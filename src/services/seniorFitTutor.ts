import { GoogleGenerativeAI } from '@google/generative-ai';
import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';

/**
 * Configuração do Gemini com tratamento de erros 429 (Quota Exceeded)
 */

interface TutorConfig {
  apiKey: string
  model?: string
  maxRetries?: number
  fallbackMessage?: string
}

interface TutorResponse {
  success: boolean
  text?: string
  error?: string
  quotaExceeded?: boolean
}

export class SeniorFitTutor {
  private genAI: GoogleGenerativeAI | null = null
  private model: any = null
  private config: TutorConfig
  private requestCount = 0
  private lastRequestTime = 0
  private readonly RATE_LIMIT_DELAY = 2000 // 2 segundos entre requests

  constructor(config: TutorConfig) {
    this.config = {
      model: 'gemini-2.0-flash-exp',
      maxRetries: 2,
      fallbackMessage: 'Desculpe, o limite de uso da IA foi atingido. Tente novamente mais tarde.',
      ...config
    }

    if (!this.config.apiKey || this.config.apiKey === 'Presente') {
      console.warn('⚠️ API Key do Gemini não configurada')
      return
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.config.apiKey)
      this.model = this.genAI.getGenerativeModel({ 
        model: this.config.model!
      })
      console.log('✅ SeniorFit Tutor IA inicializado')
      console.log('   Modelo:', this.config.model)
    } catch (error) {
      console.error('❌ Erro ao inicializar Gemini:', error)
    }
  }

  /**
   * Rate limiting simples
   */
  private async enforceRateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest
      console.log(`⏳ Aguardando ${waitTime}ms (rate limit)...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * Enviar pergunta ao Tutor IA
   */
  async ask(question: string, context?: string): Promise<TutorResponse> {
    if (!this.model) {
      return {
        success: false,
        error: 'Tutor IA não está configurado. Verifique a chave API no painel de Integrações.',
        quotaExceeded: false
      }
    }

    if (!question || question.trim().length < 3) {
      return {
        success: false,
        error: 'Pergunta muito curta. Digite uma pergunta mais específica.',
        quotaExceeded: false
      }
    }

    console.log('═══════════════════════════════════════')
    console.log('🤖 SeniorFit Tutor IA')
    console.log('Pergunta:', question)
    console.log('Contexto:', context || 'nenhum')
    console.log('═══════════════════════════════════════')

    // Aplicar rate limiting
    await this.enforceRateLimit()

    // Incrementar contador de requests
    this.requestCount++

    // Construir prompt com contexto
    const fullPrompt = this.buildPrompt(question, context)

    // Tentar com retry
    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${this.config.maxRetries}`)
        
        const result = await this.model.generateContent(fullPrompt)
        const response = await result.response
        const text = response.text()

        if (!text || text.trim().length === 0) {
          throw new Error('Resposta vazia da IA')
        }

        console.log('✅ Resposta recebida')
        console.log('   Tamanho:', text.length, 'caracteres')
        console.log('═══════════════════════════════════════')

        return {
          success: true,
          text: text,
          quotaExceeded: false
        }

      } catch (error: any) {
        console.error(`❌ Tentativa ${attempt} falhou:`, error)

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // TRATAMENTO ESPECÍFICO DE ERRO 429 (QUOTA EXCEEDED)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('429')) {
          console.error('🚫 Quota do Google Gemini excedida')
          
          return {
            success: false,
            error: this.config.fallbackMessage,
            quotaExceeded: true
          }
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // TRATAMENTO DE OUTROS ERROS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        if (error.status === 404) {
          return {
            success: false,
            error: 'Modelo Gemini não encontrado. Verifique se está usando gemini-2.0-flash-exp',
            quotaExceeded: false
          }
        }

        if (error.status === 401 || error.status === 403) {
          return {
            success: false,
            error: 'Chave API inválida. Verifique a configuração no painel de Integrações.',
            quotaExceeded: false
          }
        }

        if (error.message?.includes('SAFETY')) {
          return {
            success: false,
            error: 'Sua pergunta foi bloqueada por questões de segurança. Reformule de forma mais apropriada.',
            quotaExceeded: false
          }
        }

        // Se não for o último attempt, aguardar antes de tentar novamente
        if (attempt < this.config.maxRetries!) {
          const backoffDelay = attempt * 3000 // 3s, 6s, 9s...
          console.log(`⏳ Aguardando ${backoffDelay}ms antes de tentar novamente...`)
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
        }
      }
    }

    // Se todas as tentativas falharam
    console.error('═══════════════════════════════════════')
    console.error('🚨 Todas as tentativas falharam')
    console.error('═══════════════════════════════════════')

    return {
      success: false,
      error: 'Não foi possível obter resposta da IA após várias tentativas. Tente novamente em alguns minutos.',
      quotaExceeded: false
    }
  }

  /**
   * Construir prompt com contexto
   */
  private buildPrompt(question: string, context?: string): string {
    const systemPrompt = `Você é o SeniorFit Tutor, um assistente especializado em saúde e exercícios para idosos.

Suas responsabilidades:
- Fornecer orientações seguras e baseadas em evidências sobre exercícios para terceira idade
- Explicar benefícios de atividades físicas adaptadas
- Sugerir modificações de exercícios para diferentes níveis de mobilidade
- Alertar sobre precauções e contraindicações
- Incentivar a consulta com profissionais de saúde quando necessário

IMPORTANTE: 
- Seja claro, acessível e empático
- Use linguagem simples e direta
- Sempre priorize a segurança do idoso
- Não substitua orientação médica profissional`

    let fullPrompt = systemPrompt + '\n\n'

    if (context) {
      fullPrompt += `Contexto do usuário:\n${context}\n\n`
    }

    fullPrompt += `Pergunta do usuário:\n${question}\n\nResposta:`

    return fullPrompt
  }

  /**
   * Verificar status da API
   */
  getStatus() {
    return {
      initialized: this.model !== null,
      requestCount: this.requestCount,
      model: this.config.model
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hook React para usar o Tutor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useSeniorFitTutor = (apiKey: string) => {
  const [tutor, setTutor] = useState<SeniorFitTutor | null>(null)
  const [loading, setLoading] = useState(false)
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    if (apiKey && apiKey !== 'Presente') {
      const tutorInstance = new SeniorFitTutor({ apiKey })
      setTutor(tutorInstance)
    }
  }, [apiKey])

  const ask = async (question: string, context?: string) => {
    if (!tutor) {
      addToast('Configure a chave API do Gemini primeiro', 'error')
      return null
    }

    setLoading(true)
    setQuotaExceeded(false)

    const response = await tutor.ask(question, context)

    setLoading(false)

    if (response.quotaExceeded) {
      setQuotaExceeded(true)
      addToast('Limite de uso da IA atingido. Tente novamente mais tarde.', 'error')
    } else if (!response.success) {
      addToast(response.error || 'Erro ao consultar IA', 'error')
    }

    return response
  }

  return {
    ask,
    loading,
    quotaExceeded,
    status: tutor?.getStatus() || { initialized: false, requestCount: 0 }
  }
}