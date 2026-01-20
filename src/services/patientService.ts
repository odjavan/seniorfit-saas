import { supabase } from '../lib/supabase';
import { Patient } from '../types';

export const patientService = {
  getAll: async (): Promise<Patient[]> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
      return [];
    }

    // Mapeamento Snake Case (DB) -> Camel Case (App)
    return data.map(p => {
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
    });
  },

  getById: async (id: string): Promise<Patient | null> => {
    const { data: p, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !p) return null;

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
  },

  create: async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> => {
    // Mapeamento para o formato do banco (snake_case)
    const dbPayload = {
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

    // Inserção sem ID (gerado pelo Postgres)
    const { data, error } = await supabase
      .from('patients')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      ...patientData,
      id: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
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

    return data.map(p => ({
      id: p.id,
      name: p.name,
      birthDate: p.birth_date,
      age: 0, 
      weight: p.weight,
      height: p.height,
      bmi: p.bmi,
      sex: p.sex,
      whatsapp: p.whatsapp,
      ethnicity: p.ethnicity,
      screening: p.screening,
      tests: p.tests,
      history: p.history,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
  }
};