import React from 'react';
import { Users, Settings, BarChart3, Database, Dumbbell, Calendar, Home, Zap, DollarSign, Bell } from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: 'patients' | 'admin-settings' | 'subscribers' | 'admin-dashboard' | 'training' | 'agenda' | 'integrations' | 'eduzz' | 'crm') => void;
  userRole?: Role;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, userRole }) => {
  let menuItems = [];

  // Definição estrita dos menus baseada na Role
  if (userRole === 'ADMIN') {
    menuItems = [
      { id: 'admin-dashboard', label: 'Painel Master', icon: BarChart3 },
      { id: 'subscribers', label: 'Gestão Assinantes', icon: Users },
      { id: 'patients', label: 'Pacientes (Clínica)', icon: Database }, 
      { id: 'agenda', label: 'Agenda Master', icon: Calendar },
      { id: 'training', label: 'Treinamento', icon: Dumbbell },
      { id: 'integrations', label: 'Integrações & API', icon: Zap },
      { id: 'eduzz', label: 'Eduzz Financeiro', icon: DollarSign },
      { id: 'crm', label: 'CRM & Notificações', icon: Bell },
      { id: 'admin-settings', label: 'Configurações', icon: Settings },
    ];
  } else {
    // Menu para Treinadores/Personais e Assinantes
    menuItems = [
      { id: 'patients', label: 'Pacientes', icon: Users },
      { id: 'agenda', label: 'Agenda', icon: Calendar },
      { id: 'training', label: 'Treinamento', icon: Dumbbell },
    ];
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 hidden lg:block overflow-y-auto z-40 no-scrollbar">
      <div className="p-4">
        {userRole === 'ADMIN' && (
           <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-md text-xs font-bold uppercase tracking-wider text-center">
             Modo Administrador
           </div>
        )}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as any)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-md'
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
      
      {/* Rodapé da Sidebar */}
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-gray-50">
        <div className="text-xs text-center text-gray-400">
          SeniorFit v1.28.2 (Secure)
        </div>
      </div>
    </aside>
  );
};