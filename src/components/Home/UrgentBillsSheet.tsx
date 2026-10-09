import React from 'react';
import { X, CalendarCheck2, DollarSign } from 'lucide-react';
import type { RecurringBill, Transaction } from '../../types';
import { getLocalDateString } from '../../utils/dateHelpers';

interface UrgentBillsSheetProps {
  bills: RecurringBill[];
  isOpen: boolean;
  onClose: () => void;
  onOpenForm: (data?: Partial<Transaction>) => void;
}

const UrgentBillsSheet: React.FC<UrgentBillsSheetProps> = ({ bills, isOpen, onClose, onOpenForm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-center items-start pt-20">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-8 duration-300 max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-xl">
              <CalendarCheck2 size={18} className="text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Contas que vencem</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">hoje ou amanhã</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-4 space-y-3">
          {bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Nenhuma conta urgente no momento.</p>
            </div>
          ) : (
            bills.map((bill) => (
              <div key={bill.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">{bill.name}</h3>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign size={12} />
                        {bill.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span>Vence dia {bill.dueDay}</span>
                      {bill.category && (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">
                          {bill.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenForm({
                      type: 'expense',
                      category: bill.category,
                      amount: bill.amount,
                      description: bill.name,
                      date: getLocalDateString(),
                      autoFocusAmount: true,
                      linkedRecurringBillId: bill.id,
                      isBillPayment: true,
                    })}
                    className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-sm"
                  >
                    Pagar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            {bills.length} {bills.length === 1 ? 'conta pendente' : 'contas pendentes'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UrgentBillsSheet;
