import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

export const agendaService = {
  getAll: async (): Promise<Appointment[]> => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
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

  create: async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
    // 1. Validações Básicas
    if (!appointment.patientName) {
      throw new Error("O nome do aluno é obrigatório.");
    }
    if (!appointment.patientId) {
      throw new Error("O ID do aluno é obrigatório.");
    }

    // 2. Verificação de conflito de horário (opcional, mantendo lógica existente)
    const { data: existing } = await supabase
      .from('appointments')
      .select('date_time')
      .neq('status', 'Concluído')
      .neq('status', 'Faltou');

    const newTime = new Date(appointment.dateTime).getTime();
    
    if (existing) {
      const hasConflict = existing.some(appt => {
        const existingTime = new Date(appt.date_time).getTime();
        const diffMinutes = Math.abs(existingTime - newTime) / (1000 * 60);
        return diffMinutes < 60; // Bloqueia conflitos de 1h
      });

      if (hasConflict) {
        throw new Error('Choque de horários! Intervalo mínimo de 1h necessário.');
      }
    }

    // 3. Payload "Mirror Operation": Envio direto e explícito para as colunas
    const dbPayload = {
      patient_id: appointment.patientId,      // FK Obrigatória
      patient_name: appointment.patientName,  // Denormalizado (Explicitamente solicitado)
      patient_phone: appointment.patientPhone || '', // Denormalizado
      date_time: appointment.dateTime,
      type: appointment.type,                 // Coluna type
      status: appointment.status,
      notes: appointment.notes || ''
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      console.error("Supabase Agenda Insert Error:", error);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      patientId: data.patient_id,
      patientName: data.patient_name,
      patientPhone: data.patient_phone,
      dateTime: data.date_time,
      type: data.type,
      status: data.status,
      notes: data.notes
    };
  },

  updateStatus: async (id: string, status: Appointment['status']): Promise<void> => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  // --- Realtime ---
  subscribe: (onUpdate: () => void): RealtimeChannel => {
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