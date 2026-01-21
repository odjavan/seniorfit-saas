import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { authService } from '../services/authService';
import { IntegrationSettings } from '../types';
import { Save, Copy, Mail, DollarSign, Settings, Bot, Key, Eye, EyeOff, AlertTriangle } from 'lucide-react';
// CORREÇÃO: Caminho correto é ../contexts (plural)
import { useToast } from '../contexts/ToastContext';

interface IntegrationsProps {
  activeView?: 'integrations' | 'eduzz' | 'crm';
}

// CORREÇÃO: Exportação nomeada para satisfazer o App.tsx existente
export const Integrations: React.FC<IntegrationsProps> = ({ activeView = 'integrations' }) => {
  const [settings, setSettings] = useState<IntegrationSettings>({
    emailjs: { serviceId: '', templateIdRecovery: '', templateIdWelcome: '', publicKey: '' },
    eduzz: { webhookUrl: '', liveKey: '', appUrl: '' },
    gemini: { apiKey: '' }
  });
  
  const [activeTab, setActiveTab] = useState<'eduzz' | 'emailjs' | 'gemini'>('eduzz');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const [eduzzStats, setEduzzStats] = useState({
    activeSubscribers: 0,
    estimatedRevenue: 0,
    pendingPayments: 0
  });

  const [simEmail, setSimEmail] = useState('cliente@teste.com');
  const [simStatus, setSimStatus] = useState('3');

  useEffect(() => {
    if (activeView === 'eduzz') setActiveTab('eduzz');
    else if (activeView === 'crm') setActiveTab('emailjs');
    else if (activeView === 'integrations') setActiveTab('gemini');
  }, [activeView]);

  useEffect(() => {
    const initData = async () => {
      try {
        const data = await authService.getIntegrationSettings();
        setSettings(data);
        await calculateStats();
      } catch (error) {
        console.error("Erro ao inicializar integrações:", error);
        addToast("Erro ao carregar configurações.", "error");
      }
    };
    initData();
  }, []);

  const calculateStats = async () => {
    try {
      const users = await authService.getAllUsers();
      
      if (!Array.isArray(users)) return;

      const subscribers = users.filter(u => u.role === 'SUBSCRIBER');
      const active = subscribers.filter(u => u.subscriptionStatus === 'active');
      const pending = subscribers.filter(u => u.subscriptionStatus === 'pending');
      const revenue = active.length * 29.90;

      setEduzzStats({
        activeSubscribers: active.length,
        estimatedRevenue: revenue,
        pendingPayments: pending.length
      });
    } catch (e) {
      console.error("Erro ao calcular estatísticas", e);
    }
  };

  const handleChange = (section: 'emailjs' | 'eduzz' | 'gemini', field: string, value: string) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [section]: {
          // @ts-ignore
          ...prev[section],
          [field]: value
        }
      };
      if (section === 'eduzz' && field === 'appUrl') {
        const baseUrl = value.replace(/\/$/, '');
        newSettings.eduzz.webhookUrl = value ? `${baseUrl}/api/webhooks/eduzz` : '';
      }
      return newSettings;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authService.updateIntegrationSettings(settings);
      addToast('Configurações salvas e persistidas no Banco de Dados!', 'success');
      
      // Pequeno delay para garantir propagação antes do reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      addToast(`Erro ao salvar: ${error.message}`, 'error');
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('URL copiada para a área de transferência', 'info');
  };

  const handleSimulateWebhook = () => {
    const transId = Math.floor(Math.random() * 1000000).toString();
    const payload = {
      cus_name: simEmail.split('@')[0],
      cus_email: simEmail,
      cus_taxnumber: "123.456.789-00",
      cus_cel: "11999999999",
      chk_status: simStatus,
      trans_cod: transId 
    };

    try {
      const result = authService.simulateEduzzWebhook(payload);
      addToast(`Webhook Simulado: Sucesso para ${result.user.email}`, 'success');
      calculateStats();
    } catch (error: any) {
      addToast(`Erro Webhook: ${error.message}`, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center">
             <Settings className="mr-3 text-gray-700" /> Central de Integrações
           </h1>
           <p className="text-gray-600 mt-1">Conecte o SeniorFit a serviços externos, configure IA e automatize fluxos.</p>
        </div>
        <Button onClick={handleSave} variant="blue" isLoading={isSaving}>
          <Save size={18} className="mr-2" /> {isSaving ? 'SALVANDO...' : 'SALVAR NO BANCO'}
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
        <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-4">
           <nav className="space-y-2">
             <button 
               onClick={() => setActiveTab('eduzz')}
               className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                 activeTab === 'eduzz' ? 'bg-white text-yellow-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-white hover:text-gray-900'
               }`}
             >
               <DollarSign size={18} className="mr-3" /> Eduzz Hub
             </button>
             <button 
               onClick={() => setActiveTab('emailjs')}
               className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                 activeTab === 'emailjs' ? 'bg-white text-purple-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-white hover:text-gray-900'
               }`}
             >
               <Mail size={18} className="mr-3" /> CRM & Notificações
             </button>
             <button 
               onClick={() => setActiveTab('gemini')}
               className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                 activeTab === 'gemini' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-white hover:text-gray-900'
               }`}
             >
               <Bot size={18} className="mr-3" /> Inteligência Artificial
             </button>
           </nav>
        </div>

        <div className="flex-1 p-8 overflow-y-auto max-h-[800px]">
          {/* EDUZZ */}
          {activeTab === 'eduzz' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                 <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><DollarSign size={28} /></div>
                 <div><h2 className="text-xl font-bold text-gray-900">Eduzz Hub Financeiro</h2></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                   <p className="text-xs font-bold text-green-800 uppercase">Receita (Estimada)</p>
                   <h3 className="text-2xl font-black text-gray-900 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eduzzStats.estimatedRevenue)}</h3>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                   <p className="text-xs font-bold text-blue-800 uppercase">Assinaturas Ativas</p>
                   <h3 className="text-2xl font-black text-gray-900 mt-1">{eduzzStats.activeSubscribers}</h3>
                </div>
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                   <p className="text-xs font-bold text-yellow-800 uppercase">Pendentes</p>
                   <h3 className="text-2xl font-black text-gray-900 mt-1">{eduzzStats.pendingPayments}</h3>
                </div>
              </div>
              <div className="space-y-4">
                <Input label="URL do Aplicativo (ex: https://seu-app.coolify.io)" value={settings.eduzz.appUrl} onChange={(e) => handleChange('eduzz', 'appUrl', e.target.value)} />
                <div className="bg-gray-900 rounded-xl p-6 text-white">
                   <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Webhook URL (Copie e cole na Eduzz)</label>
                   <div className="flex items-center gap-2 bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <code className="flex-1 text-sm font-mono text-green-400 break-all">{settings.eduzz.webhookUrl || 'Configure a URL do Aplicativo acima...'}</code>
                      <button onClick={() => copyToClipboard(settings.eduzz.webhookUrl)} className="p-2 hover:bg-gray-700 rounded-md"><Copy size={18} /></button>
                   </div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-8 mt-8">
                 <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><AlertTriangle className="mr-2 text-yellow-500" /> Simulador de Webhook</h3>
                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Input label="E-mail Teste" value={simEmail} onChange={(e) => setSimEmail(e.target.value)} />
                       <div>
                         <label className="block text-sm font-bold text-gray-900 mb-1">Status</label>
                         <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900" value={simStatus} onChange={(e) => setSimStatus(e.target.value)}>
                           <option value="3">3 - Paga</option>
                           <option value="1">1 - Aberta</option>
                           <option value="7">7 - Cancelada</option>
                         </select>
                       </div>
                    </div>
                    <Button onClick={handleSimulateWebhook} variant="secondary" className="w-full justify-center">DISPARAR WEBHOOK FAKE</Button>
                 </div>
              </div>
            </div>
          )}

          {/* EMAILJS */}
          {activeTab === 'emailjs' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                 <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Mail size={28} /></div>
                 <div><h2 className="text-xl font-bold text-gray-900">CRM & Notificações</h2></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Input label="Service ID" value={settings.emailjs.serviceId} onChange={(e) => handleChange('emailjs', 'serviceId', e.target.value)} />
                 <Input label="Public Key" value={settings.emailjs.publicKey} onChange={(e) => handleChange('emailjs', 'publicKey', e.target.value)} />
                 <Input label="Template ID (Recuperação)" value={settings.emailjs.templateIdRecovery} onChange={(e) => handleChange('emailjs', 'templateIdRecovery', e.target.value)} />
                 <Input label="Template ID (Boas-vindas)" value={settings.emailjs.templateIdWelcome} onChange={(e) => handleChange('emailjs', 'templateIdWelcome', e.target.value)} />
              </div>
            </div>
          )}

          {/* GEMINI */}
          {activeTab === 'gemini' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Bot size={28} /></div>
                 <div><h2 className="text-xl font-bold text-gray-900">Inteligência Artificial (Gemini)</h2></div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Key size={18} className="mr-2 text-indigo-600" /> Google Gemini API Key</h3>
                 <div className="space-y-2 relative">
                    <Input 
                      label="Chave de API" 
                      type={showGeminiKey ? "text" : "password"}
                      placeholder="Cole sua chave aqui..." 
                      value={settings.gemini.apiKey}
                      onChange={(e) => handleChange('gemini', 'apiKey', e.target.value)}
                    />
                    <button type="button" onClick={() => setShowGeminiKey(!showGeminiKey)} className="absolute right-3 top-[32px] text-gray-500 hover:text-gray-700">
                      {showGeminiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};