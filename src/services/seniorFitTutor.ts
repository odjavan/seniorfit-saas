
import { GoogleGenAI } from '@google/genai';
import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';

interface TutorConfig {
  apiKey: string
  model?: string
}

interface TutorResponse {
  success: boolean
  text?: string
  error?: string
  quotaExceeded?: boolean
}

export class SeniorFitTutor {
  private client: GoogleGenAI | null = null;
  private modelName: string;
  
  // Persona definida conforme solicitação
  private readonly SYSTEM_INSTRUCTION = `Você é um Fisioterapeuta e Educador Físico especialista em geriatria. 
Sua função é analisar os resultados de uma avaliação funcional de um idoso e fornecer insights técnicos, mas em linguagem clara, para o profissional que está aplicando o teste. 
Seja objetivo, encorajador e baseie-se estritamente nos dados fornecidos.
Não invente dados. Se uma informação faltar, mencione que seria útil tê-la.`;

  constructor(config: TutorConfig) {
    this.modelName = config.model || 'gemini-2.5-flash-lite-latest'; // Modelo rápido e eficiente para texto

    if (!config.apiKey || config.apiKey.length < 10) {
      console.warn('⚠️ API Key do Gemini inválida ou não configurada');
      return;
    }

    try {
      this.client = new GoogleGenAI({ apiKey: config.apiKey });
    } catch (error) {
      console.error('❌ Erro ao inicializar cliente Gemini:', error);
    }
  }

  /**
   * Enviar pergunta ao Tutor IA com contexto completo
   */
  async ask(question: string, context: string): Promise<TutorResponse> {
    if (!this.client) {
      return {
        success: false,
        error: 'Tutor IA não está configurado. Verifique a chave API no painel de Integrações.'
      };
    }

    try {
      // Montagem do Prompt com Injeção de Contexto
      const prompt = `
--- DADOS DA AVALIAÇÃO DO ALUNO ---
${context}
-----------------------------------

PERGUNTA DO PROFISSIONAL:
${question}
      `;

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction: this.SYSTEM_INSTRUCTION,
          temperature: 0.7, // Criatividade controlada para análises clínicas
        }
      });

      const text = response.text;

      if (!text) {
        throw new Error('Resposta vazia da IA');
      }

      return {
        success: true,
        text: text
      };

    } catch (error: any) {
      console.error('❌ Erro na requisição Gemini:', error);

      // Tratamento de erros comuns
      if (error.message?.includes('429') || error.status === 429) {
        return {
          success: false,
          error: 'Limite de requisições atingido. Aguarde um momento.',
          quotaExceeded: true
        };
      }

      return {
        success: false,
        error: 'Não foi possível analisar os dados no momento. Tente novamente.'
      };
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hook React para usar o Tutor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useSeniorFitTutor = (apiKey: string) => {
  const [tutor, setTutor] = useState<SeniorFitTutor | null>(null);
  const [loading, setLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (apiKey && apiKey.length > 10) {
      const tutorInstance = new SeniorFitTutor({ apiKey });
      setTutor(tutorInstance);
    }
  }, [apiKey]);

  const ask = async (question: string, context: string) => {
    if (!tutor) {
      addToast('Configure a chave API do Gemini nas Integrações.', 'error');
      return null;
    }

    setLoading(true);
    setQuotaExceeded(false);

    const response = await tutor.ask(question, context);

    setLoading(false);

    if (response.quotaExceeded) {
      setQuotaExceeded(true);
      addToast('Tutor IA sobrecarregado. Aguarde um instante.', 'warning');
    } else if (!response.success) {
      addToast(response.error || 'Erro na comunicação com a IA', 'error');
    }

    return response;
  };

  return {
    ask,
    loading,
    quotaExceeded
  };
};
