import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../firebase';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Target,
  Zap,
  Moon,
  Scale,
  Activity,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import {
  calculateUserPersona,
  getPersonaVoice,
  getPersonaRouteLabels,
} from '../../../services/personaService';
import type { PersonaContext } from '../../../types';

interface CommandCalibrationProps {
  userId: string;
  onComplete: (persona: PersonaContext) => void;
  onClose?: () => void;
  initialAnswers?: Partial<Record<string, string>>;
}

const QUESTIONS = [
  {
    id: 'battlefield',
    title: 'Qual é o seu principal campo de batalha hoje?',
    icon: Target,
    options: [
      { id: 'debts', label: 'Sair das dívidas e respirar', sub: 'Limpeza e fôlego diário' },
      { id: 'family', label: 'Proteger minha família', sub: 'Segurança e reserva' },
      { id: 'freedom', label: 'Acelerar minha liberdade', sub: 'Patrimônio e soberania' },
      { id: 'clarity', label: 'Organizar o mês com clareza', sub: 'Rotina e previsibilidade' },
    ],
  },
  {
    id: 'debts_status',
    title: 'Como você descreveria suas dívidas?',
    icon: Scale,
    options: [
      { id: 'critical', label: 'Preocupantes', sub: 'Cartão, juros ou empréstimos' },
      { id: 'structured', label: 'Controladas', sub: 'Financiamentos planejados' },
      { id: 'leverage', label: 'Alavancadas com propósito', sub: 'Crédito para crescer' },
      { id: 'none', label: 'Sem dívidas relevantes', sub: 'Caixa livre de débitos' },
    ],
  },
  {
    id: 'sleep',
    title: 'O que mais interfere no seu sono financeiro?',
    icon: Moon,
    options: [
      { id: 'worried', label: 'Boletos e contas', sub: 'Ansiedade com o mês' },
      { id: 'calm', label: 'Nada crítico', sub: 'Reserva me dá tranquilidade' },
      { id: 'focused', label: 'Oportunidades', sub: 'Penso no próximo nível' },
      { id: 'neutral', label: 'Incerteza geral', sub: 'Falta clareza do quadro' },
    ],
  },
  {
    id: 'surplus',
    title: 'Quando sobra dinheiro, o que você faz?',
    icon: Wallet,
    options: [
      { id: 'spend', label: 'Compromisso no mês seguinte', sub: 'Ainda não há plano fixo' },
      { id: 'debt_pay', label: 'Quito ou reduzo dívidas', sub: 'Priorizo alívio' },
      { id: 'reserve', label: 'Reforço reserva', sub: 'Priorizo proteção' },
      { id: 'invest', label: 'Invisto ou acelero metas', sub: 'Priorizo crescimento' },
    ],
  },
  {
    id: 'objective',
    title: 'O que você busca no FPI hoje?',
    icon: Zap,
    options: [
      { id: 'survival', label: 'Uma saída para o labirinto', sub: 'Respirar e organizar' },
      { id: 'stability', label: 'Garantir o futuro', sub: 'Proteção para mim e família' },
      { id: 'expansion', label: 'Um cockpit de comando', sub: 'Independência patrimonial' },
      { id: 'clarity', label: 'Clareza sem complicação', sub: 'Entender antes de decidir' },
    ],
  },
  {
    id: 'contact',
    title: 'Qual sua relação com investimentos?',
    icon: Activity,
    options: [
      { id: 'beginner', label: 'O que sobra eu guardo', sub: 'Ainda não invisto ativamente' },
      { id: 'basic', label: 'Feijão com arroz', sub: 'CDB, Tesouro ou poupança' },
      { id: 'intermediate', label: 'Carteira diversificada', sub: 'Fundos, ações ou FIIs' },
      { id: 'strategist', label: 'Opero com estratégia', sub: 'Alocação e custo de oportunidade' },
    ],
  },
  {
    id: 'language',
    title: 'Como prefere receber análises?',
    icon: MessageSquare,
    options: [
      { id: 'simple', label: 'Direto e simples', sub: 'Sem termos complicados' },
      { id: 'objective', label: 'Objetivo e formal', sub: 'Clareza com precisão' },
      { id: 'technical', label: 'Técnico e numérico', sub: 'Dados e métricas' },
      { id: 'strategic', label: 'Estratégico e contextual', sub: 'Trajetória e trade-offs' },
    ],
  },
];

const CommandCalibration: React.FC<CommandCalibrationProps> = ({
  userId,
  onComplete,
  onClose,
  initialAnswers = {},
}) => {
  const [phase, setPhase] = useState<'questions' | 'reveal'>('questions');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => ({ ...(initialAnswers as Record<string, string>) })
  );
  const [loading, setLoading] = useState(false);
  const [savedPersona, setSavedPersona] = useState<PersonaContext | null>(null);

  const step = QUESTIONS[currentStep];
  const isLast = currentStep === QUESTIONS.length - 1;
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  const previewPersona = useMemo(() => {
    if (Object.keys(answers).length < 2) return null;
    return calculateUserPersona(answers);
  }, [answers]);

  const handleSelect = (optionId: string) => {
    const newAnswers = { ...answers, [step.id]: optionId };
    setAnswers(newAnswers);

    if (!isLast) {
      setTimeout(() => setCurrentStep((prev) => prev + 1), 280);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const persona = calculateUserPersona(answers);
      await updateDoc(doc(firestore, 'users', userId), { persona });
      setSavedPersona(persona);
      setPhase('reveal');
    } catch (error) {
      console.error('Erro ao salvar calibração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevealClose = () => {
    if (savedPersona) onComplete(savedPersona);
  };

  const voice = savedPersona ? getPersonaVoice(savedPersona.archetype) : null;
  const routeLabels = savedPersona ? getPersonaRouteLabels(savedPersona.archetype) : [];

  if (phase === 'reveal' && voice && savedPersona) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-surface-deep/90 backdrop-blur-md p-4">
        <div className="w-full max-w-lg bg-surface-dark border border-slate-800 rounded-3xl shadow-technical overflow-hidden">
          <div className="p-8 text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center border"
              style={{ borderColor: voice.color, backgroundColor: `${voice.color}15` }}
            >
              <CheckCircle size={32} style={{ color: voice.color }} />
            </div>
            <p className="text-xxs font-black uppercase tracking-ultra-wide text-brand-technical mb-2">
              Comando calibrado
            </p>
            <h2 className="text-2xl font-black text-white mb-1">{voice.title}</h2>
            <p className="text-sm font-bold text-slate-400 mb-6">{voice.motto}</p>
            <p className="text-sm text-slate-300 leading-relaxed mb-8">{voice.firstInsight}</p>

            <div className="text-left bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-8">
              <p className="text-xxs font-black uppercase tracking-widest text-slate-500 mb-3">
                Seus próximos passos
              </p>
              <ul className="space-y-2">
                {routeLabels.map((label, i) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-slate-300">
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xxs font-black shrink-0"
                      style={{ backgroundColor: `${voice.color}20`, color: voice.color }}
                    >
                      {i + 1}
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleRevealClose}
              className="w-full px-8 py-3.5 bg-brand-technical hover:bg-sky-400 text-surface-deep font-black rounded-xl transition-all uppercase tracking-tighter text-sm"
            >
              Ativar Modo Comando
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-surface-deep/90 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-surface-dark border border-slate-800 rounded-3xl shadow-technical overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xxs font-black uppercase tracking-ultra-wide text-brand-technical mb-1">
              Calibração de Comando
            </h2>
            <p className="text-technical text-sm font-bold">7 perguntas · relacionamento FPI inicia aqui</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 transition-colors"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="h-1 bg-slate-900 overflow-hidden">
          <div
            className="h-full bg-brand-technical transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-8 flex-1 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-brand-technical">
              <step.icon size={22} />
            </div>
            <h3 className="text-lg font-black text-white leading-tight">{step.title}</h3>
          </div>

          <div className="grid gap-2.5">
            {step.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={`group text-left p-4 rounded-2xl border transition-all duration-200 ${
                  answers[step.id] === option.id
                    ? 'border-brand-technical bg-brand-technical/10'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p
                      className={`font-bold text-sm mb-0.5 ${
                        answers[step.id] === option.id ? 'text-brand-technical' : 'text-slate-200'
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="text-xxs uppercase tracking-wider text-slate-500 font-bold">{option.sub}</p>
                  </div>
                  {answers[step.id] === option.id && (
                    <CheckCircle size={18} className="text-brand-technical shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            disabled={currentStep === 0}
            className="flex items-center gap-2 text-xxs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 disabled:opacity-0"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>

          {isLast && answers[step.id] ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="px-8 py-3 bg-brand-technical hover:bg-sky-400 text-surface-deep font-black rounded-xl transition-all flex items-center gap-2 uppercase tracking-tighter text-sm disabled:opacity-60"
            >
              {loading ? 'Sincronizando...' : 'Concluir calibração'}
              {!loading && <ArrowRight size={16} />}
            </button>
          ) : (
            <p className="text-xxs font-bold text-slate-600 uppercase tracking-widest">
              {currentStep + 1} / {QUESTIONS.length}
            </p>
          )}
        </div>

        {previewPersona && isLast && (
          <div className="px-8 py-3 bg-slate-800/80 border-t border-slate-700/50 flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: getPersonaVoice(previewPersona.archetype).color }}
            />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Perfil provável:{' '}
              <span style={{ color: getPersonaVoice(previewPersona.archetype).color }}>
                {getPersonaVoice(previewPersona.archetype).title}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandCalibration;
