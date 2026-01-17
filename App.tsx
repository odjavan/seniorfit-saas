import React, { useEffect, useState } from 'react';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Patients } from './pages/Patients';
import { PatientDetails } from './pages/PatientDetails';
import { History } from './pages/History';
import { AdminPanel } from './pages/AdminPanel';
import { AdminHome } from './pages/AdminHome';
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

type ViewState = 'dashboard' | 'patients' | 'patient-details' | 'history' | 'admin-settings' | 'admin-dashboard' | 'subscribers' | 'integrations' | 'eduzz' | 'crm' | 'training' | 'agenda';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
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
    if (user && user.role === 'ADMIN' && currentView === 'dashboard') {
      setCurrentView('admin-dashboard');
    }
  }, [user]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'ADMIN') {
      setCurrentView('admin-dashboard');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setCurrentView('dashboard');
  };
  
  const toggleHelp = () => {
    const settings = authService.getSettings();
    setHelpVideoUrl(settings.howToInstallVideoUrl);
    setShowInstallHelp(!showInstallHelp);
  };

  const handleNavigate = (view: ViewState) => {
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
    // State update handled by re-render triggered by view change or local mutation
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
        onNavigate={(view) => handleNavigate(view as ViewState)} 
        userRole={user.role}
      />
      
      <main className="pt-16 lg:ml-64 min-h-[calc(100vh-64px)]">
        {currentView === 'dashboard' && (
          <Home user={user} onNavigate={(v) => handleNavigate(v as ViewState)} />
        )}

        {currentView === 'admin-dashboard' && user.role === 'ADMIN' && (
          <AdminHome onNavigate={(v) => handleNavigate(v)} />
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

        {currentView === 'history' && (
           <History />
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

      {/* Install Guide Modal */}
      <InstallGuide isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
    </div>
  );
}

export default App;