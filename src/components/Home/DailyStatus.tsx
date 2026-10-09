import React, { useMemo } from 'react';
import type { Transaction } from '../../types';
import { CheckCircle, Sun, Activity } from 'lucide-react';

interface DailyStatusProps {
  lancamentos: Transaction[];
}

const DailyStatus: React.FC<DailyStatusProps> = ({ lancamentos }) => {
  const today = useMemo(() => new Date().toDateString(), []);

  const todayTransactions = useMemo(() => {
    return lancamentos.filter(t => {
      const transactionDate = new Date(t.date).toDateString();
      return transactionDate === today;
    });
  }, [lancamentos, today]);

  const hasTransactionsToday = todayTransactions.length > 0;
  const transactionCount = todayTransactions.length;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl text-white shadow-lg transition-all ${
            hasTransactionsToday ? 'bg-emerald-500 shadow-emerald-200' : 'bg-amber-500 shadow-amber-200'
          }`}>
            {hasTransactionsToday ? <CheckCircle size={20} /> : <Sun size={20} />}
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-slate-900 tracking-tight">
              {hasTransactionsToday
                ? `${transactionCount} lançamento${transactionCount > 1 ? 's' : ''} hoje`
                : 'Nenhum lançamento hoje'}
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-0.5">
              {hasTransactionsToday ? 'Você já lançou hoje' : 'Mantenha o ritmo'}
            </span>
          </div>
        </div>
        {/* Optional: Add a subtle activity indicator if no transactions */}
        {!hasTransactionsToday && (
          <Activity size={20} className="text-amber-400 opacity-40 animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default DailyStatus;
