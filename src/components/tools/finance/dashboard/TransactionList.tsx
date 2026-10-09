import React, { memo, useMemo } from 'react';
import { ChevronUp } from 'lucide-react';
import TransactionHistory from '../TransactionHistory';
import { isPreviousInstallment } from '../../../../utils/dateHelpers';

interface TransactionListProps {
  transactions: any[];
  visibleCount: number;
  setVisibleCount: (n: number) => void;
  showTransactions: boolean;
  setShowTransactions: (v: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (t: any) => void;
  isPrivacyMode: boolean;
  isStale: boolean;
  invoiceLookup?: Map<string, { transacoes: Array<{ id: string; description: string; amount: number; date: string }>; total: number }>;
  periodLabel?: string;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  visibleCount,
  setVisibleCount,
  showTransactions,
  setShowTransactions,
  onDelete,
  onEdit,
  isPrivacyMode,
  isStale,
  invoiceLookup,
  periodLabel,
}) => {
  // Compras de meses anteriores pertencem à fatura do cartão e não entram no feed de despesas correntes
  const displayTransactions = useMemo(() => {
    return transactions.filter(t => !isPreviousInstallment(t));
  }, [transactions]);

  // Income computed from the SAME filtered list as expenses (not from external stats)
  const periodIncome = useMemo(
    () => displayTransactions.reduce((sum, t) => t.type === 'income' ? sum + (Number(t.amount) || 0) : sum, 0),
    [displayTransactions],
  );
  const expenseTransactions = useMemo(
    () => displayTransactions.filter(t => t.type === 'expense' && !(t.isBillPayment && !t.linkedRecurringBillId) && !t.isVirtual),
    [displayTransactions],
  );
  const expenseCount = expenseTransactions.length;
  const expenseSum = expenseTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Rounded to 2 decimal places to avoid float precision artifacts
  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {showTransactions ? (
        <>
          <TransactionHistory
            transactions={displayTransactions.slice(0, visibleCount)}
            allTransactions={transactions}
            onDelete={onDelete}
            onEdit={onEdit}
            isPrivacyMode={isPrivacyMode}
            isDisabled={isStale}
            invoiceLookup={invoiceLookup}
          />

          {periodIncome !== undefined && transactions.length > 0 && (
            <div className="flex flex-col gap-1 bg-surface-primary dark:bg-slate-900 p-4 rounded-4xl border border-surface-elevated dark:border-slate-800 mt-4">
              <div className="flex items-start justify-between gap-4 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-status-success/80 dark:text-emerald-400">
                    Entradas
                  </span>
                  <span className="text-sm font-black text-status-success dark:text-emerald-400 tabular-nums">
                    R$ {fmt(periodIncome)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-action-dangerDark dark:text-rose-400">
                      Saídas
                    </span>
                    <span className="text-base font-black text-action-dangerDark dark:text-rose-400 tabular-nums">
                      R$ {fmt(expenseSum)}
                    </span>
                  </div>
                  {expenseCount > 0 && (
                    <span className="text-[9px] font-bold text-text-muted/70 dark:text-slate-400 tabular-nums">
                      {expenseCount} lançamento{expenseCount !== 1 ? 's' : ''} de despesas
                    </span>
                  )}
                  <span className="text-[9px] font-medium text-text-muted/70 dark:text-slate-400 leading-relaxed text-right">
                    Todas as compras que você fez neste período, independentemente de terem sido à vista ou à prazo.
                  </span>
                  <span className="text-[9px] font-bold text-text-muted/50 dark:text-slate-500 text-right">
                    Faturas pagas não entram no total.
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 mt-4">
            {displayTransactions.length > visibleCount && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVisibleCount(visibleCount + 5)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                >
                  + 5 Lançamentos
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(displayTransactions.length)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                >
                  Mostrar Todos
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowTransactions(false);
                setVisibleCount(10);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-3xl text-xxs font-black uppercase tracking-ultra-wide border transition-all active:scale-95 w-full bg-surface-elevated dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700"
            >
              Recolher lançamentos <ChevronUp size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 rounded-4xl px-6 py-8 shadow-soft">
          <p className="text-text-muted dark:text-slate-400 text-xxs font-bold uppercase tracking-ultra-wide">
            Lançamentos ocultos
          </p>
          <p className="text-xxs text-text-secondary dark:text-slate-400 mt-2">
            Use o botão acima para mostrar novamente.
          </p>
        </div>
      )}
    </>
  );
};

export default memo(TransactionList);
