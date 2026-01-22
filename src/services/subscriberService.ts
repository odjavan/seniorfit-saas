import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { User } from '../types';

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
   * Lógica espelhada do authService.createUser (AdminPanel)
   */
  createManualSubscriber: async (data: CreateSubscriberDTO): Promise<SubscriberResponse> => {
    // 1. SANITIZAÇÃO DE DADOS (CRÍTICO PARA CORRIGIR "Email address is invalid")
    const sanitizedEmail = data.email.trim().toLowerCase();
    const sanitizedName = data.name.trim();
    const sanitizedCpf = data.cpf ? data.cpf.trim() : null;
    const sanitizedEduzzId = data.eduzzId ? data.eduzzId.trim() : null;

    console.log('🔄 [SubscriberService] Iniciando cadastro blindado:', sanitizedEmail);
    let createdAuthId: string | null = null;

    // Validação Prévia
    if (!sanitizedEmail || !sanitizedEmail.includes('@')) throw new Error('Email inválido ou mal formatado.');
    if (!sanitizedName || sanitizedName.length < 3) throw new Error('Nome muito curto.');
    
    // Senha padrão se não fornecida
    const finalPassword = data.password && data.password.length >= 6 ? data.password : '123456';

    try {
      // 2. Criar Cliente Temporário (evita logout do Admin)
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 3. Criar Usuário no Auth com Email Sanitizado
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: sanitizedEmail,
        password: finalPassword,
        options: {
          data: { name: sanitizedName }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este e-mail já está cadastrado no sistema.');
        }
        // Repassa erro original do Supabase (ex: Email address is invalid)
        throw new Error(`Erro Auth: ${authError.message}`);
      }

      if (!authData.user?.id) {
        throw new Error('Falha ao obter ID do usuário criado.');
      }

      createdAuthId = authData.user.id;
      console.log('✅ [SubscriberService] Auth criado. ID:', createdAuthId);

      // 4. Criar Perfil (Profile)
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: createdAuthId,
        email: sanitizedEmail,
        name: sanitizedName,
        role: 'SUBSCRIBER',
        subscription_status: 'ACTIVE',
        cpf: sanitizedCpf,
        eduzz_id: sanitizedEduzzId,
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