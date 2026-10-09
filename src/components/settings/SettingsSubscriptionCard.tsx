import React from 'react';
import { Crown, CreditCard, ExternalLink, Brain } from 'lucide-react';

interface SettingsSubscriptionCardProps {
  isPremium: boolean;
  isPro: boolean;
  userMeta?: { persona?: { archetype: string } } | null;
  onOpenCalibration: () => void;
  onNavigatePricing: () => void;
}

export const SettingsSubscriptionCard: React.FC<SettingsSubscriptionCardProps> = ({
  isPremium,
  isPro,
  userMeta,
  onOpenCalibration,
  onNavigatePricing,
}) => {
  const planBadge = () => {
    if (isPremium) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
          <Crown size={12} /> Premium
        </span>
      );
    }
    if (isPro) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
          Pro
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Gratuito
      </span>
    );
  };

  return (
    <div className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-8 relative overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-tr from-sky-600 to-emerald-500 rounded-2xl text-white shadow-md">
          <Crown size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Assinatura</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Seu plano atual</p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CreditCard className="text-emerald-500" size={24} />
          <div>
            <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Plano Ativo
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-white uppercase">
              {planBadge()}
            </p>
          </div>
        </div>
        <button
          onClick={onNavigatePricing}
          className="text-[10px] font-black text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-4 py-2 rounded-xl uppercase tracking-widest flex items-center gap-2 border border-sky-200 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all"
        >
          Ver planos <ExternalLink size={12} />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5">
        <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
          Sua evolução
        </p>
        <p className="text-sm font-black text-slate-900 dark:text-white leading-snug">
          {isPremium
            ? 'Você já está na camada mais completa do produto.'
            : isPro
              ? 'Seu controle diário já está destravado. O próximo salto é a Central completa.'
              : 'Seu foco agora é criar hábito no Controla antes de subir de plano.'}
        </p>
      </div>

      {/* Calibração de Comando */}
      <div className="mt-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 rounded-xl border border-sky-200 dark:border-sky-800">
            <Brain size={18} />
          </div>
          <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Sintonização de Comando</p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
          A calibração altera o tom do Nexus e as métricas prioritárias do seu cockpit.
        </p>
        {userMeta?.persona && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-transparent dark:border-sky-800 text-[10px] font-black uppercase tracking-widest">
            Perfil Atual: {userMeta.persona.archetype}
          </div>
        )}
        <button
          onClick={onOpenCalibration}
          className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-sky-900/20"
        >
          Recalibrar Inteligência
        </button>
      </div>
    </div>
  );
};

export default SettingsSubscriptionCard;
