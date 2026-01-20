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
import { ToastProvider } from './contexts/ToastContext';

// Definição dos tipos de views permitidas
type ViewState = 'patients' | 'patient-details' | 'admin-settings' | 'admin-dashboard' | 'subscribers' | 'integrations' | 'eduzz' | 'crm' | 'training' | 'agenda';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('patients');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Install/Help Modal States
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [helpVideoUrl, setHelpVideoUrl] = useState('');

  const getSelectedPatient = () => {
    if (!selectedPatientId) return null;
    return patientService.getById(selectedPatientId);
  };

  useEffect(() => {
    const initAuth = () => {
      // Blindagem de Inicialização do Admin
      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  // Redirecionamento inicial baseado na Role
  useEffect(() => {
    if (user && !isInitializing) {
      if (user.role === 'ADMIN') {
        // Se entrar como admin e estiver na home default, joga pro dashboard
        if (currentView === 'patients') {
            setCurrentView('admin-dashboard');
        }
      } else {
        // Se não for admin, garante que não está em rota proibida
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

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setCurrentView('patients');
  };
  
  const toggleHelp = () => {
    const settings = authService.getSettings();
    setHelpVideoUrl(settings.howToInstallVideoUrl);
    setShowInstallHelp(!showInstallHelp);
  };

  const handleNavigate = (view: ViewState) => {
    // Guardião de Rotas Administrativas
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
    // State update handled by re-render triggered by service update
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

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
      
      <main className="pt-16 lg:ml-64 min-h-[calc(100vh-64px)]">
        
        {/* === ÁREA ADMINISTRATIVA === */}
        {user.role === 'ADMIN' && (
          <>
            {currentView === 'admin-dashboard' && <AdminPanel />}
            {currentView === 'admin-settings' && <AdminPanel />}
            {currentView === 'subscribers' && <Subscribers />}
            
            {/* Rota unificada para Integrações, Eduzz e CRM */}
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
        
        {currentView === 'patient-details' && selectedPatientId && (
          <PatientDetails 
            patient={getSelectedPatient()!} 
            onBack={() => handleNavigate('patients')}
            onUpdate={handleUpdatePatient}
          />
        )}

        {currentView === 'training' && (
          <TrainingDashboard />
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
                 Versão 1.28.3 (Master Stable)
               </div>
            </div>
         </Modal>
      )}

      <InstallGuide isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
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