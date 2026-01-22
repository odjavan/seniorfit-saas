import React, { useState, useEffect, useRef } from 'react';
import { Patient } from '../types';
import { X, Send, Bot, Sparkles } from 'lucide-react';
import { authService } from '../services/authService';
import { useSeniorFitTutor } from '../services/seniorFitTutor';

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
  const [apiKey, setApiKey] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Hook personalizado com gestão de erro 429 e rate limit
  const { ask, loading: isThinking, quotaExceeded } = useSeniorFitTutor(apiKey);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (isOpen && !apiKey) {
      fetchApiKey();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && apiKey && !hasInitialized) {
      initChatSummary();
      setHasInitialized(true);
    }
  }, [isOpen, apiKey]);

  const fetchApiKey = async () => {
    try {
      const settings = await authService.getIntegrationSettings();
      if (settings.gemini?.apiKey && settings.gemini.apiKey.length > 5) {
        setApiKey(settings.gemini.apiKey.trim());
        return;
      }
    } catch (e) {
      console.warn("Falha ao buscar chave no banco.");
    }

    if (process.env.API_KEY) setApiKey(process.env.API_KEY.trim());
    else if (import.meta.env.VITE_GEMINI_API_KEY) setApiKey(import.meta.env.VITE_GEMINI_API_KEY.trim());
  };

  const getPatientContext = () => {
     return `
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
  };

  const initChatSummary = async () => {
    const context = getPatientContext();
    const prompt = `Analise os dados deste aluno e faça um breve resumo da condição funcional (máximo 3 linhas). Destaque pontos de atenção (sarcopenia, risco de quedas, etc) se houver.`;

    const response = await ask(prompt, context);
    
    if (response?.success && response.text) {
      setMessages(prev => [...prev, { role: 'model', text: response.text! }]);
    } else if (response?.quotaExceeded) {
       setMessages(prev => [...prev, { role: 'model', text: '⚠️ O tutor está sobrecarregado (Limite de Cota). Tente novamente em instantes.' }]);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    
    setMessages(prev => [...prev, { role: 'user', text }]);
    
    const response = await ask(text);

    if (response?.success && response.text) {
      setMessages(prev => [...prev, { role: 'model', text: response.text! }]);
    } else if (response?.quotaExceeded) {
       setMessages(prev => [...prev, { role: 'model', text: '⚠️ Limite de uso atingido. Por favor, aguarde.' }]);
    }
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
          {!apiKey && (
             <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
               Chave de API não encontrada. Verifique as configurações.
             </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {isThinking && (
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
               placeholder={quotaExceeded ? "Limite atingido..." : "Pergunte sobre exercícios ou riscos..."}
               className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 resize-none text-sm shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
               rows={2}
               disabled={isThinking || quotaExceeded}
               readOnly={isThinking || quotaExceeded}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSend();
                 }
               }}
             />
             <button 
                onClick={handleSend} 
                disabled={!inputText.trim() || isThinking || quotaExceeded} 
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