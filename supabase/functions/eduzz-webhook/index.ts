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

    // Leitura do Body como Texto primeiro para evitar erros de JSON.parse em body vazio
    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch (e) {
      console.warn("Falha ao ler body text");
    }

    if (!bodyText) {
       console.log("Body vazio recebido.");
       return new Response(JSON.stringify({ message: "Empty body" }), { status: 200, headers: corsHeaders });
    }

    const payload = JSON.parse(bodyText);

    // --- LOG DE ENTRADA OBRIGATÓRIO (Solicitado) ---
    console.log("Payload Completo:", JSON.stringify(payload));

    // --- ESTRATÉGIA DE EXTRAÇÃO (Prioridade: Formato Real identificado) ---
    
    // 1. E-mail (Chave principal)
    // Tenta: payload.buyer.email (Formato Real) -> payload.email -> payload.trans_email (Legado)
    const email = (
        payload.buyer?.email || 
        payload.email || 
        payload.trans_email || 
        payload.data?.buyer?.email || // Caso venha encapsulado em 'data'
        ""
    ).toLowerCase().trim();

    // 2. Nome
    const name = (
        payload.buyer?.name || 
        payload.name || 
        payload.cus_name || 
        "Assinante SeniorFit"
    );

    // 3. CPF
    const cpf = (
        payload.buyer?.document || 
        payload.doc || 
        payload.cus_taxnumber || 
        ""
    );

    // 4. ID da Transação
    // Tenta: payload.id (Formato Real) -> payload.invoice.id -> payload.trans_cod
    const eduzzId = (
        payload.id || 
        payload.invoice?.id || 
        payload.trans_cod || 
        ""
    ).toString();

    // 5. Status
    // Tenta: payload.status (Formato Real) -> payload.trans_status
    const rawStatus = String(
        payload.status || 
        payload.trans_status || 
        payload.chk_status || 
        ""
    ).toLowerCase();

    console.log(`DADOS MAPEADOS -> Email: [${email}] | ID: [${eduzzId}] | Status: [${rawStatus}]`);

    // --- HANDSHAKE VS PROCESSAMENTO ---
    
    // Se não encontrou e-mail, assume que é apenas verificação de URL ou ping da Eduzz.
    // Retorna 200 para não quebrar a integração, mas avisa no log.
    if (!email) {
        console.log("HANDSHAKE: E-mail não encontrado nos campos mapeados. Retornando 200 OK para validação.");
        return new Response(JSON.stringify({ 
            success: true, 
            message: "Handshake Accepted. Waiting for payload with email." 
        }), { status: 200, headers: corsHeaders });
    }

    // --- LÓGICA DE STATUS ---
    
    let subscriptionStatus = 'inactive';
    
    // Lista expandida de status de sucesso
    // 'paid' vem do payload.status real
    // '3' vem do payload.trans_status legado
    const paidStatuses = ['paid', 'approved', 'completa', '3', 'active'];
    const pendingStatuses = ['waiting', 'review', 'open', '1', 'waiting_payment'];
    
    if (paidStatuses.includes(rawStatus)) {
        subscriptionStatus = 'active';
    } else if (pendingStatuses.includes(rawStatus)) {
        subscriptionStatus = 'pending';
    } else {
        subscriptionStatus = 'cancelled';
    }

    // --- OPERAÇÕES NO BANCO DE DADOS ---

    let userId = null;
    let action = 'none';

    // 1. Verificar/Criar Auth User
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = users?.find(u => u.email?.toLowerCase() === email);

    if (existingAuthUser) {
        userId = existingAuthUser.id;
        action = 'updated_auth';
        console.log(`Usuário Auth existente: ${userId}`);
    } else {
        console.log(`Criando novo usuário Auth: ${email}`);
        action = 'created_auth';
        
        const initialPassword = cpf.replace(/\D/g, '') || "SeniorFit123";
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: initialPassword,
            email_confirm: true,
            user_metadata: { full_name: name }
        });

        if (createError) {
             // Se erro for duplicidade (pode acontecer em race condition), tentamos recuperar
             console.error(`Erro ao criar usuário: ${createError.message}`);
             throw new Error(`Auth Create Failed: ${createError.message}`);
        }
        userId = newUser.user.id;
    }

    // 2. Upsert na tabela Profiles
    const profileData = {
      id: userId,
      email: email,
      name: name,
      // Se for criação nova, define role. Se já existe, não sobrescreve (segurança para não rebaixar admins)
      ...(action === 'created_auth' ? { role: 'subscriber' } : {}),
      cpf: cpf || undefined,
      eduzz_id: eduzzId,
      eduzz_status: rawStatus,
      subscription_status: subscriptionStatus,
      eduzz_last_update: new Date().toISOString()
    };

    console.log("Salvando Profile:", JSON.stringify(profileData));

    const { error: dbError } = await supabaseAdmin
        .from('profiles')
        .upsert(profileData);

    if (dbError) {
        console.error("Erro DB Profile:", dbError);
        throw new Error(`Profile Upsert Failed: ${dbError.message}`);
    }

    console.log("PROCESSAMENTO CONCLUÍDO COM SUCESSO.");

    return new Response(JSON.stringify({ 
        success: true, 
        userId: userId, 
        status: subscriptionStatus,
        eduzz_ref: eduzzId
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("ERRO FATAL NO WEBHOOK:", err);
    // Retornamos 500 para que a Eduzz saiba que falhou e tente reenviar se for o caso
    // (A menos que seja erro de validação de dados, mas aqui tratamos como erro de servidor)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
})