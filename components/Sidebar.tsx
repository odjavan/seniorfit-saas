import React from 'react';
import { LayoutDashboard, Users, History, Settings, BarChart3, Database, Dumbbell, Calendar } from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: 'dashboard' | 'patients' | 'history' | 'admin-settings' | 'subscribers' | 'admin-dashboard' | 'training' | 'agenda') => void;
  userRole?: Role;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, userRole }) => {
  let menuItems = [];

  if (userRole === 'ADMIN') {
    menuItems = [
      { id: 'admin-dashboard', label: 'Painel Master', icon: BarChart3 },
      { id: 'subscribers', label: 'Gestão Assinantes', icon: Users },
      { id: 'patients', label: 'Pacientes (Clínica)', icon: Database }, 
      { id: 'agenda', label: 'Agenda Master', icon: Calendar },
      { id: 'training', label: 'Treinamento', icon: Dumbbell },
      { id: 'admin-settings', label: 'Configurações', icon: Settings },
    ];
  } else {
    menuItems = [
      { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
      { id: 'agenda', label: 'Agenda', icon: Calendar },
      { id: 'patients', label: 'Pacientes', icon: Users },
      { id: 'training', label: 'Treinamento', icon: Dumbbell },
      { id: 'history', label: 'Histórico', icon: History },
    ];
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 hidden lg:block overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as any)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};