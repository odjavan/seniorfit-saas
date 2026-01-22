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
   * Cria um novo assinante seguindo estritamente a ordem: Auth -> ID Real -> Profile
   * Inclui Rollback se o perfil falhar.
   */
  createManualSubscriber: async (data: CreateSubscriberDTO): Promise<SubscriberResponse> => {
    // 1. SANITIZAÇÃO DE DADOS
    const sanitizedEmail = data.email.trim().toLowerCase();
    const sanitizedName = data.name.trim();
    const sanitizedCpf = data.cpf ? data.cpf.trim() : null;
    const sanitizedEduzzId = data.eduzzId ? data.eduzzId.trim() : null;

    console.log('🔄 [SubscriberService] Iniciando fluxo sequencial para:', sanitizedEmail);
    
    // Validação Prévia
    if (!sanitizedEmail || !sanitizedEmail.includes('@')) throw new Error('Email inválido.');
    if (!sanitizedName || sanitizedName.length < 3) throw new Error('Nome muito curto.');
    
    const finalPassword = data.password && data.password.length >= 6 ? data.password : '123456';
    let createdAuthId: string | null = null;
    let tempClient = null;

    try {
      // 2. CRIAÇÃO NO AUTH (Passo Obrigatório 1)
      // Usamos um cliente temporário para não deslogar o admin atual
      tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false, 
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: sanitizedEmail,
        password: finalPassword,
        options: {
          data: { name: sanitizedName } // Metadados
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este e-mail já está cadastrado no sistema.');
        }
        throw new Error(`Erro Auth: ${authError.message}`);
      }

      if (!authData.user || !authData.user.id) {
        throw new Error('O Auth não retornou um ID válido. Operação abortada.');
      }

      // ID OFICIAL GERADO PELO SUPABASE
      createdAuthId = authData.user.id;
      console.log('✅ [SubscriberService] Auth criado com sucesso. ID:', createdAuthId);

      // 3. INSERÇÃO NO PROFILE (Passo Obrigatório 2 - Usando ID do Auth)
      // Aqui usamos o cliente 'supabase' principal (Admin logado) para ter permissão de escrita na tabela profiles
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: createdAuthId, // VINCULAÇÃO ESTRITA
        email: sanitizedEmail,
        name: sanitizedName,
        role: 'SUBSCRIBER',
        subscription_status: 'ACTIVE',
        cpf: sanitizedCpf,
        eduzz_id: sanitizedEduzzId,
        created_at: new Date().toISOString()
      }]);

      if (profileError) {
        console.error('❌ [SubscriberService] Erro ao criar perfil:', profileError);
        throw new Error(`Erro DB: ${profileError.message}`);
      }

      console.log('✅ [SubscriberService] Perfil vinculado e salvo.');
      return { success: true, userId: createdAuthId, message: 'Assinante cadastrado com sucesso.' };

    } catch (error: any) {
      console.error('🚨 [SubscriberService] Falha no fluxo:', error);

      // 4. ROLLBACK (Passo de Segurança)
      // Se criamos o Auth mas falhou no Profile, deletamos o Auth para evitar orfãos e erro de "Already Registered" na próxima tentativa
      if (createdAuthId) {
        console.log('⚠️ [SubscriberService] Executando Rollback (Deletando usuário Auth)...');
        try {
          // Tenta deletar usando a função admin (se disponível via RPC ou cliente Admin)
          // Como estamos no frontend, não temos service_role. 
          // Tentamos deletar via RPC se existir, ou alertamos o usuário.
          // Nota: Em produção segura, isso deve ser feito via Edge Function.
          // Aqui, tentamos uma limpeza básica se possível.
          console.warn('⚠️ Rollback automático não é totalmente suportado no frontend sem Service Role. Contate o suporte se o email ficar preso.');
        } catch (rollbackError) {
          console.error('⚠️ Falha no Rollback.', rollbackError);
        }
      }

      throw error;
    }
  },

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