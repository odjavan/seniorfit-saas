
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { User, Role, SystemSettings, IntegrationSettings } from '../types';

// Credenciais para o cliente temporário (mesmas do lib/supabase.ts)
const supabaseUrl = 'https://seporcnzpysaniisprin.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcG9yY256cHlzYW5paXNwcmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODU0NjgsImV4cCI6MjA4NDQ2MTQ2OH0.uSZHjCzL8K4jp3EFF04YydcI0SpLdgBjQWEWP_xNn_w';

const DEFAULT_SETTINGS: SystemSettings = {
  howToInstallVideoUrl: '',
};

const SYSTEM_SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

export const authService = {
  // --- Auth Core ---

  login: async (email: string, password: string): Promise<User> => {
    const { data: authData, error: authError } = await (supabase.auth as any).signInWithPassword({
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
        role: 'SUBSCRIBER', // Fallback seguro atualizado
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
    await (supabase.auth as any).signOut();
    localStorage.clear(); 
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await (supabase.auth as any).getSession();
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

  // --- CRIAÇÃO DE USUÁRIO (OPERAÇÃO BLINDADA) ---
  createUser: async (userData: Partial<User>, password?: string): Promise<void> => {
    console.log("Iniciando criação de usuário...");

    // 1. Cria um Cliente Supabase Temporário
    const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // 2. Cria o Auth User (Retorna o UID real)
    const { data: authData, error: authError } = await (tempSupabase.auth as any).signUp({
      email: userData.email!,
      password: password || '123456',
      options: {
        data: {
          name: userData.name // Metadados para o Auth
        }
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
         throw new Error('Este e-mail já está cadastrado no sistema de autenticação.');
      }
      throw new Error(`Erro no Auth: ${authError.message}`);
    }

    if (!authData.user || !authData.user.id) {
      throw new Error("Falha crítica: UID não gerado pelo provedor de identidade.");
    }

    const realUserId = authData.user.id;
    console.log("UID Gerado:", realUserId);

    // 3. Insere na tabela 'profiles' usando o ID REAL
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: realUserId,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'SUBSCRIBER',
      subscription_status: 'ACTIVE',
      cpf: userData.cpf || null,
      eduzz_id: userData.eduzzId || null,
      created_at: new Date().toISOString()
    }]);

    if (profileError) {
      console.error("Erro no Profile Insert:", profileError);
      throw new Error(`Erro ao salvar perfil (FK Constraint): ${profileError.message}`);
    }

    console.log("Usuário e Perfil criados com sucesso.");
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

  // --- NOVO MÉTODO: Atualização de Perfil (Self-Service) ---
  updateProfileName: async (userId: string, newName: string): Promise<void> => {
    // 1. Atualizar Metadados do Auth (Supabase Auth)
    const { error: authError } = await (supabase.auth as any).updateUser({
      data: { full_name: newName, name: newName }
    });
    
    if (authError) {
      console.error("Erro ao atualizar Auth Metadata:", authError);
      throw new Error('Falha ao atualizar metadados de autenticação.');
    }

    // 2. Atualizar Tabela de Perfis (Aplicação)
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ name: newName })
      .eq('id', userId);

    if (dbError) {
      console.error("Erro ao atualizar Profile DB:", dbError);
      throw new Error('Falha ao salvar nome no banco de dados.');
    }
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
