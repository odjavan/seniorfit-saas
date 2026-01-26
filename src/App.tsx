import React, { useEffect, useState } from 'react';
import { Login } from './pages/Login';
import { Patients } from './pages/Patients';
import { PatientDetails } from './pages/PatientDetails';
import { AdminPanel } from './pages/AdminPanel';
import { Subscribers } from './pages/Subscribers';
import { Integrations } from './pages/Integrations';
import { TrainingDashboard } from './pages/TrainingDashboard';
import { Agenda } from './pages/Agenda';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { authService } from './services/authService';
import { patientService } from './services/patientService';
import { User, Patient } from './types';
import { Modal } from './components/Modal';
import { InstallGuide } from './components/InstallGuide';
import { UpdatePasswordPopup } from './components/UpdatePasswordPopup'; // Novo Componente
import { ToastProvider } from './contexts/ToastContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './lib/supabase'; // Importação do cliente Supabase

// Definição dos tipos de views permitidas
type ViewState = 'patients' | 'patient-details' | 'admin-settings' | 'admin-dashboard' | 'subscribers' | 'integrations' | 'eduzz' | 'crm' | 'training' | 'agenda';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('patients');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Install/Help Modal States
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [helpVideoUrl, setHelpVideoUrl] = useState('');

  // Password Recovery State
  const [showUpdatePasswordModal, setShowUpdatePasswordModal] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    const fetchPatient = async () => {
      if (selectedPatientId) {
        try {
          const p = await patientService.getById(selectedPatientId);
          setSelectedPatient(p);
        } catch (error) {
          console.error("Failed to fetch patient", error);
          setSelectedPatient(null);
        }
      } else {
        setSelectedPatient(null);
      }
    };
    fetchPatient();

    // REALTIME: Inscrever para atualizações deste paciente específico
    let subscription: RealtimeChannel | null = null;
    if (selectedPatientId) {
      subscription = patientService.subscribeById(selectedPatientId, (updatedPatient) => {
        console.log("Realtime Update Received for Patient:", updatedPatient.name);
        setSelectedPatient(updatedPatient);
      });
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [selectedPatientId]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = await authService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();

    // LISTENER DE AUTH: Detecta recuperação de senha
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event Detectado:", event);
      if (event === 'PASSWORD_RECOVERY') {
        setShowUpdatePasswordModal(true);
      }
      
      // Se o usuário logar (inclusive após a recuperação), atualizamos o estado
      if (event === 'SIGNED_IN' && session) {
         const currentUser = await authService.getCurrentUser();
         if (currentUser) setUser(currentUser);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Redirecionamento inicial baseado na Role
  useEffect(() => {
    if (user && !isInitializing) {
      if (user.role === 'ADMIN') {
        if (currentView === 'patients') {
            setCurrentView('admin-dashboard');
        }
      } else {
        const adminOnlyViews = ['admin-dashboard', 'admin-settings', 'subscribers', 'integrations', 'eduzz', 'crm'];
        if (adminOnlyViews.includes(currentView)) {
           setCurrentView('patients');
        }
      }
    }
  }, [user, isInitializing]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setCurrentView('patients');
  };
  
  const toggleHelp = async () => {
    try {
      const settings = await authService.getSettings();
      setHelpVideoUrl(settings.howToInstallVideoUrl);
      setShowInstallHelp(!showInstallHelp);
    } catch (error) {
      console.error("Error loading help video url", error);
      setShowInstallHelp(!showInstallHelp);
    }
  };

  const handleNavigate = (view: ViewState) => {
    const adminViews = ['admin-settings', 'admin-dashboard', 'subscribers', 'integrations', 'eduzz', 'crm'];
    
    if (adminViews.includes(view) && user?.role !== 'ADMIN') {
      alert('Acesso negado. Apenas administradores podem acessar esta área.');
      return;
    }

    if (view !== 'patient-details') {
      setSelectedPatientId(null);
    }
    setCurrentView(view);
  };

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    setCurrentView('patient-details');
  };

  const handleUpdatePatient = (updatedPatient: Patient) => {
    setSelectedPatient(updatedPatient);
  };

  const getEmbedUrl = (url: string) => {
     if (!url) return '';
     const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
     const match = url.match(regExp);
     if (match && match[2].length === 11) {
       return `https://www.youtube.com/embed/${match[2]}`;
     }
     return url;
  };

  // Se estiver carregando, mostra spinner
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Se não tem usuário logado E não estamos no processo de recuperação de senha
  if (!user && !showUpdatePasswordModal) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Se houver usuário, renderiza o Header e Sidebar. 
          Se estiver apenas recuperando a senha (user null mas modal true), renderiza um container vazio de fundo. */}
      {user && (
        <>
          <Header 
            user={user} 
            onLogout={handleLogout} 
            onHelp={toggleHelp} 
            onInstall={() => setShowInstallGuide(true)}
          />
          
          <Sidebar 
            currentView={currentView === 'patient-details' ? 'patients' : currentView} 
            onNavigate={handleNavigate} 
            userRole={user.role}
          />
        </>
      )}
      
      <main className={user ? "pt-16 lg:ml-64 min-h-[calc(100vh-64px)]" : "min-h-screen bg-gray-100"}>
        
        {user && (
          <>
            {/* === ÁREA ADMINISTRATIVA === */}
            {user.role === 'ADMIN' && (
              <>
                {currentView === 'admin-dashboard' && <AdminPanel />}
                {currentView === 'admin-settings' && <AdminPanel />}
                {currentView === 'subscribers' && <Subscribers />}
                
                {(currentView === 'integrations' || currentView === 'eduzz' || currentView === 'crm') && (
                  <Integrations activeView={currentView} />
                )}
              </>
            )}

            {/* === ÁREA CLÍNICA E COMUM === */}
            {currentView === 'agenda' && (
              <Agenda />
            )}
            
            {currentView === 'patients' && (
              <Patients onSelectPatient={handleSelectPatient} />
            )}
            
            {currentView === 'patient-details' && selectedPatientId && selectedPatient && (
              <PatientDetails 
                patient={selectedPatient} 
                onBack={() => handleNavigate('patients')}
                onUpdate={handleUpdatePatient}
              />
            )}
            
            {currentView === 'patient-details' && selectedPatientId && !selectedPatient && (
                <div className="flex items-center justify-center h-full pt-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            )}

            {currentView === 'training' && (
              <TrainingDashboard />
            )}
          </>
        )}
      </main>

      {/* Help Modal */}
      {showInstallHelp && (
         <Modal
            isOpen={showInstallHelp}
            onClose={() => setShowInstallHelp(false)}
            title="Ajuda"
         >
            <div className="space-y-6">
               {helpVideoUrl ? (
                 <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <iframe
                      className="w-full h-64 sm:h-80 rounded-lg"
                      src={getEmbedUrl(helpVideoUrl)}
                      title="Tutorial"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                 </div>
               ) : (
                 <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-yellow-800 text-sm">
                   Nenhum vídeo de instrução configurado pelo administrador.
                 </div>
               )}
               <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-100">
                 Versão 1.28.6 (Stable)
               </div>
            </div>
         </Modal>
      )}

      <InstallGuide isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
      
      {/* Pop-up de Recuperação de Senha */}
      <UpdatePasswordPopup 
        isOpen={showUpdatePasswordModal} 
        onClose={() => setShowUpdatePasswordModal(false)} 
      />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;