import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

let chatSession: ChatSession | null = null;

const getClient = (): GoogleGenerativeAI => {
  // Vite env vars must be prefixed with VITE_ or accessed via import.meta.env
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is not set in environment variables");
    // We don't throw here to allow the UI to handle the missing key gracefully if needed
  }
  return new GoogleGenerativeAI(apiKey);
};

export const initializeChat = async (): Promise<void> => {
  try {
    const genAI = getClient();
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