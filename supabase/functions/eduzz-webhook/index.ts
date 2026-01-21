import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ID do Produto SeniorFit (Filtro Rígido)
const TARGET_PRODUCT_ID = "2940933";

serve(async (req) => {
  // 1. Handshake CORS
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
    
    // 3. FILTRO DE PRODUTO OBRIGATÓRIO
    // Tenta localizar o ID em qualquer campo possível que a Eduzz envie
    let incomingProductId = (
        payload.product_id || 
        payload.product?.id || 
        (payload.items && payload.items[0]?.product_id) || 
        (payload.trans_items && payload.trans_items[0]?.product_id) || 
        ""
    ).toString();

    // Se tiver ID e não for o nosso, ignora imediatamente (Status 200 para a Eduzz não reenviar)
    if (incomingProductId && incomingProductId !== TARGET_PRODUCT_ID) {
        console.log(`Produto ignorado: ${incomingProductId} (Esperado: ${TARGET_PRODUCT_ID})`);
        return new Response(JSON.stringify({ message: "Produto ignorado" }), { status: 200, headers: corsHeaders });
    }

    // 4. Extração de Dados (Prioridade para Dados Reais)
    const email = (
        payload.buyer?.email || 
        payload.email || 
        payload.cus_email ||
        ""
    ).toLowerCase().trim();

    // Se não tiver e-mail, é apenas um ping de servidor
    if (!email) {
        return new Response(JSON.stringify({ success: true, msg: "Handshake OK" }), { status: 200, headers: corsHeaders });
    }

    // Mapeamento de Nome: Buyer Name (V3) > Cus Name (Legacy) > Fallback
    const name = 
        payload.buyer?.name || 
        payload.cus_name || 
        payload.name || 
        "Assinante SeniorFit";

    const cpf = payload.buyer?.document || payload.doc || "";
    const eduzzId = (payload.id || payload.invoice?.id || payload.trans_cod || "").toString();

    // 5. Auditoria de Segurança (Log Bruto)
    // Gravamos o log antes de processar para ter rastro mesmo se falhar depois
    try {
        await supabaseAdmin.from('webhook_logs').insert({
            event_type: 'eduzz_transaction',
            payload: payload,
            email: email,
            eduzz_id: eduzzId,
            status: 'processing',
            created_at: new Date().toISOString()
        });
    } catch (logError) {
        console.warn("Log warning:", logError);
    }

    // 6. Resolução de Usuário (Auth & Profiles)
    let userId = null;
    const initialPassword = cpf.replace(/\D/g, '') || "123456"; 

    // Verifica se já existe perfil
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (existingProfile) {
        userId = existingProfile.id;
    } else {
        // Cria usuário no Auth (necessário para login)
        const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: initialPassword,
            email_confirm: true,
            user_metadata: { name: name } // Garante uso do nome correto no metadata
        });

        if (newUser?.user) {
            userId = newUser.user.id;
        } else {
            // Fallback: Se falhar (ex: usuário existe no Auth mas sem profile), busca o ID
            const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = userList.users.find(u => u.email?.toLowerCase() === email);
            if (foundUser) userId = foundUser.id;
        }
    }

    if (!userId) {
        console.error("Falha crítica: Não foi possível obter userId.");
        return new Response(JSON.stringify({ error: "User resolution failed" }), { status: 200, headers: corsHeaders });
    }

    // 7. Upsert Definitivo (Visibilidade Garantida)
    // Forçamos role='subscriber' e status='active' (MINÚSCULAS) conforme solicitado explicitamente
    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: email,
        name: name, // Usa a variável 'name' com prioridade para payload.buyer.name
        cpf: cpf || undefined,
        eduzz_id: eduzzId,
        
        // CAMPOS DE VISIBILIDADE FORÇADOS (MINÚSCULOS):
        role: 'subscriber', 
        subscription_status: 'active', 
        
        eduzz_last_update: new Date().toISOString()
    });

    if (upsertError) {
        console.error("Erro ao atualizar profile:", upsertError);
    } else {
        console.log(`Sucesso: ${name} (${email}) -> active subscriber`);
    }

    // 8. Resposta Rápida (Otimizada sem integrações externas)
    return new Response(JSON.stringify({ 
        success: true, 
        userId: userId,
        status_forced: 'active'
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
  }
})