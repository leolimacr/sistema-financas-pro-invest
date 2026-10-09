import React from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { NEXUS_COPY } from '../../../../theme/fpiVoiceGuide';

interface RecurringIntroModalProps {
  isOpen: boolean;
  dontShowFor15Days: boolean;
  setDontShowFor15Days: (val: boolean) => void;
  onConfirm: () => void;
}

const RecurringIntroModal: React.FC<RecurringIntroModalProps> = ({
  isOpen,
  dontShowFor15Days,
  setDontShowFor15Days,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-primary dark:bg-slate-900 w-full max-w-sm rounded-4xl shadow-2xl border border-surface-elevated dark:border-slate-800 overflow-hidden p-6 space-y-6 animate-in zoom-in duration-300">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-secondary/10 rounded-2xl text-brand-secondary">
            <RefreshCw size={24} className="animate-spin-slow" />
          </div>
          <h3 className="text-xl font-black text-text-primary dark:text-white tracking-tight leading-tight">
            {NEXUS_COPY.recurringIntroTitle}
          </h3>
        </div>

        <p className="text-sm font-medium text-text-secondary dark:text-slate-300 leading-relaxed">
          {NEXUS_COPY.recurringIntroBody}
        </p>

        <div className="space-y-4 pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={dontShowFor15Days}
                onChange={(e) => setDontShowFor15Days(e.target.checked)}
                className="peer appearance-none w-5 h-5 border-2 border-surface-elevated dark:border-slate-700 rounded-lg checked:bg-brand-secondary checked:border-brand-secondary transition-all"
              />
              <Check size={12} className="absolute left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
            <span className="text-xxs font-bold text-text-muted dark:text-slate-400 uppercase tracking-widest group-hover:text-text-secondary dark:group-hover:text-slate-300 transition-colors">
              Não mostrar novamente nos próximos 15 dias
            </span>
          </label>

          <button
            onClick={onConfirm}
            className="w-full py-4 bg-brand-secondary text-text-onBrand rounded-3xl font-black uppercase text-xxs tracking-ultra-wide shadow-soft active:scale-95 transition-transform"
          >
            Entendi e quero acessar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringIntroModal;
