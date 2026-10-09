import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface FirstTransactionCTAProps {
  onOpenForm: (initialData?: any) => void;
}

const FirstTransactionCTA: React.FC<FirstTransactionCTAProps> = ({ onOpenForm }) => {
  const handleClick = () => {
    onOpenForm({
      type: 'income',
      category: 'Salário',
      description: 'Receita principal',
      autoFocusAmount: true,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-16 pb-24 animate-in fade-in duration-700">
      <div className="rounded-[2.5rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-10 md:p-14 shadow-xl shadow-emerald-500/5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
          <Sparkles size={32} className="text-emerald-600" />
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
          Aqui você não olha<br />
          <span className="text-emerald-600">só o saldo da conta.</span>
        </h1>

        <p className="text-slate-500 text-base leading-relaxed max-w-lg mx-auto mb-10">
          A partir do seu primeiro lançamento, calculamos o que sobra de verdade no seu mês — depois das contas, cartão e proteção.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleClick}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-10 py-5 rounded-2xl transition-all shadow-[0_4px_25px_rgba(16,185,129,0.3)] inline-flex items-center justify-center gap-3 text-base active:scale-[0.97]"
          >
            <span>Registrar primeira entrada</span>
            <ArrowRight size={20} />
          </button>

          <p className="text-xs text-slate-400 font-medium mt-2">
            Leva 30 segundos. Depois você vê seu Saldo Livre Real.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirstTransactionCTA;
