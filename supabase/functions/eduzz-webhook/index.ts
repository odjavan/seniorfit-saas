import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;
declare const EdgeRuntime: any; 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TARGET_PRODUCT_ID = "2940933"; // ID SeniorFit

serve(async (req) => {
  // 1. Handshake rápido de CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 2. Leitura Segura do Payload
    let bodyText = "";
    try { bodyText = await req.text(); } catch(e) {}
    if (!bodyText) return new Response(JSON.stringify({msg: "Empty"}), {status: 200, headers: corsHeaders});
    
    const payload = JSON.parse(bodyText);
    console.log("PAYLOAD RECEBIDO:", JSON.stringify(payload));

    // 3. FILTRO DE PRODUTO E STATUS (Lógica Nova)
    // Tenta extrair o ID do produto de vários locais possíveis
    let incomingProductId = (
        payload.product_id || 
        payload.product?.id || 
        (payload.items && payload.items[0]?.product_id) || 
        (payload.trans_items && payload.trans_items[0]?.product_id) || 
        ""
    ).toString();

    const rawStatus = String(payload.status || payload.trans_status || "").toLowerCase();

    // LOG DE SEGURANÇA SOLICITADO
    console.log(`Filtrando Produto: [${incomingProductId}] | Status: [${rawStatus}]`);

    // Bloqueio de produtos estranhos (Se houver ID e não for o nosso)
    // Nota: Se não houver ID (string vazia), deixamos passar pois pode ser um ping de sistema ou update genérico,
    // mas a validação de email abaixo vai segurar. Se tiver ID, TEM que bater.
    if (incomingProductId && incomingProductId !== TARGET_PRODUCT_ID) {
        console.log(`PRODUTO IGNORADO: Recebido ${incomingProductId} diferente do alvo ${TARGET_PRODUCT_ID}.`);
        return new Response(JSON.stringify({ message: "Product ignored" }), { status: 200, headers: corsHeaders });
    }

    // 4. Extração de Dados do Usuário
    const email = (
        payload.buyer?.email || 
        payload.email || 
        payload.trans_email || 
        payload.data?.buyer?.email || 
        ""
    ).toLowerCase().trim();

    // Handshake Eduzz (Sem e-mail = Ping de validação)
    if (!email) {
        return new Response(JSON.stringify({ success: true, msg: "Handshake OK" }), { status: 200, headers: corsHeaders });
    }

    const name = payload.buyer?.name || payload.name || payload.cus_name || "Assinante SeniorFit";
    const cpf = payload.buyer?.document || payload.doc || "";
    const eduzzId = (payload.id || payload.invoice?.id || payload.trans_cod || "").toString();

    // 5. Auditoria (Log sem travar)
    try {
        await supabaseAdmin.from('webhook_logs').insert({
            event_type: 'eduzz_transaction',
            payload: payload,
            email: email,
            eduzz_id: eduzzId,
            status: rawStatus,
            created_at: new Date().toISOString()
        });
    } catch (logError) {
        console.warn("Falha no log de auditoria (ignorado).", logError);
    }

    // 6. Mapeamento de Status (Incluindo 'open')
    const paidStatuses = ['paid', 'approved', 'completa', '3', 'active'];
    // 'open' garante que boletos gerados entrem como pending
    const pendingStatuses = ['waiting', 'review', 'open', '1', 'waiting_payment', 'invoice_opened']; 
    
    let finalStatus = 'cancelled';
    if (paidStatuses.includes(rawStatus)) finalStatus = 'active';
    else if (pendingStatuses.includes(rawStatus)) finalStatus = 'pending';

    // 7. Resolução de Usuário (Fast Path)
    let userId = null;
    let isNewUser = false;
    const initialPassword = cpf.replace(/\D/g, '') || "123456"; 

    // Check Rápido no Banco
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (existingProfile) {
        userId = existingProfile.id;
        console.log("Usuário recorrente identificado.");
    } else {
        // Criar no Auth (Mesmo que status seja 'open/pending', criamos o acesso)
        console.log(`Criando novo usuário (Status: ${finalStatus})...`);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: initialPassword,
            email_confirm: true,
            user_metadata: { full_name: name }
        });

        if (newUser?.user) {
            userId = newUser.user.id;
            isNewUser = true;
        } else {
            // Fallback para inconsistências
            const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = userList.users.find(u => u.email?.toLowerCase() === email);
            if (foundUser) userId = foundUser.id;
        }
    }

    if (!userId) {
        console.error("ERRO CRÍTICO: Falha ao resolver ID do usuário.");
        return new Response(JSON.stringify({ error: "User ID resolution failed" }), { status: 200, headers: corsHeaders });
    }

    // 8. Upsert Profile (Persistência)
    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: email,
        name: name,
        cpf: cpf || undefined,
        eduzz_id: eduzzId,
        eduzz_status: rawStatus,
        subscription_status: finalStatus,
        eduzz_last_update: new Date().toISOString(),
        ...(isNewUser ? { role: 'subscriber' } : {}) 
    });

    if (upsertError) console.error("Erro DB:", upsertError);

    // 9. Disparo de E-mail (Non-Blocking)
    // Enviamos o e-mail de boas-vindas para novos usuários, mesmo que pendente (para terem o login)
    // Opcional: Você pode restringir para apenas if (isNewUser && finalStatus === 'active') se preferir.
    if (isNewUser) {
        const sendEmailTask = async () => {
            try {
                console.log("Iniciando tarefa de e-mail background...");
                const { data: settings } = await supabaseAdmin
                    .from('system_settings')
                    .select('*')
                    .limit(1)
                    .single();

                if (!settings || !settings.emailjs_service_id || !settings.emailjs_template_welcome) return;

                const emailPayload = {
                    service_id: settings.emailjs_service_id,
                    template_id: settings.emailjs_template_welcome,
                    user_id: settings.emailjs_public_key,
                    template_params: {
                        email: email,
                        customer_name: name,
                        user_password: initialPassword,
                        link: settings.app_url || "https://seniorfit.app"
                    }
                };

                await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailPayload)
                });
            } catch (err) {
                console.error("EMAIL BACKGROUND EXCEPTION:", err);
            }
        };

        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
            EdgeRuntime.waitUntil(sendEmailTask());
        } else {
            sendEmailTask();
        }
    }

    console.log(`PROCESSAMENTO FINALIZADO: ${email} -> ${finalStatus}`);

    return new Response(JSON.stringify({ 
        success: true, 
        userId: userId, 
        status: finalStatus,
        product_checked: incomingProductId
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("CRASH HANDLER:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
  }
})