import { Appointment } from '../types';

const STORAGE_KEY = 'sf_appointments';

export const agendaService = {
  getAll: (): Appointment[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching appointments', error);
      return [];
    }
  },

  create: (appointment: Omit<Appointment, 'id'>): Appointment => {
    const appointments = agendaService.getAll();
    
    // Conflict Detection (Simple 1-hour block logic)
    // Checks if there is any appointment within +/- 59 minutes of the new time
    const newTime = new Date(appointment.dateTime).getTime();
    const hasConflict = appointments.some(appt => {
      if (appt.status === 'Concluído' || appt.status === 'Faltou') return false; // Ignore past/cancelled
      const existingTime = new Date(appt.dateTime).getTime();
      const diffMinutes = Math.abs(existingTime - newTime) / (1000 * 60);
      return diffMinutes < 60; // 60 minutes slot
    });

    if (hasConflict) {
      throw new Error('Choque de horários! Já existe um agendamento neste período (intervalo de 1h).');
    }

    const newAppointment: Appointment = {
      ...appointment,
      id: crypto.randomUUID()
    };

    appointments.push(newAppointment);
    
    // Sort by date
    appointments.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    return newAppointment;
  },

  updateStatus: (id: string, status: Appointment['status']): void => {
    const appointments = agendaService.getAll();
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments[index].status = status;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    }
  },

  delete: (id: string): void => {
    let appointments = agendaService.getAll();
    appointments = appointments.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  },

  getUpcoming: (): Appointment[] => {
    const now = new Date();
    return agendaService.getAll().filter(a => new Date(a.dateTime) >= now && a.status === 'Agendado');
  }
};