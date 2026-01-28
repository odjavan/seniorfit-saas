
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { User as UserIcon, Mail, Shield, CreditCard, Save } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';

interface ProfilePageProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdate }) => {
  const [name, setName] = useState(user.name);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('O nome não pode estar vazio.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      // Chama o serviço para atualizar Auth Metadata e Tabela Profiles
      await authService.updateProfileName(user.id, name);
      
      // Atualiza o estado global no App.tsx para refletir no Header imediatamente
      const updatedUser = { ...user, name: name };
      onUserUpdate(updatedUser);
      
      addToast('Perfil atualizado com sucesso!', 'success');
    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'Erro ao atualizar perfil.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <UserIcon className="mr-3 text-gray-700" /> Meu Perfil
        </h1>
        <p className="text-gray-600 mt-1">Visualize e edite seus dados de cadastro.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cabeçalho do Card */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold border-2 border-white shadow-sm">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
             <h2 className="text-xl font-bold text-gray-900">{name}</h2>
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
               {user.role}
             </span>
          </div>
        </div>

        {/* Corpo do Card */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Campo Nome (Editável) */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start gap-4">
               <div className="p-2 bg-gray-50 rounded-lg text-gray-500 mt-1">
                 <UserIcon size={20} />
               </div>
               <div className="flex-1">
                 <Input 
                    label="Nome Completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                 />
               </div>
            </div>

            {/* Campo Email (Somente Leitura) */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start gap-4">
               <div className="p-2 bg-gray-50 rounded-lg text-gray-500 mt-1">
                 <Mail size={20} />
               </div>
               <div className="flex-1">
                 <p className="block text-sm font-bold text-gray-900 mb-2">E-mail de Acesso</p>
                 <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 text-sm">
                   {user.email}
                 </div>
                 <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado.</p>
               </div>
            </div>

            {/* Campo Função (Extra - Somente Leitura) */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start gap-4">
               <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                 <Shield size={20} />
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nível de Acesso</p>
                 <p className="text-base font-medium text-gray-900 mt-1 capitalize">{user.role.toLowerCase()}</p>
               </div>
            </div>

            {/* Status Assinatura (Se existir) */}
            {user.subscriptionStatus && (
              <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start gap-4">
                 <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                   <CreditCard size={20} />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Status da Assinatura</p>
                   <p className={`text-base font-medium mt-1 uppercase ${user.subscriptionStatus === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                     {user.subscriptionStatus}
                   </p>
                 </div>
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
            <div className="mt-0.5"><Shield size={16} /></div>
            <div>
              <p className="font-bold mb-1">Nota de Segurança:</p>
              <p>
                Para alterar sua senha ou dados sensíveis como CPF, entre em contato com o suporte ou utilize a opção "Esqueci minha senha" na tela de login.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button type="submit" variant="blue" isLoading={isLoading} disabled={name === user.name}>
               <Save size={18} className="mr-2" /> Salvar Alterações
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
