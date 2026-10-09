import React from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';

interface DebtUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title: string;
  description: string;
}

export const DebtUpgradeModal: React.FC<DebtUpgradeModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  title, 
  description 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[2rem] mb-6">
            <Sparkles size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">{title}</h3>
          <p className="text-slate-600 font-medium leading-relaxed mb-8">{description}</p>
          
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={onUpgrade}
              className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
            >
              Conhecer plano Pro <ArrowRight size={16} />
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-xs"
            >
              Talvez depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};