import { GoogleGenerativeAI } from "@google/generative-ai";

// Recupera a chave API EXCLUSIVAMENTE do armazenamento local do usuário
// NENHUMA dependência de import.meta.env
const getApiKey = (): string => {
  try {
    const stored = localStorage.getItem('sf_integrations');
    if (stored) {
      const settings = JSON.parse(stored);
      // Retorna a chave do objeto salvo ou string vazia
      return settings.gemini?.apiKey?.trim() || '';
    }
  } catch (e) {
    console.error("Erro ao ler configuração de integração", e);
  }
  return '';
};

export const sendMessageToCoach = async (message: string): Promise<string> => {
  const apiKey = getApiKey();

  // Validação estrita
  if (!apiKey || apiKey.length < 5) {
     return "Chave não configurada";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const systemInstruction = `
      Você é o 'SeniorFit Coach', um assistente especializado em saúde e exercícios para idosos.
      Seja encorajador, use linguagem clara e simples.
      Priorize a segurança.
      Responda de forma concisa em Português do Brasil.
    `;

    const prompt = `${systemInstruction}\n\nUsuário: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('403')) {
        return "Erro de Autenticação: Sua chave API parece inválida. Verifique em 'Integrações'.";
    }
    
    return "Desculpe, o Tutor IA está indisponível no momento. Tente novamente mais tarde.";
  }
};