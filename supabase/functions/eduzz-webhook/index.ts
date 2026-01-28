
// @ts-ignore
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENIORFIT_PRODUCT_ID = '2940933'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    console.log("==================================================")
    console.log("📡 WEBHOOK EDUZZ - INICIANDO FLUXO AUTHORIZATION CODE")

    // 1. Extração do CODE do Webhook (Passo Crítico)
    const initialPayload = await req.json()
    console.log("📦 PAYLOAD RECEBIDO:", JSON.stringify(initialPayload, null, 2))

    // O 'code' é fundamental para este fluxo
    const code = initialPayload.code;
    
    // Tentamos identificar o ID da transação para uso posterior, embora o foco agora seja o token
    const transactionId = initialPayload.trans_cod || initialPayload.id || initialPayload.data?.id;

    if (!code) {
      console.error("❌ O campo 'code' não foi encontrado no payload.")
      throw new Error("Payload inválido: 'code' é obrigatório para este fluxo.")
    }

    // 2. Leitura dos Secrets
    const clientId = Deno.env.get('EDUZZ_CLIENT_ID');
    const clientSecret = Deno.env.get('EDUZZ_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error("Configuração de ambiente incompleta: EDUZZ_CLIENT_ID ou EDUZZ_CLIENT_SECRET ausentes.");
    }

    // 3. Construção do Corpo da Requisição de Token
    // Conforme documentação: client_id, client_secret, code, redirect_uri, grant_type
    const tokenRequestBody = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: 'https://app.especialsenior.com/callback', // Placeholder válido exigido pela Eduzz
      grant_type: 'authorization_code'
    };

    console.log("🔐 Trocando CODE por TOKEN...");

    // 4. Chamada para a API de Token
    const tokenResponse = await fetch('https://accounts-api.eduzz.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(tokenRequestBody)
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error(`❌ Erro na troca de token: ${tokenResponse.status} - ${tokenError}`);
      throw new Error(`Falha ao obter Access Token: ${tokenResponse.status}`);
    }

    // 5. Processamento da Resposta do Token
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("A resposta da Eduzz não continha um access_token válido.");
    }

    console.log("🔑 Access Token obtido com sucesso. Buscando detalhes da transação...");

    // --- LÓGICA DE ENRIQUECIMENTO (USANDO O NOVO TOKEN) ---
    // Agora usamos o token para buscar os dados reais do cliente na API da Eduzz
    
    // Se não tivermos o ID da transação do payload inicial, não conseguimos buscar detalhes
    if (!transactionId) {
       throw new Error("ID da transação (trans_cod) não encontrado no payload inicial para consulta de detalhes.");
    }

    const eduzzResponse = await fetch(`https://api.eduzz.com/v1/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`, // Token obtido via authorization_code
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!eduzzResponse.ok) {
      const errorText = await eduzzResponse.text();
      console.error(`❌ Erro ao buscar detalhes da transação ${transactionId}: ${errorText}`);
      throw new Error(`Falha na API de Transações: ${eduzzResponse.status}`);
    }

    const transactionDetails = await eduzzResponse.json();
    const data = transactionDetails.data || transactionDetails;

    // Extração final dos dados para criação do usuário
    const email = (
      data.client_email || 
      data.customer?.email || 
      data.buyer?.email || 
      initialPayload.cus_email 
    )?.trim().toLowerCase();

    const name = (
      data.client_name || 
      data.customer?.name || 
      data.buyer?.name || 
      initialPayload.cus_name || 
      'Novo Assinante'
    );

    const productId = (
        data.product_id || 
        data.items?.[0]?.product_id || 
        initialPayload.product_id
    )?.toString();

    console.log(`✅ DADOS CONFIRMADOS -> Nome: ${name}, Email: ${email}, Produto: ${productId}`);

    if (!email) throw new Error("E-mail do cliente não encontrado nos detalhes da transação.");

    // --- LÓGICA DO SUPABASE (Criação de Usuário) ---
    // Inicializa cliente Supabase Admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Busca configurações do sistema (para EmailJS e URLs)
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single()

    // Verifica se usuário já existe
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
    let userId;

    if (!existing) {
      console.log(`👤 Criando novo usuário para: ${email}`)
      const tempPassword = `Senior${Math.random().toString(36).slice(-8)}!Fit`
      
      // Cria no Auth
      const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
        email, 
        password: tempPassword, 
        email_confirm: true,
        user_metadata: { full_name: name }
      })
      
      if (authErr) throw authErr
      userId = auth.user.id
      
      // Cria no Profile (Tabela pública)
      await supabase.from('profiles').insert({ 
        id: userId, 
        email, 
        name, 
        role: 'SUBSCRIBER', 
        subscription_status: 'ACTIVE',
        eduzz_id: transactionId
      })
      
      // Envia Email de Boas-Vindas
      if (settings?.emailjs_private_key) {
        console.log('📧 Disparando e-mail de boas-vindas...')
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: settings.emailjs_service_id,
            template_id: settings.emailjs_template_welcome,
            user_id: settings.emailjs_public_key,
            accessToken: settings.emailjs_private_key,
            template_params: { 
              to_email: email, 
              to_name: name, 
              temp_password: tempPassword, 
              app_url: settings.app_url 
            }
          })
        })
      }
    } else {
      console.log(`🔄 Usuário existente. Atualizando status para ACTIVE.`)
      await supabase.from('profiles').update({ 
          subscription_status: 'ACTIVE',
          eduzz_id: transactionId
      }).eq('email', email)
    }

    return new Response(JSON.stringify({ success: true, action: existing ? 'updated' : 'created', email }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 
    })

  } catch (err: any) {
    console.error('🚨 ERRO FATAL NA FUNCTION:', err.message)
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 // Retorna 500 para a Eduzz saber que falhou e tentar reenviar se necessário
    })
  }
})
