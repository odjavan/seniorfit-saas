import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authService } from '../services/authService';
import { useCreateSubscriber, subscriberService } from '../services/subscriberService';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Search, Plus, Edit, Shield, Lock } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export const Subscribers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();
  
  // Hook do novo serviço de criação blindado
  const { createSubscriber, loading: isCreating } = useCreateSubscriber();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '', 
    role: 'SUBSCRIBER' as Role,
    cpf: '',
    eduzzId: '',
    subscriptionStatus: 'active' as 'active' | 'pending' | 'cancelled'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Mantemos o authService para leitura (listagem)
      const data = await authService.getSubscribers();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Erro ao carregar assinantes", error);
      setUsers([]);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '', 
        role: user.role,
        cpf: user.cpf || '',
        eduzzId: user.eduzzId || '',
        subscriptionStatus: user.subscriptionStatus || 'active'
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'SUBSCRIBER',
        cpf: '',
        eduzzId: '',
        subscriptionStatus: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingUser) {
        // Atualização usando o novo subscriberService
        const updateData = {
          ...editingUser,
          name: formData.name,
          cpf: formData.cpf,
          eduzzId: formData.eduzzId,
          subscriptionStatus: formData.subscriptionStatus
        };
        await subscriberService.updateSubscriber(updateData);
        addToast('Assinante atualizado com sucesso!', 'success');
      } else {
        // Criação usando o Hook Blindado (Auth + Profile + Rollback)
        if (!formData.password || formData.password.length < 6) {
           addToast('A senha é obrigatória e deve ter pelo menos 6 caracteres.', 'warning');
           setIsLoading(false);
           return;
        }

        await createSubscriber({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          cpf: formData.cpf,
          eduzzId: formData.eduzzId
        });
        
        addToast('Novo assinante criado e vinculado com sucesso!', 'success');
      }
      setIsModalOpen(false);
      loadUsers(); 
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = status?.toLowerCase();
    switch(s) {
      case 'active': return <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">ATIVO</span>;
      case 'pending': return <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">PENDENTE</span>;
      case 'cancelled': return <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800">CANCELADO</span>;
      default: return <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">--</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Assinantes</h1>
          <p className="text-gray-600 mt-1">Controle de acesso e status financeiro.</p>
        </div>
        <Button onClick={() => handleOpenModal()} variant="blue">
          <Plus size={20} className="mr-2" /> Novo Assinante
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex items-center gap-4">
        <div className="p-3 bg-white rounded-lg shadow-sm text-blue-600">
           <Shield size={24} />
        </div>
        <div>
           <p className="text-sm font-bold text-blue-900">Eduzz Integration</p>
           <p className="text-sm text-blue-700">Monitorando webhooks em tempo real.</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={20} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 sm:text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assinante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Financeiro</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eduzz ID</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.cpf && <div className="text-xs text-gray-400">CPF: {user.cpf}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.subscriptionStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {user.eduzzId || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleOpenModal(user)} className="text-blue-600 hover:text-blue-900">
                    <Edit size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Editar Assinante" : "Novo Assinante"}
      >
        <form onSubmit={handleSave} className="space-y-4">
           <Input 
             label="Nome Completo" 
             value={formData.name} 
             onChange={e => setFormData({...formData, name: e.target.value})} 
             required 
           />
           <Input 
             label="E-mail" 
             type="email" 
             value={formData.email} 
             onChange={e => setFormData({...formData, email: e.target.value})} 
             required 
             disabled={!!editingUser}
           />
           
           {!editingUser && (
              <div className="relative">
                <Input 
                  label="Senha de Acesso" 
                  type="password" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  placeholder="Mínimo 6 caracteres"
                  required 
                />
                <Lock size={16} className="absolute right-3 top-[34px] text-gray-400" />
              </div>
           )}

           <div className="grid grid-cols-2 gap-4">
             <Input 
               label="CPF" 
               value={formData.cpf} 
               onChange={e => setFormData({...formData, cpf: e.target.value})} 
             />
             <Input 
               label="Eduzz Transaction ID" 
               value={formData.eduzzId} 
               onChange={e => setFormData({...formData, eduzzId: e.target.value})} 
             />
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-gray-900 mb-1">Status</label>
               <input 
                 className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 cursor-not-allowed sm:text-sm"
                 value="Ativo"
                 disabled
               />
               <p className="text-xs text-gray-400 mt-1">Definido como ACTIVE por padrão.</p>
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-900 mb-1">Função</label>
               <input 
                 className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 cursor-not-allowed sm:text-sm"
                 value="Assinante"
                 disabled
               />
               <p className="text-xs text-gray-400 mt-1">Definido como SUBSCRIBER por padrão.</p>
             </div>
           </div>

           <div className="flex justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="mr-2">Cancelar</Button>
              <Button type="submit" variant="blue" isLoading={isLoading || isCreating}>
                 {isLoading || isCreating ? 'Salvando...' : 'Salvar'}
              </Button>
           </div>
        </form>
      </Modal>
    </div>
  );
};