
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { User as UserIcon, Mail, Shield, CreditCard, Save, Phone, FileText, MapPin, Loader2 } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

interface ProfilePageProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    cpf: user.cpf || '',
    phone: '',
    address: ''
  });
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  // Carrega dados complementares do perfil que podem não estar no objeto user básico
  useEffect(() => {
    const fetchProfileDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone, address, cpf, name')
          .eq('id', user.id)
          .single();

        if (data) {
          setFormData(prev => ({
            ...prev,
            name: data.name || prev.name,
            cpf: data.cpf || prev.cpf,
            phone: data.phone || '',
            address: data.address || ''
          }));
        }
      } catch (error) {
        console.error("Erro ao carregar detalhes do perfil", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchProfileDetails();
  }, [user.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('O nome não pode estar vazio.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Atualizar Tabela de Perfis (Dados de Negócio)
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ 
          name: formData.name,
          phone: formData.phone,
          cpf: formData.cpf,
          address: formData.address
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 2. Atualizar Metadados de Autenticação (Apenas Nome)
      // Isso garante que o nome no Header/Sessão seja atualizado imediatamente
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: formData.name, name: formData.name }
      });

      if (authError) console.warn("Aviso ao atualizar metadados de auth:", authError);
      
      // 3. Atualizar Estado Global do App
      const updatedUser = { 
        ...user, 
        name: formData.name, 
        cpf: formData.cpf 
      };
      onUserUpdate(updatedUser);
      
      addToast('Perfil atualizado com sucesso!', 'success');
    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'Erro ao atualizar perfil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-gray-500 text-sm">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <UserIcon className="mr-3 text-gray-700" /> Meu Perfil
        </h1>
        <p className="text-gray-600 mt-1">Visualize e edite seus dados pessoais e de contato.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cabeçalho do Card */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold border-2 border-white shadow-sm">
            {formData.name.charAt(0).toUpperCase()}
          </div>
          <div>
             <h2 className="text-xl font-bold text-gray-900">{formData.name}</h2>
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
               {user.role}
             </span>
          </div>
        </div>

        {/* Corpo do Card */}
        <div className="p-6 space-y-6">
          
          {/* Seção Pessoal */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">Dados Pessoais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-3 hover:border-gray-300 transition-colors">
                 <div className="p-2 bg-gray-50 rounded-lg text-gray-500 mt-1">
                   <UserIcon size={18} />
                 </div>
                 <div className="flex-1">
                   <Input 
                      label="Nome Completo"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Seu nome completo"
                      required
                   />
                 </div>
              </div>

              {/* CPF */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-3 hover:border-gray-300 transition-colors">
                 <div className="p-2 bg-gray-50 rounded-lg text-gray-500 mt-1">
                   <FileText size={18} />
                 </div>
                 <div className="flex-1">
                   <Input 
                      label="CPF"
                      value={formData.cpf}
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                      placeholder="000.000.000-00"
                   />
                 </div>
              </div>
            </div>
          </div>

          {/* Seção Contato */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">Contato e Endereço</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Telefone */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-3 hover:border-gray-300 transition-colors">
                 <div className="p-2 bg-gray-50 rounded-lg text-gray-500 mt-1">
                   <Phone size={18} />
                 </div>
                 <div className="flex-1">
                   <Input 
                      label="Telefone / WhatsApp"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                   />
                 </div>
              </div>

              {/* Email (Read Only) */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-3 bg-gray-50/50">
                 <div className="p-2 bg-gray-50 rounded-lg text-gray-500 mt-1">
                   <Mail size={18} />
                 </div>
                 <div className="flex-1">
                   <p className="block text-sm font-bold text-gray-900 mb-2">E-mail de Acesso</p>
                   <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-500 text-sm cursor-not-allowed">
                     {formData.email}
                   </div>
                 </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-3 hover:border-gray-300 transition-colors">
               <div className="p-2 bg-gray-50 rounded-lg text-gray-500 mt-1">
                 <MapPin size={18} />
               </div>
               <div className="flex-1">
                 <Input 
                    label="Endereço Completo"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                 />
               </div>
            </div>
          </div>

          {/* Seção Assinatura */}
          {user.subscriptionStatus && (
            <div className="space-y-4 pt-2">
               <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">Assinatura</h3>
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
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3 mt-4">
            <div className="mt-0.5"><Shield size={16} /></div>
            <div>
              <p className="font-bold mb-1">Nota de Segurança:</p>
              <p>
                O e-mail é sua chave única de acesso e não pode ser alterado por aqui. Caso necessite trocar, entre em contato com o suporte.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button type="submit" variant="blue" isLoading={isSaving}>
               <Save size={18} className="mr-2" /> Salvar Alterações
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
