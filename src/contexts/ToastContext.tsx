import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextData {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((state) => [...state, { id, message, type }]);

    // Auto remove após 4 segundos
    setTimeout(() => {
      setToasts((state) => state.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((state) => state.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start p-4 rounded-lg shadow-xl border-l-4 transition-all duration-300 animate-slide-in-right bg-white
              ${toast.type === 'success' ? 'border-green-500' : ''}
              ${toast.type === 'error' ? 'border-red-500' : ''}
              ${toast.type === 'warning' ? 'border-yellow-500' : ''}
              ${toast.type === 'info' ? 'border-blue-500' : ''}
            `}
          >
            <div className="mr-3 mt-0.5">
              {toast.type === 'success' && <CheckCircle size={20} className="text-green-500" />}
              {toast.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
              {toast.type === 'warning' && <AlertTriangle size={20} className="text-yellow-500" />}
              {toast.type === 'info' && <Info size={20} className="text-blue-500" />}
            </div>
            <div className="flex-1">
               <p className={`text-sm font-medium ${
                 toast.type === 'success' ? 'text-green-800' :
                 toast.type === 'error' ? 'text-red-800' :
                 toast.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
               }`}>
                 {toast.type === 'success' ? 'Sucesso' : toast.type === 'error' ? 'Erro' : toast.type === 'warning' ? 'Atenção' : 'Info'}
               </p>
               <p className="text-sm text-gray-600 mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="ml-3 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
