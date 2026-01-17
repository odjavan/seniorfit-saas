import React, { useState, useEffect } from 'react';
import { Download, Users, Zap, DollarSign, Bell } from 'lucide-react';
import { Button } from '../components/Button';
import { authService } from '../services/authService';

interface AdminHomeProps {
  onNavigate: (view: 'subscribers' | 'crm' | 'eduzz') => void;
}

export const AdminHome: React.FC<AdminHomeProps> = ({ onNavigate }) => {
  const [recentSubscribers, setRecentSubscribers] = useState(0);

  useEffect(() => {
    // Load real metrics
    setRecentSubscribers(authService.getRecentSubscribersCount());
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Section: Banner & Quick Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Welcome Banner */}
        <div className="lg:col-span-2 bg-gray-900 rounded-xl p-8 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Painel Master</h1>
            <p className="text-gray-300 max-w-md mb-6">
              Visão geral de crescimento, retenção e saúde financeira da plataforma SeniorFit.
            </p>
            <div className="flex gap-3">
               <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                 Sistema Operacional
               </span>
               <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                 v1.17 Stable
               </span>
            </div>
          </div>
          {/* Abstract Pattern Background */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.1,-46.6C90.4,-34.1,96.1,-19.2,95.8,-4.4C95.5,10.5,89.2,25.2,80.3,37.7C71.3,50.2,59.7,60.5,47.1,68.6C34.5,76.7,20.8,82.6,6.4,81.4C-8,80.3,-23.1,72.1,-35.1,63.1C-47.1,54.1,-56,44.3,-65.4,32.7C-74.8,21.1,-84.7,7.7,-85.4,-6.1C-86.1,-19.9,-77.6,-34.1,-66.6,-44.6C-55.6,-55.1,-42.1,-61.9,-29.2,-69.8C-16.3,-77.7,-4,-86.7,9.8,-88.4C23.6,-90.1,47.2,-84.5,44.7,-76.4Z" transform="translate(100 100)" />
            </svg>
          </div>
        </div>

        {/* Quick Metrics Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
             <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-4">Métricas Rápidas (24h)</h3>
             <div className="flex items-center justify-between mb-4">
                <div>
                   <span className="block text-3xl font-black text-gray-900">+{recentSubscribers}</span>
                   <span className="text-sm text-green-600 font-bold flex items-center">
                     <TrendingUpIcon className="w-3 h-3 mr-1" /> Novos Assinantes
                   </span>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                  <Users size={24} />
                </div>
             </div>
             <div className="flex items-center justify-between">
                <div>
                   <span className="block text-3xl font-black text-gray-900">68%</span>
                   <span className="text-sm text-blue-600 font-bold">Taxa de Abertura</span>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <Zap size={24} />
                </div>
             </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
             <Button variant="outline" fullWidth className="flex items-center justify-center">
               <Download size={16} className="mr-2" /> Baixar Relatório Mensal
             </Button>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ASSINANTES CARD */}
        <div 
          onClick={() => onNavigate('subscribers')}
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-blue-600"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Users size={28} />
            </div>
            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Gestão</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Assinantes</h3>
          <p className="text-gray-500 text-sm">
            Gerencie usuários, status de pagamento e acessos manuais.
          </p>
        </div>

        {/* CRM CARD */}
        <div 
          onClick={() => onNavigate('crm')}
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-purple-600"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
              <Bell size={28} />
            </div>
            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Notificações</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">CRM & Push 3.0</h3>
          <p className="text-gray-500 text-sm">
            Configure réguas de relacionamento e notificações do sistema.
          </p>
        </div>

        {/* EDUZZ CARD */}
        <div 
          onClick={() => onNavigate('eduzz')}
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-yellow-500"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg group-hover:bg-yellow-100 transition-colors">
              <DollarSign size={28} />
            </div>
            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Integração</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Eduzz Hub</h3>
          <p className="text-gray-500 text-sm">
            Monitore vendas, webhooks e logs de transação em tempo real.
          </p>
        </div>
      </div>
    </div>
  );
};

// Simple Icon component for reuse
const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
);
