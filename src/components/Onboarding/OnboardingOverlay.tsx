import React from 'react';
import { X, ArrowRight, Wallet, BarChart3, ShieldCheck, Target } from 'lucide-react';

interface OnboardingOverlayProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onLaunch: () => void;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  step,
  onNext,
  onSkip,
  onFinish,
  onLaunch,
}) => {
  if (step === 0) return null;

  const content = [
    {
      icon: <Wallet className="text-emerald-500" size={32} />,
      title: 'Seu painel financeiro',
      body: 'O Finanças Pro Invest mostra sua situação real de forma clara. Aqui você vê o que realmente importa: quanto sobra, onde está protegido e o que fazer agora.',
      cta: 'Continuar',
      action: onNext,
    },
    {
      icon: <BarChart3 className="text-sky-500" size={32} />,
      title: 'Seu dinheiro livre de verdade',
      body: 'A Disponibilidade Real é o que sobra depois de descontar contas, cartão e proteção. Esse número mostra o que você pode decidir sem medo.',
      cta: 'Entendi',
      action: onNext,
    },
    {
      icon: <ShieldCheck className="text-indigo-500" size={32} />,
      title: 'Sua primeira proteção',
      body: 'O Colchão Emergencial é uma reserva rápida para meses de aperto, antes de mexer na emergência. Defina sua meta e acompanhe na Home.',
      cta: 'Continuar',
      action: onNext,
    },
    {
      icon: <Target className="text-rose-500" size={32} />,
      title: 'Sua vez de agir',
      body: 'Comece anotando o que entra e sai no Controla. Com alguns lançamentos, o sistema já mostra sua Disponibilidade Real e sugere o próximo passo.',
      cta: 'Fazer primeiro lançamento',
      action: onLaunch,
    },
  ];

  const currentContent = content[step - 1];
  const isLast = step === 4;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-sm px-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-sm">
          {currentContent.icon}
        </div>

        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
          {currentContent.title}
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8">
          {currentContent.body}
        </p>

        <div className="w-full space-y-4">
          <button
            onClick={currentContent.action}
            className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg hover:bg-slate-800 dark:hover:bg-emerald-500 active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
          >
            {currentContent.cta}
            <ArrowRight size={16} />
          </button>

          <button
            onClick={isLast ? onFinish : onSkip}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-[11px] uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto py-2"
          >
            <X size={14} /> {isLast ? 'Pular' : 'Pular introdução'}
          </button>
        </div>

        <div className="flex gap-1.5 mt-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                s === step ? 'w-6 bg-slate-900 dark:bg-emerald-500' : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
