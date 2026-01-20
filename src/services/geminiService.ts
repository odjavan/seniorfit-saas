import { GoogleGenerativeAI } from "@google/generative-ai";

// Recupera a chave API diretamente do armazenamento de Integrações
// Ignora variáveis de ambiente para garantir que a chave do usuário (painel) seja a única fonte de verdade.
const getApiKey = (): string => {
  try {
    const stored = localStorage.getItem('sf_integrations');
    if (stored) {
      const settings = JSON.parse(stored);
      // Retorna a chave do objeto salvo ou string vazia
      const key = settings.gemini?.apiKey || '';
      return key.trim();
    }
  } catch (e) {
    console.error("Erro ao ler configuração de integração", e);
  }
  return '';
};

export const sendMessageToCoach = async (message: string): Promise<string> => {
  const apiKey = getApiKey();

  if (!apiKey || apiKey.length < 10) {
     return "⚠️ Chave API não configurada ou inválida. Por favor, vá em 'Integrações' e adicione sua Google Gemini API Key.";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Instrução de sistema leve injetada a cada request para garantir contexto
    const systemInstruction = `
      Você é o 'SeniorFit Coach', um assistente especializado em saúde e exercícios para idosos.
      Seja encorajador, use linguagem clara e simples (letra grande metaforicamente).
      Priorize a segurança. Se o usuário perguntar sobre dor, recomende médico.
      Responda de forma concisa (máx 3 parágrafos) em Português do Brasil.
    `;

    const prompt = `${systemInstruction}\n\nUsuário: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('403')) {
        return "Erro de Autenticação: Sua chave API parece inválida ou expirada. Verifique em 'Integrações'.";
    }
    
    return "Desculpe, o Tutor IA está indisponível no momento. Tente novamente mais tarde.";
  }
};