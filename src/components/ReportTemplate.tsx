
import React from 'react';
import { Patient, AssessmentHistoryEntry } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Calendar, Activity, User } from 'lucide-react';

interface ReportTemplateProps {
  patient: Patient;
  observations: string;
}

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

export const ReportTemplate: React.FC<ReportTemplateProps> = ({ patient, observations }) => {
  // Extract latest assessment for each test type from history
  const getLatestAssessments = () => {
    if (!patient.history || patient.history.length === 0) return [];

    const map = new Map<string, AssessmentHistoryEntry>();
    // Iterate chronologically to ensure we get the latest
    // Sort ascending first
    const sortedHistory = [...patient.history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedHistory.forEach(entry => {
      map.set(entry.testId, entry);
    });

    return Array.from(map.values());
  };

  const latestTests = getLatestAssessments();

  // Helper for badge colors (inline styles for print safety)
  const getStatusColor = (classification: string) => {
    const cls = classification.toLowerCase();
    if (cls.includes('baixo_risco') || cls.includes('not_frail') || cls.includes('sem_declinio') || cls === 'normal' || cls === 'bom' || cls === 'muito_bom' || cls === 'excelente') {
      return '#16a34a'; // green-600
    }
    if (cls.includes('medio_risco') || cls.includes('pre_frail') || cls === 'regular' || cls.includes('declinio_leve') || cls.includes('depressao_leve')) {
      return '#ca8a04'; // yellow-600 (darker for print)
    }
    return '#dc2626'; // red-600
  };

  const translateClassification = (text: string) => {
    return TERMS_MAP[text] || text.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="bg-white text-gray-900 p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <div className="bg-gray-900 text-white p-1 rounded">
               <Activity size={24} />
             </div>
             <h1 className="text-2xl font-bold tracking-tight">Especial Senior</h1>
           </div>
           <p className="text-sm text-gray-500">Sistema de Avaliação Funcional</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase text-gray-900">Laudo de Avaliação</h2>
          <p className="text-gray-600 mt-1">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Patient Data */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100 flex justify-between items-start">
         <div className="space-y-2">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Dados do Paciente</h3>
           <div className="flex items-center gap-2">
             <User size={18} className="text-gray-400" />
             <span className="text-xl font-bold">{patient.name}</span>
           </div>
           <p className="text-gray-600">
             <span className="font-semibold">Idade:</span> {patient.age} anos • 
             <span className="font-semibold ml-2">Sexo:</span> {patient.sex === 'M' ? 'Masculino' : 'Feminino'} •
             <span className="font-semibold ml-2">WhatsApp:</span> {patient.whatsapp}
           </p>
         </div>
         <div className="text-right">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm inline-block min-w-[120px] text-center">
              <span className="block text-xs font-bold text-gray-400 uppercase">IMC</span>
              <span className="block text-2xl font-black text-gray-900">{patient.bmi.toString().replace('.', ',')}</span>
            </div>
         </div>
      </div>

      {/* Summary Table */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-l-4 border-gray-900 pl-3">Resumo das Avaliações</h3>
        {latestTests.length === 0 ? (
          <p className="text-gray-500 italic">Nenhum teste registrado para este paciente.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="p-3 border-b border-gray-200">Protocolo</th>
                <th className="p-3 border-b border-gray-200">Data</th>
                <th className="p-3 border-b border-gray-200 text-right">Resultado</th>
                <th className="p-3 border-b border-gray-200 text-center">Classificação</th>
              </tr>
            </thead>
            <tbody>
              {latestTests.map((test) => (
                <tr key={test.testId} className="border-b border-gray-100">
                  <td className="p-3 font-medium text-gray-900">{test.testName}</td>
                  <td className="p-3 text-gray-600 text-sm">{new Date(test.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3 text-right font-bold text-gray-900">{test.score}</td>
                  <td className="p-3 text-center">
                    <span 
                      className="inline-block px-2 py-1 rounded text-xs font-bold text-white uppercase"
                      style={{ backgroundColor: getStatusColor(test.classification) }}
                    >
                      {translateClassification(test.classification)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detailed Findings (Simplified) */}
      <div className="mb-10 break-inside-avoid">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-l-4 border-gray-900 pl-3">Análise Detalhada</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Fall Risk Card if TUG or Berg exists */}
           {latestTests.find(t => t.testId === 'tug' || t.testId === 'berg_balance') && (
             <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h4 className="font-bold text-gray-700 mb-2">Risco de Quedas</h4>
                {latestTests.filter(t => t.testId === 'tug' || t.testId === 'berg_balance').map(t => (
                  <div key={t.id} className="text-sm mb-2 last:mb-0">
                    <span className="font-semibold">{t.testName}:</span> {translateClassification(t.classification)}
                  </div>
                ))}
             </div>
           )}

           {/* Functional Capacity if Fried or Chair Stand exists */}
           {latestTests.find(t => t.testId === 'fried' || t.testId === 'sit_stand_30') && (
             <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h4 className="font-bold text-gray-700 mb-2">Capacidade Funcional</h4>
                {latestTests.filter(t => t.testId === 'fried' || t.testId === 'sit_stand_30' || t.testId === 'arm_curl').map(t => (
                  <div key={t.id} className="text-sm mb-2 last:mb-0">
                    <span className="font-semibold">{t.testName}:</span> {translateClassification(t.classification)}
                  </div>
                ))}
             </div>
           )}
           
           {/* Cognitive/Emotional if MEEM or GDS exists */}
           {latestTests.find(t => t.testId === 'meem_cognitive' || t.testId === 'gds15') && (
             <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h4 className="font-bold text-gray-700 mb-2">Cognitivo & Emocional</h4>
                {latestTests.filter(t => t.testId === 'meem_cognitive' || t.testId === 'gds15').map(t => (
                  <div key={t.id} className="text-sm mb-2 last:mb-0">
                    <span className="font-semibold">{t.testName}:</span> {translateClassification(t.classification)}
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* Conduct/Observations */}
      <div className="mb-12 break-inside-avoid">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-l-4 border-gray-900 pl-3">Conduta / Observações Clínicas</h3>
        <div className="w-full min-h-[150px] border border-gray-300 rounded-lg p-4 bg-gray-50 text-gray-800 whitespace-pre-wrap">
          {observations || "Sem observações adicionais."}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 mt-8 flex flex-col items-center text-center break-inside-avoid">
         <div className="w-64 border-b border-gray-400 mb-2"></div>
         <p className="text-sm font-semibold text-gray-900 uppercase">Assinatura do Profissional</p>
         <p className="text-xs text-gray-500 mt-4">Documento gerado pelo Sistema Especial Senior • Protocolo Igor Conterato Gomes</p>
         <p className="text-xs text-gray-400 mt-1">ID Paciente: {patient.id.slice(0, 8)}</p>
      </div>
    </div>
  );
};
