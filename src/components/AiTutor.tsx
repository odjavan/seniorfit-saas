
import React, { useState, useEffect, useRef } from 'react';
import { Patient } from '../types';
import { X, Send, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { useSeniorFitTutor } from '../services/seniorFitTutor';

interface AiTutorProps {
  patient: Patient;
  observations: string; // Recebe as notas do laudo
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AiTutor: React.FC<AiTutorProps> = ({ patient, observations, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Hook do Tutor
  const { ask, loading: isThinking, quotaExceeded } = useSeniorFitTutor(apiKey);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Carrega API Key ao abrir
  useEffect(() => {
    if (isOpen && !apiKey) {
      fetchApiKey();
    }
  }, [isOpen]);

  // Inicia a conversa com análise automática ao ter a chave
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

    // Fallback para variáveis de ambiente (dev)
    if (process.env.API_KEY) setApiKey(process.env.API_KEY.trim());
  };

  // --- Função de Coleta de Contexto ---
  const getPatientContext = () => {
     // Formata o histórico de testes mais recentes
     const recentTests = patient.history
       ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
       .slice(0, 8) // Pega os 8 mais recentes
       .map(h => `- ${h.testName}: Resultado ${h.score} | Classificação: ${h.classification} (${new Date(h.date).toLocaleDateString('pt-BR')})`)
       .join('\n');

     return `
IDENTIFICAÇÃO:
Nome: ${patient.name}
Idade: ${patient.age} anos
Sexo: ${patient.sex === 'M' ? 'Masculino' : 'Feminino'}
IMC: ${patient.bmi} (Peso: ${patient.weight}kg, Altura: ${patient.height}m)

RESULTADOS DOS TESTES (Histórico Recente):
${recentTests || "Nenhum teste registrado ainda."}

TRIAGEM INICIAL:
${JSON.stringify(patient.screening || {}, null, 2)}

OBSERVAÇÕES DO PROFISSIONAL (Notas Atuais):
"${observations || 'Nenhuma observação inserida pelo profissional.'}"
      `.trim();
  };

  const initChatSummary = async () => {
    const context = getPatientContext();
    const prompt = `Analise os resultados desta avaliação e forneça um resumo executivo de 3 pontos principais sobre a condição funcional deste idoso.`;

    const response = await ask(prompt, context);
    
    if (response?.success && response.text) {
      setMessages(prev => [...prev, { role: 'model', text: response.text! }]);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    
    // 1. Exibe mensagem do usuário
    setMessages(prev => [...prev, { role: 'user', text }]);
    
    // 2. Coleta contexto atualizado (incluindo notas que podem ter mudado)
    const context = getPatientContext();

    // 3. Chama IA
    const response = await ask(text, context);

    if (response?.success && response.text) {
      setMessages(prev => [...prev, { role: 'model', text: response.text! }]);
    } else if (response?.quotaExceeded) {
       setMessages(prev => [...prev, { role: 'model', text: '⚠️ Limite de uso atingido. Tente novamente em breve.' }]);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[450px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 animate-slide-in-right font-sans">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-lg backdrop-blur-sm">
               <Bot size={24} className="text-indigo-300" />
            </div>
            <div>
               <h3 className="font-bold text-base flex items-center gap-2">
                 AI Tutor <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-[10px] text-indigo-200 border border-indigo-500/40">BETA</span>
               </h3>
               <p className="text-xs text-gray-300 flex items-center">
                 <Sparkles size={10} className="mr-1 text-yellow-300" /> Especialista em Geriatria
               </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 chat-scroll" ref={scrollRef}>
          {!apiKey && (
             <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 flex gap-3">
               <AlertCircle size={20} className="shrink-0" />
               <div>
                 <strong>Chave API Ausente</strong>
                 <p className="mt-1 text-xs">Vá em Integrações para configurar sua chave Gemini e ativar o tutor.</p>
               </div>
             </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {isThinking && (
            <div className="flex justify-start">
               <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex gap-3 items-center">
                 <div className="flex gap-1 h-3 items-center">
                   <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                   <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                   <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                 </div>
                 <span className="text-xs text-gray-500 font-medium">Analisando dados clínicos...</span>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
           <div className="relative">
             <textarea
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               placeholder={quotaExceeded ? "Limite atingido..." : "Ex: O que sugere para melhorar o equilíbrio?"}
               className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm shadow-sm transition-all disabled:opacity-60"
               rows={2}
               disabled={isThinking || quotaExceeded || !apiKey}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSend();
                 }
               }}
             />
             <button 
                onClick={handleSend} 
                disabled={!inputText.trim() || isThinking || quotaExceeded || !apiKey} 
                className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm hover:shadow"
             >
               <Send size={18} />
             </button>
           </div>
           <p className="text-[10px] text-center text-gray-400 mt-2">
             IA auxiliar. Sempre use seu julgamento clínico profissional.
           </p>
        </div>
      </div>
    </>
  );
};
