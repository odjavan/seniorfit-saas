import { supabase } from '../lib/supabase';
import { User, Role, SystemSettings, IntegrationSettings } from '../types';

const DEFAULT_SETTINGS: SystemSettings = {
  howToInstallVideoUrl: '',
};

const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  emailjs: { serviceId: '', templateIdRecovery: '', templateIdWelcome: '', publicKey: '' },
  eduzz: { webhookUrl: '', liveKey: '', appUrl: '' },
  gemini: { apiKey: '' }
};

export const authService = {
  // --- Auth Core ---

  login: async (email: string, password: string): Promise<User> => {
    // 1. Autenticação no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Usuário não encontrado.');

    // 2. Buscar perfil detalhado na tabela 'profiles'
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      // Fallback: Se o usuário existe no Auth mas não no Profile
      return {
        id: authData.user.id,
        email: authData.user.email!,
        name: 'Usuário',
        role: 'TRAINER',
        createdAt: new Date().toISOString(),
        subscriptionStatus: 'active'
      };
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as Role,
      createdAt: profile.created_at,
      subscriptionStatus: profile.subscription_status,
      cpf: profile.cpf,
      eduzzId: profile.eduzz_id
    };
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.clear(); 
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as Role,
      createdAt: profile.created_at,
      subscriptionStatus: profile.subscription_status,
      cpf: profile.cpf,
      eduzzId: profile.eduzz_id
    };
  },

  getAllUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }

    return data.map(p => ({
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role as Role,
      createdAt: p.created_at,
      subscriptionStatus: p.subscription_status,
      cpf: p.cpf,
      eduzzId: p.eduzz_id
    }));
  },

  // --- CRUD User ---

  createUser: async (user: Omit<User, 'id' | 'createdAt'>): Promise<void> => {
    // Inserção direta no perfil (Geralmente requer trigger ou criação via Auth Admin API)
    // Para este escopo, assumimos inserção direta na tabela profiles
    const { error } = await supabase.from('profiles').insert([{
      email: user.email,
      name: user.name,
      role: user.role,
      cpf: user.cpf,
      eduzz_id: user.eduzzId,
      subscription_status: user.subscriptionStatus
    }]);

    if (error) throw new Error(error.message);
  },

  updateUser: async (user: User): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: user.name,
        role: user.role,
        cpf: user.cpf,
        eduzz_id: user.eduzzId,
        subscription_status: user.subscriptionStatus
      })
      .eq('id', user.id);

    if (error) throw new Error(error.message);
  },

  deleteUser: async (userId: string): Promise<void> => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw new Error(error.message);
  },

  // --- Configurações & Integrações ---

  getSettings: async (): Promise<SystemSettings> => {
    // Mantém configurações visuais locais para performance
    const stored = localStorage.getItem('sf_settings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  },

  updateSettings: (settings: SystemSettings): void => {
    localStorage.setItem('sf_settings', JSON.stringify(settings));
  },

  getIntegrationSettings: async (): Promise<IntegrationSettings> => {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('settings')
      .limit(1)
      .single();

    if (error || !data) {
      return DEFAULT_INTEGRATIONS;
    }

    const settings = data.settings as IntegrationSettings;
    // Cache para uso síncrono onde necessário
    localStorage.setItem('sf_integrations', JSON.stringify(settings));
    return settings;
  },

  updateIntegrationSettings: async (settings: IntegrationSettings): Promise<void> => {
    const { data } = await supabase.from('integration_settings').select('id').limit(1).single();

    if (data) {
      await supabase
        .from('integration_settings')
        .update({ settings, updated_at: new Date().toISOString() })
        .eq('id', data.id);
    } else {
      await supabase.from('integration_settings').insert([{ settings }]);
    }
    
    localStorage.setItem('sf_integrations', JSON.stringify(settings));
  },

  // --- Métricas ---

  getRecentSubscribersCount: async (): Promise<number> => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'SUBSCRIBER')
      .gt('created_at', oneDayAgo.toISOString());

    return count || 0;
  },

  simulateEduzzWebhook: (payload: any): { action: string, user: User } => {
    console.log("Simulating Webhook", payload);
    return { 
      action: 'created', 
      user: { 
        id: 'mock-id', 
        name: payload.cus_name, 
        email: payload.cus_email, 
        role: 'SUBSCRIBER', 
        createdAt: new Date().toISOString(),
        subscriptionStatus: 'active'
      } 
    };
  }
};