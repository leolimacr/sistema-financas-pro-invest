import React from 'react';
import { Calendar, Check } from 'lucide-react';
import { getLocalDateString } from '../../../../utils/dateHelpers';

export interface InvoiceDetailsModalProps {
  pendingInvoice: any;
  showEarlyPaymentWarning: boolean;
  showDatePicker: boolean;
  selectedPaymentDate: string;
  onSelectPaymentDate: (d: string) => void;
  onConfirmEarlyPayment: () => void;
  onFinalConfirmPayment: () => void;
  onCancel: () => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  pendingInvoice,
  showEarlyPaymentWarning,
  showDatePicker,
  selectedPaymentDate,
  onSelectPaymentDate,
  onConfirmEarlyPayment,
  onFinalConfirmPayment,
  onCancel,
}) => {
  if (!showEarlyPaymentWarning && !showDatePicker) return null;

  return (
    <>
      {/* MODAL DE CONFIRMAÇÃO DE ANTECIPAÇÃO */}
      {showEarlyPaymentWarning && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-primary dark:bg-slate-900 w-full max-w-sm rounded-4xl shadow-2xl border border-surface-elevated dark:border-slate-800 overflow-hidden p-6 space-y-6 animate-in zoom-in duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-secondary/10 rounded-2xl text-brand-secondary">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-black text-text-primary dark:text-white tracking-tight leading-tight uppercase">
                Antecipar Fatura?
              </h3>
            </div>

            <p className="text-sm font-medium text-text-secondary dark:text-slate-300 leading-relaxed">
              Esta fatura vence apenas em <strong className="text-text-primary dark:text-white">{new Date(pendingInvoice?.dueDate?.replace(/-/g, '/')).toLocaleDateString('pt-BR')}</strong>. Deseja realmente antecipar o pagamento para hoje?
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-4 bg-surface-secondary dark:bg-slate-800 text-text-muted dark:text-slate-400 rounded-3xl font-black uppercase text-xxs tracking-widest hover:bg-surface-elevated dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmEarlyPayment}
                className="flex-1 py-4 bg-brand-primary text-text-onBrand rounded-3xl font-black uppercase text-xxs tracking-widest shadow-brand-glow active:scale-95 transition-transform"
              >
                Sim, Antecipar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE DATA */}
      {showDatePicker && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-primary dark:bg-slate-900 w-full max-w-sm rounded-4xl shadow-2xl border border-surface-elevated dark:border-slate-800 overflow-hidden p-6 space-y-6 animate-in zoom-in duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                <Check size={24} />
              </div>
              <h3 className="text-xl font-black text-text-primary dark:text-white tracking-tight leading-tight uppercase">
                Data do Pagamento
              </h3>
            </div>

            <p className="text-sm font-medium text-text-secondary dark:text-slate-300 leading-relaxed">
              O pagamento será registrado para o dia selecionado. Você pode escolher hoje ou uma data anterior.
            </p>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">Data de Pagamento</label>
              <input
                type="date"
                max={getLocalDateString()}
                value={selectedPaymentDate}
                onChange={(e) => onSelectPaymentDate(e.target.value)}
                className="w-full bg-surface-secondary dark:bg-slate-800 p-4 rounded-2xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-4 bg-surface-secondary dark:bg-slate-800 text-text-muted dark:text-slate-400 rounded-3xl font-black uppercase text-xxs tracking-widest hover:bg-surface-elevated dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onFinalConfirmPayment}
                className="flex-1 py-4 bg-brand-primary text-text-onBrand rounded-3xl font-black uppercase text-xxs tracking-widest shadow-brand-glow active:scale-95 transition-transform"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
