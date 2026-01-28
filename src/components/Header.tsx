
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { LogOut, HelpCircle, User as UserIcon, Download, Activity, ChevronDown, UserCircle } from 'lucide-react';
import { Button } from './Button';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onHelp: () => void;
  onInstall: () => void;
  onNavigateToProfile: () => void;
  appName: string;
  appLogoUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onHelp, onInstall, onNavigateToProfile, appName, appLogoUrl }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu se clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    setIsMenuOpen(false);
    onNavigateToProfile();
  };

  const getRoleLabel = (role: string) => {
    if (role === 'ADMIN') return 'Administrador';
    if (role === 'SUBSCRIBER') return 'Assinante';
    return 'Usuário';
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {appLogoUrl ? (
          <img 
            src={appLogoUrl} 
            alt="Logo" 
            className="h-10 w-10 object-contain rounded-md"
          />
        ) : (
          <div className="bg-gray-900 text-white p-1.5 rounded-lg">
             <Activity size={20} strokeWidth={2.5} />
          </div>
        )}
        <span className="text-xl font-bold text-gray-900 tracking-tight">{appName}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Dropdown do Usuário */}
        <div className="relative hidden md:block" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UserIcon size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
            <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded ml-1">
              {getRoleLabel(user.role)}
            </span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200 ring-1 ring-black ring-opacity-5 animate-fade-in">
              <button
                onClick={handleProfileClick}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <UserCircle size={16} className="mr-2 text-gray-500" />
                Meu Perfil
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={onInstall}
          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          title="Instalar Aplicativo"
        >
          <Download size={20} />
        </button>

        <button 
          onClick={onHelp}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title="Como Instalar / Ajuda"
        >
          <HelpCircle size={20} />
        </button>

        <Button 
          variant="ghost" 
          onClick={onLogout}
          className="text-gray-500 hover:text-red-600 hover:bg-red-50"
          title="Sair"
        >
          <LogOut size={20} />
        </Button>
      </div>
    </header>
  );
};
