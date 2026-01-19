import { GoogleGenAI, Chat } from "@google/genai";

let chatSession: Chat | null = null;

export const initializeChat = async (): Promise<void> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    chatSession = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are 'SeniorFit Coach', a warm, encouraging, and knowledgeable health companion for seniors. Your goal is to provide safe, low-impact exercise advice, nutrition tips, and motivation. Always prioritize safety. Advise users to consult doctors before major lifestyle changes. Keep language simple, large, and clear. Avoid jargon. Be empathetic and positive. Keep responses concise (under 100 words) unless asked for details.",
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
    const result = await chatSession.sendMessage({ message });
    return result.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, encontrei um problema técnico. Tente novamente mais tarde.";
  }
};
import { GoogleGenAI, Chat } from "@google/genai";

let chatSession: Chat | null = null;

export const initializeChat = async (): Promise<void> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    chatSession = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are 'SeniorFit Coach', a warm, encouraging, and knowledgeable health companion for seniors. Your goal is to provide safe, low-impact exercise advice, nutrition tips, and motivation. Always prioritize safety. Advise users to consult doctors before major lifestyle changes. Keep language simple, large, and clear. Avoid jargon. Be empathetic and positive. Keep responses concise (under 100 words) unless asked for details.",
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
    const result = await chatSession.sendMessage({ message });
    return result.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, encontrei um problema técnico. Tente novamente mais tarde.";
  }
};
import { GoogleGenAI, Chat } from "@google/genai";

let chatSession: Chat | null = null;

export const initializeChat = async (): Promise<void> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    chatSession = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are 'SeniorFit Coach', a warm, encouraging, and knowledgeable health companion for seniors. Your goal is to provide safe, low-impact exercise advice, nutrition tips, and motivation. Always prioritize safety. Advise users to consult doctors before major lifestyle changes. Keep language simple, large, and clear. Avoid jargon. Be empathetic and positive. Keep responses concise (under 100 words) unless asked for details.",
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
    const result = await chatSession.sendMessage({ message });
    return result.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, encontrei um problema técnico. Tente novamente mais tarde.";
  }
};
