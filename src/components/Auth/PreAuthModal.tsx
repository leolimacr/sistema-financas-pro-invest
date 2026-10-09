import React from 'react';
import { X, ArrowRight, Heart, ShieldCheck } from 'lucide-react';

interface PreAuthModalProps {
  open: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  onLogin: () => void;
}

const PreAuthModal: React.FC<PreAuthModalProps> = ({
  open,
  onClose,
  onCreateAccount,
  onLogin,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm px-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
        
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-6 shadow-sm">
          <Heart className="text-emerald-500 fill-emerald-500" size={32} />
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
          Estamos quase lá!
        </h2>
        
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8">
          Para que o Nexus possa calcular seu plano realista e salvar seu progresso com total privacidade, você só precisa criar um acesso gratuito.
        </p>

        <div className="w-full space-y-4">
          <button
            onClick={onCreateAccount}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
          >
            Criar Conta Grátis
            <ArrowRight size={16} />
          </button>

          <button
            onClick={onLogin}
            className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest border border-slate-200 dark:border-slate-700"
          >
            Já tenho conta / Entrar
          </button>

          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-[11px] uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto py-2"
          >
            <X size={14} /> Continuar explorando o site
          </button>
        </div>

        <div className="flex items-center gap-2 mt-6 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
          <ShieldCheck size={12} className="text-emerald-500" />
          Seus dados estão protegidos
        </div>
      </div>
    </div>
  );
};

export default PreAuthModal;
