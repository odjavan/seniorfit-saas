import { TrainingPlan } from '../types';

const STORAGE_KEYS = {
  TRAINING_PLANS: 'sf_training_plans',
};

export const trainingService = {
  getAllPlans: (): TrainingPlan[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRAINING_PLANS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching training plans', error);
      return [];
    }
  },

  createPlan: (plan: Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt' | 'status'>): TrainingPlan => {
    const plans = trainingService.getAllPlans();
    
    const newPlan: TrainingPlan = {
      ...plan,
      id: crypto.randomUUID(),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: []
    };

    plans.unshift(newPlan);

    try {
      localStorage.setItem(STORAGE_KEYS.TRAINING_PLANS, JSON.stringify(plans));
    } catch (error) {
      console.error('Error saving training plan', error);
      throw new Error('Falha ao salvar plano de treino.');
    }

    return newPlan;
  },

  updatePlan: (plan: TrainingPlan): void => {
    const plans = trainingService.getAllPlans();
    const index = plans.findIndex(p => p.id === plan.id);
    
    if (index !== -1) {
      plans[index] = { ...plan, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.TRAINING_PLANS, JSON.stringify(plans));
    }
  },

  getPlansByPatientId: (patientId: string): TrainingPlan[] => {
    return trainingService.getAllPlans().filter(p => p.patientId === patientId);
  }
};