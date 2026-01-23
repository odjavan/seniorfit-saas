// @ts-ignore
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ID do produto SeniorFit na Eduzz
const SENIORFIT_PRODUCT_ID = '2940933'

serve(async (req) => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORS Preflight
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let rawPayload = ''
  let supabase

  try {
    rawPayload = await req.text()
    const payload = JSON.parse(rawPayload)
    
    console.log('═══════════════════════════════════════════════════════')
    console.log('🔔 WEBHOOK EDUZZ RECEBIDO')
    console.log('Timestamp:', new Date().toISOString())
    console.log('═══════════════════════════════════════════════════════')
    console.log('📦 Payload RAW:', rawPayload)
    console.log('📦 Payload Parsed:', JSON.stringify(payload, null, 2))
    console.log('═══════════════════════════════════════════════════════')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Conexão Supabase
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Auditoria
    try {
      await supabase.from('webhook_logs').insert({
        received_at: new Date().toISOString(),
        raw_payload: rawPayload,
        parsed_payload: payload,
        event_type: payload.event || 'unknown',
        processing_status: 'started'
      })
    } catch (logError) {
      console.log('⚠️ Tabela webhook_logs não encontrada (continuando)')
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EXTRAÇÃO INTELIGENTE DE DADOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    let email: string | null = null
    let name: string | null = null
    let eduzzId: string | null = null
    let status: string | null = null
    let productId: string | null = null

    // FORMATO REAL EDUZZ (baseado nas screenshots)
    if (payload.buyer?.email) {
      email = payload.buyer.email?.trim().toLowerCase()
      name = payload.buyer.name?.trim() || 'Novo Assinante'
      eduzzId = payload.id?.toString()
      status = payload.status?.toLowerCase()
      productId = payload.producer?.id?.toString() || SENIORFIT_PRODUCT_ID
      
      console.log('✅ Formato detectado: EDUZZ REAL')
    }
    // FORMATO ALTERNATIVO (cus_email, cus_name)
    else if (payload.cus_email) {
      email = payload.cus_email?.trim().toLowerCase()
      name = payload.cus_name?.trim() || 'Novo Assinante'
      eduzzId = payload.trans_cod || payload.id?.toString()
      status = payload.trans_status?.toLowerCase() || 'paid'
      productId = payload.product_id || SENIORFIT_PRODUCT_ID
      
      console.log('✅ Formato detectado: EDUZZ ALTERNATIVO')
    }
    // FORMATO DE TESTE (trans_email)
    else if (payload.trans_email) {
      email = payload.trans_email?.trim().toLowerCase()
      name = payload.cus_name?.trim() || 'Teste Manual'
      eduzzId = payload.trans_id || 'test'
      status = 'paid'
      productId = SENIORFIT_PRODUCT_ID
      
      console.log('✅ Formato detectado: TESTE MANUAL')
    }

    console.log('📋 Dados extraídos:')
    console.log(`   Email: ${email || '❌ NÃO ENCONTRADO'}`)
    console.log(`   Nome: ${name || '❌ NÃO ENCONTRADO'}`)
    console.log(`   Eduzz ID: ${eduzzId || '❌ NÃO ENCONTRADO'}`)
    console.log(`   Status: ${status || '❌ NÃO ENCONTRADO'}`)
    console.log(`   Product ID: ${productId || '❌ NÃO ENCONTRADO'}`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FILTRO DE PRODUTO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if (productId && productId !== SENIORFIT_PRODUCT_ID) {
      console.log(`⚠️ Produto ignorado: ${productId} (não é SeniorFit)`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Produto ignorado (não é SeniorFit)',
          product_id: productId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // VALIDAÇÃO DE EMAIL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if (!email || !email.includes('@')) {
      console.error('❌ Email inválido ou ausente')
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email não encontrado no payload',
          payload_keys: Object.keys(payload)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // VERIFICAR SE JÁ EXISTE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log('🔍 Verificando se usuário existe:', email)
    
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (fetchError) {
      console.error('❌ Erro ao buscar usuário:', fetchError)
      throw new Error(`Erro no SELECT: ${fetchError.message}`)
    }

    if (existingUser) {
      // ═══ ATUALIZAR EXISTENTE ═══
      console.log('👤 Usuário já existe - atualizando')
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          name: name,
          role: 'SUBSCRIBER',
          subscription_status: 'ACTIVE',
          eduzz_id: eduzzId,
          eduzz_status: status?.toUpperCase(),
          eduzz_last_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
      
      if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError)
        throw new Error(`Erro no UPDATE: ${updateError.message}`)
      }

      console.log('✅ Usuário atualizado com sucesso')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuário atualizado',
          email: email,
          action: 'updated'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else {
      // ═══ CRIAR NOVO ASSINANTE ═══
      console.log('➕ Criando novo assinante')
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ETAPA 1: CRIAR NO AUTH
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      const tempPassword = `Senior${Math.random().toString(36).slice(-10)}!Fit`
      console.log('🔐 Criando no Auth...')

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          eduzz_id: eduzzId,
          created_via: 'eduzz_webhook'
        }
      })

      if (authError) {
        console.error('❌ Erro no Auth:', authError)
        throw new Error(`Erro no Auth: ${authError.message}`)
      }

      if (!authData || !authData.user || !authData.user.id) {
        throw new Error('Auth retornou resposta inválida')
      }

      const userId = authData.user.id
      console.log('✅ Criado no Auth - ID:', userId)

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ETAPA 2: CRIAR PERFIL
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      console.log('📝 Criando perfil...')

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,  // 🎯 ID do Auth
          email: email,
          name: name,
          role: 'SUBSCRIBER',
          subscription_status: 'ACTIVE',
          eduzz_id: eduzzId,
          eduzz_status: status?.toUpperCase(),
          eduzz_last_update: new Date().toISOString()
        })

      if (profileError) {
        console.error('❌ Erro ao criar perfil:', profileError)
        
        // ROLLBACK
        try {
          await supabase.auth.admin.deleteUser(userId)
          console.log('✅ Rollback executado')
        } catch (rollbackError) {
          console.error('❌ Falha no rollback:', rollbackError)
        }
        
        throw new Error(`Erro no INSERT: ${profileError.message}`)
      }

      console.log('✅ Perfil criado com sucesso')

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ETAPA 3: BUSCAR CONFIGURAÇÕES DE EMAIL (AGORA COM PRIVATE KEY)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      console.log('⚙️ Buscando configurações de EmailJS...')

      const { data: settings } = await supabase
        .from('system_settings')
        .select('emailjs_service_id, emailjs_public_key, emailjs_private_key, emailjs_template_welcome, app_url')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single()

      if (!settings || !settings.emailjs_service_id) {
        console.warn('⚠️ EmailJS não configurado - pulando envio')
      } else {
        console.log('✅ Configurações encontradas')
        console.log('   Service ID:', settings.emailjs_service_id)
        console.log('   Template ID:', settings.emailjs_template_welcome)
        console.log('   Private Key Presente:', !!settings.emailjs_private_key)

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ETAPA 4: ENVIAR EMAIL DE BOAS-VINDAS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        try {
          console.log('📧 Enviando email de boas-vindas...')

          const emailPayload = {
            service_id: settings.emailjs_service_id,
            template_id: settings.emailjs_template_welcome,
            user_id: settings.emailjs_public_key,
            accessToken: settings.emailjs_private_key, // 🎯 CHAVE PRIVADA PARA ENVIO SERVER-SIDE
            template_params: {
              to_email: email,
              to_name: name,
              temp_password: tempPassword,
              app_url: settings.app_url || 'https://seniorfit.com',
              product_name: 'SeniorFit 2.0 - Sistema Inteligente de Avaliação Geriátrica'
            }
          }

          // Nota: Não logamos o payload inteiro aqui para não vazar a Private Key nos logs
          console.log('📤 Enviando requisição para EmailJS API...')

          const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
          })

          if (emailResponse.ok) {
            console.log('✅ Email enviado com sucesso!')
          } else {
            const errorText = await emailResponse.text()
            console.error('❌ Erro ao enviar email:', emailResponse.status, errorText)
          }

        } catch (emailError) {
          console.error('❌ Exceção ao enviar email:', emailError)
          // Não falha o webhook se email falhar
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SUCESSO FINAL
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      console.log('═══════════════════════════════════════════════════════')
      console.log('🎉 ONBOARDING CONCLUÍDO COM SUCESSO')
      console.log('═══════════════════════════════════════════════════════')
      console.log('User ID:', userId)
      console.log('Email:', email)
      console.log('Nome:', name)
      console.log('Eduzz ID:', eduzzId)
      console.log('Email de boas-vindas:', settings?.emailjs_service_id ? 'Enviado' : 'Pulado')
      console.log('═══════════════════════════════════════════════════════\n')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Assinante criado e email enviado',
          email: email,
          name: name,
          user_id: userId,
          action: 'created'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('🚨 ERRO CRÍTICO NO WEBHOOK')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Mensagem:', error.message)
    console.error('Stack:', error.stack)
    console.error('Payload RAW:', rawPayload)
    console.error('═══════════════════════════════════════════════════════\n')

    if (supabase) {
      try {
        await supabase.from('webhook_logs').insert({
          received_at: new Date().toISOString(),
          raw_payload: rawPayload,
          processing_status: 'error',
          error_message: error.message
        })
      } catch {}
    }

    // SEMPRE retornar 200 para não bloquear webhook na Eduzz
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})