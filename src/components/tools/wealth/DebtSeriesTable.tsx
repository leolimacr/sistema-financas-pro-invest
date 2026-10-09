import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Calculator, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import type { DebtSeries, DebtAdjustmentType } from '../../../services/debt/debt.types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface DebtSeriesTableProps {
  series: DebtSeries[];
  onChange: (series: DebtSeries[]) => void;
  adjustmentType: DebtAdjustmentType;
  annualPercentRate?: number;
  initialInstallmentValue: number;
  readOnly?: boolean;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createNextSeries = (
  previousSeries: DebtSeries[],
  annualPercentRate: number | undefined,
  initialValue: number
): DebtSeries => {
  const lastSeries = previousSeries[previousSeries.length - 1];
  const nextYear = lastSeries ? lastSeries.year + 1 : new Date().getFullYear();
  const nextStartMonth = lastSeries ? lastSeries.startMonth : 1;
  const nextInstallmentsCount = lastSeries ? lastSeries.installmentsCount : 12;
  
  let nextValue = initialValue;
  if (annualPercentRate && lastSeries) {
    nextValue = lastSeries.installmentValue * (1 + annualPercentRate / 100);
  } else if (lastSeries) {
    nextValue = lastSeries.installmentValue;
  }

  return {
    id: generateId(),
    year: nextYear,
    startMonth: nextStartMonth,
    installmentsCount: nextInstallmentsCount,
    installmentValue: Math.round(nextValue * 100) / 100,
    adjustmentRate: annualPercentRate,
  };
};

export const DebtSeriesTable: React.FC<DebtSeriesTableProps> = ({
  series,
  onChange,
  adjustmentType,
  annualPercentRate,
  initialInstallmentValue,
  readOnly = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<DebtSeries>>({});

  const isAnnualPercent = adjustmentType === 'annual_percent';
  const isManualSeries = adjustmentType === 'manual_series';

  const handleAddSeries = () => {
    if (series.length === 0) {
      const firstSeries: DebtSeries = {
        id: generateId(),
        year: new Date().getFullYear(),
        startMonth: 1,
        installmentsCount: 12,
        installmentValue: initialInstallmentValue,
        adjustmentRate: annualPercentRate,
      };
      onChange([firstSeries]);
    } else {
      const nextSeries = createNextSeries(series, annualPercentRate, initialInstallmentValue);
      onChange([...series, nextSeries]);
    }
  };

  const handleRemoveSeries = (id: string) => {
    const newSeries = series.filter(s => s.id !== id);
    onChange(newSeries);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSeries = [...series];
    [newSeries[index], newSeries[index - 1]] = [newSeries[index - 1], newSeries[index]];
    onChange(newSeries);
  };

  const handleMoveDown = (index: number) => {
    if (index === series.length - 1) return;
    const newSeries = [...series];
    [newSeries[index], newSeries[index + 1]] = [newSeries[index + 1], newSeries[index]];
    onChange(newSeries);
  };

  const handleStartEdit = (s: DebtSeries) => {
    setEditingId(s.id);
    setEditValues({
      year: s.year,
      startMonth: s.startMonth,
      installmentsCount: s.installmentsCount,
      installmentValue: s.installmentValue,
      effectiveRate: s.effectiveRate,
    });
  };

  const handleSaveEdit = (id: string) => {
    const newSeries = series.map(s => {
      if (s.id === id) {
        return {
          ...s,
          year: editValues.year ?? s.year,
          startMonth: editValues.startMonth ?? s.startMonth,
          installmentsCount: editValues.installmentsCount ?? s.installmentsCount,
          installmentValue: editValues.installmentValue ?? s.installmentValue,
          effectiveRate: editValues.effectiveRate ?? s.effectiveRate,
        };
      }
      return s;
    });
    onChange(newSeries);
    setEditingId(null);
    setEditValues({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleEditChange = (field: keyof DebtSeries, value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setEditValues(prev => ({ ...prev, [field]: numValue }));
  };

  const totalInstallments = useMemo(() => 
    series.reduce((sum, s) => sum + s.installmentsCount, 0), [series]);
  
  const totalValue = useMemo(() =>
    series.reduce((sum, s) => sum + s.installmentValue * s.installmentsCount, 0), [series]);

  if (series.length === 0) {
    return (
      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-surface-subtle">
        <Calculator size={48} className="mx-auto text-slate-400 mb-4" />
        <p className="text-slate-600 font-medium mb-2">Nenhuma série configurada</p>
        <p className="text-[11px] text-slate-500 mb-4">
          {isAnnualPercent 
            ? 'A primeira série será criada com o valor da parcela informado acima. As próximas serão calculadas com o reajuste anual.'
            : 'Adicione séries definindo ano, número de parcelas e valor de cada parcela.'}
        </p>
        <button
          onClick={handleAddSeries}
          disabled={readOnly}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-rose-500 transition-all disabled:opacity-50"
        >
          <Plus size={16} className="inline mr-1" /> Adicionar Primeira Série
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {isAnnualPercent ? 'Séries Anuais (Geradas Automaticamente)' : 'Séries Manuais (Editáveis)'}
        </h4>
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <span>Total: {totalInstallments} parcelas</span>
          <span className="text-rose-600">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ordem</th>
              <th className="text-left py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ano</th>
              <th className="text-left py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Mês Início</th>
              <th className="text-left py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Parcelas</th>
              <th className="text-left py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Valor Parcela</th>
              <th className="text-left py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Série</th>
              {isManualSeries && (
                <th className="text-left py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Taxa Efetiva %</th>
              )}
              {isAnnualPercent && (
                <th className="text-left py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Reajuste %</th>
              )}
              <th className="text-right py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {series.map((s, index) => {
              const isEditing = editingId === s.id;
              const seriesTotal = s.installmentValue * s.installmentsCount;
              
              return (
                <tr key={s.id} className={isEditing ? 'bg-amber-50' : 'hover:bg-slate-50/50'}>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <span className="text-[10px] font-black text-slate-500">{index + 1}</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || readOnly}
                          className="p-1 text-slate-500 hover:text-rose-600 disabled:opacity-50 disabled:hover:text-slate-400"
                          aria-label="Mover para cima"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <span className="text-[10px] font-black text-slate-500 w-6 text-center">{index + 1}</span>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === series.length - 1 || readOnly}
                          className="p-1 text-slate-500 hover:text-rose-600 disabled:opacity-50 disabled:hover:text-slate-400"
                          aria-label="Mover para baixo"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input
                        type="number"
                        min="2000"
                        max="2100"
                        value={editValues.year ?? s.year}
                        onChange={e => handleEditChange('year', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 rounded bg-white border border-rose-500 text-[11px] font-black focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    ) : (
                      <span className="font-black text-slate-900">{s.year}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={editValues.startMonth ?? s.startMonth}
                        onChange={e => handleEditChange('startMonth', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 rounded bg-white border border-rose-500 text-[11px] font-black focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    ) : (
                      <span className="font-black text-slate-900">{s.startMonth}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={editValues.installmentsCount ?? s.installmentsCount}
                        onChange={e => handleEditChange('installmentsCount', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 rounded bg-white border border-rose-500 text-[11px] font-black focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    ) : (
                      <span className="font-black text-slate-900">{s.installmentsCount}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-black text-[11px]">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editValues.installmentValue ?? s.installmentValue}
                          onChange={e => handleEditChange('installmentValue', parseFloat(e.target.value) || 0)}
                          className="w-28 pl-8 pr-2 py-1 rounded bg-white border border-rose-500 text-[11px] font-black focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                      </div>
                    ) : (
                      <span className="font-black text-slate-900">{formatCurrency(s.installmentValue)}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-black text-slate-700">
                    {formatCurrency(seriesTotal)}
                  </td>
                  {isManualSeries && (
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editValues.effectiveRate ?? s.effectiveRate ?? ''}
                          onChange={e => handleEditChange('effectiveRate', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 rounded bg-white border border-rose-500 text-[11px] font-black focus:outline-none focus:ring-2 focus:ring-rose-200 placeholder:text-slate-500"
                          placeholder="opcional"
                        />
                      ) : (
                        <span className="text-slate-500">
                          {s.effectiveRate !== undefined ? `${s.effectiveRate}%` : '—'}
                        </span>
                      )}
                    </td>
                  )}
                  {isAnnualPercent && (
                    <td className="py-3 px-3">
                      <span className="text-slate-500">
                        {s.adjustmentRate !== undefined ? `${s.adjustmentRate}%` : '—'}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSaveEdit(s.id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded"
                          aria-label="Salvar"
                        >
                          <Calculator size={14} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                          aria-label="Cancelar"
                        >
                          <AlertCircle size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        {!readOnly && (
                          <button
                            onClick={() => handleStartEdit(s)}
                            className="p-1.5 text-sky-600 hover:bg-sky-100 rounded"
                            aria-label="Editar série"
                          >
                            <Calculator size={14} />
                          </button>
                        )}
                        {!readOnly && series.length > 1 && (
                          <button
                            onClick={() => handleRemoveSeries(s.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-100 rounded"
                            aria-label="Remover série"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button
          onClick={handleAddSeries}
          className="w-full mt-4 py-3 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-black uppercase tracking-widest text-xs hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Adicionar Próxima Série
        </button>
      )}

      {isAnnualPercent && series.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Calculator size={12} /> Como funciona o reajuste anual
          </p>
          <p className="text-[11px] text-blue-700">
            Cada nova série terá seu valor calculado aplicando <strong>{annualPercentRate}% a.a.</strong> sobre a parcela da série anterior.
            Ex: Série 1 = R$ {formatCurrency(initialInstallmentValue)} → Série 2 = R$ {formatCurrency(initialInstallmentValue * (1 + (annualPercentRate || 0) / 100))} → Série 3 = R$ {formatCurrency(initialInstallmentValue * Math.pow(1 + (annualPercentRate || 0) / 100, 2))}...
          </p>
        </div>
      )}
    </div>
  );
};