import React from 'react';
import { User } from '../types';
import { User as UserIcon, Mail, Shield, CreditCard } from 'lucide-react';

interface ProfilePageProps {
  user: User;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <UserIcon className="mr-3 text-gray-700" /> Meu Perfil
        </h1>
        <p className="text-gray-600 mt-1">Visualize seus dados de cadastro.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cabeçalho do Card */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold border-2 border-white shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
             <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
               {user.role}
             </span>
          </div>
        </div>

        {/* Corpo do Card */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Campo Nome */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start gap-4">
               <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                 <UserIcon size={20} />
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nome Completo</p>
                 <p className="text-base font-medium text-gray-900 mt-1">{user.name}</p>
               </div>
            </div>

            {/* Campo Email */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start gap-4">
               <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                 <Mail size={20} />
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">E-mail de Acesso</p>
                 <p className="text-base font-medium text-gray-900 mt-1">{user.email}</p>
               </div>
            </div>

            {/* Campo Função (Extra) */}
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
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-bold mb-1">Nota Informativa:</p>
            <p>
              Para alterar sua senha ou atualizar dados cadastrais sensíveis, entre em contato com o suporte ou utilize a opção "Esqueci minha senha" na tela de login.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};