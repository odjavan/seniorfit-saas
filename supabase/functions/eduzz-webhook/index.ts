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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  try {
    const payload = await req.json()
    console.log('🔔 WEBHOOK RECEBIDO:', JSON.stringify(payload))

    // 1. EXTRAÇÃO DE DADOS (Payload Eduzz Real)
    const email = payload.buyer?.email?.trim().toLowerCase() || payload.cus_email?.trim().toLowerCase()
    const name = payload.buyer?.name || payload.cus_name || 'Novo Assinante'
    const productId = payload.producer?.id?.toString() || payload.product_id?.toString()

    if (!email) throw new Error('Email não encontrado no payload')
    if (productId && productId !== SENIORFIT_PRODUCT_ID) {
       console.log(`⚠️ Produto ${productId} ignorado.`);
       return new Response(JSON.stringify({ success: true, msg: 'Produto ignorado' }), { status: 200 })
    }

    // 2. BUSCA CONFIGURAÇÕES (Private Key + IDs)
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single()

    // 3. LÓGICA DE CADASTRO (Auth + Profile)
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
    let userId;

    if (!existing) {
      const tempPassword = `Senior${Math.random().toString(36).slice(-8)}!Fit`
      const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
        email, password: tempPassword, email_confirm: true,
        user_metadata: { full_name: name }
      })
      if (authErr) throw authErr
      userId = auth.user.id
      await supabase.from('profiles').insert({ id: userId, email, name, role: 'SUBSCRIBER', subscription_status: 'ACTIVE' })
      
      // 4. DISPARO DE E-MAIL COM AUDITORIA (Private Key)
      if (settings?.emailjs_private_key) {
        console.log('📧 Enviando Boas-vindas...')
        const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: settings.emailjs_service_id,
            template_id: settings.emailjs_template_welcome,
            user_id: settings.emailjs_public_key,
            accessToken: settings.emailjs_private_key,
            template_params: { to_email: email, to_name: name, temp_password: tempPassword, app_url: settings.app_url }
          })
        })
        const resBody = await emailRes.text()
        console.log(`📬 RESPOSTA EMAILJS: ${emailRes.status} - ${resBody}`)
      }
    } else {
      console.log('👤 Usuário já existe, atualizando status.');
      await supabase.from('profiles').update({ subscription_status: 'ACTIVE' }).eq('email', email)
    }

    return new Response(JSON.stringify({ success: true, action: existing ? 'updated' : 'created' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 
    })

  } catch (err: any) {
    console.error('🚨 ERRO CRÍTICO:', err.message)
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 200 })
  }
})