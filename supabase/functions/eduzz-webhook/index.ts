import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    console.log("[LOG] Pacote recebido:", JSON.stringify(payload));

    // 🕵️‍♂️ EXTRAÇÃO MULTI-FORMATO (Busca o e-mail em qualquer lugar do pacote)
    const email = (payload.fields?.edz_cli_email || payload.buyer?.email || "").toLowerCase().trim();
    const name = payload.fields?.edz_cli_name || payload.buyer?.name || "Assinante SeniorFit";
    const status = payload.status || 'paid';

    if (!email) {
      console.error("[ERRO] Falha crítica: E-mail não encontrado no sinal da Eduzz.");
      return new Response(JSON.stringify({ error: "No email found" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    // 🏗️ SALVAMENTO NO PERFIL (Garante a função 'subscriber')
    const { error: dbError } = await supabase.from('profiles').upsert({ 
      email: email, 
      name: name,
      role: 'subscriber', 
      eduzz_status: status,
      subscription_status: (status === 'paid' || status === 'approved') ? 'active' : 'inactive',
      eduzz_last_update: new Date().toISOString()
    }, { onConflict: 'email' });

    if (dbError) throw new Error(`Erro de Banco: ${dbError.message}`);

    console.log(`[SUCESSO] Assinante ${email} registrado com sucesso.`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("[FATAL]", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
})