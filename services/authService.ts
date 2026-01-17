import { User, Session, Role, SystemSettings, IntegrationSettings } from '../types';

const STORAGE_KEYS = {
  USER: 'seniorfit_user',
  SESSION: 'seniorfit_session',
  ALL_USERS: 'sf_users',
  SETTINGS: 'sf_settings',
  INTEGRATIONS: 'sf_integrations',
};

// Mock admin for initialization
const MOCK_ADMIN: User = {
  id: 'admin-001',
  email: 'admin@seniorfit.com',
  name: 'Administrador',
  role: 'ADMIN',
  createdAt: new Date().toISOString(),
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
  login: async (email: string, password: string): Promise<User> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    let userToLogin: User | undefined;

    if (email === MOCK_ADMIN.email && password === 'admin') {
      userToLogin = MOCK_ADMIN;
    } else {
       // Check stored users
       const users = authService.getAllUsers();
       const found = users.find(u => u.email === email);
       
       if (found) {
         // Check password: 
         // 1. '123456' (default for manual creation)
         // 2. CPF digits (for Eduzz auto-creation)
         const cpfPassword = found.cpf ? found.cpf.replace(/\D/g, '') : null;
         
         if (password === '123456' || (cpfPassword && password === cpfPassword)) {
           userToLogin = found;
         }
       }
    }

    if (userToLogin) {
      const session: Session = {
        userId: userToLogin.id,
        token: 'mock-jwt-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      try {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userToLogin));
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      } catch (error) {
        console.error('Failed to save session to localStorage', error);
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

      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error retrieving user from storage', error);
      return null;
    }
  },

  // --- User Management ---

  getAllUsers: (): User[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALL_USERS);
      const users: User[] = data ? JSON.parse(data) : [];
      
      // Ensure Mock Admin is always present in the list logic or handled separately
      if (!users.some(u => u.id === MOCK_ADMIN.id)) {
        users.unshift(MOCK_ADMIN);
        localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
      }
      return users;
    } catch (error) {
      return [MOCK_ADMIN];
    }
  },

  createUser: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const users = authService.getAllUsers();
    if (users.some(u => u.email === user.email)) {
      throw new Error('E-mail já cadastrado.');
    }

    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
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
      // Ensure gemini object exists for legacy data compatibility
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
    // Payload expected: cus_name, cus_email, cus_taxnumber, cus_cel, chk_status
    // chk_status: 3 = paid

    const status = payload.chk_status?.toString();
    // Validate Status (3 = Paid)
    if (status !== '3' && status !== 'paid') {
      throw new Error(`Webhook ignorado: Status da fatura é '${status}' (Esperado: 3 ou paid). O sistema só cria usuários com pagamento confirmado.`);
    }

    const email = payload.cus_email;
    if (!email) throw new Error('Dados inválidos: E-mail do cliente não encontrado.');

    const users = authService.getAllUsers();
    const existingUserIndex = users.findIndex(u => u.email === email);

    if (existingUserIndex !== -1) {
      // Update existing user
      const user = users[existingUserIndex];
      user.role = 'SUBSCRIBER'; // Upgrade/Ensure role
      user.subscriptionStatus = 'active';
      user.lastPaymentDate = new Date().toISOString();
      if (payload.cus_taxnumber) user.cpf = payload.cus_taxnumber;
      if (payload.trans_cod) user.eduzzId = payload.trans_cod;
      
      users[existingUserIndex] = user;
      localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
      return { action: 'updated', user };
    } else {
      // Create new user
      const newUser: User = {
        id: crypto.randomUUID(),
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