import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Transaction } from '../../types';
import { isTransactionVisible } from '../../utils/historyTimeGate';

interface RecentTransactionsProps {
  transactions: Transaction[];
  isPrivacyMode: boolean;
  onNavigate: (tool: string) => void;
  historyLocked?: boolean;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  isPrivacyMode,
  onNavigate,
  historyLocked = false,
}) => {
  const plan = historyLocked ? 'free' : 'pro';

  const recent = useMemo(
    () =>
      [...transactions]
        .filter((t) => t?.date && isTransactionVisible(t.date, plan))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 5),
    [transactions, plan]
  );

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Últimos Lançamentos</h2>
        <button
          onClick={() => onNavigate('manager')}
          className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-1"
        >
          Ver tudo <ChevronRight size={14} />
        </button>
      </div>

      {recent.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Nenhum lançamento recente</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {recent.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-4 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-200 hover:bg-white transition-all group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900 truncate tracking-tight">{t.description || 'Sem descrição'}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">
                  {t.date ? new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'} ·{' '}
                  <span className="text-slate-500">{t.category || 'Outros'}</span>
                </p>
              </div>
              <span className={`text-xs font-black shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPrivacyMode
                  ? '••••'
                  : `${t.type === 'income' ? '+' : '−'} ${new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(Number(t.amount) || 0)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecentTransactions;
