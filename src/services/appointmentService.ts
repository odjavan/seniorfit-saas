import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { useState } from 'react';

export interface CreateAppointmentDTO {
  patientId?: string | null; // Soft Constraint: Pode ser nulo
  patientName: string;       // Obrigatório (Denormalizado)
  patientPhone?: string;     // Denormalizado
  dateTime: string;
  type: 'Avaliação Inicial' | 'Reavaliação' | 'Sessão de Treino';
  notes?: string;
}

export const appointmentService = {
  /**
   * Cria um agendamento.
   * Aceita patientId nulo, desde que patientName seja fornecido.
   */
  createAppointment: async (data: CreateAppointmentDTO): Promise<Appointment> => {
    // 1. Validações
    if (!data.patientName) throw new Error("O nome do aluno é obrigatório.");
    if (!data.dateTime) throw new Error("A data e hora são obrigatórias.");
    if (!data.type) throw new Error("O tipo de sessão é obrigatório.");

    // 2. Verificação de Conflito de Horário
    // Busca agendamentos ativos na mesma data
    // Nota: Lógica simplificada de conflito. Em produção, usar range filters do Supabase.
    const checkDate = new Date(data.dateTime);
    const startWindow = new Date(checkDate.getTime() - 59 * 60000).toISOString();
    const endWindow = new Date(checkDate.getTime() + 59 * 60000).toISOString();

    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id, date_time')
      .neq('status', 'Concluído')
      .neq('status', 'Faltou')
      .gte('date_time', startWindow)
      .lte('date_time', endWindow);

    if (conflicts && conflicts.length > 0) {
      throw new Error('Choque de horários! Já existe um agendamento neste intervalo de 1h.');
    }

    // 3. Montar Payload (Mapeamento Explícito)
    const payload = {
      patient_id: data.patientId || null, // Permite nulo (Soft Constraint)
      patient_name: data.patientName,
      patient_phone: data.patientPhone || '',
      date_time: data.dateTime,
      type: data.type,
      status: 'Agendado',
      notes: data.notes || ''
    };

    console.log('📅 [AppointmentService] Criando agendamento:', payload);

    // 4. Insert
    const { data: created, error } = await supabase
      .from('appointments')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('❌ [AppointmentService] Erro no insert:', error);
      throw new Error(`Erro ao agendar: ${error.message}`);
    }

    // 5. Mapear retorno para o tipo Appointment
    return {
      id: created.id,
      patientId: created.patient_id || '',
      patientName: created.patient_name,
      patientPhone: created.patient_phone,
      dateTime: created.date_time,
      type: created.type,
      status: created.status,
      notes: created.notes
    };
  }
};

/**
 * Hook para uso nos componentes
 */
export const useCreateAppointment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAppointment = async (data: CreateAppointmentDTO) => {
    setLoading(true);
    setError(null);
    try {
      const result = await appointmentService.createAppointment(data);
      return result;
    } catch (err: any) {
      const msg = err.message || 'Erro ao criar agendamento.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createAppointment, loading, error };
};