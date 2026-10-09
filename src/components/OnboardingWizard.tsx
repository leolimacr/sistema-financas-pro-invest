import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { X, ArrowRight, ArrowLeft, CheckCircle, Sparkles, AlertCircle, Shield, Target } from 'lucide-react';

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

type OnboardingPersona = 'dividas' | 'patrimonio' | 'geral';

const PERSONA_OPTIONS: { value: OnboardingPersona; label: string; sublabel: string }[] = [
  { value: 'dividas', label: 'Tenho dívidas que me preocupam', sublabel: 'Quero me organizar para sair do vermelho' },
  { value: 'patrimonio', label: 'Quero investir e crescer', sublabel: 'Acompanhar bens, investimentos e evolução' },
  { value: 'geral', label: 'Quero controlar o dia a dia', sublabel: 'Registrar contas, gastos e ver o que sobra' },
];

/** Onboarding conceitual: introdução ao Saldo Livre Real, Colchão Emergencial e perfil inicial. */
const STEPS = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'O dinheiro que sobra de verdade',
    description: 'Aqui você não olha só o saldo da conta. O app calcula o que sobra depois das despesas do mês — para você saber quanto pode usar com tranquilidade.',
    color: 'emerald',
  },
  {
    id: 'marco_zero',
    icon: Target,
    title: 'Colchão Emergencial: sua primeira proteção',
    description: 'É o dinheiro que funciona como amortecedor entre o dia a dia e a reserva de emergência. Uma camada de segurança para meses de aperto.',
    color: 'sky',
  },
  {
    id: 'diagnose',
    icon: Shield,
    title: 'O que você quer resolver hoje?',
    description: 'Escolha seu objetivo abaixo. Isso ajuda o app a personalizar dicas e sugestões para o seu momento.',
    color: 'sky',
  },
  {
    id: 'ready',
    icon: CheckCircle,
    title: 'Tudo pronto para começar',
    description: 'Registre seu dia a dia sem limite no Free. Quando quiser comparar meses anteriores e ver sua evolução, o Pro libera o histórico completo.',
    color: 'emerald',
  },
];

const colorMap: Record<string, { bg: string; icon: string; button: string; ring: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30',
    ring: 'bg-emerald-500',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800',
    icon: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800',
    button: 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/30',
    ring: 'bg-sky-500',
  },
};

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [persona, setPersona] = useState<OnboardingPersona | null>(null);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isDiagnose = step.id === 'diagnose';
  const colors = colorMap[step.color] || colorMap.emerald;
  const Icon = step.icon;

  const markComplete = async () => {
    setCompleting(true);
    try {
      await updateDoc(doc(firestore, 'users', userId), {
        onboardingCompleted: true,
        onboardingPersona: persona ?? 'geral',
      });
    } catch (e) {
      console.error('Erro ao gravar onboardingCompleted:', e);
    } finally {
      onComplete();
    }
  };

  const handleNext = () => {
    if (isLast) markComplete();
    else setCurrentStep((prev) => prev + 1);
  };

  const handleSkip = async () => {
    setCompleting(true);
    try {
      await updateDoc(doc(firestore, 'users', userId), {
        onboardingCompleted: true,
        onboardingPersona: persona ?? 'geral',
      });
    } catch (e) {
      console.error('Erro ao gravar onboarding no skip:', e);
    } finally {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? colors.ring : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className={`m-4 rounded-xl border p-6 ${colors.bg} transition-all duration-300`}>
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-5 ${colors.icon}`}>
            <Icon size={28} />
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">{step.title}</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{step.description}</p>

          {isDiagnose && (
            <div className="mt-4 flex flex-col gap-2">
              {PERSONA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPersona(opt.value)}
                  className={`text-left rounded-xl border px-4 py-3 transition-all duration-200 ${
                    persona === opt.value
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/40 dark:hover:bg-slate-700'
                  }`}
                >
                  <p className={`text-sm font-black leading-snug ${persona === opt.value ? 'text-sky-800 dark:text-sky-300' : 'text-slate-800 dark:text-slate-200'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.sublabel}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-5 flex items-center gap-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={completing || (isDiagnose && !persona)}
            className={`flex-1 ${colors.button} text-white font-black py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {completing ? 'Salvando...' : isLast ? 'Ir para o Controla' : 'Próximo'}
            {!completing && <ArrowRight size={16} />}
          </button>

          {!isLast && (
            <button
              type="button"
              onClick={handleSkip}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              aria-label="Pular"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {!isLast && (
          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 pb-4">
            Passo {currentStep + 1} de {STEPS.length}
          </p>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
