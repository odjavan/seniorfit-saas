import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { User, Role } from '../types';

// Credenciais para o cliente temporário (necessário para criar usuário sem deslogar o admin)
const supabaseUrl = 'https://seporcnzpysaniisprin.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcG9yY256cHlzYW5paXNwcmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODU0NjgsImV4cCI6MjA4NDQ2MTQ2OH0.uSZHjCzL8K4jp3EFF04YydcI0SpLdgBjQWEWP_xNn_w';

interface CreateSubscriberDTO {
  name: string;
  email: string;
  password?: string;
  cpf?: string;
  eduzzId?: string;
}

interface SubscriberResponse {
  success: boolean;
  userId?: string;
  message: string;
}

export const subscriberService = {
  /**
   * Cria um novo assinante com consistência transacional simulada.
   * 1. Cria no Auth (usando cliente temporário)
   * 2. Cria no Profile (usando cliente admin)
   * 3. Se Profile falhar, deleta do Auth (Rollback)
   */
  createManualSubscriber: async (data: CreateSubscriberDTO): Promise<SubscriberResponse> => {
    console.log('🔄 [SubscriberService] Iniciando cadastro:', data.email);
    let createdAuthId: string | null = null;

    // 0. Validação Prévia
    if (!data.email || !data.email.includes('@')) throw new Error('Email inválido.');
    if (!data.name || data.name.length < 3) throw new Error('Nome muito curto.');
    
    // Senha padrão se não fornecida
    const finalPassword = data.password && data.password.length >= 6 ? data.password : '123456';

    try {
      // 1. Criar Cliente Temporário (evita logout do Admin)
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 2. Criar Usuário no Auth
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: data.email,
        password: finalPassword,
        options: {
          data: { name: data.name }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este e-mail já está cadastrado no sistema.');
        }
        throw new Error(`Erro na Autenticação: ${authError.message}`);
      }

      if (!authData.user?.id) {
        throw new Error('Falha ao obter ID do usuário criado.');
      }

      createdAuthId = authData.user.id;
      console.log('✅ [SubscriberService] Auth criado. ID:', createdAuthId);

      // 3. Criar Perfil (Profile)
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: createdAuthId,
        email: data.email,
        name: data.name,
        role: 'SUBSCRIBER',
        subscription_status: 'ACTIVE',
        cpf: data.cpf || null,
        eduzz_id: data.eduzzId || null,
        created_at: new Date().toISOString()
      }]);

      if (profileError) {
        console.error('❌ [SubscriberService] Erro no Profile:', profileError);
        throw new Error(`Erro ao salvar perfil: ${profileError.message}`);
      }

      console.log('✅ [SubscriberService] Perfil vinculado com sucesso.');
      return { success: true, userId: createdAuthId, message: 'Assinante cadastrado com sucesso.' };

    } catch (error: any) {
      console.error('🚨 [SubscriberService] Falha no fluxo:', error);

      // ROLLBACK: Tentar limpar o usuário do Auth se o perfil falhou
      if (createdAuthId) {
        console.log('⚠️ [SubscriberService] Executando Rollback...');
        try {
          // Nota: deleteUser requer service_role ou ser o próprio usuário. 
          // Como estamos no cliente admin, tentamos via RPC ou admin API se disponível,
          // Caso contrário, o usuário fica "órfão" no Auth mas sem acesso ao sistema (sem profile).
          // Em um ambiente puramente client-side sem Service Role, o rollback completo é limitado,
          // mas evitamos o estado inconsistente na UI.
          await supabase.auth.admin.deleteUser(createdAuthId);
          console.log('✅ [SubscriberService] Rollback concluído.');
        } catch (rollbackError) {
          console.warn('⚠️ [SubscriberService] Falha no Rollback (Auth Cleanup).', rollbackError);
        }
      }

      throw error;
    }
  },

  /**
   * Atualiza dados de um assinante existente
   */
  updateSubscriber: async (user: User): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: user.name,
        cpf: user.cpf,
        eduzz_id: user.eduzzId,
        subscription_status: user.subscriptionStatus?.toUpperCase()
      })
      .eq('id', user.id);

    if (error) throw new Error(error.message);
  }
};

/**
 * Hook para uso nos componentes
 */
export const useCreateSubscriber = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSubscriber = async (data: CreateSubscriberDTO) => {
    setLoading(true);
    setError(null);
    try {
      const result = await subscriberService.createManualSubscriber(data);
      return result;
    } catch (err: any) {
      const msg = err.message || 'Erro desconhecido ao criar assinante.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createSubscriber, loading, error };
};
