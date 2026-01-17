import React from 'react';
import { User } from '../types';
import { ClipboardList, Dumbbell, ArrowRight } from 'lucide-react';

interface HomeProps {
  user: User;
  onNavigate: (view: 'dashboard' | 'patients' | 'training') => void;
}

export const Home: React.FC<HomeProps> = ({ user, onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Olá, {user.name.split(' ')[0]}</h1>
        <p className="mt-2 text-lg text-gray-600">Selecione um portal para começar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Portal de Avaliação */}
        <div 
          onClick={() => onNavigate('patients')}
          className="group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 p-8 flex flex-col cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ClipboardList size={120} className="text-gray-900" />
          </div>
          
          <div className="mb-6 bg-blue-50 w-16 h-16 rounded-lg flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors">
            <ClipboardList size={32} className="text-blue-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Portal de Avaliação</h2>
          <p className="text-gray-600 mb-8 flex-grow">
            Realize triagens, anamneses e testes funcionais baseados em protocolos científicos rigorosos.
          </p>
          
          <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
            Acessar Avaliações <ArrowRight size={20} className="ml-2" />
          </div>
        </div>

        {/* Portal de Treinamento */}
        <div 
          onClick={() => onNavigate('training')}
          className="group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 p-8 flex flex-col cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Dumbbell size={120} className="text-gray-900" />
          </div>

          <div className="mb-6 bg-green-50 w-16 h-16 rounded-lg flex items-center justify-center border border-green-100 group-hover:bg-green-100 transition-colors">
            <Dumbbell size={32} className="text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Portal de Treinamento</h2>
          <p className="text-gray-600 mb-8 flex-grow">
            Prescrição de exercícios, periodização e acompanhamento de evolução dos pacientes.
          </p>

          <div className="flex items-center text-green-600 font-semibold group-hover:translate-x-1 transition-transform">
            Acessar Treinos <ArrowRight size={20} className="ml-2" />
          </div>
        </div>
      </div>
      
      <div className="mt-12 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do Sistema</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
             <span className="text-sm text-gray-500 block mb-1">Pacientes Ativos</span>
             <span className="text-2xl font-bold text-gray-900">0</span>
           </div>
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
             <span className="text-sm text-gray-500 block mb-1">Avaliações este mês</span>
             <span className="text-2xl font-bold text-gray-900">0</span>
           </div>
        </div>
      </div>
    </div>
  );
};