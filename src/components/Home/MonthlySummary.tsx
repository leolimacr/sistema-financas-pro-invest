import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';

interface MonthlySummaryProps {
  income: number;
  expenses: number;
  balance: number;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({
  income,
  expenses,
  balance,
  isPrivacyMode,
  onTogglePrivacy,
}) => {
  const formatMoney = (n: number) =>
    isPrivacyMode
      ? 'R$ ••••'
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  return (
    <div className="space-y-4">
      {/* Saldo Principal */}
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Wallet size={14} className="text-emerald-600" />
            Dinheiro do mês
          </div>
          <button
            type="button"
            onClick={onTogglePrivacy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className={`text-4xl font-black tracking-tight ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
          {formatMoney(balance)}
        </p>
      </div>

      {/* Grid de Receitas e Despesas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">
            <TrendingUp size={12} />
            Receitas
          </div>
          <p className="text-lg font-black text-slate-900">{formatMoney(income)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">
            <TrendingDown size={12} />
            Despesas
          </div>
          <p className="text-lg font-black text-slate-900">{formatMoney(expenses)}</p>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummary;
