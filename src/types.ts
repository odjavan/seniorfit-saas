
export type Role = 'ADMIN' | 'TRAINER' | 'PERSONAL' | 'SUBSCRIBER' | 'subscriber';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  
  // Subscriber specific fields (SaaS)
  cpf?: string;
  eduzzId?: string;
  subscriptionStatus?: 'active' | 'pending' | 'cancelled';
  lastPaymentDate?: string;
}

export interface TrainingPlan {
  id: string;
  patientId: string;
  patientName: string;
  objective: 'Hipertrofia' | 'Equilíbrio' | 'Flexibilidade' | 'Potência';
  frequency: '2x' | '3x';
  status: 'active' | 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
  exercises?: any[]; // Placeholder for future expansion
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  dateTime: string; // ISO String
  type: 'Avaliação Inicial' | 'Reavaliação' | 'Sessão de Treino';
  status: 'Agendado' | 'Em Andamento' | 'Concluído' | 'Faltou';
  notes?: string;
}

export interface SystemSettings {
  howToInstallVideoUrl: string;
  appName?: string;
  appLogoUrl?: string;
}

export interface IntegrationSettings {
  emailjs: {
    serviceId: string;
    templateIdRecovery: string;
    templateIdWelcome: string;
    publicKey: string;
  };
  eduzz: {
    webhookUrl: string;
    liveKey: string;
    appUrl: string;
  };
  gemini: {
    apiKey: string;
  };
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Screening {
  walksIndependently: boolean;
  standsWithoutArms: boolean;
  hadFalls: boolean;
  fearsWalking: boolean;
  doesHousework: boolean;
  completedAt: string;
}

export interface FragilityResult {
  testId: 'fried';
  scores: {
    weightLoss: number;
    fatigue: number;
    gripStrength: number;
    walkingSpeed: number;
    physicalActivity: number;
  };
  measurements: {
    gripStrengthKg: number;
    gaitSpeedTime: number;
  };
  totalScore: number;
  classification: 'not_frail' | 'pre_frail' | 'frail';
  completedAt: string;
}

export interface TUGResult {
  testId: 'tug';
  timeSeconds: number;
  classification: 'low_risk' | 'moderate_risk' | 'high_risk';
  completedAt: string;
}

export interface ChairStandResult {
  testId: 'sit_stand_30';
  repetitions: number;
  classification: 'ruim' | 'regular' | 'bom' | 'muito_bom' | 'excelente';
  completedAt: string;
}

export interface ArmCurlResult {
  testId: 'arm_curl';
  repetitions: number;
  weightUsed: string;
  classification: 'ruim' | 'regular' | 'bom' | 'muito_bom' | 'excelente';
  completedAt: string;
}

export interface FlexibilityResult {
  testId: 'sit_reach';
  distanceCm: number;
  classification: 'ruim' | 'regular' | 'bom' | 'muito_bom';
  completedAt: string;
}

export interface DepressionResult {
  testId: 'gds15';
  answers: boolean[];
  totalScore: number;
  classification: 'normal' | 'depressao_leve' | 'depressao_grave';
  completedAt: string;
}

export interface CognitiveResult {
  testId: 'meem_cognitive';
  scores: {
    orientation: number;
    registration: number;
    attention: number;
    recall: number;
    language: number;
  };
  totalScore: number;
  classification: 'sem_declinio' | 'declinio_leve' | 'declinio_moderado' | 'declinio_grave';
  educationLevel: 'analfabeto' | '1-4' | '5-8' | '9-11' | '12+';
  completedAt: string;
}

export interface BalanceResult {
  testId: 'berg_balance';
  itemScores: number[]; // Array of 14 integers (0-4)
  totalScore: number; // 0-56
  classification: 'alto_risco' | 'medio_risco' | 'baixo_risco';
  completedAt: string;
}

export interface AssessmentHistoryEntry {
  id: string;
  date: string;
  testId: string;
  testName: string;
  score: number | string;
  classification: string;
  details: any; // Full result object
}

export interface TestStatus {
  testId: string;
  testName: string;
  status: 'pending' | 'in_progress' | 'completed';
  result?: any; // Can hold any of the Result types
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  age: number;
  weight: number;
  height: number;
  bmi: number;
  sex: 'M' | 'F';
  whatsapp: string;
  ethnicity?: 'branco' | 'pardo' | 'negro' | 'asiático';
  educationLevel?: 'analfabeto' | '1-4' | '5-8' | '9-11' | '12+';
  
  screening?: Screening;
  tests?: TestStatus[];
  history?: AssessmentHistoryEntry[];
  
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  title: string;
  duration: string;
  difficulty: string;
  description: string;
  imageUrl: string;
  category: string;
}

export interface DailyStat {
  day: string;
  steps: number;
  calories: number;
  activeMinutes: number;
}
