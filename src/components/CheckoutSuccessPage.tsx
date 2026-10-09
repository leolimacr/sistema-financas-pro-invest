import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, LayoutDashboard, Crown } from 'lucide-react';

interface CheckoutSuccessPageProps {
  planName?: string;
}

const CheckoutSuccessPage: React.FC<CheckoutSuccessPageProps> = ({ planName = 'Pro' }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-primary dark:bg-slate-950 flex items-center justify-center p-6 text-slate-900 dark:text-white font-sans transition-colors">
      <div className="w-full max-w-md text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Success Icon */}
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" />
          <div className="relative w-24 h-24 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center">
            <CheckCircle size={48} className="text-emerald-500 dark:text-emerald-400" />
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
              Assinatura Confirmada
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Bem-vindo ao próximo nível.</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Sua jornada financeira ganhou novas ferramentas. O plano <span className="text-slate-900 dark:text-white font-bold">{planName}</span> já está ativo na sua conta.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/app/central')}
            className="group flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <LayoutDashboard size={16} />
            Ir para o Painel
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={() => navigate('/app/central')}
            className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
          >
            Explorar Central
          </button>
        </div>

        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
          Obrigado por confiar no Finanças Pro Invest
        </p>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
