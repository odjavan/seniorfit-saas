import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

let chatSession: ChatSession | null = null;

const getApiKey = (): string => {
  // Acesso seguro à variável de ambiente no Vite
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

export const initializeChat = async (): Promise<void> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY não encontrada nas variáveis de ambiente.");
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    chatSession = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "System Instruction: You are 'SeniorFit Coach', a warm, encouraging, and knowledgeable health companion for seniors. Your goal is to provide safe, low-impact exercise advice, nutrition tips, and motivation. Always prioritize safety. Advise users to consult doctors before major lifestyle changes. Keep language simple, large, and clear. Avoid jargon. Be empathetic and positive. Keep responses concise (under 100 words) unless asked for details." }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am SeniorFit Coach, ready to help with safe exercises and health tips for seniors." }],
        }
      ],
      generationConfig: {
        maxOutputTokens: 150,
      },
    });
  } catch (error) {
    console.error("Failed to initialize chat:", error);
  }
};

export const sendMessageToCoach = async (message: string): Promise<string> => {
  if (!chatSession) {
    await initializeChat();
  }

  if (!chatSession) {
     return "Estou com dificuldades para conectar agora. Por favor, verifique sua conexão ou a Chave API.";
  }

  try {
    const result = await chatSession.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, encontrei um problema técnico. Tente novamente mais tarde.";
  }
};