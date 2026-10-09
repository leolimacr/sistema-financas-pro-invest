import React, { useEffect } from 'react';
import { X, Calendar, Receipt, Plus, CreditCard, Wallet, Pencil } from 'lucide-react';
import type { Transaction } from '../../../../types';
import {
  formatCalendarFullDate,
  getWeekdayNameFromIso,
  formatDayExpenseAmount,
} from '../../../../utils/expenseCalendarUtils';

interface DayExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateIso: string | null;
  transactions: Transaction[];
  totalAmount: number;
  isPrivacyMode?: boolean;
  onEditTransaction?: (t: Transaction) => void;
  onOpenForm?: (initialData?: Partial<Transaction>) => void;
}

export const DayExpensesModal: React.FC<DayExpensesModalProps> = ({
  isOpen,
  onClose,
  dateIso,
  transactions,
  totalAmount,
  isPrivacyMode = false,
  onEditTransaction,
  onOpenForm,
}) => {
  // Fecha com tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !dateIso) return null;

  const fullDateLabel = formatCalendarFullDate(dateIso);
  const weekdayLabel = getWeekdayNameFromIso(dateIso);
  const count = transactions.length;

  const handleAddNewForDay = () => {
    onClose();
    if (onOpenForm) {
      onOpenForm({ date: dateIso, type: 'expense' });
    }
  };

  const handleEdit = (t: Transaction) => {
    onClose();
    if (onEditTransaction) {
      onEditTransaction(t);
    }
  };

  const getPaymentMethodBadge = (t: Transaction) => {
    if (t.paymentMethod === 'credit') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] font-black">
          <CreditCard size={11} />
          Crédito
        </span>
      );
    }
    if (t.paymentMethod === 'voucher') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-black">
          <Wallet size={11} />
          Vale
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[10px] font-black">
        <Wallet size={11} />
        À vista / Débito
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-expenses-title"
      className="fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-lg bg-surface-primary dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de arraste para ergonomia mobile */}
        <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b-2 border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/40 shrink-0">
              <Receipt size={20} />
            </div>
            <div className="min-w-0">
              <h2
                id="day-expenses-title"
                className="text-base md:text-lg font-black text-slate-950 dark:text-white capitalize tracking-tight truncate"
              >
                {fullDateLabel}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-900 dark:text-slate-200 font-black">{weekdayLabel}</span>
                <span>•</span>
                <span>
                  {count} {count === 1 ? 'saída' : 'saídas'}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhamento do dia"
            className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de Despesas */}
        <div className="p-4 md:p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
          {count === 0 ? (
            <div className="py-8 px-4 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                <Calendar size={26} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  Nenhuma saída registrada neste dia
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1 max-w-xs mx-auto">
                  Não houve compras ou pagamentos computados nesta data.
                </p>
              </div>
              {onOpenForm && (
                <button
                  type="button"
                  onClick={handleAddNewForDay}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 mt-2"
                >
                  <Plus size={16} />
                  Lançar despesa neste dia
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((t) => {
                const amount = Number(t.amount) || 0;
                const formattedAmount = isPrivacyMode
                  ? '••••••'
                  : `- ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

                return (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 flex items-center justify-between gap-3 shadow-xs transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-300">
                          {t.category || 'Sem categoria'}
                        </span>
                        {getPaymentMethodBadge(t)}
                      </div>
                      <p className="text-sm font-black text-slate-950 dark:text-white truncate">
                        {t.description || 'Despesa'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-base sm:text-lg font-black text-red-700 dark:text-red-400 tabular-nums">
                        {formattedAmount}
                      </span>
                      {onEditTransaction && (
                        <button
                          type="button"
                          onClick={() => handleEdit(t)}
                          title="Editar lançamento"
                          aria-label={`Editar ${t.description}`}
                          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé Obrigatório: Valor Total Logo Abaixo em Cartão Executivo de Máximo Contraste */}
        <div className="p-4 md:p-5 bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3 bg-slate-950 dark:bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800 dark:border-slate-700">
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-400">
                Valor total do dia
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                {count} {count === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="text-right">
              <span
                data-testid="day-total-amount"
                className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight"
              >
                {formatDayExpenseAmount(totalAmount, { isPrivacyMode }) || (isPrivacyMode ? '••••••' : 'R$ 0,00')}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            {onOpenForm && count > 0 && (
              <button
                type="button"
                onClick={handleAddNewForDay}
                className="flex items-center gap-1.5 text-xs font-black text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 py-1"
              >
                <Plus size={14} />
                Adicionar outra despesa
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayExpensesModal;
