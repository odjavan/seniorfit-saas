import { supabase } from '../lib/supabase';
import { User, Role, SystemSettings, IntegrationSettings } from '../types';
import { generateId } from '../utils/generateId';

const DEFAULT_SETTINGS: SystemSettings = {
  howToInstallVideoUrl: '',
};

// ID Singleton para garantir que só exista uma linha de configuração na tabela nova
const SYSTEM_SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

export const authService = {
  // --- Auth Core ---

  login: async (email: string, password: string): Promise<User> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Usuário não encontrado.');

    // Busca dados complementares na tabela profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Fallback caso o profile não exista (primeiro login ou erro de sync)
    if (profileError || !profile) {
      return {
        id: authData.user.id,
        email: authData.user.email!,
        name: 'Usuário',
        role: 'TRAINER', // Default role
        createdAt: new Date().toISOString(),
        subscriptionStatus: 'active'
      };
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name, // Garante uso de 'name'
      // Normalização: Banco (SUBSCRIBER) -> App (SUBSCRIBER)
      role: (profile.role === 'subscriber' ? 'SUBSCRIBER' : profile.role) as Role,
      createdAt: profile.created_at,
      // Normalização: Banco (ACTIVE) -> App (active)
      subscriptionStatus: profile.subscription_status?.toLowerCase(),
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
      name: profile.name, // Garante uso de 'name'
      // Normalização: Banco (SUBSCRIBER) -> App (SUBSCRIBER)
      role: (profile.role === 'subscriber' ? 'SUBSCRIBER' : profile.role) as Role,
      createdAt: profile.created_at,
      // Normalização: Banco (ACTIVE) -> App (active)
      subscriptionStatus: profile.subscription_status?.toLowerCase(),
      cpf: profile.cpf,
      eduzzId: profile.eduzz_id
    };
  },

  // --- User Management (Admin) ---

  // Método genérico para Admin (traz todos)
  getAllUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }

    return data.map((profile: any) => ({
      id: profile.id,
      email: profile.email,
      name: profile.name, // Correção: name
      role: (profile.role === 'subscriber' ? 'SUBSCRIBER' : profile.role) as Role,
      createdAt: profile.created_at,
      subscriptionStatus: profile.subscription_status?.toLowerCase(),
      cpf: profile.cpf,
      eduzzId: profile.eduzz_id,
      lastPaymentDate: profile.last_payment_date
    }));
  },

  // Método ESPECÍFICO para Assinantes (Filtro Rígido)
  getSubscribers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'SUBSCRIBER') // FILTRO MAIÚSCULO OBRIGATÓRIO
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar assinantes:', error);
      return [];
    }

    return data.map((profile: any) => ({
      id: profile.id,
      email: profile.email,
      name: profile.name, // Correção: name
      role: 'SUBSCRIBER',
      createdAt: profile.created_at,
      subscriptionStatus: profile.subscription_status?.toLowerCase(), // Normaliza para Badge
      cpf: profile.cpf,
      eduzzId: profile.eduzz_id,
      lastPaymentDate: profile.last_payment_date
    }));
  },

  createUser: async (userData: Partial<User>): Promise<void> => {
    const fakeId = generateId(); 
    
    const { error } = await supabase.from('profiles').insert([{
      id: fakeId,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'SUBSCRIBER',
      cpf: userData.cpf,
      eduzz_id: userData.eduzzId,
      subscription_status: userData.subscriptionStatus?.toUpperCase() || 'ACTIVE', // Gravação UPPERCASE
      created_at: new Date().toISOString()
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
        subscription_status: user.subscriptionStatus?.toUpperCase() // Gravação UPPERCASE
      })
      .eq('id', user.id);

    if (error) throw new Error(error.message);
  },

  deleteUser: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  getRecentSubscribersCount: async (): Promise<number> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // CORREÇÃO CRÍTICA: Busca por 'SUBSCRIBER' em MAIÚSCULO
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'SUBSCRIBER') 
      .gte('created_at', today.toISOString());

    if (error) return 0;
    return count || 0;
  },

  // --- System Settings (Admin Panel - Video URL) ---

  getSettings: async (): Promise<SystemSettings> => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('video_url')
        .eq('id', SYSTEM_SETTINGS_ID)
        .single();
        
      if (data && data.video_url) {
        return { howToInstallVideoUrl: data.video_url };
      }
    } catch (e) {
      console.warn('Erro ao ler settings, usando padrão.');
    }
    return DEFAULT_SETTINGS;
  },

  updateSettings: async (settings: SystemSettings): Promise<void> => {
    const { error } = await supabase.from('system_settings').upsert({
      id: SYSTEM_SETTINGS_ID,
      video_url: settings.howToInstallVideoUrl
    });

    if (error) throw new Error(error.message);
  },

  // --- Integrations (Admin Panel - API Keys) ---

  getIntegrationSettings: async (): Promise<IntegrationSettings> => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', SYSTEM_SETTINGS_ID)
      .single();

    if (error || !data) {
      return {
        emailjs: { serviceId: '', templateIdRecovery: '', templateIdWelcome: '', publicKey: '' },
        eduzz: { webhookUrl: '', liveKey: '', appUrl: '' },
        gemini: { apiKey: '' }
      };
    }

    return {
      emailjs: {
        serviceId: data.emailjs_service_id || '',
        templateIdRecovery: data.emailjs_template_recovery || '',
        templateIdWelcome: data.emailjs_template_welcome || '',
        publicKey: data.emailjs_public_key || ''
      },
      eduzz: {
        webhookUrl: data.app_url ? `${data.app_url.replace(/\/$/, '')}/api/webhooks/eduzz` : '',
        liveKey: '', 
        appUrl: data.app_url || ''
      },
      gemini: {
        apiKey: data.gemini_api_key || ''
      }
    };
  },

  updateIntegrationSettings: async (settings: IntegrationSettings): Promise<void> => {
    const payload = {
      id: SYSTEM_SETTINGS_ID,
      gemini_api_key: settings.gemini.apiKey,
      emailjs_service_id: settings.emailjs.serviceId,
      emailjs_public_key: settings.emailjs.publicKey,
      emailjs_template_welcome: settings.emailjs.templateIdWelcome,
      emailjs_template_recovery: settings.emailjs.templateIdRecovery,
      app_url: settings.eduzz.appUrl
    };

    const { error } = await supabase
      .from('system_settings')
      .upsert(payload);

    if (error) {
      throw new Error('Falha ao salvar configurações no banco de dados: ' + error.message);
    }
  },

  // --- Webhook Simulation ---
  simulateEduzzWebhook: (payload: any) => {
     console.log("Simulando Webhook:", payload);
     return { 
       success: true, 
       action: 'updated', 
       user: { name: payload.cus_name, email: payload.cus_email } 
     };
  }
};