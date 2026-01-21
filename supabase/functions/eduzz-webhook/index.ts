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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let bodyText = "";
    try { bodyText = await req.text(); } catch(e) {}
    if (!bodyText) return new Response(JSON.stringify({msg: "Empty"}), {status: 200, headers: corsHeaders});
    
    const payload = JSON.parse(bodyText);
    console.log("PAYLOAD COMPLETO:", JSON.stringify(payload)); // Log para debug detalhado

    // 1. FILTRO DE PRODUTO
    let incomingProductId = (
        payload.product_id || 
        payload.product?.id || 
        (payload.items && payload.items[0]?.product_id) || 
        (payload.trans_items && payload.trans_items[0]?.product_id) || 
        ""
    ).toString();

    const rawStatus = String(payload.status || payload.trans_status || "").toLowerCase();

    console.log(`Filtrando Produto: [${incomingProductId}] | Status: [${rawStatus}]`);

    // Bloqueio de produtos estranhos (Se houver ID e não for o nosso)
    if (incomingProductId && incomingProductId !== TARGET_PRODUCT_ID) {
        console.log(`PRODUTO IGNORADO: Recebido ${incomingProductId} diferente do alvo ${TARGET_PRODUCT_ID}.`);
        return new Response(JSON.stringify({ message: "Product ignored" }), { status: 200, headers: corsHeaders });
    }

    // 2. Extração de Dados
    const email = (
        payload.buyer?.email || 
        payload.email || 
        payload.trans_email || 
        payload.data?.buyer?.email || 
        ""
    ).toLowerCase().trim();

    if (!email) {
        return new Response(JSON.stringify({ success: true, msg: "Handshake OK" }), { status: 200, headers: corsHeaders });
    }

    // CORREÇÃO CRÍTICA DE NOME:
    // Priorizamos buyer.name (Padrão V3), depois cus_name (Legacy/Testes), depois data.buyer.name
    const name = 
        payload.buyer?.name || 
        payload.cus_name || 
        payload.data?.buyer?.name || 
        payload.name || 
        "Assinante SeniorFit";

    console.log(`Dados Extraídos -> Nome: "${name}" | Email: "${email}"`);

    const cpf = payload.buyer?.document || payload.doc || "";
    const eduzzId = (payload.id || payload.invoice?.id || payload.trans_cod || "").toString();

    // 3. Auditoria
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
        console.warn("Falha no log de auditoria.", logError);
    }

    // 4. Mapeamento de Status
    const paidStatuses = ['paid', 'approved', 'completa', '3', 'active'];
    const pendingStatuses = ['waiting', 'review', 'open', '1', 'waiting_payment', 'invoice_opened']; 
    
    let finalStatus = 'cancelled';
    if (paidStatuses.includes(rawStatus)) finalStatus = 'active';
    else if (pendingStatuses.includes(rawStatus)) finalStatus = 'pending';

    // 5. Resolução de Usuário
    let userId = null;
    let isNewUser = false;
    const initialPassword = cpf.replace(/\D/g, '') || "123456"; 

    // Busca perfil existente
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (existingProfile) {
        userId = existingProfile.id;
        console.log(`Usuário existente encontrado: ${userId}`);
    } else {
        console.log(`Criando novo usuário para ${email}...`);
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
            // Fallback: Tenta achar no Auth se falhar (inconsistência Auth vs Profiles)
            const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = userList.users.find(u => u.email?.toLowerCase() === email);
            if (foundUser) userId = foundUser.id;
        }
    }

    if (!userId) {
        console.error("ERRO CRÍTICO: Falha ao resolver ID do usuário.");
        return new Response(JSON.stringify({ error: "User ID resolution failed" }), { status: 200, headers: corsHeaders });
    }

    // 6. Upsert Profile (CORREÇÃO: FORÇAR ROLE E NOME)
    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: email,
        name: name, // Agora usa a variável com a extração correta
        cpf: cpf || undefined,
        eduzz_id: eduzzId,
        eduzz_status: rawStatus,
        subscription_status: finalStatus,
        role: 'subscriber', // FORÇADO: Garante que apareça na lista de Assinantes
        eduzz_last_update: new Date().toISOString()
    });

    if (upsertError) console.error("Erro DB:", upsertError);

    // 7. Email em Background
    if (isNewUser) {
        const sendEmailTask = async () => {
            try {
                const { data: settings } = await supabaseAdmin
                    .from('system_settings')
                    .select('*')
                    .limit(1)
                    .single();

                if (!settings?.emailjs_service_id || !settings?.emailjs_template_welcome) return;

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

    console.log(`SUCESSO FINAL: ${name} (${email}) -> ${finalStatus}`);

    return new Response(JSON.stringify({ 
        success: true, 
        userId: userId, 
        status: finalStatus,
        name_mapped: name
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("CRASH HANDLER:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
  }
})