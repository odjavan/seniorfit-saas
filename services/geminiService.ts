import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

let chatSession: Chat | null = null;

const getClient = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is not set");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const initializeChat = (): void => {
  try {
    const ai = getClient();
    chatSession = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are 'SeniorFit Coach', a warm, encouraging, and knowledgeable health companion for seniors. 
        Your goal is to provide safe, low-impact exercise advice, nutrition tips, and motivation. 
        - Always prioritize safety. Advise users to consult doctors before major lifestyle changes.
        - Keep language simple, large, and clear. Avoid jargon.
        - Be empathetic and positive.
        - Keep responses concise (under 100 words) unless asked for details.`,
      },
    });
  } catch (error) {
    console.error("Failed to initialize chat:", error);
  }
};

export const sendMessageToCoach = async (message: string): Promise<string> => {
  if (!chatSession) {
    initializeChat();
  }

  if (!chatSession) {
     return "I'm having trouble connecting right now. Please check your API key.";
  }

  try {
    const response: GenerateContentResponse = await chatSession.sendMessage({ message });
    return response.text || "I didn't catch that. Could you say it again?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm sorry, I encountered an issue. Please try again later.";
  }
};