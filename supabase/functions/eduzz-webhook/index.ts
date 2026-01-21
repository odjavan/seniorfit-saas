import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;
declare const EdgeRuntime: any; // Declaração para ambiente Edge do Supabase

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // 3. Extração Robustas (Rede de Pesca)
    // Tenta formato V3 (buyer.email) e Legacy (trans_email)
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
    // ID da Transação: Crucial para V3 (payload.id) e Legacy (trans_cod)
    const eduzzId = (payload.id || payload.invoice?.id || payload.trans_cod || "").toString();
    const rawStatus = String(payload.status || payload.trans_status || "").toLowerCase();

    // 4. Auditoria (Log sem travar)
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

    // 5. Mapeamento de Status
    const paidStatuses = ['paid', 'approved', 'completa', '3', 'active'];
    const pendingStatuses = ['waiting', 'review', 'open', '1', 'waiting_payment'];
    let finalStatus = 'cancelled';
    if (paidStatuses.includes(rawStatus)) finalStatus = 'active';
    else if (pendingStatuses.includes(rawStatus)) finalStatus = 'pending';

    // 6. Resolução de Usuário (Fast Path)
    let userId = null;
    let isNewUser = false;
    const initialPassword = cpf.replace(/\D/g, '') || "123456"; // Senha = CPF (apenas números)

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
        // Criar no Auth
        console.log("Criando novo usuário...");
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

    // 7. Upsert Profile (Persistência)
    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: email,
        name: name,
        cpf: cpf || undefined,
        eduzz_id: eduzzId,
        eduzz_status: rawStatus,
        subscription_status: finalStatus,
        eduzz_last_update: new Date().toISOString(),
        ...(isNewUser ? { role: 'subscriber' } : {}) // Só define role se for novo
    });

    if (upsertError) console.error("Erro DB:", upsertError);

    // 8. Disparo de E-mail (Non-Blocking / Fire & Forget)
    // Só enviamos e-mail se for um NOVO usuário e se a conta for criada com sucesso.
    if (isNewUser) {
        const sendEmailTask = async () => {
            try {
                console.log("Iniciando tarefa de e-mail background...");
                
                // Busca configurações do banco
                const { data: settings } = await supabaseAdmin
                    .from('system_settings')
                    .select('*')
                    .limit(1)
                    .single();

                if (!settings || !settings.emailjs_service_id || !settings.emailjs_template_welcome) {
                    console.warn("EmailJS não configurado no banco. E-mail cancelado.");
                    return;
                }

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

                const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailPayload)
                });

                if (res.ok) console.log("EMAIL BACKGROUND: Enviado com sucesso!");
                else console.error("EMAIL BACKGROUND ERRO:", await res.text());

            } catch (err) {
                console.error("EMAIL BACKGROUND EXCEPTION:", err);
            }
        };

        // Mágica do Supabase Edge Functions: Mantém a função viva para o e-mail SEM travar a resposta HTTP
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
            EdgeRuntime.waitUntil(sendEmailTask());
        } else {
            // Fallback para dev local: chama sem await (pode ser morto pelo runtime, mas não bloqueia)
            sendEmailTask();
        }
    }

    console.log(`PROCESSAMENTO FINALIZADO: ${email} -> ${finalStatus}`);

    // 9. Resposta Imediata para Eduzz
    return new Response(JSON.stringify({ 
        success: true, 
        userId: userId, 
        status: finalStatus 
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("CRASH HANDLER:", err);
    // Retornamos 200 com erro logado para evitar retentativas infinitas da Eduzz em casos de erro lógico interno
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
  }
})