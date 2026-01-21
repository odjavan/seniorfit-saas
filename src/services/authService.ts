import { supabase } from '../lib/supabase';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

export const authService = {
  // --- FUNÇÕES DE CONFIGURAÇÃO (Novas) ---
  async getIntegrationSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateIntegrationSettings(settings: any) {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        id: SETTINGS_ID,
        ...settings,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
  },

  // --- FUNÇÕES VITAIS RESTAURADAS (O Cérebro do APP) ---
  async login(credentials: any) {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return { ...user, ...data };
  },

  async getAllUsers() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: any) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteUser(id: string) {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  }
};