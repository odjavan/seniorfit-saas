import { supabase } from '../lib/supabase';

// ID fixo para garantir que sempre editaremos a mesma linha de configuração
const SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

export const authService = {
  // Busca as configurações do banco de dados
  async getIntegrationSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar configurações:', error);
      throw error;
    }
    return data;
  },

  // Salva ou Atualiza as configurações
  async updateIntegrationSettings(settings: any) {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: SETTINGS_ID,
        gemini_api_key: settings.gemini_api_key,
        emailjs_service_id: settings.emailjs_service_id,
        emailjs_public_key: settings.emailjs_public_key,
        emailjs_template_welcome: settings.emailjs_template_welcome,
        emailjs_template_recovery: settings.emailjs_template_recovery,
        app_url: settings.app_url,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar configurações:', error);
      throw error;
    }
    return data;
  }
};