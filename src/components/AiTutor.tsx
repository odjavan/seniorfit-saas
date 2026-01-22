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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

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

  // Função robusta para pegar a chave (Banco > Env)
  const getApiKey = async (): Promise<string> => {
    try {
      // 1. Tenta buscar do banco (Settings)
      const settings = await authService.getIntegrationSettings();
      if (settings.gemini?.apiKey && settings.gemini.apiKey.length > 5) {
        return settings.gemini.apiKey.trim();
      }
    } catch (e) {
      console.warn("Falha ao buscar chave no banco, tentando ENV.", e);
    }

    // 2. Tenta variáveis de ambiente
    if (process.env.API_KEY) return process.env.API_KEY.trim();
    if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY.trim();

    return '';
  };

  const initChat = async () => {
    setIsLoading(true);
    
    // PASSO CRÍTICO 1: Resolver a chave antes de tudo
    const apiKey = await getApiKey();
    
    // PASSO CRÍTICO 2: Log de diagnóstico
    console.log('Chave final utilizada:', apiKey ? 'Presente' : 'AUSENTE');

    if (!apiKey) {
      setMessages([{ 
        role: 'model', 
        text: 'ERRO: API Key não configurada. Por favor, vá em "Integrações" no painel e adicione sua chave do Google AI Studio.' 
      }]);
      setIsLoading(false);
      return;
    }

    try {
      // Inicialização segura
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Configuração limpa para Gemini 2.0 (sem apiVersion que quebra o TS)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash" 
      });

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
        Analise os dados deste aluno e faça um breve resumo da condição funcional (máximo 3 linhas). 
        Destaque pontos de atenção (sarcopenia, risco de quedas, etc) se houver. Responda em Português do Brasil.
        
        DADOS:
        ${context}
      `;
      
      const result = await model.generateContent(initialPrompt);
      const response = await result.response;
      const text = response.text();
      
      if (text) {
        setMessages(prev => [...prev, { role: 'model', text }]);
      }
    } catch (err: any) {
      console.error("🚨 [Tutor IA] ERRO CRÍTICO:", err);
      
      let errorMsg = "Desculpe, tive um problema técnico ao conectar com a IA.";
      if (err.message?.includes('403') || err.message?.includes('API key')) {
        errorMsg = "Erro de Permissão: Verifique se sua chave API é válida.";
      } else if (err.message?.includes('404')) {
        errorMsg = "Erro de Modelo: O modelo gemini-2.0-flash pode não estar disponível para sua chave/região ainda.";
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageToGemini = async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    const apiKey = await getApiKey();
    
    if (!apiKey) {
        setMessages(prev => [...prev, { role: 'model', text: "Erro: Chave de API perdida." }]);
        setIsLoading(false);
        return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Configuração limpa para Gemini 2.0
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash" 
      });
      
      const systemInstruction = `
        Você é o SeniorFit AI Tutor. Ajude o treinador a interpretar os resultados e sugira condutas práticas. 
        Seja técnico e baseie-se no ACSM/NSCA. 
        Você não diagnostica doenças e não faz alterações no sistema.
        Se o aluno relatar patologias (ex: artrose), cruze com os dados funcionais para sugerir adaptações seguras.
        Responda sempre em Português do Brasil.
      `;

      const result = await model.generateContent(`${systemInstruction}\n\nTreinador pergunta: ${text}`);
      const response = await result.response;
      const responseText = response.text();
      
      if (responseText) {
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }
    } catch (err: any) {
      console.error("🚨 [Tutor IA] ERRO NA RESPOSTA:", err);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "Erro ao processar sua pergunta. Tente novamente." 
      }]);
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
                   <span className="text-xs text-gray-400">Analisando...</span>
                 </div>
               </div>
            </div>
          )}
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
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSend();
                 }
               }}
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
             IA pode cometer erros. Consulte diretrizes oficiais de saúde.
           </p>
        </div>
      </div>
    </>
  );
};