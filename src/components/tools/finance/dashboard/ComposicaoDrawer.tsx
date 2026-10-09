import React from 'react';
import { X, CreditCard, Receipt, Clock } from 'lucide-react';
import { maskCurrency } from '../../../../utils/calculations';
import type { FaturaDetalhe, LancamentoFuturoInfo } from '../../../../utils/calculations';

export type ComposicaoItem =
  | { tipo: 'fatura'; dados: FaturaDetalhe }
  | { tipo: 'gasto-futuro'; dados: LancamentoFuturoInfo }
  | { tipo: 'conta-futura'; dados: LancamentoFuturoInfo };

interface ComposicaoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: ComposicaoItem | null;
}

const ComposicaoDrawer: React.FC<ComposicaoDrawerProps> = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  const renderHeader = () => {
    switch (item.tipo) {
      case 'fatura':
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-text-primary dark:text-white">
                {item.dados.cardName}
              </p>
              <p className="text-[10px] text-text-muted dark:text-slate-400 font-medium mt-0.5">
                {item.dados.tipo === 'fechada' ? 'Fatura fechada' : 'Fatura aberta'} — vence{' '}
                {new Date(item.dados.dueDate.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        );
      case 'gasto-futuro':
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-text-primary dark:text-white">
                Gasto futuro
              </p>
              <p className="text-[10px] text-text-muted dark:text-slate-400 font-medium mt-0.5">
                {item.dados.description}
              </p>
            </div>
          </div>
        );
      case 'conta-futura':
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Receipt size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-text-primary dark:text-white">
                Conta futura
              </p>
              <p className="text-[10px] text-text-muted dark:text-slate-400 font-medium mt-0.5">
                {item.dados.description}
              </p>
            </div>
          </div>
        );
    }
  };

  const renderContent = () => {
    switch (item.tipo) {
      case 'fatura': {
        const fat = item.dados;
        if (fat.transacoes.length === 0) {
          return (
            <p className="text-sm text-text-muted dark:text-slate-400 text-center py-8">
              Nenhuma transação encontrada para esta fatura.
            </p>
          );
        }
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-surface-elevated dark:border-slate-800">
              <span>Lançamento</span>
              <span>Valor</span>
            </div>
            {fat.transacoes.map((t, i) => (
              <div
                key={t.id || i}
                className="flex justify-between items-start gap-3 py-2 px-1 rounded-xl hover:bg-surface-secondary dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary dark:text-white truncate">
                    {t.description || 'Sem descrição'}
                  </p>
                  <p className="text-[9px] text-text-muted dark:text-slate-400 mt-0.5">
                    {new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <p className="text-xs font-black text-text-primary dark:text-white tabular-nums shrink-0">
                  {maskCurrency(t.amount)}
                </p>
              </div>
            ))}
            <div className="border-t border-surface-elevated dark:border-slate-800 pt-3 flex justify-between items-center">
              <span className="text-xs font-black text-text-primary dark:text-slate-200 uppercase tracking-wider">
                Total
              </span>
              <span className="text-sm font-black text-text-primary dark:text-white tabular-nums">
                {maskCurrency(fat.remainingAmount)}
              </span>
            </div>
          </div>
        );
      }
      case 'gasto-futuro':
      case 'conta-futura': {
        const lanc = item.dados;
        return (
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-start gap-3 py-3 px-3 rounded-xl bg-surface-secondary dark:bg-slate-800/60">
              <div>
                <p className="text-xs font-medium text-text-primary dark:text-white">
                  {lanc.description || 'Sem descrição'}
                </p>
                <p className="text-[9px] text-text-muted dark:text-slate-400 mt-0.5">
                  Previsto para {new Date(lanc.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <p className="text-sm font-black text-text-primary dark:text-white tabular-nums shrink-0">
                {maskCurrency(lanc.amount)}
              </p>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh] flex flex-col">
        {/* Handle grab */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-surface-elevated dark:border-slate-800">
          {renderHeader()}
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-secondary dark:hover:bg-slate-800 transition-colors text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ComposicaoDrawer;
