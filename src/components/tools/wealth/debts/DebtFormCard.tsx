import React from 'react';
import { Plus, Pencil, X, ChevronDown } from 'lucide-react';
import type { DebtItem } from '../../../../services/debt';
import { MANUAL_DEBT_TYPE_OPTIONS } from '../../../../services/debt/debt.constants';
import type { DebtAdjustmentType, DebtSeries } from '../../../../services/debt/debt.types';
import type { InterestRatePeriod } from '../../../../services/debt/debt.math';
import { DebtAdjustmentSelector } from '../DebtAdjustmentSelector';
import { DebtSeriesTable } from '../DebtSeriesTable';

export interface DebtFormCardProps {
  form: DebtItem;
  setForm: React.Dispatch<React.SetStateAction<DebtItem>>;
  editingId: string | null;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  debtsCount: number;
  isSubmitting: boolean;
  handleSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  adjustmentType: DebtAdjustmentType;
  setAdjustmentType: (v: DebtAdjustmentType) => void;
  annualPercentRate: number | undefined;
  setAnnualPercentRate: (v: number | undefined) => void;
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  setFrequency: (v: 'monthly' | 'quarterly' | 'semi_annual' | 'annual') => void;
  series: DebtSeries[];
  setSeries: (v: DebtSeries[]) => void;
  interestRatePeriod: InterestRatePeriod;
  setInterestRatePeriod: (v: InterestRatePeriod) => void;
}

export const DebtFormCard: React.FC<DebtFormCardProps> = ({
  form,
  setForm,
  editingId,
  showForm,
  setShowForm,
  debtsCount,
  isSubmitting,
  handleSave,
  onCancel,
  adjustmentType,
  setAdjustmentType,
  annualPercentRate,
  setAnnualPercentRate,
  frequency,
  setFrequency,
  series,
  setSeries,
  interestRatePeriod,
  setInterestRatePeriod,
}) => {
  if (!showForm && debtsCount > 0) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] px-6 py-4 shadow-sm hover:border-rose-400 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 group-hover:bg-rose-100 dark:group-hover:bg-rose-950/40 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
            <Plus size={20} />
          </div>
          <span className="text-sm font-black text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 uppercase tracking-tight transition-colors">
            Cadastrar Dívida
          </span>
        </div>
        <ChevronDown size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
      </button>
    );
  }

  return (
    <div id="wealth-form" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
            {editingId ? <Pencil size={20} /> : <Plus size={20} />}
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {editingId ? 'Editar Dívida' : 'Cadastrar Nova Dívida'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {editingId && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-black text-slate-500 dark:text-slate-400 hover:text-rose-500 uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              <X size={14} /> Cancelar
            </button>
          )}
          {!editingId && debtsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs font-black text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              <X size={14} /> Fechar
            </button>
          )}
        </div>
      </div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Dívida</label>
            <input
              type="text"
              required
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-rose-500 transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value as any })}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-rose-500 transition-all text-sm font-bold outline-none [&>option]:bg-white [&>option]:dark:bg-slate-900"
            >
              {MANUAL_DEBT_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Saldo</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.saldoDevedor || ''}
              onChange={e => setForm({ ...form, saldoDevedor: Number(e.target.value) })}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-rose-500 transition-all text-sm font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                Taxa de Juros
              </label>
              <select
                value={interestRatePeriod}
                onChange={e => setInterestRatePeriod(e.target.value as InterestRatePeriod)}
                className="px-3 py-1.5 text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-rose-500 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-900"
              >
                <option value="monthly">% a.m.</option>
                <option value="annual">% a.a.</option>
              </select>
            </div>
            <input
              type="number"
              step="0.01"
              required
              value={form.taxaMensal || ''}
              onChange={e => setForm({ ...form, taxaMensal: Number(e.target.value) })}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-rose-500 transition-all text-sm font-bold"
              placeholder={interestRatePeriod === 'annual' ? 'Ex: 12.00' : 'Ex: 1.00'}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Parcela Atual</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.valorParcela || ''}
              onChange={e => setForm({ ...form, valorParcela: Number(e.target.value) })}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-rose-500 transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Dia Vencimento</label>
            <input
              type="number"
              value={form.dataVencimento || ''}
              onChange={e => setForm({ ...form, dataVencimento: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-rose-500 transition-all text-sm font-bold"
            />
          </div>
        </div>

        {/* Tipo de Reajuste + Séries */}
        <DebtAdjustmentSelector
          value={adjustmentType}
          onChange={setAdjustmentType}
          annualPercentRate={annualPercentRate}
          onAnnualPercentRateChange={setAnnualPercentRate}
          frequency={frequency}
          onFrequencyChange={setFrequency}
        />
        
        {adjustmentType !== 'fixed' && (
          <DebtSeriesTable
            series={series}
            onChange={setSeries}
            adjustmentType={adjustmentType}
            annualPercentRate={annualPercentRate}
            initialInstallmentValue={form.valorParcela}
          />
        )}

        {adjustmentType === 'fixed' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Parcelas Restantes</label>
              <input
                type="number"
                required
                value={form.parcelasRestantes || ''}
                onChange={e => setForm({ ...form, parcelasRestantes: Number(e.target.value) })}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-rose-500 transition-all text-sm font-bold"
              />
            </div>
          </div>
        )}

        <textarea
          value={form.proposito || ''}
          onChange={e => setForm({ ...form, proposito: e.target.value })}
          className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all text-sm font-medium min-h-[100px] resize-none"
          placeholder="Propósito..."
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-5 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest text-xs hover:bg-rose-500 transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar Dívida' : 'Salvar Nova Dívida'}
        </button>
      </form>
    </div>
  );
};
