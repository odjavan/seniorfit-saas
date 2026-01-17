import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { authService } from '../services/authService';
import { IntegrationSettings } from '../types';
import { Save, Copy, Check, Mail, DollarSign, Settings, Zap, PlayCircle, AlertTriangle, Bot } from 'lucide-react';

export const Integrations: React.FC = () => {
  const [settings, setSettings] = useState<IntegrationSettings>({
    emailjs: { serviceId: '', templateIdRecovery: '', templateIdWelcome: '', publicKey: '' },
    eduzz: { webhookUrl: '', liveKey: '', appUrl: '' },
    gemini: { apiKey: '' }
  });
  const [activeTab, setActiveTab] = useState<'eduzz' | 'emailjs' | 'gemini'>('eduzz');
  const [copied, setCopied] = useState(false);

  // Simulation State
  const [simEmail, setSimEmail] = useState('cliente@teste.com');
  const [simStatus, setSimStatus] = useState('3');

  useEffect(() => {
    setSettings(authService.getIntegrationSettings());
  }, []);

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

      // Dynamic Webhook URL Update logic
      if (section === 'eduzz' && field === 'appUrl') {
        const baseUrl = value.replace(/\/$/, ''); // Remove trailing slash
        newSettings.eduzz.webhookUrl = value ? `${baseUrl}/api/webhooks/eduzz` : '';
      }

      return newSettings;
    });
  };

  const handleSave = () => {
    authService.updateIntegrationSettings(settings);
    alert('Configurações de integração salvas com sucesso!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateWebhook = () => {
    // Generate random transaction ID for simulation
    const transId = Math.floor(Math.random() * 1000000).toString();
    
    const payload = {
      cus_name: simEmail.split('@')[0],
      cus_email: simEmail,
      cus_taxnumber: "123.456.789-00",
      cus_cel: "11999999999",
      chk_status: simStatus,
      trans_cod: transId // Eduzz Transaction Code
    };

    try {
      const result = authService.simulateEduzzWebhook(payload);
      if (result.action === 'created') {
        alert(`SUCESSO: Assinante criado!\n\nNome: ${result.user.name}\nLogin: ${result.user.email}\nSenha: 12345678900 (CPF)\nEduzz ID: ${transId}`);
      } else {
        alert(`SUCESSO: Assinante atualizado!\nStatus: ${result.user.subscriptionStatus}`);
      }
    } catch (error: any) {
      alert(`ERRO WEBHOOK: ${error.message}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center">
             <Settings className="mr-3 text-gray-700" /> Central de Integrações
           </h1>
           <p className="text-gray-600 mt-1">Conecte o SeniorFit a serviços externos e automatize fluxos.</p>
        </div>
        <Button onClick={handleSave} variant="blue">
          <Save size={18} className="mr-2" /> SALVAR ALTERAÇÕES
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-4">
           <nav className="space-y-2">
             <button 
               onClick={() => setActiveTab('eduzz')}
               className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                 activeTab === 'eduzz' 
                 ? 'bg-white text-yellow-600 shadow-sm border border-gray-200' 
                 : 'text-gray-600 hover:bg-white hover:text-gray-900'
               }`}
             >
               <DollarSign size={18} className="mr-3" /> Eduzz Hub
             </button>
             <button 
               onClick={() => setActiveTab('emailjs')}
               className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                 activeTab === 'emailjs' 
                 ? 'bg-white text-purple-600 shadow-sm border border-gray-200' 
                 : 'text-gray-600 hover:bg-white hover:text-gray-900'
               }`}
             >
               <Mail size={18} className="mr-3" /> Email & CRM
             </button>
             <button 
               onClick={() => setActiveTab('gemini')}
               className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                 activeTab === 'gemini' 
                 ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' 
                 : 'text-gray-600 hover:bg-white hover:text-gray-900'
               }`}
             >
               <Bot size={18} className="mr-3" /> Inteligência Artificial
             </button>
           </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8">
          
          {/* EDUZZ SETTINGS */}
          {activeTab === 'eduzz' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                 <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                   <DollarSign size={28} />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-gray-900">Integração Eduzz</h2>
                   <p className="text-sm text-gray-500">Configuração de Webhooks e Chaves de API.</p>
                 </div>
              </div>

              {/* Webhook Configuration */}
              <div className="space-y-4">
                <Input 
                  label="URL do Aplicativo (Sua Instalação)" 
                  placeholder="Ex: https://app.seniorfit.com" 
                  value={settings.eduzz.appUrl}
                  onChange={(e) => handleChange('eduzz', 'appUrl', e.target.value)}
                />
                
                {/* Dynamic Webhook Box */}
                <div className="bg-gray-900 rounded-xl p-6 text-white">
                   <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Zap size={18} className="text-yellow-400" /> Webhook Endpoint
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Copie esta URL e configure na Eduzz para receber notificações.
                        </p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <code className="flex-1 text-sm font-mono text-green-400 break-all">
                        {settings.eduzz.webhookUrl || 'Configure a URL do Aplicativo acima...'}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(settings.eduzz.webhookUrl)}
                        disabled={!settings.eduzz.webhookUrl}
                        className="p-2 hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-white disabled:opacity-50"
                        title="Copiar URL"
                      >
                        {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                      </button>
                   </div>
                </div>

                <Input 
                  label="Eduzz Live Key (API Key)" 
                  placeholder="Cole sua chave de API aqui (Opcional)..." 
                  value={settings.eduzz.liveKey}
                  onChange={(e) => handleChange('eduzz', 'liveKey', e.target.value)}
                />
              </div>

              {/* Simulation Tool */}
              <div className="border-t border-gray-200 pt-8 mt-8">
                 <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <AlertTriangle className="mr-2 text-yellow-500" /> Simulador de Webhook
                 </h3>
                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                    <p className="text-sm text-gray-600">
                      Simule o recebimento de um evento de venda da Eduzz para testar a automação.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Input 
                         label="E-mail do Cliente (Teste)"
                         value={simEmail}
                         onChange={(e) => setSimEmail(e.target.value)}
                       />
                       <div>
                         <label className="block text-sm font-bold text-gray-900 mb-1">Status da Fatura (chk_status)</label>
                         <select 
                           className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                           value={simStatus}
                           onChange={(e) => setSimStatus(e.target.value)}
                         >
                           <option value="3">3 - Paga (Aprovada)</option>
                           <option value="1">1 - Aberta</option>
                           <option value="7">7 - Cancelada</option>
                         </select>
                       </div>
                    </div>
                    <Button onClick={handleSimulateWebhook} variant="secondary" className="w-full justify-center">
                      <PlayCircle size={18} className="mr-2" /> DISPARAR WEBHOOK FAKE
                    </Button>
                 </div>
              </div>
            </div>
          )}

          {/* EMAILJS SETTINGS */}
          {activeTab === 'emailjs' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                 <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                   <Mail size={28} />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-gray-900">EmailJS & Notificações</h2>
                   <p className="text-sm text-gray-500">Automação de e-mails transacionais.</p>
                 </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
                <p>
                  <strong>Dica:</strong> Crie uma conta em <a href="https://www.emailjs.com/" target="_blank" rel="noreferrer" className="underline font-bold hover:text-blue-900">emailjs.com</a>, configure um serviço (Gmail/Outlook) e crie os templates antes de preencher abaixo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Input 
                    label="Service ID" 
                    placeholder="ex: service_x9d8s7" 
                    value={settings.emailjs.serviceId}
                    onChange={(e) => handleChange('emailjs', 'serviceId', e.target.value)}
                 />
                 <Input 
                    label="Public Key" 
                    placeholder="ex: user_A8s7d89as7d98" 
                    value={settings.emailjs.publicKey}
                    onChange={(e) => handleChange('emailjs', 'publicKey', e.target.value)}
                 />
                 <Input 
                    label="Template ID (Recuperação de Senha)" 
                    placeholder="ex: template_recovery" 
                    value={settings.emailjs.templateIdRecovery}
                    onChange={(e) => handleChange('emailjs', 'templateIdRecovery', e.target.value)}
                 />
                 <Input 
                    label="Template ID (Boas-vindas)" 
                    placeholder="ex: template_welcome" 
                    value={settings.emailjs.templateIdWelcome}
                    onChange={(e) => handleChange('emailjs', 'templateIdWelcome', e.target.value)}
                 />
              </div>
            </div>
          )}

          {/* GEMINI SETTINGS */}
          {activeTab === 'gemini' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                   <Bot size={28} />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-gray-900">Inteligência Artificial (Gemini)</h2>
                   <p className="text-sm text-gray-500">Configuração do Tutor IA e Análise Clínica.</p>
                 </div>
              </div>

              <div className="space-y-4">
                <Input 
                  label="Gemini API Key" 
                  type="password"
                  placeholder="Cole sua chave API aqui..." 
                  value={settings.gemini?.apiKey || ''}
                  onChange={(e) => handleChange('gemini', 'apiKey', e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  A chave é armazenada apenas localmente no navegador por segurança.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};