import React, { useMemo } from 'react';
import { Zap } from 'lucide-react';
import type { Transaction } from '../../types';

interface QuickCategoryShortcutsProps {
  transactions: Transaction[];
  onQuickAdd: (category: string, type: 'income' | 'expense') => void;
}

function parseTransactionDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

const QuickCategoryShortcuts: React.FC<QuickCategoryShortcutsProps> = ({ transactions, onQuickAdd }) => {
  const topCategories = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const expenseCounts: Record<string, number> = {};
    let countInPeriod = 0;

    const safeTx = Array.isArray(transactions) ? transactions : [];

    safeTx.forEach(tx => {
      if (tx.type !== 'expense' || !tx.category) return;
      
      const dt = parseTransactionDate(tx.date);
      if (dt && dt >= thirtyDaysAgo) {
        expenseCounts[tx.category] = (expenseCounts[tx.category] || 0) + 1;
        countInPeriod++;
      }
    });

    if (countInPeriod < 3) return null;

    return Object.entries(expenseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  }, [transactions]);

  if (!topCategories || topCategories.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-amber-100 p-2 rounded-xl">
          <Zap size={16} className="text-amber-600 fill-amber-600" />
        </div>
        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Lançar rápido</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {topCategories.map(category => (
          <button
            key={category}
            onClick={() => onQuickAdd(category, 'expense')}
            className="px-5 py-2.5 bg-slate-50 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-wider text-slate-600 transition-all active:scale-95 shadow-sm"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickCategoryShortcuts;
