import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { authService } from '../services/authService';
import { emailService } from '../services/emailService';
import { User } from '../types';
import { ShieldCheck } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isHuman, setIsHuman] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  // Recovery Modal State
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  const isFormValid = email.length > 0 && password.length > 0 && isHuman;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError('');
    setIsLoading(true);

    try {
      const user = await authService.login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao fazer login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    
    // Verificação local de usuário
    const users = authService.getAllUsers();
    const userExists = users.find(u => u.email.toLowerCase() === recoveryEmail.toLowerCase());

    if (!userExists) {
      addToast('E-mail não encontrado no sistema. Verifique a digitação.', 'warning');
      return;
    }

    setIsSendingRecovery(true);
    
    try {
      await emailService.sendRecovery(recoveryEmail);
      addToast(`Instruções enviadas para ${recoveryEmail}`, 'success');
      setIsRecoveryOpen(false);
      setRecoveryEmail('');
    } catch (error: any) {
      console.error('Falha na Recuperação:', error);
      const msg = error.message || '';
      if (msg.includes('Configurações')) {
        addToast('Sistema de e-mail não configurado pelo Admin.', 'error');
      } else {
        addToast(`Erro ao enviar: ${msg}`, 'error');
      }
    } finally {
      setIsSendingRecovery(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-gray-900 text-white p-3 rounded-xl shadow-lg">
             <ShieldCheck size={40} />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          SeniorFit
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Acesso Profissional Seguro
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <div>
              <Input
                label="Senha"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end mt-1">
                <button 
                  type="button"
                  onClick={() => setIsRecoveryOpen(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <ShieldCheck size={16} className="mr-2 text-gray-500" />
                Confirmo que sou humano
              </span>
              <button
                type="button"
                onClick={() => setIsHuman(!isHuman)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  isHuman ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={isHuman}
              >
                <span className="sr-only">Sou humano</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isHuman ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-100">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Acesso Negado</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button type="submit" fullWidth isLoading={isLoading} disabled={!isFormValid}>
                {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-medium">Versão 1.16 (Master)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isRecoveryOpen}
        onClose={() => setIsRecoveryOpen(false)}
        title="Recuperação de Acesso"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Digite seu e-mail abaixo. Enviaremos um link seguro para redefinição de senha via <strong>EmailJS</strong>.
          </p>
          
          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            <Input
              label="E-mail cadastrado"
              type="email"
              placeholder="exemplo@seniorfit.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              required
            />
            
            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsRecoveryOpen(false)} className="mr-2">
                Cancelar
              </Button>
              <Button type="submit" variant="blue" isLoading={isSendingRecovery}>
                Enviar Instruções
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
