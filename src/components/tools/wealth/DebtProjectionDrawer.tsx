import React, { useState, useMemo } from 'react';
import { X, ShieldCheck, ChevronRight, Calendar, AlertCircle, TrendingUp } from 'lucide-react';
import { projectDebt } from '../../../services/debt/debt.projection';
import { computeCurrentInstallment, getCurrentSeriesInfo, computeRemainingInstallments } from '../../../services/debt/debt.math';
import type { DebtItem } from '../../../services/debt';

interface DebtProjectionDrawerProps {
  debt: DebtItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirmAmortization: (amount: number) => void;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

export const DebtProjectionDrawer: React.FC<DebtProjectionDrawerProps> = ({ 
  debt, 
  isOpen, 
  onClose, 
  onConfirmAmortization 
}) => {
  const [extraPayment, setExtraPayment] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'summary' | 'timeline'>('summary');

  const projection = useMemo(() => projectDebt({
    debt,
    extraPayment,
    scenario: 'auto'
  }), [debt, extraPayment]);

  const baseProjection = useMemo(() => projectDebt({
    debt,
    extraPayment: 0,
    scenario: 'auto'
  }), [debt]);

  const currentInstallment = computeCurrentInstallment(debt);
  const seriesInfo = getCurrentSeriesInfo(debt);
  const remainingInstallments = computeRemainingInstallments(debt);
  const config = debt.adjustmentConfig;

  const isSeriesDebt = config && config.type !== 'fixed' && config.series && config.series.length > 0;
  const currentSeries = seriesInfo.series;
  const nextSeries = isSeriesDebt && config.series && seriesInfo.seriesIndex + 1 < config.series.length 
    ? config.series[seriesInfo.seriesIndex + 1] 
    : null;

  if (!isOpen) return null;

  const savedMonths = (baseProjection.rows.length || 0) - (projection.rows.length || 0);
  const savedInterest = (baseProjection.totalInterest || 0) - (projection.totalInterest || 0);

  // Detectar transições de série na projeção
  const seriesTransitions = useMemo(() => {
    if (!isSeriesDebt || !projection.rows.length) return [];
    const transitions: { rowIndex: number; fromSeries: number; toSeries: number; month: number }[] = [];
    let lastSeriesIndex = projection.rows[0].seriesIndex ?? 0;
    
    projection.rows.forEach((row, idx) => {
      const sIdx = row.seriesIndex ?? 0;
      if (sIdx !== lastSeriesIndex) {
        transitions.push({
          rowIndex: idx,
          fromSeries: lastSeriesIndex,
          toSeries: sIdx,
          month: row.month,
        });
        lastSeriesIndex = sIdx;
      }
    });
    return transitions;
  }, [projection.rows, isSeriesDebt]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-950">Projeção: {debt.nome}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>

        {/* Info da Série Atual */}
        {isSeriesDebt && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3">
              <Calendar size={14} /> Série Atual & Próximo Reajuste
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 font-medium">Série Atual</p>
                <p className="font-black text-slate-900">
                  {currentSeries ? `${seriesInfo.seriesIndex + 1} (${currentSeries.year})` : '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Parcela Atual</p>
                <p className="font-black text-rose-600">{formatCurrency(currentInstallment)}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Parcelas na Série</p>
                <p className="font-black text-slate-900">
                  {seriesInfo.installmentInSeries} / {currentSeries?.installmentsCount ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Parcelas Restantes (Total)</p>
                <p className="font-black text-slate-900">{remainingInstallments}</p>
              </div>
              {nextSeries && (
                <>
                  <div className="col-span-2">
                    <p className="text-slate-500 font-medium">Próxima Série</p>
                    <p className="font-black text-amber-600 flex items-center gap-1">
                      {seriesInfo.seriesIndex + 2} ({nextSeries.year}) 
                      <ChevronRight size={12} /> 
                      {formatCurrency(nextSeries.installmentValue)} 
                      {nextSeries.adjustmentRate ? ` (+${nextSeries.adjustmentRate}%)` : ''}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 font-medium">Data do Próximo Reajuste</p>
                    <p className="font-black text-blue-600 flex items-center gap-1">
                      <Calendar size={12} /> {formatDate(debt.nextAdjustmentDate)}
                    </p>
                  </div>
                </>
              )}
              {!nextSeries && (
                <div className="col-span-2">
                  <p className="text-slate-500 font-medium">Status</p>
                  <p className="font-black text-emerald-600">Última série — sem reajustes futuros</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modo de Visualização */}
        {isSeriesDebt && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setViewMode('summary')}
              className={`flex-1 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                viewMode === 'summary' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Resumo
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex-1 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                viewMode === 'timeline' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cronograma
            </button>
          </div>
        )}

        {/* Resumo de Impacto */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 mb-6">
          <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-1">Impacto ao acelerar quitação</p>
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-black text-rose-600">{Math.max(0, savedMonths)}</p>
              <p className="text-[10px] text-rose-800 font-bold uppercase">Meses a menos</p>
            </div>
            <div>
              <p className="text-2xl font-black text-rose-600">{formatCurrency(Math.max(0, savedInterest))}</p>
              <p className="text-[10px] text-rose-800 font-bold uppercase">Economia em juros</p>
            </div>
            {isSeriesDebt && seriesTransitions.length > 0 && (
              <div>
                <p className="text-2xl font-black text-blue-600">{seriesTransitions.length}</p>
                <p className="text-[10px] text-blue-800 font-bold uppercase">Trocas de série</p>
              </div>
            )}
          </div>
        </div>

        {/* Visualização do Cronograma */}
        {viewMode === 'timeline' && isSeriesDebt && (
          <div className="mb-6 max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 sticky top-0">
                  <th className="text-left py-2 px-3 font-black text-slate-500 uppercase">Mês</th>
                  <th className="text-left py-2 px-3 font-black text-slate-500 uppercase">Série</th>
                  <th className="text-right py-2 px-3 font-black text-slate-500 uppercase">Parcela</th>
                  <th className="text-right py-2 px-3 font-black text-slate-500 uppercase">Juros</th>
                  <th className="text-right py-2 px-3 font-black text-slate-500 uppercase">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projection.rows.map((row, idx) => {
                  const isTransition = seriesTransitions.some(t => t.rowIndex === idx);
                  const seriesIdx = row.seriesIndex ?? 0;
                  const series = config.series?.[seriesIdx];
                  return (
                    <tr 
                      key={row.month} 
                      className={isTransition ? 'bg-amber-50 font-bold' : 'hover:bg-slate-50/50'}
                    >
                      <td className="py-2 px-3 text-slate-600">{row.month}</td>
                      <td className="py-2 px-3 font-medium">
                        {series ? `Série ${seriesIdx + 1} (${series.year})` : '—'}
                        {isTransition && <AlertCircle size={10} className="inline text-amber-500 ml-1" />}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-rose-600">{formatCurrency(row.payment)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{formatCurrency(row.interest)}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-700">{formatCurrency(row.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Input de Valor Extra */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor extra mensal</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">R$</span>
              <input
                type="number"
                value={extraPayment || ''}
                onChange={e => setExtraPayment(Number(e.target.value))}
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 transition-all text-sm font-black"
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <button
              onClick={() => onConfirmAmortization(extraPayment)}
              className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-500 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} /> Registrar pagamento extra
            </button>
          </div>
        </div>

        {/* Legenda para dívidas com séries */}
        {isSeriesDebt && (
          <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <TrendingUp size={12} /> Como ler o cronograma
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1">
              <li>• <span className="font-medium">Amarelo</span> = mês de troca de série (reajuste aplicado)</li>
              <li>• <span className="font-medium">Parcelas</span> mostram valor total (amortização + juros)</li>
              <li>• <span className="font-medium">Valor extra</span> reduz saldo e pode antecipar troca de série</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};