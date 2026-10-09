import React from 'react';
import { Radio, Check } from 'lucide-react';
import type { DebtAdjustmentType } from '../../../services/debt/debt.types';
import { DEBT_ADJUSTMENT_TYPE_OPTIONS } from '../../../services/debt/debt.constants';

interface DebtAdjustmentSelectorProps {
  value: DebtAdjustmentType;
  onChange: (value: DebtAdjustmentType) => void;
  annualPercentRate?: number;
  onAnnualPercentRateChange?: (value: number) => void;
  frequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  onFrequencyChange?: (value: 'monthly' | 'quarterly' | 'semi_annual' | 'annual') => void;
}

export const DebtAdjustmentSelector: React.FC<DebtAdjustmentSelectorProps> = ({
  value,
  onChange,
  annualPercentRate,
  onAnnualPercentRateChange,
  frequency,
  onFrequencyChange,
}) => {
  return (
    <div className="space-y-4">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
        Tipo de Reajuste das Parcelas
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DEBT_ADJUSTMENT_TYPE_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value as DebtAdjustmentType)}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
              value === option.value
                ? 'border-rose-500 bg-rose-50 shadow-sm shadow-rose-100'
                : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5">
                <Radio
                  size={20}
                  className={`transition-colors ${
                    value === option.value ? 'text-rose-600' : 'text-slate-300'
                  }`}
                />
                {value === option.value && (
                  <Check
                    size={12}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-900 truncate">{option.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{option.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {(value === 'annual_percent' || value === 'manual_series') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
          {value === 'annual_percent' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Reajuste Anual (% a.a.)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={annualPercentRate ?? ''}
                  onChange={e => onAnnualPercentRateChange?.(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-rose-500 transition-all text-sm font-black"
                  placeholder="Ex: 8.5"
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">% a.a.</span>
              </div>
              <p className="text-[10px] text-slate-500">
                A parcela será reajustada anualmente por este percentual. Ex: 8,5% a.a. = parcela aumenta 8,5% a cada 12 meses.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Frequência das Parcelas
            </label>
            <select
              value={frequency ?? 'monthly'}
              onChange={e => onFrequencyChange?.(e.target.value as 'monthly' | 'quarterly' | 'semi_annual' | 'annual')}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-rose-500 transition-all text-sm font-black outline-none"
            >
              <option value="monthly">Mensal (12x ao ano)</option>
              <option value="quarterly">Trimestral (4x ao ano)</option>
              <option value="semi_annual">Semestral (2x ao ano)</option>
              <option value="annual">Anual (1x ao ano)</option>
            </select>
          </div>
        </div>
      )}

      {value === 'fixed' && (
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in duration-200">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            Parcela fixa durante todo o contrato
          </p>
          <p className="text-sm text-slate-600">
            O valor da parcela não muda. Juros e amortização seguem a tabela Price/SAC padrão.
          </p>
        </div>
      )}
    </div>
  );
};