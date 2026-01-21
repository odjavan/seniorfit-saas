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

    // Leitura segura do payload
    let payload: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) payload = JSON.parse(bodyText);
    } catch (e) {
      console.warn("Payload vazio ou inválido.");
    }

    console.log("--- INÍCIO PROCESSAMENTO EDUZZ ---");
    console.log("Payload Bruto:", JSON.stringify(payload));

    // --- 1. ESTRATÉGIA DE EXTRAÇÃO ROBUSTA (A "REDE DE PESCA") ---
    
    // Identificação do Formato para Logs
    let formatType = "DESCONHECIDO/GENÉRICO";
    if (payload.buyer && payload.invoice) formatType = "REAL (V3 - Invoice/Buyer)";
    else if (payload.trans_cod || payload.trans_email) formatType = "LEGADO (TransCod)";
    
    console.log(`FORMATO DETECTADO: [ ${formatType} ]`);

    // Extração de E-MAIL (Chave Primária Lógica)
    const email = (
        payload.buyer?.email ||          // Formato V3 Real
        payload.trans_email ||           // Formato Legado
        payload.email ||                 // Formato Genérico
        payload.fields?.edz_cli_email || // Formato Custom
        ""
    ).toLowerCase().trim();

    // Extração de NOME
    const name = (
        payload.buyer?.name || 
        payload.cus_name ||              // Campo comum em alguns webhooks Eduzz
        payload.name || 
        "Assinante SeniorFit"
    );

    // Extração de CPF (para senha inicial)
    const cpf = (
        payload.buyer?.document || 
        payload.doc || 
        payload.cus_taxnumber || 
        ""
    );

    // Extração do ID DA TRANSAÇÃO (Crucial para rastreio)
    const eduzzId = (
        payload.invoice?.id ||   // Formato V3 (ID da Fatura)
        payload.trans_cod ||     // Formato Legado (Código da Transação)
        payload.id ||            // Fallback
        ""
    ).toString();

    // Extração do STATUS
    // V3 usa: 'paid', 'open', 'cancelled'
    // Legado usa: '3' (paga), '1' (aberta), '7' (cancelada)
    const rawStatus = String(
        payload.status || 
        payload.trans_status || 
        payload.chk_status || 
        payload.invoice?.status || 
        ""
    ).toLowerCase();

    console.log(`DADOS EXTRAÍDOS -> Email: ${email} | ID: ${eduzzId} | Status: ${rawStatus}`);

    // --- 2. HANDSHAKE / VALIDAÇÃO DE URL ---
    if (!email) {
        console.log("HANDSHAKE: E-mail não detectado. Retornando 200 para validação da Eduzz.");
        return new Response(JSON.stringify({ 
            success: true, 
            message: "Handshake Accepted. Waiting for real data." 
        }), { status: 200, headers: corsHeaders });
    }

    // --- 3. MAPEAMENTO DE STATUS PARA O APP ---
    let subscriptionStatus = 'inactive';
    
    // Lista de status positivos (Pagamento Confirmado)
    const paidStatuses = ['3', 'paid', 'approved', 'completa', 'paid_capitalization'];
    // Lista de status pendentes (Aguardando Pagamento)
    const pendingStatuses = ['1', 'waiting', 'review', 'open', 'waiting_payment'];
    
    if (paidStatuses.includes(rawStatus)) {
        subscriptionStatus = 'active';
    } else if (pendingStatuses.includes(rawStatus)) {
        subscriptionStatus = 'pending';
    } else {
        // Qualquer outra coisa (cancelado, estornado, vencido) vira inactive/cancelled
        subscriptionStatus = 'cancelled';
    }

    // --- 4. GESTÃO DE USUÁRIO (AUTH + PROFILE) ---
    
    let userId = null;
    let action = 'none';

    // A. Busca usuário existente no Auth
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = users?.find(u => u.email?.toLowerCase() === email);

    if (existingAuthUser) {
        userId = existingAuthUser.id;
        action = 'updated';
        console.log(`Usuário Auth encontrado: ${userId}`);
    } else {
        console.log(`Criando novo usuário Auth para: ${email}`);
        action = 'created';
        
        // Senha padrão é o CPF (apenas números) ou fallback seguro
        const initialPassword = cpf.replace(/\D/g, '') || "SeniorFit123";
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: initialPassword,
            email_confirm: true,
            user_metadata: { full_name: name }
        });

        if (createError) {
             // Se der erro (ex: rate limit), lança exceção para logar, mas tenta prosseguir se for duplicidade
             throw new Error(`Erro Fatal CreateUser: ${createError.message}`);
        }
        userId = newUser.user.id;
    }

    // B. Persistência na Tabela PROFILES (Upsert)
    // Aqui garantimos que os campos eduzz_* sejam salvos
    const { error: dbError } = await supabaseAdmin.from('profiles').upsert({ 
      id: userId,
      email: email, 
      name: name,
      // Se for novo, define como subscriber. Se já existe, mantém o role atual (ex: admin não vira subscriber)
      role: existingAuthUser ? undefined : 'subscriber', 
      cpf: cpf || undefined, // Atualiza CPF se vier no payload
      
      // Campos de Integração
      eduzz_id: eduzzId,
      eduzz_status: rawStatus,         // Guarda o status original para auditoria
      subscription_status: subscriptionStatus, // Status traduzido para o App
      eduzz_last_update: new Date().toISOString()
    });

    if (dbError) {
        console.error("Erro ao persistir Profile:", dbError);
        throw new Error(`Erro DB Profile: ${dbError.message}`);
    }

    console.log("SUCESSO: Perfil sincronizado.");

    return new Response(JSON.stringify({ 
        success: true, 
        userId: userId, 
        action: action,
        status: subscriptionStatus,
        eduzz_ref: eduzzId
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("ERRO CRÍTICO WEBHOOK:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
})