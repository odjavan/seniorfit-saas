import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handshake rápido de CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 2. Init Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3. Leitura Segura do Payload
    let bodyText = "";
    try { bodyText = await req.text(); } catch(e) {}
    if (!bodyText) return new Response(JSON.stringify({msg: "Empty"}), {status: 200, headers: corsHeaders});
    
    const payload = JSON.parse(bodyText);
    console.log("PAYLOAD RECEBIDO:", JSON.stringify(payload)); // Log essencial

    // 4. Extração de Dados (Lógica da Rede de Pesca)
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
    const rawStatus = String(payload.status || payload.trans_status || "").toLowerCase();

    // 5. Auditoria (Webhook Logs) - Execução segura
    // Gravamos o log, mas não deixamos falhar a requisição principal se a tabela não existir
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
        console.warn("Aviso: Falha ao gravar webhook_logs (não crítico).", logError);
    }

    // 6. Resolução de ID do Usuário (ESTRATÉGIA FAST-PATH)
    let userId = null;
    let isNewUser = false;

    // A: Check Rápido no Banco (Indexado) - Mais rápido que Auth API
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (existingProfile) {
        userId = existingProfile.id;
        console.log("Fast-Path: Usuário encontrado no banco.");
    } else {
        // B: Tenta criar no Auth (Se não existe no banco, provável ser novo)
        console.log("Fast-Path: Criando usuário no Auth...");
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: cpf.replace(/\D/g, '') || "SeniorFit123",
            email_confirm: true,
            user_metadata: { full_name: name }
        });

        if (newUser?.user) {
            userId = newUser.user.id;
            isNewUser = true;
        } else if (createError?.message?.includes("already registered")) {
            // C: Fallback Lento - Só executa se houver inconsistência (Auth existe, Profile não)
            console.log("Fallback: Usuário existe no Auth mas sem perfil. Buscando ID...");
            const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = userList.users.find(u => u.email?.toLowerCase() === email);
            if (foundUser) userId = foundUser.id;
        }
    }

    if (!userId) {
        // Se falhou tudo, retornamos 200 com erro logado para não travar a Eduzz (ela vai tentar de novo se dermos 500)
        console.error("ERRO CRÍTICO: Não foi possível resolver o ID do usuário.");
        return new Response(JSON.stringify({ error: "User ID resolution failed" }), { status: 200, headers: corsHeaders });
    }

    // 7. Mapeamento de Status
    const paidStatuses = ['paid', 'approved', 'completa', '3', 'active'];
    const pendingStatuses = ['waiting', 'review', 'open', '1', 'waiting_payment'];
    let finalStatus = 'cancelled';
    if (paidStatuses.includes(rawStatus)) finalStatus = 'active';
    else if (pendingStatuses.includes(rawStatus)) finalStatus = 'pending';

    // 8. Persistência Final (Upsert Profile)
    const profileData = {
        id: userId,
        email: email,
        name: name,
        cpf: cpf || undefined,
        eduzz_id: eduzzId,
        eduzz_status: rawStatus,
        subscription_status: finalStatus,
        eduzz_last_update: new Date().toISOString(),
        // Se for novo usuário detectado no passo B, define role. Se já existia, mantém.
        ...(isNewUser ? { role: 'subscriber' } : {})
    };

    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert(profileData);

    if (upsertError) {
        console.error("Erro ao salvar profile:", upsertError);
        // Retornamos 200 mesmo com erro de banco para limpar a fila da Eduzz, já que logamos o erro
        return new Response(JSON.stringify({ error: "DB Error" }), { status: 200, headers: corsHeaders });
    }

    console.log(`SUCESSO: ${email} -> ${finalStatus}`);

    // 9. Resposta Imediata
    return new Response(JSON.stringify({ 
        success: true, 
        userId: userId,
        status: finalStatus
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("EXCEPTION:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
  }
})