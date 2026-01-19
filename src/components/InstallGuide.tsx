import React from 'react';
import { Modal } from './Modal';
import { Share, PlusSquare, MoreVertical, Download } from 'lucide-react';

interface InstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallGuide: React.FC<InstallGuideProps> = ({ isOpen, onClose }) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Instalar Aplicativo">
      <div className="space-y-8">
        <div className="text-center">
           <div className="mx-auto w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
             <span className="text-2xl font-bold">SF</span>
           </div>
           <h3 className="text-xl font-bold text-gray-900">SeniorFit App</h3>
           <p className="text-gray-500">Tenha acesso rápido direto da sua tela inicial.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* iOS Instructions */}
          <div className={`p-5 rounded-xl border ${isIOS ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500' : 'bg-gray-50 border-gray-100'}`}>
             <h4 className="font-bold text-gray-900 mb-4 flex items-center">
               📱 iPhone / iPad (iOS)
             </h4>
             <ol className="space-y-4 text-sm text-gray-700">
               <li className="flex items-start">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs border border-gray-200 mr-3">1</span>
                 <span>Toque no botão <strong>Compartilhar</strong> <Share className="inline w-4 h-4 mx-1" /> na barra inferior do Safari.</span>
               </li>
               <li className="flex items-start">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs border border-gray-200 mr-3">2</span>
                 <span>Role para cima e selecione <strong>Adicionar à Tela de Início</strong> <PlusSquare className="inline w-4 h-4 mx-1" />.</span>
               </li>
               <li className="flex items-start">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs border border-gray-200 mr-3">3</span>
                 <span>Confirme clicando em <strong>Adicionar</strong> no canto superior direito.</span>
               </li>
             </ol>
          </div>

          {/* Android Instructions */}
          <div className={`p-5 rounded-xl border ${!isIOS ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500' : 'bg-gray-50 border-gray-100'}`}>
             <h4 className="font-bold text-gray-900 mb-4 flex items-center">
               🤖 Android (Chrome)
             </h4>
             <ol className="space-y-4 text-sm text-gray-700">
               <li className="flex items-start">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs border border-gray-200 mr-3">1</span>
                 <span>Toque no menu de três pontos <MoreVertical className="inline w-4 h-4 mx-1" /> no canto superior direito.</span>
               </li>
               <li className="flex items-start">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs border border-gray-200 mr-3">2</span>
                 <span>Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong> <Download className="inline w-4 h-4 mx-1" />.</span>
               </li>
               <li className="flex items-start">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs border border-gray-200 mr-3">3</span>
                 <span>Siga as instruções na tela para confirmar.</span>
               </li>
             </ol>
          </div>
        </div>

        <div className="text-center">
           <button onClick={onClose} className="text-blue-600 font-semibold hover:underline">
             Entendi, fechar guia.
           </button>
        </div>
      </div>
    </Modal>
  );
};