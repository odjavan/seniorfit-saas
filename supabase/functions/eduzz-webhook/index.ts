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
    // --- INÍCIO DO DEBUG DEEP DIVE (WEBHOOK RECEBIDO) ---
    console.log("==================================================")
    console.log("📡 NOVA REQUISIÇÃO RECEBIDA - SENIORFIT WEBHOOK")
    
    const requestHeaders: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      requestHeaders[key] = value
    })
    console.log("📋 HEADERS RECEBIDOS:", JSON.stringify(requestHeaders, null, 2))

    // 1. Recebe o Payload "magro" (apenas ID geralmente)
    const initialPayload = await req.json()
    console.log("📦 PAYLOAD INICIAL (WEBHOOK):", JSON.stringify(initialPayload, null, 2))
    
    // --- LÓGICA DE ENRIQUECIMENTO (BUSCA NA API EDUZZ) ---
    
    // A. Identifica o ID da transação
    const transactionId = initialPayload.id || initialPayload.trans_cod || initialPayload.data?.id;

    if (!transactionId) {
      throw new Error("ID da transação não encontrado no payload inicial. Payload recebido: " + JSON.stringify(initialPayload));
    }

    // B. Obtém Credenciais (Client ID e Secret)
    const eduzzClientId = Deno.env.get('EDUZZ_CLIENT_ID');
    const eduzzSecret = Deno.env.get('EDUZZ_SECRET');

    // --- LOGS DE DIAGNÓSTICO DE SEGREDOS ---
    console.log(`VERIFICANDO SEGREDOS: EDUZZ_CLIENT_ID lido como: ${eduzzClientId ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
    console.log(`VERIFICANDO SEGREDOS: EDUZZ_SECRET lido como: ${eduzzSecret ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);

    if (!eduzzClientId || !eduzzSecret) {
      throw new Error("Configuração ausente: EDUZZ_CLIENT_ID ou EDUZZ_SECRET não encontrados nas variáveis de ambiente.");
    }

    // C. Autenticação (Obter Access Token)
    console.log("🔐 Autenticando com a API da Eduzz...");
    
    const tokenResponse = await fetch('https://api.eduzz.com/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: eduzzClientId,
        client_secret: eduzzSecret,
        grant_type: "client_credentials"
      })
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error(`❌ Erro ao obter Token Eduzz: ${tokenResponse.status} - ${tokenError}`);
      throw new Error(`Falha na autenticação Eduzz: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      throw new Error("Access Token não retornado pela Eduzz.");
    }
    console.log("🔑 Token de acesso obtido com sucesso.");

    // D. Faz a chamada GET para a API da Eduzz usando o Token
    console.log(`🚀 Consultando Detalhes da Transação ID: ${transactionId}`);
    const eduzzResponse = await fetch(`https://api.eduzz.com/v1/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!eduzzResponse.ok) {
      const errorText = await eduzzResponse.text();
      console.error(`❌ Erro na API Eduzz (Transação): ${eduzzResponse.status} - ${errorText}`);
      throw new Error(`Falha ao consultar transação: ${eduzzResponse.status}`);
    }

    const transactionDetails = await eduzzResponse.json();
    console.log("📄 DETALHES COMPLETOS DA TRANSAÇÃO (API EDUZZ):", JSON.stringify(transactionDetails, null, 2));

    // E. Extração de Dados Reais (Mapeamento Flexível)
    const data = transactionDetails.data || transactionDetails; 
    
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

    console.log(`✅ Dados Extraídos -> Nome: ${name}, Email: ${email}, Produto: ${productId}`);
    console.log("==================================================")
    // --- FIM DO ENRIQUECIMENTO ---

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    if (!email) throw new Error('Campo de e-mail não encontrado nem no Webhook nem na API da Eduzz.')
    
    // Validação do Produto
    if (productId && productId !== SENIORFIT_PRODUCT_ID) {
       console.log(`⚠️ ALERTA: Produto ID ${productId} diferente do esperado (${SENIORFIT_PRODUCT_ID}). Prosseguindo com cautela.`);
    }

    // 4. BUSCA CONFIGURAÇÕES
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single()

    // 5. LÓGICA DE CADASTRO (Auth + Profile)
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
    let userId;

    if (!existing) {
      console.log(`👤 Criando novo usuário para: ${email}`)
      const tempPassword = `Senior${Math.random().toString(36).slice(-8)}!Fit`
      
      const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
        email, 
        password: tempPassword, 
        email_confirm: true,
        user_metadata: { full_name: name }
      })
      
      if (authErr) throw authErr
      userId = auth.user.id
      
      await supabase.from('profiles').insert({ 
        id: userId, 
        email, 
        name, 
        role: 'SUBSCRIBER', 
        subscription_status: 'ACTIVE',
        eduzz_id: transactionId
      })
      
      // 6. DISPARO DE E-MAIL COM AUDITORIA
      if (settings?.emailjs_private_key) {
        console.log('📧 Preparando envio EmailJS (Boas-vindas)...')
        const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
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
        const resBody = await emailRes.text()
        console.log(`📬 RESPOSTA EMAILJS: Status ${emailRes.status} - Body: ${resBody}`)
      }
    } else {
      console.log(`🔄 Usuário já existente (${email}). Atualizando status para ACTIVE.`)
      await supabase.from('profiles').update({ 
          subscription_status: 'ACTIVE',
          eduzz_id: transactionId
      }).eq('email', email)
    }

    return new Response(JSON.stringify({ success: true, action: existing ? 'updated' : 'created', email: email }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 
    })

  } catch (err: any) {
    console.error('🚨 ERRO CRÍTICO NA FUNCTION:', err.message)
    console.error('Stack:', err.stack)
    // Retornamos 200 para evitar retentativas infinitas da Eduzz em caso de erro de lógica
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    })
  }
})