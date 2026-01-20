import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, Calendar, Activity } from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { patientService } from '../services/patientService';
import { trainingService } from '../services/trainingService';
import { Patient, TrainingPlan } from '../types';
import { useToast } from '../contexts/ToastContext';

export const TrainingDashboard: React.FC = () => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    patientId: '',
    objective: 'Hipertrofia' as TrainingPlan['objective'],
    frequency: '2x' as TrainingPlan['frequency']
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Planos de treino ainda são locais (sync), mas pacientes são do Supabase (async)
      setPlans(trainingService.getAllPlans());
      
      const fetchedPatients = await patientService.getAll();
      setPatients(fetchedPatients);
    } catch (error) {
      console.error("Erro ao carregar dados de treinamento:", error);
    }
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) {
      addToast('Selecione um aluno.', 'warning');
      return;
    }

    const patient = patients.find(p => p.id === formData.patientId);
    if (!patient) return;

    try {
      trainingService.createPlan({
        patientId: formData.patientId,
        patientName: patient.name,
        objective: formData.objective,
        frequency: formData.frequency
      });
      
      setIsModalOpen(false);
      setFormData({ patientId: '', objective: 'Hipertrofia', frequency: '2x' });
      loadData();
      addToast('Plano de treino criado (Rascunho).', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Dumbbell className="mr-3 text-green-600" /> Portal de Treinamento
          </h1>
          <p className="text-gray-600 mt-1">Gestão de prescrições e periodização.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="blue">
          <Plus size={20} className="mr-2" /> Novo Treino
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
          <div className="mx-auto h-16 w-16 text-gray-300 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
            <Dumbbell size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Nenhum plano de treino ativo</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-1 mb-6">Comece criando uma nova prescrição para seus alunos.</p>
          <Button onClick={() => setIsModalOpen(true)} variant="outline">
            Criar Primeiro Treino
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6 relative group cursor-pointer">
               <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold">
                     {plan.patientName.charAt(0)}
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors">{plan.patientName}</h3>
                     <p className="text-xs text-gray-500 flex items-center">
                       <Calendar size={12} className="mr-1" /> {new Date(plan.createdAt).toLocaleDateString()}
                     </p>
                   </div>
                 </div>
                 <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                   plan.status === 'active' ? 'bg-green-100 text-green-800' :
                   plan.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                   'bg-gray-100 text-gray-800'
                 }`}>
                   {plan.status === 'active' ? 'Ativo' : plan.status === 'draft' ? 'Rascunho' : 'Concluído'}
                 </span>
               </div>
               
               <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                   <span className="text-gray-500 flex items-center"><Activity size={14} className="mr-2" /> Objetivo</span>
                   <span className="font-semibold text-gray-900">{plan.objective}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 flex items-center"><Calendar size={14} className="mr-2" /> Frequência</span>
                   <span className="font-semibold text-gray-900">{plan.frequency}</span>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Plano de Treino"
      >
        <form onSubmit={handleCreatePlan} className="space-y-6">
           <div>
             <label className="block text-sm font-bold text-gray-900 mb-1">Selecione o Aluno</label>
             <select 
               className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
               value={formData.patientId}
               onChange={e => setFormData({...formData, patientId: e.target.value})}
               required
             >
               <option value="">Selecione...</option>
               {patients.map(p => (
                 <option key={p.id} value={p.id}>{p.name}</option>
               ))}
             </select>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-gray-900 mb-1">Objetivo Principal</label>
               <select 
                 className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                 value={formData.objective}
                 onChange={e => setFormData({...formData, objective: e.target.value as any})}
               >
                 <option value="Hipertrofia">Hipertrofia</option>
                 <option value="Equilíbrio">Equilíbrio</option>
                 <option value="Flexibilidade">Flexibilidade</option>
                 <option value="Potência">Potência</option>
               </select>
             </div>
             
             <div>
               <label className="block text-sm font-bold text-gray-900 mb-1">Frequência Semanal</label>
               <select 
                 className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                 value={formData.frequency}
                 onChange={e => setFormData({...formData, frequency: e.target.value as any})}
               >
                 <option value="2x">2x na Semana</option>
                 <option value="3x">3x na Semana</option>
               </select>
             </div>
           </div>

           <div className="flex justify-end pt-4 gap-3">
             <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
             <Button type="submit" variant="blue" className="bg-green-600 hover:bg-green-700">Gerar Treino</Button>
           </div>
        </form>
      </Modal>
    </div>
  );
};