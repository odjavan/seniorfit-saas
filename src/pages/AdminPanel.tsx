import React, { useState, useEffect } from 'react';
import { User, SystemSettings, Role } from '../types';
import { authService } from '../services/authService';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Trash2, Edit, Plus, Save, Youtube } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ howToInstallVideoUrl: '' });
  const { addToast } = useToast();
  
  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'TRAINER' as Role });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setUsers(authService.getAllUsers());
    setSettings(authService.getSettings());
  };

  // --- Settings Logic ---

  const handleSaveSettings = () => {
    authService.updateSettings(settings);
    addToast('Configurações salvas com sucesso!', 'success');
  };

  const convertToEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  };

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, howToInstallVideoUrl: e.target.value });
  };

  // --- User Logic ---

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({ name: user.name, email: user.email, role: user.role });
    } else {
      setEditingUser(null);
      setUserForm({ name: '', email: '', role: 'TRAINER' });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        authService.updateUser({ ...editingUser, ...userForm });
        addToast('Usuário atualizado com sucesso!', 'success');
      } else {
        authService.createUser(userForm);
        addToast('Usuário criado com sucesso!', 'success');
      }
      setIsUserModalOpen(false);
      loadData();
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
      try {
        authService.deleteUser(id);
        loadData();
        addToast('Usuário removido.', 'success');
      } catch (error: any) {
        addToast(error.message, 'error');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Painel Administrativo</h1>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'users' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Gerenciar Usuários
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'settings' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Configurações do Sistema
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => handleOpenUserModal()} variant="blue">
              <Plus size={18} className="mr-2" /> Novo Usuário
            </Button>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenUserModal(user)} className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit size={18} />
                      </button>
                      {user.role !== 'ADMIN' && (
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Youtube className="mr-2 text-red-600" /> Vídeo de Instrução
              </h3>
              <Input
                label="URL do Vídeo (YouTube)"
                placeholder="Ex: https://www.youtube.com/watch?v=..."
                value={settings.howToInstallVideoUrl}
                onChange={handleVideoUrlChange}
              />
              <p className="text-xs text-gray-500 mt-2">
                Cole o link completo do vídeo. O sistema converterá automaticamente para o formato de incorporação.
              </p>
            </div>

            {settings.howToInstallVideoUrl && (
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  className="w-full h-64 rounded-lg"
                  src={convertToEmbedUrl(settings.howToInstallVideoUrl)}
                  title="Video Preview"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button onClick={handleSaveSettings} variant="blue">
                <Save size={18} className="mr-2" /> Salvar Configurações
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <Input
            label="Nome Completo"
            value={userForm.name}
            onChange={e => setUserForm({ ...userForm, name: e.target.value })}
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={userForm.email}
            onChange={e => setUserForm({ ...userForm, email: e.target.value })}
            required
            disabled={!!editingUser}
          />
          
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">Função</label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 sm:text-sm"
              value={userForm.role}
              onChange={e => setUserForm({ ...userForm, role: e.target.value as Role })}
            >
              <option value="TRAINER">Treinador</option>
              <option value="PERSONAL">Personal</option>
              <option value="ADMIN">Administrador</option>
              <option value="SUBSCRIBER">Assinante</option>
            </select>
          </div>

          {!editingUser && (
             <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
               Senha padrão para novos usuários: <strong>123456</strong>
             </p>
          )}

          <div className="flex justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsUserModalOpen(false)} className="mr-2">Cancelar</Button>
            <Button type="submit" variant="blue">Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
