import { Patient } from '../types';

const STORAGE_KEY = 'sf_clients';

export const patientService = {
  getAll: (): Patient[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching patients', error);
      return [];
    }
  },

  getById: (id: string): Patient | undefined => {
    const patients = patientService.getAll();
    return patients.find(p => p.id === id);
  },

  create: (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient => {
    const patients = patientService.getAll();
    
    const newPatient: Patient = {
      ...patientData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    patients.unshift(newPatient); // Add to beginning of list

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    } catch (error) {
      console.error('Error saving patient', error);
      throw new Error('Falha ao salvar paciente no armazenamento local.');
    }

    return newPatient;
  },

  update: (patient: Patient): void => {
    const patients = patientService.getAll();
    const index = patients.findIndex(p => p.id === patient.id);
    
    if (index !== -1) {
      patients[index] = {
        ...patient,
        updatedAt: new Date().toISOString()
      };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
      } catch (error) {
        console.error('Error updating patient', error);
        throw new Error('Falha ao atualizar dados do paciente.');
      }
    }
  },

  search: (query: string): Patient[] => {
    const patients = patientService.getAll();
    if (!query) return patients;
    
    const lowerQuery = query.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(lowerQuery));
  }
};