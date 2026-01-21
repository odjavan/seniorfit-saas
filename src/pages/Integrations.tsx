import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { toast } from 'react-hot-toast'; // Ou o componente de alerta que seu APP usa

const Integrations = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    gemini_api_key: '',
    emailjs_service_id: '',
    emailjs_public_key: '',
    emailjs_template_welcome: '',
    emailjs_template_recovery: '',
    app_url: ''
  });

  // 1. CARREGAR DADOS: Busca as informações assim que a página abre
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await authService.getIntegrationSettings();
        if (data) {
          setSettings({
            gemini_api_key: data.gemini_api_key || '',
            emailjs_service_id: data.emailjs_service_id || '',
            emailjs_public_key: data.emailjs_public_key || '',
            emailjs_template_welcome: data.emailjs_template_welcome || '',
            emailjs_template_recovery: data.emailjs_template_recovery || '',
            app_url: data.app_url || ''
          });
        }
      } catch (error) {
        console.error("Falha ao carregar configurações");
      }
    }
    loadSettings();
  }, []);

  // 2. SALVAR DADOS: Envia para o motor gravar no Supabase
  const handleSave = async () => {
    setLoading(true);
    try {
      await authService.updateIntegrationSettings(settings);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Central de Integrações</h1>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'SALVAR TUDO'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* URL DO APP */}
        <div className="bg-white p-4 rounded shadow">
          <label className="block text-sm font-medium mb-1">URL do Aplicativo</label>
          <input 
            type="text"
            className="w-full border p-2 rounded"
            value={settings.app_url}
            onChange={(e) => setSettings({...settings, app_url: e.target.value})}
            placeholder="http://seu-app.io"
          />
        </div>

        {/* GEMINI */}
        <div className="bg-white p-4 rounded shadow">
          <label className="block text-sm font-medium mb-1">Google Gemini API Key</label>
          <input 
            type="password"
            className="w-full border p-2 rounded"
            value={settings.gemini_api_key}
            onChange={(e) => setSettings({...settings, gemini_api_key: e.target.value})}
          />
        </div>

        {/* EMAILJS */}
        <div className="bg-white p-4 rounded shadow md:col-span-2">
          <h2 className="font-bold mb-4">Configurações EmailJS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              placeholder="Service ID"
              className="border p-2 rounded"
              value={settings.emailjs_service_id}
              onChange={(e) => setSettings({...settings, emailjs_service_id: e.target.value})}
            />
            <input 
              placeholder="Public Key"
              className="border p-2 rounded"
              value={settings.emailjs_public_key}
              onChange={(e) => setSettings({...settings, emailjs_public_key: e.target.value})}
            />
            <input 
              placeholder="Template ID (Boas-vindas)"
              className="border p-2 rounded"
              value={settings.emailjs_template_welcome}
              onChange={(e) => setSettings({...settings, emailjs_template_welcome: e.target.value})}
            />
            <input 
              placeholder="Template ID (Recuperação)"
              className="border p-2 rounded"
              value={settings.emailjs_template_recovery}
            onChange={(e) => setSettings({...settings, emailjs_template_recovery: e.target.value})}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;