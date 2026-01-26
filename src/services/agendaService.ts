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

  // OBS: create movido para appointmentService para centralizar a lógica blindada
  // Mantemos aqui caso legado, mas redirecionando erro.
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
        updated_at: new Date().toISOString() // Rastreabilidade
      })
      .eq('id', id)
      .eq('user_id', user.id); // RLS: Garante propriedade

    if (error) throw new Error(error.message);
  },

  delete: async (id: string): Promise<void> => {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // RLS: Garante propriedade

    if (error) throw new Error(error.message);
  },

  // --- Realtime ---
  subscribe: (onUpdate: () => void): any => {
    // Nota: O filtro de RLS no Realtime depende das Policies do Supabase.
    // O frontend apenas escuta a tabela.
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