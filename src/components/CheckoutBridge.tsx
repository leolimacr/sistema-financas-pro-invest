import React, { useEffect } from 'react';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface CheckoutBridgeProps {
  stripeUrl?: string;
}

const CheckoutBridge: React.FC<CheckoutBridgeProps> = ({ stripeUrl }) => {
  const finalUrl = stripeUrl || '/app/mais/pricing';

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = finalUrl;
    }, 3000);
    return () => clearTimeout(timer);
  }, [finalUrl]);

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-6 text-slate-900 font-sans">
      <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Logos Container */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center shadow-emerald-500/10 shadow-2xl">
              <span className="text-2xl font-black tracking-tighter text-emerald-500">Finanças Pro Invest</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ecossistema</span>
          </div>
          
          <div className="h-px w-8 bg-slate-200" />
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={32} className="text-slate-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stripe Secure</span>
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <h1 className="text-2xl font-black tracking-tight">Preparando seu checkout seguro...</h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
            Você será redirecionado para concluir sua assinatura em um ambiente protegido.
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          
          <a
            href={finalUrl}
            className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            Continuar para pagamento
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        <p className="text-[10px] text-slate-600 uppercase font-bold tracking-[0.2em]">
          Transação processada pelo Stripe
        </p>
      </div>
    </div>
  );
};

export default CheckoutBridge;
