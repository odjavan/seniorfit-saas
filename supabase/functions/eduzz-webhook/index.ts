import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  
  try {
    const payload = await req.json()
    const email = payload.buyer?.email?.trim().toLowerCase()
    const name = payload.buyer?.name || 'Assinante'

    // 1. Busca as chaves que você salvou no banco
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single()

    // 2. Lógica de cadastro (Simplificada para o teste)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email, password: 'SeniorFit123!', email_confirm: true, user_metadata: { full_name: name }
    })
    if (authError) throw authError

    await supabase.from('profiles').insert({ id: authUser.user.id, email, name, role: 'SUBSCRIBER' })

    // 3. O DISPARO REAL (Com a assinatura de segurança)
    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: settings.emailjs_service_id,
        template_id: settings.emailjs_template_welcome,
        user_id: settings.emailjs_public_key,
        accessToken: settings.emailjs_private_key, // <-- ESSA É A BLINDAGEM
        template_params: { to_email: email, to_name: name, temp_password: 'SeniorFit123!' }
      })
    })

    const resultText = await emailResponse.text()
    console.log(`Log de Auditoria: ${emailResponse.status} - ${resultText}`)

    return new Response(JSON.stringify({ success: true, action: 'created', log: resultText }), { headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { headers: corsHeaders })
  }
})