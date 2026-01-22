import { supabase } from '../lib/supabase';
import { User, Role, SystemSettings, IntegrationSettings } from '../types';

const DEFAULT_SETTINGS: SystemSettings = {
  howToInstallVideoUrl: '',
};

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
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
      role: (profile.role === 'subscriber' ? 'SUBSCRIBER' : profile.role) as Role,
      createdAt: profile.created_at,
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
      name: profile.name,
      role: (profile.role === 'subscriber' ? 'SUBSCRIBER' : profile.role) as Role,
      createdAt: profile.created_at,
      subscriptionStatus: profile.subscription_status?.toLowerCase(),
      cpf: profile.cpf,
      eduzzId: profile.eduzz_id
    };
  },

  // --- User Management (Admin) ---

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
      name: profile.name,
      role: (profile.role === 'subscriber' ? 'SUBSCRIBER' : profile.role) as Role,
      createdAt: profile.created_at,
      subscriptionStatus: profile.subscription_status?.toLowerCase(),
      cpf: profile.cpf,
      eduzzId: profile.eduzz_id,
      lastPaymentDate: profile.last_payment_date
    }));
  },

  getSubscribers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'SUBSCRIBER')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar assinantes:', error);
      return [];
    }

    return data.map((profile: any) => ({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: 'SUBSCRIBER',
      createdAt: profile.created_at,
      subscriptionStatus: profile.subscription_status?.toLowerCase(),
      cpf: profile.cpf,
      eduzzId: profile.eduzz_id,
      lastPaymentDate: profile.last_payment_date
    }));
  },

  // FLUXO DE CRIAÇÃO CORRIGIDO (SEQUENCIAL)
  createUser: async (userData: Partial<User>, password?: string): Promise<void> => {
    // 1. PRIMEIRO: Criar no Auth Provider para gerar o UID
    // O 'admin.createUser' só funciona com service_role key no backend. 
    // No frontend, usamos 'signUp' que retorna o mesmo objeto User com ID.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email!,
      password: password || '123456', 
      options: {
        data: {
          name: userData.name // Metadados úteis para o Auth
        }
      }
    });

    if (authError) {
      throw new Error(`Erro na etapa de Autenticação: ${authError.message}`);
    }

    if (!authData.user || !authData.user.id) {
      throw new Error("Falha crítica: UID não gerado pelo provedor de identidade.");
    }

    const userId = authData.user.id;

    // 2. SEGUNDO: Inserir na tabela 'profiles' usando o UID gerado
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: userId, // Vinculação obrigatória da Foreign Key
      email: userData.email,
      name: userData.name,
      // Padronização rigorosa (Upper Case conforme solicitado)
      role: 'SUBSCRIBER', 
      subscription_status: 'ACTIVE',
      cpf: userData.cpf || null,
      eduzz_id: userData.eduzzId || null,
      created_at: new Date().toISOString()
    }]);

    if (profileError) {
      console.error("Erro ao criar perfil:", profileError);
      throw new Error(`Erro ao salvar perfil no banco: ${profileError.message}`);
    }
  },

  updateUser: async (user: User): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: user.name,
        role: user.role,
        cpf: user.cpf,
        eduzz_id: user.eduzzId,
        subscription_status: user.subscriptionStatus?.toUpperCase()
      })
      .eq('id', user.id);

    if (error) throw new Error(error.message);
  },

  deleteUser: async (id: string): Promise<void> => {
    // Nota: Deletar do 'profiles' não deleta do 'auth.users' sem trigger/cascade.
    // Em um ambiente Admin real, chamariamos uma Edge Function.
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  getRecentSubscribersCount: async (): Promise<number> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'SUBSCRIBER') 
      .gte('created_at', today.toISOString());

    if (error) return 0;
    return count || 0;
  },

  // --- System Settings ---
  getSettings: async (): Promise<SystemSettings> => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('video_url')
        .limit(1)
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

  // --- Integrations ---
  getIntegrationSettings: async (): Promise<IntegrationSettings> => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
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

  simulateEduzzWebhook: (payload: any) => {
     console.log("Simulando Webhook:", payload);
     return { 
       success: true, 
       action: 'updated', 
       user: { name: payload.cus_name, email: payload.cus_email } 
     };
  }
};