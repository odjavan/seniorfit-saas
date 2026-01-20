import { User, Session, Role, SystemSettings, IntegrationSettings } from '../types';
import { generateId } from '../utils/generateId';

const STORAGE_KEYS = {
  USER: 'seniorfit_user',
  SESSION: 'seniorfit_session',
  ALL_USERS: 'sf_users',
  SETTINGS: 'sf_settings',
  INTEGRATIONS: 'sf_integrations',
};

// Mock admin for initialization - A CONSTANTE MESTRA
const MOCK_ADMIN: User = {
  id: 'admin-001',
  email: 'admin@seniorfit.com',
  name: 'Administrador Master',
  role: 'ADMIN', // Esta regra é imutável
  createdAt: new Date().toISOString(),
  subscriptionStatus: 'active'
};

const DEFAULT_SETTINGS: SystemSettings = {
  howToInstallVideoUrl: '',
};

const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  emailjs: {
    serviceId: '',
    templateIdRecovery: '',
    templateIdWelcome: '',
    publicKey: '',
  },
  eduzz: {
    webhookUrl: 'https://api.seniorfit-app.com/webhooks/eduzz',
    liveKey: '',
    appUrl: '',
  },
  gemini: {
    apiKey: '',
  }
};

export const authService = {
  // --- Initialization & User Retrieval ---
  getAllUsers: (): User[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALL_USERS);
      let users: User[] = data ? JSON.parse(data) : [];
      
      // Verificação de Integridade: Admin deve sempre existir
      const adminIndex = users.findIndex(u => u.email === MOCK_ADMIN.email);
      
      if (adminIndex === -1) {
        console.log("Inicializando sistema: Criando Admin padrão.");
        users.unshift(MOCK_ADMIN);
        localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
      } else if (users[adminIndex].role !== 'ADMIN') {
        // Correção de integridade da base de dados
        console.warn("Corrigindo role do Admin na base de dados.");
        users[adminIndex].role = 'ADMIN';
        localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
      }
      return users;
    } catch (error) {
      console.error("Erro no armazenamento de usuários. Resetando para padrão.", error);
      const safeUsers = [MOCK_ADMIN];
      localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(safeUsers));
      return safeUsers;
    }
  },

  login: async (email: string, password: string): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    let userToLogin: User | undefined;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verificação de Admin Hardcoded (Backup de Acesso)
    if (normalizedEmail === MOCK_ADMIN.email && password === 'admin') {
      userToLogin = MOCK_ADMIN;
    } else {
       // 2. Verificação na Base de Dados Local
       const users = authService.getAllUsers();
       const found = users.find(u => u.email.toLowerCase() === normalizedEmail);
       
       if (found) {
         const cpfPassword = found.cpf ? found.cpf.replace(/\D/g, '') : null;
         if (password === '123456' || (cpfPassword && password === cpfPassword)) {
           userToLogin = found;
         }
       }
    }

    if (userToLogin) {
      // Garantia de Role: Força ADMIN para o email mestre
      if (userToLogin.email === MOCK_ADMIN.email) {
         userToLogin.role = 'ADMIN'; 
      }

      const session: Session = {
        userId: userToLogin.id,
        token: `token-${generateId()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      try {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userToLogin));
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        
        // Sincroniza a lista global
        if (userToLogin.id === MOCK_ADMIN.id) {
           authService.getAllUsers(); 
        }
      } catch (error) {
        throw new Error('Erro ao salvar sessão local.');
      }

      return userToLogin;
    }

    throw new Error('Credenciais inválidas.');
  },

  logout: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch (error) {
      console.error('Failed to clear session', error);
    }
  },

  getCurrentUser: (): User | null => {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);

      if (!userStr || !sessionStr) return null;

      const session: Session = JSON.parse(sessionStr);
      if (new Date(session.expiresAt) < new Date()) {
        authService.logout();
        return null;
      }

      const user: User = JSON.parse(userStr);
      
      // === AUTO-CORRECTION & SELF-HEALING ===
      // Se detectarmos o email do admin mas a role estiver errada,
      // corrigimos o objeto EM MEMÓRIA e no DISCO imediatamente.
      if (user.email === MOCK_ADMIN.email && user.role !== 'ADMIN') {
         console.warn("SISTEMA DE SEGURANÇA: Restaurando privilégios de Admin.");
         user.role = 'ADMIN'; 
         
         // Atualiza Sessão Atual
         localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
         
         // Atualiza Base de Dados
         const allUsers = authService.getAllUsers();
         const idx = allUsers.findIndex(u => u.email === MOCK_ADMIN.email);
         if (idx !== -1) {
             allUsers[idx].role = 'ADMIN';
             localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(allUsers));
         }
      }

      return user;
    } catch (error) {
      return null;
    }
  },

  // --- CRUD User ---

  createUser: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const users = authService.getAllUsers();
    if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      throw new Error('E-mail já cadastrado.');
    }

    const newUser: User = {
      ...user,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
    return newUser;
  },

  updateUser: (user: User): void => {
    const users = authService.getAllUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
      localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
      
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.id === user.id) {
         localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }
    }
  },

  deleteUser: (userId: string): void => {
    if (userId === MOCK_ADMIN.id) throw new Error('Não é possível excluir o administrador principal.');
    let users = authService.getAllUsers();
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
  },

  // --- Settings ---

  getSettings: (): SystemSettings => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch (error) {
      return DEFAULT_SETTINGS;
    }
  },

  updateSettings: (settings: SystemSettings): void => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getIntegrationSettings: (): IntegrationSettings => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INTEGRATIONS);
      const settings = data ? JSON.parse(data) : DEFAULT_INTEGRATIONS;
      if (!settings.gemini) settings.gemini = DEFAULT_INTEGRATIONS.gemini;
      return settings;
    } catch (error) {
      return DEFAULT_INTEGRATIONS;
    }
  },

  updateIntegrationSettings: (settings: IntegrationSettings): void => {
    localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(settings));
  },

  // --- Eduzz Simulation ---

  simulateEduzzWebhook: (payload: any) => {
    const status = payload.chk_status?.toString();
    if (status !== '3' && status !== 'paid') {
      throw new Error(`Webhook ignorado: Status '${status}' não é pago.`);
    }

    const email = payload.cus_email;
    if (!email) throw new Error('Dados inválidos: E-mail não encontrado.');

    const users = authService.getAllUsers();
    const existingUserIndex = users.findIndex(u => u.email === email);

    if (existingUserIndex !== -1) {
      const user = users[existingUserIndex];
      user.role = 'SUBSCRIBER';
      user.subscriptionStatus = 'active';
      user.lastPaymentDate = new Date().toISOString();
      if (payload.cus_taxnumber) user.cpf = payload.cus_taxnumber;
      if (payload.trans_cod) user.eduzzId = payload.trans_cod;
      
      users[existingUserIndex] = user;
      localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
      return { action: 'updated', user };
    } else {
      const newUser: User = {
        id: generateId(),
        name: payload.cus_name || email.split('@')[0],
        email: email,
        role: 'SUBSCRIBER',
        createdAt: new Date().toISOString(),
        subscriptionStatus: 'active',
        cpf: payload.cus_taxnumber,
        lastPaymentDate: new Date().toISOString(),
        eduzzId: payload.trans_cod
      };
      
      users.push(newUser);
      localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
      return { action: 'created', user: newUser };
    }
  },

  getRecentSubscribersCount: (): number => {
    try {
      const users = authService.getAllUsers();
      const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
      return users.filter(u => 
        u.role === 'SUBSCRIBER' && 
        new Date(u.createdAt).getTime() > oneDayAgo
      ).length;
    } catch (e) {
      return 0;
    }
  }
};