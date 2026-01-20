import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, User, Phone, CheckCircle, XCircle, MessageCircle, AlertCircle, ClipboardList, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { agendaService } from '../services/agendaService';
import { patientService } from '../services/patientService';
import { Appointment, Patient } from '../types';
import { useToast } from '../contexts/ToastContext';

export const Agenda: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const { addToast } = useToast();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
    type: 'Avaliação Inicial' as Appointment['type'],
    notes: ''
  });

  useEffect(() => {
    loadAndSanitizeData();
  }, []);

  const loadAndSanitizeData = () => {
    try {
      // 1. Carregamento Seguro
      const rawAppts = agendaService.getAll();
      const safeAppts = Array.isArray(rawAppts) ? rawAppts : [];
      
      // 2. Protocolo de Saneamento (Data Cleaning)
      // Remove agendamentos com datas inválidas ou formatos legados que quebram o React
      const validAppts = safeAppts.filter(appt => {
        if (!appt.dateTime) return false;
        const timestamp = new Date(appt.dateTime).getTime();
        return !isNaN(timestamp); // Mantém apenas se for uma data válida
      });

      if (validAppts.length < safeAppts.length) {
        console.warn(`Agenda: ${safeAppts.length - validAppts.length} registros corrompidos foram removidos para evitar crash.`);
      }

      setAppointments(validAppts);
      
      const pts = patientService.getAll();
      setPatients(Array.isArray(pts) ? pts : []);
    } catch (e) {
      console.error("ERRO CRÍTICO NA AGENDA. Resetando visualização.", e);
      setAppointments([]); // Fail-safe: Tela vazia é melhor que tela branca
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    
    const patient = patients.find(p => p.id === formData.patientId);
    if (!patient) return;

    try {
      agendaService.create({
        patientId: patient.id,
        patientName: patient.name,
        patientPhone: patient.whatsapp,
        dateTime: `${formData.date}T${formData.time}`, // ISO Format Forced
        type: formData.type,
        status: 'Agendado',
        notes: formData.notes
      });
      
      setIsModalOpen(false);
      setFormData({ patientId: '', date: '', time: '', type: 'Avaliação Inicial', notes: '' });
      loadAndSanitizeData();
      addToast('Agendamento realizado com sucesso!', 'success');
    } catch (error: any) {
      addToast(error.message, 'warning');
    }
  };

  const handleStatusChange = (id: string, newStatus: Appointment['status']) => {
    agendaService.updateStatus(id, newStatus);
    loadAndSanitizeData();
    addToast('Status atualizado.', 'info');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este agendamento?')) {
      agendaService.delete(id);
      loadAndSanitizeData();
      addToast('Agendamento removido.', 'success');
    }
  };

  const getPendingTests = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return [];

    const allTestIds = ['fried', 'tug', 'sit_stand_30', 'arm_curl', 'sit_reach', 'gds15', 'meem_cognitive', 'berg_balance'];
    const completedTestIds = patient.tests?.filter(t => t.status === 'completed').map(t => t.testId) || [];
    
    const testNames: {[key: string]: string} = {
      'fried': 'Fried', 'tug': 'TUG', 'sit_stand_30': 'Levantar', 'arm_curl': 'Flexão',
      'sit_reach': 'Alcance', 'gds15': 'GDS-15', 'meem_cognitive': 'MEEM', 'berg_balance': 'Berg'
    };

    const pending = allTestIds.filter(id => !completedTestIds.includes(id));
    return pending.map(id => testNames[id]);
  };

  // Agrupamento Seguro por Data ISO (YYYY-MM-DD)
  const groupedAppointments = appointments.reduce((groups, appt) => {
    try {
      const dateKey = appt.dateTime.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(appt);
    } catch (e) {
      // Ignora silenciosamente registros mal formados durante o reduce
    }
    return groups;
  }, {} as Record<string, Appointment[]>);

  const sortedDates = Object.keys(groupedAppointments).sort();

  const formatDateHeader = (isoDateString: string) => {
    try {
      const [year, month, day] = isoDateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return {
        full: date.toLocaleDateString('pt-BR'),
        weekday: date.toLocaleDateString('pt-BR', { weekday: 'long' })
      };
    } catch (e) {
      return { full: isoDateString, weekday: '' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Agendado': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Em Andamento': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Concluído': return 'bg-green-100 text-green-800 border-green-200';
      case 'Faltou': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="mr-3 text-gray-700" /> Agenda
          </h1>
          <p className="text-gray-600 mt-1">Organize seus atendimentos e veja pendências de avaliação.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="blue">
          <Plus size={20} className="mr-2" /> Novo Agendamento
        </Button>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
          <div className="mx-auto h-16 w-16 text-gray-300 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
            <CalendarIcon size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Agenda Vazia</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-1 mb-6">Nenhum compromisso agendado.</p>
          <Button onClick={() => setIsModalOpen(true)} variant="outline">
            Agendar Agora
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(dateKey => {
            const displayDate = formatDateHeader(dateKey);
            return (
              <div key={dateKey}>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center sticky top-16 bg-gray-50 py-2 z-10 shadow-sm sm:shadow-none rounded-lg sm:rounded-none px-3 sm:px-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                  {displayDate.full} 
                  <span className="text-sm font-normal text-gray-500 ml-2 capitalize">
                    ({displayDate.weekday})
                  </span>
                </h3>
                <div className="space-y-4">
                  {groupedAppointments[dateKey]?.map(appt => {
                    const pendingTests = getPendingTests(appt.patientId);
                    const isEval = appt.type.includes('Avaliação');
                    
                    return (
                      <div key={appt.id} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all relative group">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-gray-100 pr-4">
                              <span className="text-lg font-bold text-gray-900">
                                {new Date(appt.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Horário</span>
                            </div>
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <h4 className="text-lg font-bold text-gray-900">{appt.patientName}</h4>
                                 <a 
                                   href={`https://wa.me/55${appt.patientPhone.replace(/\D/g, '')}`} 
                                   target="_blank" 
                                   rel="noreferrer"
                                   className="text-green-500 hover:text-green-600 bg-green-50 p-1 rounded-full transition-colors"
                                   title="Chamar no WhatsApp"
                                 >
                                   <MessageCircle size={16} />
                                 </a>
                               </div>
                               <p className="text-sm text-gray-600 font-medium">{appt.type}</p>
                               
                               {isEval && pendingTests.length > 0 && appt.status !== 'Concluído' && (
                                 <div className="mt-2 flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 p-2 rounded-md border border-orange-100 max-w-sm">
                                   <ClipboardList size={14} className="mt-0.5 shrink-0" />
                                   <span>
                                     <strong>Pendente:</strong> {pendingTests.slice(0, 5).join(', ')}
                                     {pendingTests.length > 5 && '...'}
                                   </span>
                                 </div>
                               )}

                               {appt.notes && <p className="text-xs text-gray-400 mt-2 italic">"{appt.notes}"</p>}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                             <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(appt.status)}`}>
                               {appt.status}
                             </span>
                             
                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               {appt.status !== 'Concluído' && (
                                 <button onClick={() => handleStatusChange(appt.id, 'Concluído')} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="Concluir">
                                   <CheckCircle size={20} />
                                 </button>
                               )}
                               {appt.status !== 'Faltou' && (
                                 <button onClick={() => handleStatusChange(appt.id, 'Faltou')} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Faltou">
                                   <XCircle size={20} />
                                 </button>
                               )}
                               <button onClick={() => handleDelete(appt.id)} className="text-gray-400 hover:text-red-600 hover:bg-gray-100 p-1.5 rounded text-xs" title="Excluir">
                                 <Trash2 size={20} />
                               </button>
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Agendar Atendimento"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">Aluno</label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <Input
              label="Data"
              type="date"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              required
            />
            <Input
              label="Horário"
              type="time"
              value={formData.time}
              onChange={e => setFormData({...formData, time: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">Tipo de Sessão</label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="Avaliação Inicial">Avaliação Inicial</option>
              <option value="Reavaliação">Reavaliação</option>
              <option value="Sessão de Treino">Sessão de Treino</option>
            </select>
          </div>

          <Input
            label="Notas (Opcional)"
            placeholder="Ex: Levar ficha de anamnese..."
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />

          <div className="bg-yellow-50 p-3 rounded-lg flex items-start text-xs text-yellow-800">
            <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
            O sistema bloqueará automaticamente horários com intervalo menor que 1h entre atendimentos.
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="mr-2">Cancelar</Button>
            <Button type="submit" variant="blue">Confirmar Agendamento</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};