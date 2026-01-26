import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// Helper para formatar dados do banco (snake_case) para o frontend (camelCase)
const mapToPatient = (p: any): Patient => {
  let age = 0;
  if (p.birth_date) {
    const today = new Date();
    const birthDate = new Date(p.birth_date);
    age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  return {
    id: p.id,
    name: p.name,
    birthDate: p.birth_date,
    age: age,
    weight: p.weight,
    height: p.height,
    bmi: p.bmi,
    sex: p.sex,
    whatsapp: p.whatsapp,
    ethnicity: p.ethnicity,
    screening: p.screening || undefined,
    tests: p.tests || [],
    history: p.history || [],
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
};

export const patientService = {
  // --- Leitura e Escrita ---

  getAll: async (): Promise<Patient[]> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
      return [];
    }
    return data.map(mapToPatient);
  },

  getById: async (id: string): Promise<Patient | null> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapToPatient(data);
  },

  create: async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> => {
    // Obter o ID do usuário logado para vincular o paciente
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado para realizar o cadastro.");

    // A Edge Function cuidará do Email de Boas-Vindas via Database Webhook
    const dbPayload = {
      user_id: user.id, // Vinculação com o criador
      name: patientData.name,
      birth_date: patientData.birthDate,
      sex: patientData.sex,
      whatsapp: patientData.whatsapp,
      weight: patientData.weight,
      height: patientData.height,
      bmi: patientData.bmi,
      ethnicity: patientData.ethnicity,
      screening: patientData.screening || {},
      tests: patientData.tests || [],
      history: patientData.history || []
    };

    const { data, error } = await supabase
      .from('patients')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapToPatient(data);
  },

  update: async (patient: Patient): Promise<void> => {
    const dbPayload = {
      name: patient.name,
      birth_date: patient.birthDate,
      sex: patient.sex,
      whatsapp: patient.whatsapp,
      weight: patient.weight,
      height: patient.height,
      bmi: patient.bmi,
      ethnicity: patient.ethnicity,
      screening: patient.screening,
      tests: patient.tests,
      history: patient.history,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('patients')
      .update(dbPayload)
      .eq('id', patient.id);

    if (error) throw new Error('Falha ao atualizar dados do aluno: ' + error.message);
  },

  search: async (query: string): Promise<Patient[]> => {
    if (!query) return patientService.getAll();
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .ilike('name', `%${query}%`);

    if (error) return [];
    return data.map(mapToPatient);
  },

  // --- Realtime / Escuta Ativa ---

  // Escuta alterações na tabela inteira (para atualizar listas)
  subscribeToAll: (onUpdate: () => void): RealtimeChannel => {
    return supabase
      .channel('patients-list-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => onUpdate()
      )
      .subscribe();
  },

  // Escuta alterações em um paciente específico (para a tela de detalhes)
  subscribeById: (id: string, onUpdate: (patient: Patient) => void): RealtimeChannel => {
    return supabase
      .channel(`patient-${id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'patients', 
          filter: `id=eq.${id}` 
        },
        (payload) => {
          if (payload.new) {
            onUpdate(mapToPatient(payload.new));
          }
        }
      )
      .subscribe();
  }
};