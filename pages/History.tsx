import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, Filter, Calendar, ChevronRight, 
  ArrowRight, FileText, CheckCircle2, TrendingUp, ArrowUpDown, AlertCircle, Printer
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { Patient, AssessmentHistoryEntry } from '../types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ReportTemplate } from '../components/ReportTemplate';

// Translation Map (Duplicate from ReportTemplate for consistency, could be shared util)
const TERMS_MAP: Record<string, string> = {
  'not_frail': 'NÃO FRÁGIL',
  'pre_frail': 'PRÉ-FRÁGIL',
  'frail': 'FRÁGIL',
  'low_risk': 'BAIXO RISCO',
  'moderate_risk': 'RISCO MODERADO',
  'high_risk': 'ALTO RISCO',
  'ruim': 'RUIM',
  'regular': 'REGULAR',
  'bom': 'BOM',
  'muito_bom': 'MUITO BOM',
  'excelente': 'EXCELENTE',
  'normal': 'NORMAL',
  'depressao_leve': 'DEPRESSÃO LEVE',
  'depressao_grave': 'DEPRESSÃO GRAVE',
  'sem_declinio': 'SEM DECLÍNIO',
  'declinio_leve': 'DECLÍNIO LEVE',
  'declinio_moderado': 'DECLÍNIO MODERADO',
  'declinio_grave': 'DECLÍNIO GRAVE',
  'alto_risco': 'ALTO RISCO',
  'medio_risco': 'MÉDIO RISCO',
  'baixo_risco': 'BAIXO RISCO'
};

export const History: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [history, setHistory] = useState<AssessmentHistoryEntry[]>([]);
  
  // Filters
  const [selectedTestFilter, setSelectedTestFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AssessmentHistoryEntry | null>(null);

  // Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [clinicalObservations, setClinicalObservations] = useState('');

  useEffect(() => {
    setPatients(patientService.getAll());
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient && patient.history) {
        setHistory(patient.history);
      } else {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [selectedPatientId, patients]);

  // Derived Data
  const filteredHistory = history
    .filter(item => selectedTestFilter === 'all' || item.testId === selectedTestFilter)
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const uniqueTestTypes = Array.from(new Set(history.map(h => h.testId))).map(id => {
    const entry = history.find(h => h.testId === id);
    return { id, name: entry?.testName || id };
  });

  const handleOpenDetails = (entry: AssessmentHistoryEntry) => {
    setSelectedEntry(entry);
    setDetailModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for Badge Colors
  const getBadgeStyles = (classification: string) => {
    const cls = classification.toLowerCase();
    if (cls.includes('baixo_risco') || cls.includes('not_frail') || cls.includes('sem_declinio') || cls === 'normal' || cls === 'bom' || cls === 'muito_bom' || cls === 'excelente') {
      return 'bg-green-600 text-white';
    }
    if (cls.includes('medio_risco') || cls.includes('pre_frail') || cls === 'regular' || cls.includes('declinio_leve') || cls.includes('depressao_leve')) {
      return 'bg-yellow-400 text-gray-900';
    }
    return 'bg-red-600 text-white';
  };

  const translateClassification = (text: string) => {
    return TERMS_MAP[text] || text.replace(/_/g, ' ').toUpperCase();
  };

  // SVG Chart Component
  const EvolutionChart = () => {
    if (selectedTestFilter === 'all') return null;
    
    // Sort chronological for chart
    const chartData = [...history]
      .filter(h => h.testId === selectedTestFilter)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (chartData.length < 2) return null;

    // Determine scale
    const values = chartData.map(d => Number(d.score) || 0);
    const minVal = 0; // Fixed baseline usually better for tests
    const maxVal = Math.max(...values) * 1.2 || 10;
    
    const width = 800;
    const height = 250;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    const points = chartData.map((d, i) => {
      const x = padding + (i * (graphWidth / (chartData.length - 1)));
      const y = height - padding - ((Number(d.score) || 0) / maxVal) * graphHeight;
      return { x, y, val: d.score, date: new Date(d.date).toLocaleDateString('pt-BR') };
    });

    const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <TrendingUp className="mr-2 text-blue-600" /> Evolução: {chartData[0].testName}
        </h3>
        <div className="overflow-x-auto">
          <svg width={width} height={height} className="min-w-full">
            {/* Axes */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" />
            
            {/* Grid Lines (Horizontal) */}
            {[0.25, 0.5, 0.75, 1].map(factor => {
               const y = height - padding - (graphHeight * factor);
               return <line key={factor} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4" />;
            })}

            {/* Line Path */}
            <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Data Points */}
            {points.map((p, i) => (
              <g key={i} className="group">
                <circle cx={p.x} cy={p.y} r="6" fill="#fff" stroke="#2563eb" strokeWidth="2" className="transition-all duration-200 group-hover:r-8" />
                
                {/* Value Label */}
                <text x={p.x} y={p.y - 15} textAnchor="middle" fontSize="14" fill="#111827" fontWeight="bold">
                  {p.val}
                </text>
                
                {/* Date Label */}
                <text x={p.x} y={height - 15} textAnchor="middle" fontSize="12" fill="#6b7280">
                  {p.date}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <HistoryIcon className="mr-3" /> Histórico de Avaliações
          </h1>
          <p className="text-gray-600">Acompanhe a evolução funcional ao longo do tempo.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {selectedPatientId && (
            <Button 
              variant="outline" 
              onClick={() => setReportModalOpen(true)}
              className="border-gray-300 shadow-sm"
            >
              <Printer size={18} className="mr-2" /> GERAR LAUDO
            </Button>
          )}

          <div className="w-full md:w-72">
            <select 
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 pl-3 pr-10 bg-white"
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setSelectedTestFilter('all');
              }}
            >
              <option value="">Selecione o Paciente...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedPatientId ? (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <div className="mx-auto h-16 w-16 text-gray-300 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
            <HistoryIcon size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Nenhum paciente selecionado</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-1">Selecione um paciente no menu acima para visualizar seu histórico clínico e gráficos de evolução.</p>
        </div>
      ) : (
        <>
          {history.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
               <div className="mx-auto h-16 w-16 text-yellow-500 mb-4 bg-yellow-50 rounded-full flex items-center justify-center">
                  <AlertCircle size={32} />
               </div>
               <h3 className="text-lg font-bold text-gray-900">Nenhuma avaliação encontrada</h3>
               <p className="text-gray-500">Este paciente ainda não realizou nenhum teste no sistema.</p>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                 <div className="flex items-center gap-2 w-full sm:w-auto min-w-[120px]">
                   <Filter size={18} className="text-gray-500" />
                   <span className="text-sm font-bold text-gray-700">Filtrar:</span>
                 </div>
                 
                 <div className="flex gap-2 overflow-x-auto w-full pb-2 sm:pb-0 no-scrollbar">
                   <button 
                     onClick={() => setSelectedTestFilter('all')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                       selectedTestFilter === 'all' 
                       ? 'bg-gray-900 text-white shadow-md' 
                       : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                     }`}
                   >
                     Todos
                   </button>
                   {uniqueTestTypes.map(type => (
                     <button 
                       key={type.id}
                       onClick={() => setSelectedTestFilter(type.id)}
                       className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                         selectedTestFilter === type.id 
                         ? 'bg-blue-600 text-white shadow-md' 
                         : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                       }`}
                     >
                       {type.name}
                     </button>
                   ))}
                 </div>
                 
                 <div className="ml-auto border-l pl-4 border-gray-200">
                    <button 
                      onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Alternar ordem cronológica"
                    >
                      <ArrowUpDown size={16} />
                      {sortOrder === 'desc' ? 'Mais Recente' : 'Mais Antigo'}
                    </button>
                 </div>
              </div>

              {/* Chart */}
              <EvolutionChart />

              {/* Timeline List */}
              <div className="space-y-4">
                 {filteredHistory.length === 0 ? (
                   <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                     Nenhum registro encontrado para este filtro.
                   </div>
                 ) : (
                   filteredHistory.map((entry) => (
                     <div 
                       key={entry.id} 
                       className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                     >
                        <div className="flex items-start gap-5">
                           <div className="p-3 bg-gray-50 rounded-full text-gray-500 border border-gray-100 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                             <FileText size={24} />
                           </div>
                           
                           <div>
                             <h4 className="font-bold text-lg text-gray-900">{entry.testName}</h4>
                             <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Calendar size={14} className="mr-1.5" />
                                <span className="capitalize">
                                  {new Date(entry.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                             </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-6 pl-16 sm:pl-0">
                           <div className="text-right">
                              <span className="block font-black text-xl text-gray-900 mb-1">{entry.score}</span>
                              <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm ${getBadgeStyles(entry.classification)}`}>
                                {translateClassification(entry.classification)}
                              </span>
                           </div>
                           
                           <Button 
                             variant="outline" 
                             onClick={() => handleOpenDetails(entry)}
                             className="shrink-0 hidden sm:flex"
                           >
                             Ver Detalhes
                           </Button>
                           {/* Mobile only button */}
                           <button 
                             onClick={() => handleOpenDetails(entry)}
                             className="p-2 bg-gray-100 rounded-full text-gray-600 sm:hidden"
                           >
                             <ChevronRight size={20} />
                           </button>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </>
          )}
        </>
      )}

      {/* Details Modal */}
      <Modal 
        isOpen={detailModalOpen} 
        onClose={() => setDetailModalOpen(false)}
        title={selectedEntry ? `Detalhes da Avaliação` : 'Detalhes'}
      >
        {selectedEntry && (
          <div className="space-y-8">
             <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="p-3 bg-white rounded-full shadow-sm text-blue-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedEntry.testName}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedEntry.date).toLocaleDateString('pt-BR')} às {new Date(selectedEntry.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                  <span className="block text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Resultado</span>
                  <span className="block text-3xl font-black text-gray-900">{selectedEntry.score}</span>
               </div>
               <div className={`p-4 rounded-lg border text-center flex flex-col justify-center ${getBadgeStyles(selectedEntry.classification)}`}>
                  <span className="block text-sm font-medium opacity-80 uppercase tracking-wider mb-1">Classificação</span>
                  <span className="block text-lg font-black leading-tight">
                    {translateClassification(selectedEntry.classification)}
                  </span>
               </div>
             </div>
             
             <div>
               <h4 className="font-bold text-gray-900 mb-3 border-b pb-2 flex items-center">
                 <CheckCircle2 size={18} className="mr-2 text-gray-400" />
                 Dados da Coleta
               </h4>
               <div className="bg-gray-900 rounded-lg p-4 overflow-hidden">
                 <pre className="text-gray-300 text-xs overflow-x-auto font-mono">
                   {JSON.stringify(selectedEntry.details, null, 2)}
                 </pre>
               </div>
             </div>

             <div className="flex justify-end pt-4">
                <Button onClick={() => setDetailModalOpen(false)} variant="secondary">
                  Fechar
                </Button>
             </div>
          </div>
        )}
      </Modal>

      {/* Report Generation Modal */}
      {/* Note: We manually create a full-screen overlay for preview that mimics Modal but handles Print styling */}
      {reportModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in relative">
              {/* Toolbar */}
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 no-print">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center">
                    <Printer size={20} className="mr-2" /> Pré-visualização do Laudo
                 </h3>
                 <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setReportModalOpen(false)}>Cancelar</Button>
                    <Button variant="blue" onClick={handlePrint}>
                       <Printer size={18} className="mr-2" /> IMPRIMIR / PDF
                    </Button>
                 </div>
              </div>

              {/* Editable Areas (No Print) */}
              <div className="p-4 bg-blue-50 border-b border-blue-100 no-print">
                 <label className="block text-sm font-bold text-blue-900 mb-2">
                    Adicionar Observações Clínicas ou Conduta (Opcional):
                 </label>
                 <textarea 
                   className="w-full p-3 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                   rows={3}
                   placeholder="Digite aqui recomendações, observações específicas ou plano de cuidado para sair no laudo..."
                   value={clinicalObservations}
                   onChange={(e) => setClinicalObservations(e.target.value)}
                 />
              </div>

              {/* Printable Content Area */}
              <div className="flex-1 overflow-y-auto bg-gray-200 p-8" id="report-scroll-container">
                 {/* This div is targeted by @media print via id="printable-section" */}
                 <div id="printable-section" className="bg-white shadow-xl mx-auto max-w-[21cm] min-h-[29.7cm] origin-top">
                    <ReportTemplate patient={selectedPatient} observations={clinicalObservations} />
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};