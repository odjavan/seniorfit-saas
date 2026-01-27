
import { supabase } from '../lib/supabase';
import { SystemSettings } from '../types';

const SYSTEM_SETTINGS_ID = '00000000-0000-0000-0000-000000000000';
const BUCKET_NAME = 'branding_assets';

export const brandingService = {
  getBrandingSettings: async (): Promise<Partial<SystemSettings>> => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('app_name, app_logo_url')
        .eq('id', SYSTEM_SETTINGS_ID)
        .single();

      if (error) throw error;

      return {
        appName: data.app_name || '',
        appLogoUrl: data.app_logo_url || ''
      };
    } catch (error) {
      console.error('Erro ao buscar configurações de marca:', error);
      return { appName: '', appLogoUrl: '' };
    }
  },

  uploadLogo: async (file: File): Promise<string> => {
    try {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        throw new Error('O arquivo deve ser uma imagem.');
      }

      // Validar tamanho (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('A imagem deve ter no máximo 2MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Erro no upload do logo:', error);
      throw new Error('Falha ao fazer upload da imagem: ' + error.message);
    }
  },

  updateBrandingSettings: async (settings: { appName?: string; appLogoUrl?: string }): Promise<void> => {
    const payload: any = { id: SYSTEM_SETTINGS_ID };
    
    if (settings.appName !== undefined) payload.app_name = settings.appName;
    if (settings.appLogoUrl !== undefined) payload.app_logo_url = settings.appLogoUrl;

    const { error } = await supabase
      .from('system_settings')
      .upsert(payload);

    if (error) throw new Error('Erro ao salvar configurações: ' + error.message);
  }
};
