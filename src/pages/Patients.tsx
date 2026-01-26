import React, { useState, useEffect } from 'react';
import { Plus, Search, User as UserIcon, Calendar, Scale, Ruler, Activity, CheckCircle2, MessageCircle, Edit, Trash2, LayoutGrid, List } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { patientService } from '../services/patientService';
import { Patient } from '../types';
import { useToast } from '../contexts/ToastContext';

interface PatientsProps {
  onSelectPatient?: (patientId: string) => void;
}

export const Patients: React.FC<PatientsProps> = ({ onSelectPatient }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // State for Modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    sex: 'M' as 'M' | 'F',
    weight: '',
    height: '',
    whatsapp: '',
    ethnicity: '' as 'branco' | 'pardo' | 'negro' | 'asiático' | ''
  });

  // Computed Values State
  const [computed, setComputed] = useState({
    age: 0,
    bmi: 0
  });

  useEffect(() => {
    loadPatients();
  }, []);

  // Update calculations in real-time when relevant fields change
  useEffect(() => {
    let age = 0;
    let bmi = 0;

    // Calculate Age
    if (formData.birthDate) {
      const today = new Date();
      const birthDate = new Date(formData.birthDate);
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Calculate BMI: weight (kg) / height (m)^2
    const w = parseFloat(formData.weight);
    const h = parseFloat(formData.height);
    
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      const bmiValue = w / (h * h);
      bmi = parseFloat(bmiValue.toFixed(2));
    }

    setComputed({ age: Math.max(0, age), bmi });
  }, [formData.birthDate, formData.weight, formData.height]);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch (error) {
      console.error("Erro ao carregar pacientes", error);
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setIsLoading(true);
    try {
      const data = await patientService.search(term);
      setPatients(data);
    } catch (error) {
      console.error("Erro na busca", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPatient) {
        // Update Logic (Async)
        // A função update agora recebe o ID implicitamente via objeto patient
        await patientService.update({
          ...editingPatient,
          name: formData.name,
          birthDate: formData.birthDate,
          sex: formData.sex,
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          whatsapp: formData.whatsapp,
          ethnicity: formData.ethnicity || undefined,
          age: computed.age,
          bmi: computed.bmi
        });
        addToast('Aluno atualizado com sucesso!', 'success');
      } else {
        // Create Logic (Async)
        await patientService.create({
          name: formData.name,
          birthDate: formData.birthDate,
          sex: formData.sex,
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          whatsapp: formData.whatsapp,
          ethnicity: formData.ethnicity || undefined,
          age: computed.age,
          bmi: computed.bmi
        });
        addToast('Aluno cadastrado com sucesso!', 'success');
      }

      closeModal();
      loadPatients(); // Reload list
    } catch (error: any) {
      console.error(error);
      addToast(`Erro ao salvar aluno: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (patient: Patient) => {
    if (window.confirm(`Tem certeza de que deseja excluir ${patient.name}? Esta ação não pode ser desfeita.`)) {
      try {
        await patientService.delete(patient.id);
        addToast('Aluno excluído com sucesso.', 'success');
        loadPatients();
      } catch (error: any) {
        addToast(`Erro ao excluir: ${error.message}`, 'error');
      }
    }
  };

  const getProgress = (patient: Patient) => {
    if (!patient.tests) return 0;
    const completed = patient.tests.filter(t => t.status === 'completed').length;
    // Total standard tests = 8
    return Math.min(100, Math.round((completed / 8) * 100));
  };

  const openModal = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        name: patient.name,
        birthDate: patient.birthDate,
        sex: patient.sex,
        weight: String(patient.weight),
        height: String(patient.height),
        whatsapp: patient.whatsapp,
        ethnicity: patient.ethnicity || ''
      });
    } else {
      setEditingPatient(null);
      setFormData({
        name: '',
        birthDate: '',
        sex: 'M',
        weight: '',
        height: '',
        whatsapp: '',
        ethnicity: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Alunos</h1>
          <p className="text-gray-600 mt-1">Gerencie os alunos e suas avaliações</p>
        </div>
        <div className="flex gap-2">
           <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
             <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                title="Visualização em Grade"
             >
                <LayoutGrid size={20} />
             </button>
             <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                title="Visualização em Lista"
             >
                <List size={20} />
             </button>
           </div>
           <Button onClick={() => openModal()} variant="blue">
             <Plus size={20} className="mr-2" /> Novo Aluno
           </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={20} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar aluno por nome..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 sm:text-sm transition-colors"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {/* Loading State */}
      {isLoading ? (
         <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
         </div>
      ) : (
        <>
          {patients.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <UserIcon size={48} />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum aluno cadastrado</h3>
              <p className="mt-1 text-sm text-gray-500">Comece adicionando um novo aluno ao sistema.</p>
              <div className="mt-6">
                <Button onClick={() => openModal()} variant="blue">
                  <Plus size={20} className="mr-2" /> Novo Aluno
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* GRID VIEW */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {patients.map((patient) => {
                    const progress = getProgress(patient);
                    return (
                      <div 
                        key={patient.id} 
                        onClick={() => onSelectPatient && onSelectPatient(patient.id)}
                        className="group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer p-6 relative flex flex-col justify-between"
                      >
                        {patient.screening && progress >= 100 && (
                          <div className="absolute top-4 right-4 text-green-600" title="Triagem realizada">
                            <CheckCircle2 size={20} />
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3 w-full">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                              {patient.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{patient.name}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <p className="text-sm text-gray-500 truncate">{patient.whatsapp}</p>
                                 <a 
                                   href={`https://wa.me/55${patient.whatsapp.replace(/\D/g, '')}`} 
                                   target="_blank" 
                                   rel="noreferrer"
                                   onClick={(e) => e.stopPropagation()}
                                   className="text-green-500 hover:text-green-600 hover:bg-green-50 p-1 rounded-full transition-colors"
                                   title="Abrir no WhatsApp"
                                 >
                                   <MessageCircle size={14} />
                                 </a>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex">
                             <button 
                               onClick={(e) => { e.stopPropagation(); openModal(patient); }}
                               className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition-colors"
                               title="Editar Aluno"
                             >
                               <Edit size={18} />
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleDelete(patient); }}
                               className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full transition-colors ml-1"
                               title="Excluir Aluno"
                             >
                               <Trash2 size={18} />
                             </button>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                             <span>Progresso da Avaliação</span>
                             <span className="font-bold">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                             <div 
                               className={`h-2 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                               style={{ width: `${progress}%` }}
                             ></div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mt-2 pt-4 border-t border-gray-100">
                          <div className="flex items-center text-gray-600">
                            <Calendar size={16} className="mr-2 text-gray-400" />
                            {patient.age} anos
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Activity size={16} className="mr-2 text-gray-400" />
                            IMC: {patient.bmi}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* LIST VIEW (TABLE) */}
              {viewMode === 'list' && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Idade/Sexo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progresso</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patients.map((patient) => (
                        <tr 
                          key={patient.id} 
                          onClick={() => onSelectPatient && onSelectPatient(patient.id)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center">
                               <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 mr-3">
                                 {patient.name.charAt(0)}
                               </div>
                               <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             {patient.age} anos / {patient.sex}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                             {patient.whatsapp}
                             <a 
                               href={`https://wa.me/55${patient.whatsapp.replace(/\D/g, '')}`} 
                               target="_blank" 
                               rel="noreferrer"
                               onClick={(e) => e.stopPropagation()}
                               className="text-green-500 hover:text-green-600"
                             >
                               <MessageCircle size={16} />
                             </a>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${getProgress(patient)}%` }}></div>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={(e) => { e.stopPropagation(); openModal(patient); }}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(patient); }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 size={18} />
                              </button>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Registration/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal}
        title={editingPatient ? "Editar Aluno" : "Novo Aluno"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Dados Pessoais</h4>
            
            <Input
              label="Nome Completo"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="Ex: Maria da Silva"
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Data de Nascimento"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                  required
                />
                {computed.age > 0 && (
                   <p className="mt-1 text-sm text-blue-600 font-medium">Idade calculada: {computed.age} anos</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sexo Biológico</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, sex: 'M'})}
                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                      formData.sex === 'M' 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, sex: 'F'})}
                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                      formData.sex === 'F' 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <Input
                 label="WhatsApp"
                 type="tel"
                 placeholder="(11) 99999-9999"
                 value={formData.whatsapp}
                 onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                 required
               />
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Etnia (Opcional)</label>
                 <select
                   className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm bg-white"
                   value={formData.ethnicity}
                   onChange={(e) => setFormData({...formData, ethnicity: e.target.value as any})}
                 >
                   <option value="">Selecione...</option>
                   <option value="branco">Branco</option>
                   <option value="pardo">Pardo</option>
                   <option value="negro">Negro</option>
                   <option value="asiático">Asiático</option>
                 </select>
               </div>
            </div>
          </div>

          {/* Anthropometry */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Antropometria</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Peso (kg)"
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: e.target.value})}
                required
              />
              <Input
                label="Estatura (m)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.height}
                onChange={(e) => setFormData({...formData, height: e.target.value})}
                required
              />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <div className="flex justify-between items-center">
                 <span className="text-gray-700 font-medium">IMC Calculado</span>
                 <span className={`text-xl font-bold ${
                    computed.bmi > 0 && computed.bmi < 18.5 ? 'text-yellow-600' :
                    computed.bmi >= 18.5 && computed.bmi < 25 ? 'text-green-600' :
                    computed.bmi >= 25 && computed.bmi < 30 ? 'text-yellow-600' :
                    computed.bmi >= 30 ? 'text-red-600' : 'text-gray-400'
                 }`}>
                   {computed.bmi > 0 ? computed.bmi : '--'}
                 </span>
               </div>
               <p className="text-xs text-gray-500 mt-1">
                 Índice de Massa Corporal (Peso / Altura²)
               </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <Button type="button" variant="ghost" onClick={closeModal}>
               Cancelar
             </Button>
             <Button type="submit" variant="blue">
               {editingPatient ? 'Salvar Alterações' : 'Cadastrar Aluno'}
             </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};