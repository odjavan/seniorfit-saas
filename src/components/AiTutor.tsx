import React, { useState, useEffect, useRef } from 'react';
import { Patient } from '../types';
import { X, Send, Bot, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authService } from '../services/authService';

interface AiTutorProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AiTutor: React.FC<AiTutorProps> = ({ patient, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Acesso seguro à chave API (Prioridade: Settings do Admin > Env Var)
  const getApiKey = () => {
    try {
      const settings = authService.getIntegrationSettings();
      if (settings.gemini?.apiKey) return settings.gemini.apiKey;
      return import.meta.env.VITE_GEMINI_API_KEY || '';
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && !hasInitialized) {
      initChat();
      setHasInitialized(true);
    }
  }, [isOpen]);

  const initChat = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setMessages([{ role: 'model', text: 'Chave API não encontrada. Configure no Painel Admin ou no arquivo .env.' }]);
      return;
    }

    setIsLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const context = `
        PACIENTE ATUAL:
        Nome: ${patient.name}
        Idade: ${patient.age} anos
        Sexo: ${patient.sex}
        IMC: ${patient.bmi}
        
        TRIAGEM FUNCIONAL:
        ${JSON.stringify(patient.screening || {})}

        HISTÓRICO DE TESTES (Últimos Resultados):
        ${patient.history?.slice(0, 10).map(h => `- ${h.testName}: ${h.score} (${h.classification})`).join('\n') || "Nenhum teste registrado."}
      `;

      const initialPrompt = `
        Analise os dados deste paciente e faça um breve resumo da condição funcional (máximo 3 linhas). 
        Destaque pontos de atenção (sarcopenia, risco de quedas, etc) se houver. Responda em Português do Brasil.
        
        DADOS:
        ${context}
      `;
      
      const result = await model.generateContent(initialPrompt);
      const response = await result.response;
      const text = response.text();
      
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (err: any) {
      console.error("Erro Detalhado Gemini (Init):", err);
      setMessages(prev => [...prev, { role: 'model', text: "Erro ao iniciar o Tutor. Verifique a conexão ou a API Key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageToGemini = async (text: string) => {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'model', text: "Chave API não encontrada." }]);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const systemInstruction = `
        Você é o SeniorFit AI Tutor. Ajude o treinador a interpretar os resultados e sugira condutas práticas. 
        Seja técnico e baseie-se no ACSM/NSCA. 
        Você não diagnostica doenças e não faz alterações no sistema.
        Se o usuário relatar patologias (ex: artrose), cruze com os dados funcionais para sugerir adaptações seguras.
        Responda sempre em Português do Brasil.
      `;

      // Simulação de histórico enviando contexto + histórico recente no prompt (versão stateless simplificada para estabilidade)
      const promptToSend = `${systemInstruction}\n\nTreinador pergunta: ${text}`;

      const result = await model.generateContent(promptToSend);
      const response = await result.response;
      const responseText = response.text();
      
      if (responseText) {
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }
    } catch (err: any) {
      console.error("Erro Detalhado Gemini:", err);
      setMessages(prev => [...prev, { role: 'model', text: "Erro ao processar solicitação." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    sendMessageToGemini(text);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 animate-slide-in-right">
        <div className="p-4 bg-gray-900 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
               <Bot size={20} className="text-white" />
            </div>
            <div>
               <h3 className="font-bold text-sm">SeniorFit Tutor IA</h3>
               <p className="text-xs text-indigo-200 flex items-center">
                 <Sparkles size={10} className="mr-1" /> {patient.name.split(' ')[0]}
               </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 chat-scroll" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-3 shadow-sm">
                 <div className="flex gap-2 items-center">
                   <div className="flex gap-1">
                     <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                     <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                   </div>
                   <span className="text-xs text-gray-400">Digitando...</span>
                 </div>
               </div>
            </div>
          )}
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs">{error}</div>}
        </div>

        <div className="p-4 bg-white border-t border-gray-200">
           <div className="relative">
             <textarea
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               placeholder="Pergunte sobre exercícios ou riscos..."
               className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 resize-none text-sm shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
               rows={2}
               disabled={isLoading}
               readOnly={isLoading}
             />
             <button 
                onClick={handleSend} 
                disabled={!inputText.trim() || isLoading} 
                className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
             >
               <Send size={16} />
             </button>
           </div>
           <p className="text-[10px] text-center text-gray-400 mt-2">
             IA pode cometer erros. Verifique informações médicas importantes.
           </p>
        </div>
      </div>
    </>
  );
};