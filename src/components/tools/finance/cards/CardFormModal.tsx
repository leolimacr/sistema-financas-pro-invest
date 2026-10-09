import React from 'react';
import { Plus, X } from 'lucide-react';
import type { VoucherType } from '../../../../types';

export interface CardFormModalProps {
  newCardName: string;
  setNewCardName: (v: string) => void;
  newCardType: 'credit' | 'voucher';
  setNewCardType: (v: 'credit' | 'voucher') => void;
  newVoucherType: VoucherType;
  setNewVoucherType: (v: VoucherType) => void;
  newLimit: string;
  setNewLimit: (v: string) => void;
  newVoucherBalance: string;
  setNewVoucherBalance: (v: string) => void;
  newTaxaJuros: string;
  setNewTaxaJuros: (v: string) => void;
  newClosingDay: string;
  setNewClosingDay: (v: string) => void;
  newDueDay: string;
  setNewDueDay: (v: string) => void;
  isAdding: boolean;
  canClose: boolean;
  onClose: () => void;
  onAdd: () => void;
}

export const CardFormModal: React.FC<CardFormModalProps> = ({
  newCardName,
  setNewCardName,
  newCardType,
  setNewCardType,
  newVoucherType,
  setNewVoucherType,
  newLimit,
  setNewLimit,
  newVoucherBalance,
  setNewVoucherBalance,
  newTaxaJuros,
  setNewTaxaJuros,
  newClosingDay,
  setNewClosingDay,
  newDueDay,
  setNewDueDay,
  isAdding,
  canClose,
  onClose,
  onAdd,
}) => {
  return (
    <div className="bg-surface-primary dark:bg-slate-900 p-6 rounded-4xl border border-surface-elevated dark:border-slate-800 shadow-soft space-y-6 sticky top-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 ml-1">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
          <p className="text-[10px] font-black text-text-primary dark:text-white uppercase tracking-widest">Novo Cartão</p>
        </div>
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[9px] font-black text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X size={12} /> Fechar
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">Nome do Cartão</label>
          <input
            type="text"
            placeholder="Ex: Nubank, Inter, Alelo Alimentação..."
            value={newCardName}
            onChange={(e) => {
              const val = e.target.value;
              setNewCardName(val);
              if (newCardType === 'voucher') {
                const lower = val.toLowerCase();
                if (lower.includes('refei') || /\bvr\b/.test(lower)) {
                  setNewVoucherType('refeicao');
                } else if (lower.includes('alimenta') || /\bva\b/.test(lower)) {
                  setNewVoucherType('alimentacao');
                }
              }
            }}
            className="w-full bg-surface-secondary dark:bg-slate-800 p-4 rounded-2xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">Tipo de Cartão</label>
          <div className="flex bg-surface-secondary dark:bg-slate-800 p-1 rounded-2xl border border-surface-elevated dark:border-slate-700">
            <button
              type="button"
              onClick={() => setNewCardType('credit')}
              className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                newCardType === 'credit' ? 'bg-surface-primary dark:bg-slate-700 text-text-primary dark:text-white shadow-soft' : 'text-text-muted dark:text-slate-400'
              }`}
            >
              Crédito
            </button>
            <button
              type="button"
              onClick={() => setNewCardType('voucher')}
              className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                newCardType === 'voucher' ? 'bg-surface-primary dark:bg-slate-700 text-text-primary dark:text-white shadow-soft' : 'text-text-muted dark:text-slate-400'
              }`}
            >
              Voucher (Alimentação/Refeição)
            </button>
          </div>
        </div>

        {newCardType === 'voucher' && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">Subtipo de Benefício</label>
            <div className="flex bg-surface-secondary dark:bg-slate-800 p-1 rounded-2xl border border-surface-elevated dark:border-slate-700 gap-1">
              <button
                type="button"
                onClick={() => setNewVoucherType('alimentacao')}
                className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                  newVoucherType === 'alimentacao' ? 'bg-emerald-600 text-white shadow-soft' : 'text-text-muted dark:text-slate-400'
                }`}
              >
                Alimentação
              </button>
              <button
                type="button"
                onClick={() => setNewVoucherType('refeicao')}
                className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                  newVoucherType === 'refeicao' ? 'bg-amber-600 text-white shadow-soft' : 'text-text-muted dark:text-slate-400'
                }`}
              >
                Refeição
              </button>
              <button
                type="button"
                onClick={() => setNewVoucherType('outro')}
                className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                  newVoucherType === 'outro' ? 'bg-surface-primary dark:bg-slate-700 text-text-primary dark:text-white shadow-soft' : 'text-text-muted dark:text-slate-400'
                }`}
              >
                Outro
              </button>
            </div>
          </div>
        )}

        {newCardType === 'credit' && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">Limite Total (R$)</label>
            <input
              type="number"
              placeholder="Ex: 5000"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="w-full bg-surface-secondary dark:bg-slate-800 p-4 rounded-2xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm transition-all"
            />
          </div>
        )}

        {newCardType === 'voucher' && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">Saldo Inicial (R$)</label>
            <input
              type="number"
              placeholder="Ex: 1000"
              value={newVoucherBalance}
              onChange={(e) => setNewVoucherBalance(e.target.value)}
              className="w-full bg-surface-secondary dark:bg-slate-800 p-4 rounded-2xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm transition-all"
            />
            <p className="text-[8px] font-medium text-text-muted dark:text-slate-400 ml-1">Valor carregado no cartão voucher no momento do cadastro.</p>
          </div>
        )}

        {newCardType === 'credit' && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">Juros mensais do cartão (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 14.9"
              value={newTaxaJuros}
              onChange={(e) => setNewTaxaJuros(e.target.value)}
              className="w-full bg-surface-secondary dark:bg-slate-800 p-4 rounded-2xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm transition-all"
            />
            <p className="text-[8px] font-medium text-text-muted dark:text-slate-400 ml-1">Usado em novas conversões para rotativo. Opcional.</p>
          </div>
        )}

        {newCardType === 'credit' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">Dia Fechamento</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 5"
                value={newClosingDay}
                onChange={(e) => setNewClosingDay(e.target.value)}
                className="w-full bg-surface-secondary dark:bg-slate-800 p-4 rounded-2xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">Dia Vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 12"
                value={newDueDay}
                onChange={(e) => setNewDueDay(e.target.value)}
                className="w-full bg-surface-secondary dark:bg-slate-800 p-4 rounded-2xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm transition-all"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onAdd}
          disabled={isAdding || !newCardName.trim()}
          className="w-full py-5 bg-brand-primary text-text-onBrand rounded-3xl shadow-brand-glow active:scale-95 disabled:opacity-50 transition-all font-black uppercase text-xxs tracking-widest flex items-center justify-center gap-2 mt-4 cursor-pointer"
        >
          <Plus size={18} /> Cadastrar Cartão
        </button>
      </div>
    </div>
  );
};
