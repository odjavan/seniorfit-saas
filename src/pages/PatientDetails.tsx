import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, AlertCircle, CheckCircle2, UserCheck, Scale, Brain, 
  Heart, Activity, Move, Dumbbell, TrendingUp, ChevronLeft, ClipboardList,
  Timer, Play, Pause, RotateCcw, Minus, Plus, Printer, Bot, Sparkles, MessageCircle, FileText
} from 'lucide-react';
import { Patient, Screening, TestStatus, FragilityResult, TUGResult, ChairStandResult, ArmCurlResult, FlexibilityResult, DepressionResult, CognitiveResult, BalanceResult, AssessmentHistoryEntry } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { patientService } from '../services/patientService';
import { ReportTemplate } from '../components/ReportTemplate';
import { AiTutor } from '../components/AiTutor';
import { useToast } from '../contexts/ToastContext';
import { generateId } from '../utils/generateId';

interface PatientDetailsProps {
  patient: Patient;
  onBack: () => void;
  onUpdate: (updatedPatient: Patient) => void;
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

export const PatientDetails: React.FC<PatientDetailsProps> = ({ patient, onBack, onUpdate }) => {
  // Initialize state with existing screening or defaults
  const [screening, setScreening] = useState<Partial<Screening>>(patient.screening || {});
  const { addToast } = useToast();
  
  // View mode state
  const [viewMode, setViewMode] = useState<'triage' | 'tests' | 'execution'>(
    patient.screening ? 'tests' : 'triage'
  );
  
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  
  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [clinicalObservations, setClinicalObservations] = useState('');

  // AI Tutor State
  const [isAiTutorOpen, setIsAiTutorOpen] = useState(false);

  // Fried Test State
  const [friedData, setFriedData] = useState({
    weightLoss: null as boolean | null,
    fatigue: null as boolean | null,
    physicalActivity: null as boolean | null,
    gripStrengthKg: '',
    gaitSpeedTime: ''
  });

  // TUG Test State
  const [tugTime, setTugTime] = useState<string>('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);

  // Chair Stand Test State
  const [chairStandReps, setChairStandReps] = useState<string>('');

  // Arm Curl Test State
  const [armCurlReps, setArmCurlReps] = useState<string>('');

  // Sit and Reach Test State
  const [sitReachDist, setSitReachDist] = useState<string>('');

  // GDS-15 Test State
  const [gdsAnswers, setGdsAnswers] = useState<(boolean | null)[]>(new Array(15).fill(null));

  // MEEM Test State
  const [meemData, setMeemData] = useState({
    orientation: 0,
    registration: 0,
    attention: 0,
    recall: 0,
    language: 0
  });
  const [educationLevel, setEducationLevel] = useState<Patient['educationLevel'] | ''>(patient.educationLevel || '');

  // Berg Balance Test State
  const [bergScores, setBergScores] = useState<number[]>(new Array(14).fill(0));
  
  // Shared Countdown State (Chair Stand & Arm Curl)
  const [timeLeft, setTimeLeft] = useState(30);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const countdownIntervalRef = useRef<number | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopCountdown();
    };
  }, []);

  // --- Stopwatch Logic (TUG) ---
  const startTimer = () => {
    if (isTimerRunning) return;
    setIsTimerRunning(true);
    startTimeRef.current = Date.now() - elapsedTimeRef.current;
    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      elapsedTimeRef.current = now - startTimeRef.current;
      setTugTime((elapsedTimeRef.current / 1000).toFixed(2));
    }, 50);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    stopTimer();
    elapsedTimeRef.current = 0;
    setTugTime('');
  };

  // --- Countdown Logic (Chair Stand & Arm Curl) ---
  const startCountdown = () => {
    if (isCountdownRunning || timeLeft <= 0) return;
    
    setIsCountdownRunning(true);
    countdownIntervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsCountdownRunning(false);
  };

  const resetCountdown = () => {
    stopCountdown();
    setTimeLeft(30);
  };

  const questions = [
    { key: 'walksIndependently', label: 'Caminha de forma independente (sem auxílio)?' },
    { key: 'standsWithoutArms', label: 'Consegue levantar da cadeira sem usar os braços?' },
    { key: 'hadFalls', label: 'Houve episódios de quedas nos últimos 6 meses?' },
    { key: 'fearsWalking', label: 'Relata insegurança ou medo de cair ao caminhar?' },
    { key: 'doesHousework', label: 'Realiza tarefas domésticas leves sem ajuda?' },
  ];

  const testProtocols = [
    { id: 'fried', name: 'Fragilidade (Fried)', desc: 'Avaliação do fenótipo de fragilidade', icon: UserCheck },
    { id: 'tug', name: 'TUG (Mobilidade)', desc: 'Timed Up and Go - Agilidade', icon: Move },
    { id: 'sit_stand_30', name: 'Sentar e Levantar (30s)', desc: 'Força de membros inferiores', icon: Activity },
    { id: 'arm_curl', name: 'Flexão de Cotovelo (30s)', desc: 'Força de membros superiores', icon: Dumbbell },
    { id: 'sit_reach', name: 'Sentar e Alcançar', desc: 'Flexibilidade de cadeia posterior', icon: TrendingUp },
    { id: 'gds15', name: 'Depressão (GDS-15)', desc: 'Escala de depressão geriátrica', icon: Heart },
    { id: 'meem_cognitive', name: 'Declínio Cognitivo (MEEM)', desc: 'Rastreio de funções cognitivas', icon: Brain },
    { id: 'berg_balance', name: 'Equilíbrio (Berg)', desc: 'Avaliação do equilíbrio estático e dinâmico', icon: Scale },
  ];

  // --- Protocol Descriptions ---
  const getProtocolInstructions = (testId: string | null) => {
    switch(testId) {
      case 'fried': return "Avalie 5 componentes: 1) Perda de peso não intencional (>4.5kg no último ano); 2) Exaustão autorrelatada; 3) Baixo nível de atividade física; 4) Diminuição da velocidade de marcha (4.6m); 5) Fraqueza muscular (Dinapometria).";
      case 'tug': return "O aluno inicia sentado com as costas apoiadas. Ao comando 'VÁ', deve levantar-se, caminhar 3 metros, virar-se, voltar à cadeira e sentar-se. O cronômetro para quando as costas tocam o encosto novamente.";
      case 'sit_stand_30': return "O aluno inicia sentado. Ao sinal, deve levantar-se totalmente e sentar-se o maior número de vezes possível em 30 segundos, com os braços cruzados no peito. Conte apenas as execuções completas.";
      case 'arm_curl': return "Sentado, segurando um peso (4kg para homens, 2kg para mulheres). Realizar o máximo de flexões de cotovelo (rosca bíceps) em 30 segundos na amplitude completa.";
      case 'sit_reach': return "Sentado na ponta da cadeira, uma perna estendida (calcanhar no chão, pé fletido). Com as mãos sobrepostas, tentar alcançar a ponta do pé. Medir a distância entre os dedos e a ponta do pé (negativo se não alcançar, positivo se passar).";
      case 'gds15': return "Aplique as 15 perguntas da Escala de Depressão Geriátrica. Respostas em negrito indicam pontuação. Score >= 6 sugere depressão.";
      case 'meem_cognitive': return "Mini Exame do Estado Mental. Avalie Orientação, Registro, Atenção/Cálculo, Evocação e Linguagem. Ajuste a pontuação de corte baseada na escolaridade selecionada.";
      case 'berg_balance': return "Escala de Equilíbrio de Berg. 14 tarefas comuns da vida diária. Avalie cada item de 0 (incapaz) a 4 (capaz/seguro). Score total máximo de 56 pontos.";
      default: return "Selecione um teste para visualizar as instruções detalhadas do protocolo.";
    }
  };

  // --- Triage Logic ---

  const handleToggle = (key: keyof Screening, value: boolean) => {
    setScreening(prev => ({ ...prev, [key]: value }));
  };

  const isFormComplete = questions.every(q => screening[q.key as keyof Screening] !== undefined);

  const handleSaveTriage = () => {
    if (!isFormComplete) return;

    const completedScreening: Screening = {
      ...(screening as Screening),
      completedAt: new Date().toISOString()
    };

    const updatedPatient: Patient = {
      ...patient,
      screening: completedScreening
    };

    try {
      patientService.update(updatedPatient);
      onUpdate(updatedPatient);
      setViewMode('tests');
      addToast('Triagem salva com sucesso!', 'success');
    } catch (error) {
      addToast('Erro ao salvar triagem.', 'error');
    }
  };

  // --- Test Selection Logic ---

  const getTestStatus = (testId: string): TestStatus['status'] => {
    return patient.tests?.find(t => t.testId === testId)?.status || 'pending';
  };

  const startTest = (testId: string) => {
    setActiveTestId(testId);
    if (testId === 'fried') {
      setFriedData({
        weightLoss: null,
        fatigue: null,
        physicalActivity: null,
        gripStrengthKg: '',
        gaitSpeedTime: ''
      });
      setViewMode('execution');
    } else if (testId === 'tug') {
      setTugTime('');
      elapsedTimeRef.current = 0;
      setViewMode('execution');
    } else if (testId === 'sit_stand_30') {
      setChairStandReps('');
      setTimeLeft(30);
      setViewMode('execution');
    } else if (testId === 'arm_curl') {
      setArmCurlReps('');
      setTimeLeft(30);
      setViewMode('execution');
    } else if (testId === 'sit_reach') {
      setSitReachDist('');
      setViewMode('execution');
    } else if (testId === 'gds15') {
      setGdsAnswers(new Array(15).fill(null));
      setViewMode('execution');
    } else if (testId === 'meem_cognitive') {
      setMeemData({
        orientation: 0,
        registration: 0,
        attention: 0,
        recall: 0,
        language: 0
      });
      if (patient.educationLevel) {
        setEducationLevel(patient.educationLevel);
      }
      setViewMode('execution');
    } else if (testId === 'berg_balance') {
      setBergScores(new Array(14).fill(0));
      setViewMode('execution');
    } else {
      addToast('Este teste será implementado nas próximas etapas.', 'info');
    }
  };

  // --- Helper: Save Result ---
  const saveTestResult = (testId: string, testName: string, result: any, additionalPatientUpdates?: Partial<Patient>) => {
    const newTests = patient.tests ? [...patient.tests] : [];
    const existingIndex = newTests.findIndex(t => t.testId === testId);
    
    const testStatusEntry: TestStatus = {
      testId,
      testName,
      status: 'completed',
      result
    };

    if (existingIndex >= 0) {
      newTests[existingIndex] = testStatusEntry;
    } else {
      newTests.push(testStatusEntry);
    }

    let score: number | string = 0;
    let classification = '';

    if ('totalScore' in result) score = result.totalScore;
    else if ('timeSeconds' in result) score = result.timeSeconds;
    else if ('repetitions' in result) score = result.repetitions;
    else if ('distanceCm' in result) score = result.distanceCm;
    
    if ('classification' in result) classification = result.classification;

    const historyEntry: AssessmentHistoryEntry = {
      id: generateId(),
      date: new Date().toISOString(),
      testId,
      testName,
      score,
      classification,
      details: result
    };

    const newHistory = patient.history ? [historyEntry, ...patient.history] : [historyEntry];

    const updatedPatient = { 
      ...patient, 
      tests: newTests,
      history: newHistory,
      ...additionalPatientUpdates
    };
    
    try {
      patientService.update(updatedPatient);
      onUpdate(updatedPatient);
      setViewMode('tests');
      setActiveTestId(null);
      addToast('Avaliação salva com sucesso!', 'success');
    } catch (error) {
      addToast('Erro ao salvar avaliação.', 'error');
    }
  };

  const calculateFriedScore = () => {
    let score = 0;
    const scores = { weightLoss: 0, fatigue: 0, gripStrength: 0, walkingSpeed: 0, physicalActivity: 0 };
    if (friedData.weightLoss) { score++; scores.weightLoss = 1; }
    if (friedData.fatigue) { score++; scores.fatigue = 1; }
    if (friedData.physicalActivity) { score++; scores.physicalActivity = 1; }
    const kg = parseFloat(friedData.gripStrengthKg);
    if (!isNaN(kg)) {
      let cutoff = 0;
      if (patient.sex === 'M') {
        if (patient.bmi <= 24) cutoff = 29;
        else if (patient.bmi <= 28) cutoff = 30;
        else cutoff = 32;
      } else {
        if (patient.bmi <= 23) cutoff = 17;
        else if (patient.bmi <= 26) cutoff = 17.3;
        else if (patient.bmi <= 29) cutoff = 18;
        else cutoff = 21;
      }
      if (kg <= cutoff) { score++; scores.gripStrength = 1; }
    }
    const time = parseFloat(friedData.gaitSpeedTime);
    if (!isNaN(time)) {
      let cutoff = 0;
      if (patient.sex === 'M') {
        cutoff = patient.height <= 1.73 ? 7 : 6;
      } else {
        cutoff = patient.height <= 1.59 ? 7 : 6;
      }
      if (time >= cutoff) { score++; scores.walkingSpeed = 1; }
    }
    return { score, scores };
  };

  const handleSaveFried = () => {
    const { score, scores } = calculateFriedScore();
    const classification: FragilityResult['classification'] = score === 0 ? 'not_frail' : score <= 2 ? 'pre_frail' : 'frail';
    const result: FragilityResult = {
      testId: 'fried',
      scores,
      measurements: { gripStrengthKg: parseFloat(friedData.gripStrengthKg) || 0, gaitSpeedTime: parseFloat(friedData.gaitSpeedTime) || 0 },
      totalScore: score,
      classification,
      completedAt: new Date().toISOString()
    };
    saveTestResult('fried', 'Fragilidade (Fried)', result);
  };

  const getTUGClassification = (seconds: number): TUGResult['classification'] => {
    if (seconds < 10) return 'low_risk';
    if (seconds <= 20) return 'moderate_risk';
    return 'high_risk';
  };

  const handleSaveTUG = () => {
    const seconds = parseFloat(tugTime);
    if (isNaN(seconds)) return;
    const classification = getTUGClassification(seconds);
    const result: TUGResult = { testId: 'tug', timeSeconds: seconds, classification, completedAt: new Date().toISOString() };
    saveTestResult('tug', 'TUG (Mobilidade)', result);
  };

  const getChairStandClassification = (reps: number): ChairStandResult['classification'] => {
    const age = patient.age;
    const isMale = patient.sex === 'M';
    let min = 0; let max = 0;
    if (isMale) {
      if (age < 65) { min = 14; max = 19; } else if (age < 70) { min = 12; max = 18; } else if (age < 75) { min = 12; max = 17; } else if (age < 80) { min = 11; max = 17; } else if (age < 85) { min = 10; max = 15; } else if (age < 90) { min = 8; max = 14; } else { min = 7; max = 12; }
    } else {
      if (age < 65) { min = 12; max = 17; } else if (age < 70) { min = 11; max = 16; } else if (age < 75) { min = 10; max = 15; } else if (age < 80) { min = 10; max = 15; } else if (age < 85) { min = 9; max = 14; } else if (age < 90) { min = 8; max = 13; } else { min = 4; max = 11; }
    }
    if (reps < min - 2) return 'ruim';
    if (reps < min) return 'regular';
    if (reps <= max) return 'bom';
    if (reps <= max + 3) return 'muito_bom';
    return 'excelente';
  };

  const handleSaveChairStand = () => {
    const reps = parseInt(chairStandReps);
    if (isNaN(reps)) return;
    const classification = getChairStandClassification(reps);
    const result: ChairStandResult = { testId: 'sit_stand_30', repetitions: reps, classification, completedAt: new Date().toISOString() };
    saveTestResult('sit_stand_30', 'Sentar e Levantar (30s)', result);
  };

  const getArmCurlClassification = (reps: number): ArmCurlResult['classification'] => {
    const age = patient.age;
    const isMale = patient.sex === 'M';
    let min = 0; let max = 0;
    if (isMale) {
      if (age < 65) { min = 16; max = 22; } else if (age < 70) { min = 15; max = 21; } else if (age < 75) { min = 14; max = 21; } else if (age < 80) { min = 13; max = 19; } else if (age < 85) { min = 13; max = 19; } else if (age < 90) { min = 11; max = 17; } else { min = 10; max = 14; }
    } else {
      if (age < 65) { min = 13; max = 19; } else if (age < 70) { min = 12; max = 18; } else if (age < 75) { min = 12; max = 17; } else if (age < 80) { min = 11; max = 17; } else if (age < 85) { min = 10; max = 16; } else if (age < 90) { min = 10; max = 15; } else { min = 8; max = 13; }
    }
    if (reps < min - 2) return 'ruim';
    if (reps < min) return 'regular';
    if (reps <= max) return 'bom';
    if (reps <= max + 3) return 'muito_bom';
    return 'excelente';
  };

  const handleSaveArmCurl = () => {
    const reps = parseInt(armCurlReps);
    if (isNaN(reps)) return;
    const classification = getArmCurlClassification(reps);
    const weightUsed = patient.sex === 'M' ? '4kg' : '2kg';
    const result: ArmCurlResult = { testId: 'arm_curl', repetitions: reps, weightUsed, classification, completedAt: new Date().toISOString() };
    saveTestResult('arm_curl', 'Flexão de Cotovelo (30s)', result);
  };

  const getSitReachClassification = (dist: number): FlexibilityResult['classification'] => {
    const age = patient.age;
    const isMale = patient.sex === 'M';
    let min = 0; let max = 0;
    if (isMale) {
      if (age < 65) { min = -6; max = 4; } else if (age < 70) { min = -8; max = 2; } else if (age < 75) { min = -8; max = 3; } else if (age < 80) { min = -10; max = 2; } else if (age < 85) { min = -10; max = 2; } else if (age < 90) { min = -13; max = -3; } else { min = -15; max = -3; }
    } else {
      if (age < 65) { min = -1; max = 8; } else if (age < 70) { min = -1; max = 8; } else if (age < 75) { min = -3; max = 6; } else if (age < 80) { min = -4; max = 5; } else if (age < 85) { min = -5; max = 5; } else if (age < 90) { min = -6; max = 4; } else { min = -10; max = 1; }
    }
    const mid = (min + max) / 2;
    if (dist < min) return 'ruim';
    if (dist <= mid) return 'regular';
    if (dist <= max) return 'bom';
    return 'muito_bom';
  };

  const handleSaveSitReach = () => {
    const dist = parseFloat(sitReachDist);
    if (isNaN(dist)) return;
    const classification = getSitReachClassification(dist);
    const result: FlexibilityResult = { testId: 'sit_reach', distanceCm: dist, classification, completedAt: new Date().toISOString() };
    saveTestResult('sit_reach', 'Sentar e Alcançar', result);
  };

  const handleGdsAnswer = (index: number, answer: boolean) => {
    const newAnswers = [...gdsAnswers];
    newAnswers[index] = answer;
    setGdsAnswers(newAnswers);
  };

  const calculateGdsScore = () => {
    let score = 0;
    const gdsQuestions = [
      { id: 1, text: "Você está satisfeito com sua vida?", scoreIfYes: 0, scoreIfNo: 1 },
      { id: 2, text: "Você abandonou muitos de seus interesses e atividades?", scoreIfYes: 1, scoreIfNo: 0 },
      { id: 3, text: "Você sente que sua vida está vazia?", scoreIfYes: 1, scoreIfNo: 0 },
      { id: 4, text: "Você se aborrece com frequência?", scoreIfYes: 1, scoreIfNo: 0 },
      { id: 5, text: "Você se sente de bom humor na maior parte do tempo?", scoreIfYes: 0, scoreIfNo: 1 },
      { id: 6, text: "Você tem medo de que algum mal vá lhe acontecer?", scoreIfYes: 1, scoreIfNo: 0 },
      { id: 7, text: "Você se sente feliz na maior parte do tempo?", scoreIfYes: 0, scoreIfNo: 1 },
      { id: 8, text: "Você se sente frequentemente desamparado?", scoreIfYes: 1, scoreIfNo: 0 },
      { id: 9, text: "Você prefere ficar em casa a sair e fazer coisas novas?", scoreIfYes: 1, scoreIfNo: 0 },
      { id: 10, text: "Você acha que tem mais problemas de memória do que a maioria?", scoreIfYes: 1, scoreIfNo: 0 },
      { id: 11, text: "Você acha que é maravilhoso estar vivo agora?", scoreIfYes: 0, scoreIfNo: 1 },
      { id: 12, text: "Você se sente inútil da maneira como está agora?", scoreIfYes: 1, scoreIfNo: 0 },
      { id: 13, text: "Você se sente cheio de energia?", scoreIfYes: 0, scoreIfNo: 1 },
      { id: 14, text: "Você sente que sua situação não tem esperança?", scoreIfYes: 1, scoreIfNo: 0 },
      { id: 15, text: "Você acha que a maioria das pessoas está melhor do que você?", scoreIfYes: 1, scoreIfNo: 0 },
    ];
    gdsAnswers.forEach((answer, index) => {
      if (answer === true) {
        score += gdsQuestions[index].scoreIfYes;
      } else if (answer === false) {
        score += gdsQuestions[index].scoreIfNo;
      }
    });
    return score;
  };

  const handleSaveGDS15 = () => {
    if (gdsAnswers.some(a => a === null)) return;
    const score = calculateGdsScore();
    let classification: DepressionResult['classification'] = 'normal';
    if (score >= 11) classification = 'depressao_grave';
    else if (score >= 6) classification = 'depressao_leve';
    const result: DepressionResult = { testId: 'gds15', answers: gdsAnswers as boolean[], totalScore: score, classification, completedAt: new Date().toISOString() };
    saveTestResult('gds15', 'Depressão (GDS-15)', result);
  };

  const handleMeemChange = (key: keyof typeof meemData, delta: number, max: number) => {
    setMeemData(prev => ({
      ...prev,
      [key]: Math.min(Math.max(0, prev[key] + delta), max)
    }));
  };

  const getMeemTotal = () => {
    return meemData.orientation + meemData.registration + meemData.attention + meemData.recall + meemData.language;
  };

  const getMeemCutoff = () => {
    switch (educationLevel) {
      case 'analfabeto': return 20;
      case '1-4': return 25;
      case '5-8': return 26.5; 
      case '9-11': return 28;
      case '12+': return 29;
      default: return 0;
    }
  };

  const handleSaveMeem = () => {
    if (!educationLevel) {
      addToast("Por favor, selecione a escolaridade antes de finalizar.", 'warning');
      return;
    }
    const total = getMeemTotal();
    const cutoff = getMeemCutoff();
    const isDecline = total < cutoff;
    let classification: CognitiveResult['classification'] = 'sem_declinio';
    if (isDecline) {
       if (total >= 20) classification = 'declinio_leve';
       else if (total >= 10) classification = 'declinio_moderado';
       else classification = 'declinio_grave';
    }
    const result: CognitiveResult = { testId: 'meem_cognitive', scores: meemData, totalScore: total, classification, educationLevel: educationLevel, completedAt: new Date().toISOString() };
    saveTestResult('meem_cognitive', 'Declínio Cognitivo (MEEM)', result, { educationLevel });
  };

  // --- Berg Balance Test Logic ---
  const bergItems = [
    "1. Sentado para em pé", "2. Em pé sem apoio", "3. Sentado sem apoio nas costas", "4. De em pé para sentado",
    "5. Transferências", "6. Em pé com olhos fechados", "7. Em pé com pés juntos", "8. Alcançar à frente (braço estendido)",
    "9. Pegar objeto do chão", "10. Virar-se para olhar para trás", "11. Girar 360 graus", "12. Posicionar pé alternado no degrau",
    "13. Em pé com um pé à frente (Tandem)", "14. Em pé sobre uma perna"
  ];

  const handleBergScoreChange = (index: number, score: number) => {
    const newScores = [...bergScores];
    newScores[index] = score;
    setBergScores(newScores);
  };

  const calculateBergTotal = () => {
    return bergScores.reduce((acc, curr) => acc + curr, 0);
  };

  const handleSaveBerg = () => {
    const total = calculateBergTotal();
    let classification: BalanceResult['classification'] = 'baixo_risco';
    if (total <= 20) classification = 'alto_risco';
    else if (total <= 40) classification = 'medio_risco';
    else classification = 'baixo_risco';
    const result: BalanceResult = { testId: 'berg_balance', itemScores: bergScores, totalScore: total, classification, completedAt: new Date().toISOString() };
    saveTestResult('berg_balance', 'Equilíbrio (Berg)', result);
  };

  // --- Render Helpers ---
  const translateClassification = (text: string) => {
    return TERMS_MAP[text] || text.replace(/_/g, ' ').toUpperCase();
  };

  const getCurrentTestName = () => {
    const test = testProtocols.find(t => t.id === activeTestId);
    return test ? test.name : 'Avaliação';
  };

  const getCurrentTestIcon = () => {
    const test = testProtocols.find(t => t.id === activeTestId);
    return test ? test.icon : Activity;
  };

  const handlePrint = () => {
    window.print();
  };

  const CurrentTestIcon = getCurrentTestIcon();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Global Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Voltar para a lista de alunos"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Avaliação: {patient.name}</h1>
            <div className="text-gray-600 flex items-center gap-3 mt-1 text-sm">
              <span>{patient.age} anos • IMC {patient.bmi} • {patient.sex === 'M' ? 'Masculino' : 'Feminino'}</span>
              <span className="text-gray-300">|</span>
              <a 
                href={`https://wa.me/55${patient.whatsapp.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium transition-colors"
                title="Abrir no WhatsApp"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {/* AI Tutor Button */}
          <Button variant="secondary" onClick={() => setIsAiTutorOpen(true)} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:text-indigo-900 border-indigo-200">
             <Bot size={18} className="mr-2" />
             AI TUTOR
          </Button>

          <Button variant="outline" onClick={() => setReportModalOpen(true)}>
             <Printer size={18} className="mr-2" />
             GERAR LAUDO
          </Button>
        </div>
      </div>

      {viewMode === 'triage' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-4xl mx-auto">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
               <AlertCircle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">TRIAGEM INICIAL</h2>
              <p className="text-sm text-gray-600">Coleta Funcional do Aluno</p>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 space-y-8">
            {questions.map((q) => {
              const currentVal = screening[q.key as keyof Screening];
              return (
                <div key={q.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-lg text-gray-900 font-medium leading-tight">
                    {q.label}
                  </span>
                  
                  <div className="flex gap-3 w-full sm:w-auto min-w-[200px]">
                    <button onClick={() => handleToggle(q.key as keyof Screening, false)} className={`flex-1 sm:flex-none py-3 px-6 rounded-md font-bold transition-all duration-200 border ${currentVal === false ? 'bg-gray-600 text-white border-gray-600 shadow-md transform scale-105' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>NÃO</button>
                    <button onClick={() => handleToggle(q.key as keyof Screening, true)} className={`flex-1 sm:flex-none py-3 px-6 rounded-md font-bold transition-all duration-200 border ${currentVal === true ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>SIM</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
            <Button variant="blue" disabled={!isFormComplete} onClick={handleSaveTriage} className="w-full sm:w-auto text-lg py-3 px-8">CALIBRAR PROTOCOLOS</Button>
          </div>
        </div>
      )}

      {viewMode === 'tests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-2xl font-bold text-gray-900">SELEÇÃO DE TESTES</h2>
             <button onClick={() => setViewMode('triage')} className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">Editar Triagem</button>
          </div>
          <p className="text-gray-600 -mt-4">Selecione os protocolos indicados para a avaliação deste aluno.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {testProtocols.map((test) => {
              const status = getTestStatus(test.id);
              const testResult = patient.tests?.find(t => t.testId === test.id)?.result;
              let classificationDisplay = null;
              if (status === 'completed' && testResult) {
                if (test.id === 'fried') {
                   const res = testResult as FragilityResult;
                   const color = res.classification === 'not_frail' ? 'text-green-600' : res.classification === 'pre_frail' ? 'text-yellow-600' : 'text-red-600';
                   classificationDisplay = (<div className="mb-4"><span className={`text-sm font-bold ${color}`}>{translateClassification(res.classification)}</span><p className="text-xs text-gray-500">Score: {res.totalScore}/5</p></div>);
                } else if (test.id === 'tug') {
                  const res = testResult as TUGResult;
                  const color = res.classification === 'low_risk' ? 'text-green-600' : res.classification === 'moderate_risk' ? 'text-yellow-600' : 'text-red-600';
                  classificationDisplay = (<div className="mb-4"><span className={`text-sm font-bold ${color}`}>{translateClassification(res.classification)}</span><p className="text-xs text-gray-500">Tempo: {res.timeSeconds}s</p></div>);
                } else if (test.id === 'sit_stand_30' || test.id === 'arm_curl') {
                  const res = testResult as (ChairStandResult | ArmCurlResult);
                  const cls = res.classification;
                  const color = cls === 'excelente' || cls === 'muito_bom' || cls === 'bom' ? 'text-green-600' : cls === 'regular' ? 'text-yellow-600' : 'text-red-600';
                  classificationDisplay = (<div className="mb-4"><span className={`text-sm font-bold ${color}`}>{translateClassification(cls)}</span><p className="text-xs text-gray-500">Reps: {res.repetitions}</p></div>);
                } else if (test.id === 'sit_reach') {
                  const res = testResult as FlexibilityResult;
                  const cls = res.classification;
                  const color = cls === 'muito_bom' || cls === 'bom' ? 'text-green-600' : cls === 'regular' ? 'text-yellow-600' : 'text-red-600';
                  classificationDisplay = (<div className="mb-4"><span className={`text-sm font-bold ${color}`}>{translateClassification(cls)}</span><p className="text-xs text-gray-500">Dist: {res.distanceCm} cm</p></div>);
                } else if (test.id === 'gds15') {
                  const res = testResult as DepressionResult;
                  const cls = res.classification;
                  const color = cls === 'normal' ? 'text-green-600' : cls === 'depressao_leve' ? 'text-yellow-600' : 'text-red-600';
                  classificationDisplay = (<div className="mb-4"><span className={`text-sm font-bold ${color}`}>{translateClassification(cls)}</span><p className="text-xs text-gray-500">Pontos: {res.totalScore}/15</p></div>);
                } else if (test.id === 'meem_cognitive') {
                  const res = testResult as CognitiveResult;
                  const cls = res.classification;
                  const color = cls === 'sem_declinio' ? 'text-green-600' : cls === 'declinio_leve' ? 'text-yellow-600' : 'text-red-600';
                  classificationDisplay = (<div className="mb-4"><span className={`text-sm font-bold ${color}`}>{translateClassification(cls)}</span><p className="text-xs text-gray-500">Pontos: {res.totalScore}/30</p></div>);
                } else if (test.id === 'berg_balance') {
                  const res = testResult as BalanceResult;
                  const cls = res.classification;
                  const color = cls === 'baixo_risco' ? 'text-green-600' : cls === 'medio_risco' ? 'text-yellow-600' : 'text-red-600';
                  classificationDisplay = (<div className="mb-4"><span className={`text-sm font-bold ${color}`}>{translateClassification(cls)}</span><p className="text-xs text-gray-500">Pontos: {res.totalScore}/56</p></div>);
                }
              }

              return (
                <div key={test.id} className={`bg-white rounded-lg border-2 transition-all duration-200 p-6 flex flex-col shadow-sm hover:shadow-md group ${status === 'completed' ? 'border-green-200' : 'border-gray-200 hover:border-blue-600'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors"><test.icon size={24} className="text-gray-700 group-hover:text-blue-600 transition-colors" /></div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${status === 'completed' ? 'bg-green-100 text-green-800' : status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>{status === 'pending' ? 'PENDENTE' : status === 'completed' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{test.name}</h3>
                  {classificationDisplay ? classificationDisplay : (<p className="text-sm text-gray-600 mb-6 flex-grow">{test.desc}</p>)}
                  <Button variant="outline" fullWidth className={status === 'completed' ? '' : "group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"} onClick={() => startTest(test.id)}>{status === 'completed' ? 'REFAZER AVALIAÇÃO' : 'INICIAR AVALIAÇÃO'}</Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UNIFIED EXECUTION VIEW */}
      {viewMode === 'execution' && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setViewMode('tests')} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"><ChevronLeft size={20} className="mr-1" /> Voltar para Seleção</button>
            <Button variant="outline" onClick={() => setShowProtocolModal(true)} className="flex items-center gap-2 border-gray-300 shadow-sm"><FileText size={18} /> INSTRUÇÕES DO TESTE</Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><CurrentTestIcon size={24} /></div>
              <div><h2 className="text-xl font-bold text-gray-900">{getCurrentTestName()}</h2><p className="text-sm text-gray-600">Execução do Protocolo</p></div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* FRIED UI */}
              {activeTestId === 'fried' && (
                <>
                  <div className="space-y-4">
                    {[
                      { key: 'weightLoss', label: '1. Perda de peso não intencional (>4.5kg ou 5% no último ano)?' },
                      { key: 'fatigue', label: '2. Autorrelato de fadiga/exaustão?' },
                      { key: 'physicalActivity', label: '3. Baixo nível de atividade física (sedentário)?' }
                    ].map(q => (
                      <div key={q.key} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                        <span className="font-medium text-gray-900">{q.label}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setFriedData({...friedData, [q.key]: false})} className={`px-4 py-2 rounded-md font-bold border ${friedData[q.key as keyof typeof friedData] === false ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-200'}`}>NÃO</button>
                          <button onClick={() => setFriedData({...friedData, [q.key]: true})} className={`px-4 py-2 rounded-md font-bold border ${friedData[q.key as keyof typeof friedData] === true ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200'}`}>SIM</button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block font-medium text-gray-900 mb-2">4. Força de Preensão (kg)</label>
                        <Input label="" type="number" placeholder="0.0" value={friedData.gripStrengthKg} onChange={(e) => setFriedData({...friedData, gripStrengthKg: e.target.value})} />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block font-medium text-gray-900 mb-2">5. Tempo de Marcha 4.6m (s)</label>
                        <Input label="" type="number" placeholder="0.0" value={friedData.gaitSpeedTime} onChange={(e) => setFriedData({...friedData, gaitSpeedTime: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4"><Button variant="blue" onClick={handleSaveFried} className="px-8 py-3 text-lg">SALVAR AVALIAÇÃO</Button></div>
                </>
              )}
              {/* TUG UI */}
              {activeTestId === 'tug' && (
                <>
                  <div className="flex flex-col items-center justify-center space-y-8 py-8">
                    <div className="text-6xl font-mono font-bold text-gray-900 tracking-wider">
                      {isTimerRunning ? (Date.now() - startTimeRef.current) / 1000 : tugTime || '0.00'}
                      <span className="text-xl text-gray-500 ml-2">s</span>
                    </div>
                    
                    <div className="flex gap-4">
                      {!isTimerRunning ? (
                        <button onClick={startTimer} className="flex items-center px-8 py-4 bg-green-600 text-white rounded-full font-bold text-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                          <Play size={24} className="mr-2" /> INICIAR
                        </button>
                      ) : (
                        <button onClick={stopTimer} className="flex items-center px-8 py-4 bg-red-600 text-white rounded-full font-bold text-lg hover:bg-red-700 transition-all shadow-lg">
                          <Pause size={24} className="mr-2" /> PARAR
                        </button>
                      )}
                      <button onClick={resetTimer} className="flex items-center px-4 py-4 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition-colors">
                        <RotateCcw size={24} />
                      </button>
                    </div>

                    <div className="w-full max-w-xs mt-8">
                      <label className="block text-center text-sm font-medium text-gray-500 mb-2">Inserção Manual</label>
                      <Input label="" type="number" step="0.01" className="text-center text-lg" placeholder="0.00" value={tugTime} onChange={(e) => setTugTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4"><Button variant="blue" onClick={handleSaveTUG} className="px-8 py-3 text-lg">SALVAR AVALIAÇÃO</Button></div>
                </>
              )}

              {/* CHAIR STAND & ARM CURL UI (Shared Structure) */}
              {(activeTestId === 'sit_stand_30' || activeTestId === 'arm_curl') && (
                <>
                  <div className="flex flex-col items-center justify-center space-y-8 py-8">
                    <div className="relative">
                      <div className="text-6xl font-mono font-bold text-gray-900">{timeLeft}</div>
                      <div className="absolute -bottom-6 left-0 right-0 text-center text-sm text-gray-500">segundos</div>
                    </div>

                    <div className="flex gap-4">
                      {!isCountdownRunning ? (
                        <button onClick={startCountdown} className="flex items-center px-8 py-4 bg-green-600 text-white rounded-full font-bold text-lg hover:bg-green-700 transition-all shadow-lg">
                          <Play size={24} className="mr-2" /> INICIAR 30s
                        </button>
                      ) : (
                        <button onClick={stopCountdown} className="flex items-center px-8 py-4 bg-red-600 text-white rounded-full font-bold text-lg hover:bg-red-700 transition-all shadow-lg">
                          <Pause size={24} className="mr-2" /> PAUSAR
                        </button>
                      )}
                      <button onClick={resetCountdown} className="flex items-center px-4 py-4 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition-colors">
                        <RotateCcw size={24} />
                      </button>
                    </div>

                    <div className="w-full max-w-xs bg-blue-50 p-6 rounded-xl border border-blue-100">
                      <label className="block text-center font-bold text-blue-900 mb-2">
                        Repetições Realizadas
                      </label>
                      <Input 
                        label="" 
                        type="number" 
                        className="text-center text-2xl font-bold" 
                        placeholder="0" 
                        value={activeTestId === 'sit_stand_30' ? chairStandReps : armCurlReps} 
                        onChange={(e) => activeTestId === 'sit_stand_30' ? setChairStandReps(e.target.value) : setArmCurlReps(e.target.value)} 
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button variant="blue" onClick={activeTestId === 'sit_stand_30' ? handleSaveChairStand : handleSaveArmCurl} className="px-8 py-3 text-lg">
                      SALVAR AVALIAÇÃO
                    </Button>
                  </div>
                </>
              )}

              {/* SIT REACH UI */}
              {activeTestId === 'sit_reach' && (
                <>
                  <div className="flex flex-col items-center justify-center space-y-8 py-10">
                    <div className="w-full max-w-md bg-gray-50 p-8 rounded-xl border border-gray-200 text-center">
                      <label className="block text-lg font-bold text-gray-900 mb-4">
                        Distância Alcançada (cm)
                      </label>
                      <p className="text-sm text-gray-500 mb-6">
                        Use valores negativos (-) se não alcançar a ponta do pé, e positivos (+) se ultrapassar.
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setSitReachDist((prev) => String((parseFloat(prev || '0') - 1).toFixed(1)))} className="p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"><Minus size={20} /></button>
                        <Input 
                          label="" 
                          type="number" 
                          step="0.5" 
                          className="text-center text-3xl font-bold w-32" 
                          placeholder="0.0" 
                          value={sitReachDist} 
                          onChange={(e) => setSitReachDist(e.target.value)} 
                        />
                        <button onClick={() => setSitReachDist((prev) => String((parseFloat(prev || '0') + 1).toFixed(1)))} className="p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"><Plus size={20} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4"><Button variant="blue" onClick={handleSaveSitReach} className="px-8 py-3 text-lg">SALVAR AVALIAÇÃO</Button></div>
                </>
              )}

              {/* GDS-15 UI */}
              {activeTestId === 'gds15' && (
                <>
                  <div className="space-y-4">
                    {[
                      { id: 1, text: "1. Você está satisfeito com sua vida?" },
                      { id: 2, text: "2. Você abandonou muitos de seus interesses e atividades?" },
                      { id: 3, text: "3. Você sente que sua vida está vazia?" },
                      { id: 4, text: "4. Você se aborrece com frequência?" },
                      { id: 5, text: "5. Você se sente de bom humor na maior parte do tempo?" },
                      { id: 6, text: "6. Você tem medo de que algum mal vá lhe acontecer?" },
                      { id: 7, text: "7. Você se sente feliz na maior parte do tempo?" },
                      { id: 8, text: "8. Você se sente frequentemente desamparado?" },
                      { id: 9, text: "9. Você prefere ficar em casa a sair e fazer coisas novas?" },
                      { id: 10, text: "10. Você acha que tem mais problemas de memória do que a maioria?" },
                      { id: 11, text: "11. Você acha que é maravilhoso estar vivo agora?" },
                      { id: 12, text: "12. Você se sente inútil da maneira como está agora?" },
                      { id: 13, text: "13. Você se sente cheio de energia?" },
                      { id: 14, text: "14. Você sente que sua situação não tem esperança?" },
                      { id: 15, text: "15. Você acha que a maioria das pessoas está melhor do que você?" },
                    ].map((q, idx) => (
                      <div key={q.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="font-medium text-gray-900 text-sm flex-1 mr-4">{q.text}</span>
                        <div className="flex gap-2 min-w-[120px]">
                          <button onClick={() => handleGdsAnswer(idx, true)} className={`flex-1 py-1.5 px-3 rounded text-xs font-bold border transition-colors ${gdsAnswers[idx] === true ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>SIM</button>
                          <button onClick={() => handleGdsAnswer(idx, false)} className={`flex-1 py-1.5 px-3 rounded text-xs font-bold border transition-colors ${gdsAnswers[idx] === false ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>NÃO</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4"><Button variant="blue" onClick={handleSaveGDS15} className="px-8 py-3 text-lg">SALVAR AVALIAÇÃO</Button></div>
                </>
              )}

              {/* MEEM UI */}
              {activeTestId === 'meem_cognitive' && (
                <>
                  <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 mb-6">
                     <h3 className="text-lg font-bold text-blue-900 mb-2">1. Escolaridade do Aluno</h3>
                     <select className="w-full rounded-md border-blue-200 focus:border-blue-500 focus:ring focus:ring-blue-200 py-3 text-base" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value as any)}>
                       <option value="" disabled>Selecione a escolaridade...</option>
                       <option value="analfabeto">Analfabeto (Corte: 20)</option>
                       <option value="1-4">1 a 4 anos (Corte: 25)</option>
                       <option value="5-8">5 a 8 anos (Corte: 26.5)</option>
                       <option value="9-11">9 a 11 anos (Corte: 28)</option>
                       <option value="12+">12 anos ou mais (Corte: 29)</option>
                     </select>
                  </div>
                  <div className="space-y-6">
                    {[
                      { key: 'orientation', label: '2. Orientação Temporal e Espacial', max: 10, desc: 'Ano, Estação, Dia, Mês, Dia da Semana, Local, Andar, Bairro, Cidade, Estado.' },
                      { key: 'registration', label: '3. Registro (Memória Imediata)', max: 3, desc: 'Repetir: CARRO, VASO, TIJOLO (1 ponto por acerto na primeira tentativa).' },
                      { key: 'attention', label: '4. Atenção e Cálculo', max: 5, desc: 'Subtrair 7 de 100 sucessivamente (5x) OU soletrar MUNDO de trás para frente.' },
                      { key: 'recall', label: '5. Evocação (Memória Tardia)', max: 3, desc: 'Lembrar das palavras: CARRO, VASO, TIJOLO.' },
                      { key: 'language', label: '6. Linguagem e Praxia', max: 9, desc: 'Nomear (2), Repetir (1), Comando 3 estágios (3), Ler (1), Escrever (1), Copiar (1).' }
                    ].map((section) => (
                      <div key={section.key} className="border-b border-gray-100 pb-6">
                         <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-gray-900">{section.label}</h3><span className="text-sm font-medium text-gray-500">Max: {section.max}</span></div>
                         <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 max-w-[70%]">{section.desc}</p>
                            <div className="flex items-center gap-4">
                              <button onClick={() => handleMeemChange(section.key as any, -1, section.max)} className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"><Minus size={16} /></button>
                              <span className="text-2xl font-bold w-8 text-center">{meemData[section.key as keyof typeof meemData]}</span>
                              <button onClick={() => handleMeemChange(section.key as any, 1, section.max)} className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"><Plus size={16} /></button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-900 text-white rounded-lg p-5 border border-gray-800 flex justify-between items-center mt-8">
                      <div><h4 className="text-lg font-bold">Total: {getMeemTotal()} / 30</h4>{educationLevel && (<p className="text-sm text-gray-400">Ponto de Corte: {getMeemCutoff()}</p>)}</div>
                      <Button variant="blue" disabled={!educationLevel} onClick={handleSaveMeem} className="py-3 px-8 text-base">FINALIZAR AVALIAÇÃO</Button>
                  </div>
                </>
              )}

              {/* BERG BALANCE UI */}
              {activeTestId === 'berg_balance' && (
                <>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800 mb-6">Avalie cada item de 0 (incapaz) a 4 (normal) conforme desempenho do aluno. Consulte o protocolo para critérios exatos.</div>
                  <div className="space-y-3">
                    {bergItems.map((item, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
                        <span className="text-lg text-gray-900 font-medium leading-tight flex-1">{item}</span>
                        <div className="flex gap-2">
                          {[0, 1, 2, 3, 4].map((score) => (
                            <button key={score} onClick={() => handleBergScoreChange(index, score)} className={`w-10 h-10 rounded-full font-bold transition-all duration-200 border ${bergScores[index] === score ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-110' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`} title={`Nota ${score}`}>{score}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-900 text-white rounded-lg p-5 border border-gray-800 flex justify-between items-center mt-8">
                      <div><h4 className="text-lg font-bold">Total: {calculateBergTotal()} / 56</h4><p className="text-xs text-gray-400">&lt; 45 pontos indica alto risco de queda.</p></div>
                      <Button variant="blue" onClick={handleSaveBerg} className="py-3 px-8 text-base">FINALIZAR AVALIAÇÃO</Button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showProtocolModal} onClose={() => setShowProtocolModal(false)} title="Instruções do Protocolo">
        <div className="p-6">
           <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-6">
             <h4 className="text-lg font-bold text-blue-900 mb-2">{getCurrentTestName()}</h4>
             <p className="text-gray-700 leading-relaxed">
               {getProtocolInstructions(activeTestId)}
             </p>
           </div>
           
           <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
             <p className="font-bold mb-1">Dica de Segurança:</p>
             <p>Sempre realize os testes próximos a uma parede ou com suporte para garantir a segurança do aluno em caso de desequilíbrio.</p>
           </div>
        </div>
      </Modal>

      {reportModalOpen && patient && (
         <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in relative">
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
              <div className="flex-1 overflow-y-auto bg-gray-200 p-8" id="report-scroll-container">
                 <div id="printable-section" className="bg-white shadow-xl mx-auto max-w-[21cm] min-h-[29.7cm] origin-top">
                    <ReportTemplate patient={patient} observations={clinicalObservations} />
                 </div>
              </div>
           </div>
        </div>
      )}

      <AiTutor patient={patient} isOpen={isAiTutorOpen} onClose={() => setIsAiTutorOpen(false)} />
    </div>
  );
};