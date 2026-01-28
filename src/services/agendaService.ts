
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';

export const agendaService = {
  getAll: async (): Promise<Appointment[]> => {
    // Obter usuário para RLS no Frontend
    const { data: { user } } = await (supabase.auth as any).getUser();
    
    if (!user) {
      console.warn("Usuário não autenticado ao tentar ler agenda.");
      return [];
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id) // RLS: Apenas dados do usuário
      .order('date_time', { ascending: true });

    if (error) {
      console.error('Error fetching agenda:', error);
      return [];
    }

    return data.map(a => ({
      id: a.id,
      patientId: a.patient_id,
      patientName: a.patient_name,
      patientPhone: a.patient_phone,
      dateTime: a.date_time,
      type: a.type,
      status: a.status,
      notes: a.notes
    }));
  },

  /**
   * Tenta encontrar o agendamento mais relevante para um laudo.
   */
  getAppointmentForReport: async (patientId: string, dateISO?: string): Promise<{ id: string, notes: string } | null> => {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) return null;

    let query = supabase
      .from('appointments')
      .select('id, notes, date_time')
      .eq('user_id', user.id)
      .eq('patient_id', patientId);

    if (dateISO) {
      const date = new Date(dateISO);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();
      
      query = query
        .gte('date_time', startOfDay)
        .lte('date_time', endOfDay)
        .order('date_time', { ascending: false })
        .limit(1);
    } else {
      query = query
        .order('date_time', { ascending: false })
        .limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return null;
    }

    return { id: data.id, notes: data.notes || '' };
  },

  /**
   * NOVA FUNÇÃO: Salva notas de relatório de forma blindada.
   * Se já existe um agendamento (no dia ou recente), atualiza.
   * Se não existe, CRIA um registro de "Avaliação" concluída para segurar a nota.
   */
  saveReportNotes: async (patientId: string, notes: string, dateReference?: string, patientName?: string): Promise<void> => {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    // 1. Tenta achar agendamento existente
    const existing = await agendaService.getAppointmentForReport(patientId, dateReference);

    if (existing) {
      // Cenário A: Atualiza existente
      const { error } = await supabase
        .from('appointments')
        .update({ 
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .eq('user_id', user.id);

      if (error) throw new Error(error.message);
    } else {
      // Cenário B: Cria novo registro automático (Container para a nota)
      if (!patientName) throw new Error("Nome do paciente necessário para criar registro de notas.");
      
      const targetDate = dateReference ? new Date(dateReference).toISOString() : new Date().toISOString();
      
      const { error } = await supabase
        .from('appointments')
        .insert([{
          user_id: user.id,
          patient_id: patientId,
          patient_name: patientName,
          date_time: targetDate,
          type: 'Avaliação Inicial', // Tipo padrão para laudos
          status: 'Concluído',       // Já nasce concluído pois é um registro de histórico
          notes: notes
        }]);

      if (error) throw new Error("Erro ao criar registro de notas: " + error.message);
    }
  },

  updateNotes: async (id: string, notes: string): Promise<void> => {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
      .from('appointments')
      .update({ 
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  },

  create: async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
     throw new Error("Use appointmentService.createAppointment para garantir segurança.");
  },

  updateStatus: async (id: string, status: Appointment['status']): Promise<void> => {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
      .from('appointments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  },

  delete: async (id: string): Promise<void> => {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  },

  subscribe: (onUpdate: () => void): any => {
    return supabase
      .channel('agenda-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => onUpdate()
      )
      .subscribe();
  }
};
