import { supabase } from '../lib/supabase';
import { Appointment } from '../types';

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
    // Verificação de conflito de horário básica
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
        return diffMinutes < 60;
      });

      if (hasConflict) {
        throw new Error('Choque de horários! Intervalo mínimo de 1h necessário.');
      }
    }

    const dbPayload = {
      patient_id: appointment.patientId,
      patient_name: appointment.patientName,
      patient_phone: appointment.patientPhone,
      date_time: appointment.dateTime,
      type: appointment.type,
      status: appointment.status,
      notes: appointment.notes
    };

    // O banco gera o ID automaticamente
    const { data, error } = await supabase
      .from('appointments')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw new Error(error.message);

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
  }
};