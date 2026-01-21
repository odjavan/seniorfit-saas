import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento de CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Inicializa Supabase com Privilégios de ADMIN (Service Role)
    // Isso permite criar usuários no Auth e ignorar RLS se necessário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const payload = await req.json()
    console.log("Eduzz Webhook Payload:", JSON.stringify(payload));

    // 2. Extração Robusta de Dados (Suporta Webhook Global e Customizado)
    const email = (payload.email || payload.buyer?.email || payload.fields?.edz_cli_email || "").toLowerCase().trim();
    const name = payload.name || payload.buyer?.name || payload.fields?.edz_cli_name || "Assinante SeniorFit";
    const cpf = payload.doc || payload.buyer?.document || "";
    const eduzzId = payload.trans_cod || payload.id || "";
    
    // Status Eduzz: 3 = Paga/Aprovada, 1 = Aberta/Aguardando
    const rawStatus = String(payload.status || payload.trans_status || payload.chk_status || "");
    
    // Mapeamento de Status
    let subscriptionStatus = 'inactive';
    if (['3', 'paid', 'approved', 'completa'].includes(rawStatus.toLowerCase())) {
        subscriptionStatus = 'active';
    } else if (['1', 'waiting', 'review'].includes(rawStatus.toLowerCase())) {
        subscriptionStatus = 'pending';
    } else if (['7', 'refunded', '4', 'cancelled'].includes(rawStatus.toLowerCase())) {
        subscriptionStatus = 'cancelled';
    }

    if (!email) {
        return new Response(JSON.stringify({ error: "E-mail não encontrado no payload" }), { status: 400, headers: corsHeaders });
    }

    // 3. Verificação de Usuário Existente (Busca no Auth primeiro para garantir ID)
    // Precisamos do UUID para a tabela profiles, pois profiles.id é FK de auth.users.id
    
    let userId = null;
    
    // Tenta encontrar usuário pelo email no sistema de Auth
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = users?.find(u => u.email?.toLowerCase() === email);

    if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log(`Usuário existente encontrado: ${userId}`);
    } else {
        console.log(`Criando novo usuário para: ${email}`);
        // 4. Criação de Novo Usuário (Se não existir)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: cpf.replace(/\D/g, '') || "SeniorFit123", // Senha inicial é o CPF ou padrão
            email_confirm: true,
            user_metadata: { full_name: name }
        });

        if (createError) throw new Error(`Erro ao criar usuário Auth: ${createError.message}`);
        userId = newUser.user.id;
    }

    // 5. Upsert na tabela Profiles (Agora temos certeza que o ID existe)
    // Usamos upsert para criar se não existir ou atualizar se existir
    const { error: dbError } = await supabaseAdmin.from('profiles').upsert({ 
      id: userId, // CHAVE CRÍTICA: Vincula ao Auth
      email: email, 
      name: name,
      role: 'subscriber', // Força papel de assinante
      cpf: cpf,
      eduzz_id: eduzzId,
      eduzz_status: rawStatus,
      subscription_status: subscriptionStatus,
      eduzz_last_update: new Date().toISOString()
    });

    if (dbError) throw new Error(`Erro ao gravar no banco: ${dbError.message}`);

    // Sucesso
    return new Response(JSON.stringify({ 
        success: true, 
        userId: userId, 
        action: existingAuthUser ? 'updated' : 'created',
        status: subscriptionStatus
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("Webhook Critical Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
})