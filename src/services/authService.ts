import { User, Session, Role, SystemSettings, IntegrationSettings } from '../types';
import { generateId } from '../utils/generateId';

const STORAGE_KEYS = {
  USER: 'seniorfit_user',
  SESSION: 'seniorfit_session',
  ALL_USERS: 'sf_users',
  SETTINGS: 'sf_settings',
  INTEGRATIONS: 'sf_integrations',
};

// Mock admin for initialization - Garantia de acesso
const MOCK_ADMIN: User = {
  id: 'admin-001',
  email: 'admin@seniorfit.com',
  name: 'Administrador Master',
  role: 'ADMIN',
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
      const adminExists = users.some(u => u.email === MOCK_ADMIN.email);
      
      if (!adminExists) {
        console.log("Inicializando sistema: Criando Admin padrão.");
        users.unshift(MOCK_ADMIN);
        localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
      }
      return users;
    } catch (error) {
      // Fallback de segurança se o JSON estiver corrompido
      console.error("Erro no armazenamento de usuários. Resetando para padrão.", error);
      const safeUsers = [MOCK_ADMIN];
      localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(safeUsers));
      return safeUsers;
    }
  },

  login: async (email: string, password: string): Promise<User> => {
    // Simulate API delay
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
         // Lógica de Senha: '123456' ou CPF (apenas números)
         const cpfPassword = found.cpf ? found.cpf.replace(/\D/g, '') : null;
         
         if (password === '123456' || (cpfPassword && password === cpfPassword)) {
           userToLogin = found;
         }
       }
    }

    if (userToLogin) {
      // Garantia de Role: Se perdeu a role, restaura baseada no e-mail
      if (!userToLogin.role) {
         userToLogin.role = userToLogin.email === MOCK_ADMIN.email ? 'ADMIN' : 'SUBSCRIBER';
      }

      const session: Session = {
        userId: userToLogin.id,
        token: `token-${generateId()}`, // Uso seguro de generateId
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      try {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userToLogin));
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        
        // Garante que a lista global esteja sincronizada se o admin logar
        if (userToLogin.id === MOCK_ADMIN.id) {
           authService.getAllUsers(); 
        }
      } catch (error) {
        console.error('Failed to save session', error);
        throw new Error('Erro ao salvar sessão local.');
      }

      return userToLogin;
    }

    throw new Error('Credenciais inválidas. Se foi cadastrado via Eduzz, sua senha é o seu CPF (apenas números).');
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
      
      // Validação Extra de Role no retorno
      if (user.email === MOCK_ADMIN.email && user.role !== 'ADMIN') {
         user.role = 'ADMIN'; // Correção em tempo de execução
         localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }

      return user;
    } catch (error) {
      console.error('Error retrieving user from storage', error);
      return null;
    }
  },

  // --- User Management ---

  createUser: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const users = authService.getAllUsers();
    if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      throw new Error('E-mail já cadastrado.');
    }

    const newUser: User = {
      ...user,
      id: generateId(), // ID Seguro
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
      
      // Se o usuário atualizado for o mesmo logado, atualiza a sessão
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

  // --- System Settings ---

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

  // --- Integration Settings ---

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

  // --- Webhook Simulation (Eduzz) ---

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
        id: generateId(), // ID Seguro
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

  // --- Metrics ---

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