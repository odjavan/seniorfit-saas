import React, { useEffect, useState } from 'react';
import { Login } from './pages/Login';
import { Patients } from './pages/Patients';
import { PatientDetails } from './pages/PatientDetails';
import { AdminPanel } from './pages/AdminPanel';
// import { AdminHome } from './pages/AdminHome'; // REMOVIDO: Arquivo não existe
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

type ViewState = 'patients' | 'patient-details' | 'admin-settings' | 'admin-dashboard' | 'subscribers' | 'integrations' | 'eduzz' | 'crm' | 'training' | 'agenda';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('patients');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Install/Help Modal
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [helpVideoUrl, setHelpVideoUrl] = useState('');

  const getSelectedPatient = () => {
    if (!selectedPatientId) return null;
    return patientService.getById(selectedPatientId);
  };

  useEffect(() => {
    const initAuth = () => {
      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        setCurrentView('admin-dashboard');
      } else {
        setCurrentView('patients');
      }
    }
  }, [user]);

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

  const handleNavigate = (view: any) => { // FIX: Type 'any' to resolve TS7006
    // Basic Role Guard
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
    // State update handled by re-render
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
        onNavigate={(v: any) => handleNavigate(v)} 
        userRole={user.role}
      />
      
      <main className="pt-16 lg:ml-64 min-h-[calc(100vh-64px)]">
        
        {/* FALLBACK: Como AdminHome foi removido, usamos AdminPanel para o dashboard */}
        {currentView === 'admin-dashboard' && user.role === 'ADMIN' && (
          <AdminPanel />
        )}

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

        {currentView === 'admin-settings' && user.role === 'ADMIN' && (
          <AdminPanel />
        )}

        {currentView === 'subscribers' && user.role === 'ADMIN' && (
          <Subscribers />
        )}

        {(currentView === 'integrations' || currentView === 'eduzz' || currentView === 'crm') && user.role === 'ADMIN' && (
          <Integrations />
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
                 Versão 1.19.0 (Agenda & PWA)
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
