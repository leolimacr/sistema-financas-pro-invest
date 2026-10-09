import React from 'react';
import {
  Plus, Trash2, Pencil,
  TrendingUp, ShieldCheck,
  LayoutGrid, List
} from 'lucide-react';
import type { DebtItem } from '../../../../services/debt';
import { MANUAL_DEBT_TYPES } from '../../../../services/debt/debt.constants';
import { computeMonthlyImpact } from '../../../../services/debt/debt.math';
import { hasInterestBeenAppliedThisMonth, computeRotativoMonthlyInterest } from '../../../../services/rotativo.math';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const STRIPE_COLORS: Record<string, string> = {
  [MANUAL_DEBT_TYPES.ROTATIVO]: 'bg-rose-500',
  [MANUAL_DEBT_TYPES.PESSOAL]: 'bg-orange-400',
  [MANUAL_DEBT_TYPES.FINANCIAMENTO]: 'bg-blue-500',
  [MANUAL_DEBT_TYPES.CHEQUE_ESPECIAL]: 'bg-red-600',
  [MANUAL_DEBT_TYPES.CONSIGNADO]: 'bg-teal-500',
  [MANUAL_DEBT_TYPES.OUTRO]: 'bg-slate-400',
};

export interface DebtListSectionProps {
  debts: DebtItem[];
  rankings: { debt: DebtItem; [key: string]: any }[];
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  topDebtId?: string;
  highlightDebtId?: string | null;
  applyingInterestId?: string | null;
  isAmortizing?: boolean;
  handleApplyInterest: (debt: DebtItem) => void;
  handleOpenAmortization: (debt: DebtItem) => void;
  setSelectedDebtForProjection: (debt: DebtItem) => void;
  handleEdit: (debt: DebtItem) => void;
  handleDelete: (id: string) => void;
}

export const DebtListSection: React.FC<DebtListSectionProps> = ({
  debts,
  rankings,
  viewMode,
  setViewMode,
  topDebtId,
  highlightDebtId,
  applyingInterestId,
  isAmortizing,
  handleApplyInterest,
  handleOpenAmortization,
  setSelectedDebtForProjection,
  handleEdit,
  handleDelete,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sua Lista</h3>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setViewMode('grid'); localStorage.setItem('debt_view_mode', 'grid'); }}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('list'); localStorage.setItem('debt_view_mode', 'list'); }}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem] p-20 text-center font-bold text-slate-400 dark:text-slate-500">
          Nenhuma dívida cadastrada no momento.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rankings.map(ranking => {
            const debt = ranking.debt;
            const isTopPriority = debt.id === topDebtId;
            const totalParcelas = debt.totalParcelas || debt.parcelasRestantes + debt.parcelasPagas || debt.parcelasRestantes;
            const parcelasPagas = debt.parcelasPagas || 0;
            const progressoPercentual = totalParcelas > 0 ? Math.round((parcelasPagas / totalParcelas) * 100) : 0;
            const proximaParcela = parcelasPagas + 1;
            const podeAbater = debt.saldoDevedor > 0 && debt.parcelasRestantes > 0 && debt.originType !== 'rotativo_cartao';

            return (
              <div
                key={debt.id}
                id={`debt-${debt.id}`}
                className={`bg-white dark:bg-slate-800 border rounded-[2.5rem] p-7 shadow-sm group relative overflow-hidden flex flex-col h-full ${debt.id === highlightDebtId ? 'ring-2 ring-amber-400 border-amber-300 dark:border-amber-500 shadow-amber-100/50' : 'border-slate-200 dark:border-slate-700'}`}
              >
                <div className={`absolute top-0 left-0 w-full h-2 ${STRIPE_COLORS[debt.tipo] || 'bg-slate-400'}`} />
                <div className="flex justify-between items-start mb-4 mt-2">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase">{debt.tipo}</span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">
                      {debt.nome}
                      {isTopPriority && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[8px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                          Prioridade #1
                        </span>
                      )}
                      {debt.id === highlightDebtId && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[8px] font-black uppercase tracking-widest shadow-sm animate-pulse">
                          Citada na Notificação
                        </span>
                      )}
                    </h4>
                    {(() => {
                      const impact = computeMonthlyImpact(debt);
                      if (impact <= 0) return null;
                      const label = debt.originType === 'rotativo_cartao'
                        ? `Juros: ${formatCurrency(impact)}/mês`
                        : `Parcela: ${formatCurrency(impact)}/mês`;
                      if (isTopPriority) {
                        return (
                          <p className="mt-1 text-[11px] font-black text-amber-600 dark:text-amber-400 tracking-tight">
                            🔥 Impacto: {label}
                          </p>
                        );
                      }
                      return (
                        <p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                          {label}
                        </p>
                      );
                    })()}
                    {debt.originType === 'rotativo_cartao' && (
                      <div className="mt-1.5 space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[9px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-widest">
                          Rotativo
                        </span>
                        {debt.taxaMensal > 0 && (
                          <div className="space-y-0.5 pt-1">
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                              Taxa: {debt.taxaMensal}% a.m.
                            </p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                              Juro mensal: {formatCurrency(computeRotativoMonthlyInterest(debt.saldoDevedor, debt.taxaMensal))}
                            </p>
                            {hasInterestBeenAppliedThisMonth(debt.lastInterestAppliedAt) ? (
                              <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider">
                                Juros deste mês já aplicados
                              </p>
                            ) : (
                              <div className="flex items-center gap-2 pt-1">
                                <p className="text-[8px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider">
                                  Pode aplicar juros
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleApplyInterest(debt)}
                                  disabled={applyingInterestId === debt.id}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[8px] font-black uppercase tracking-wider hover:bg-amber-700 disabled:opacity-50 transition-all active:scale-95"
                                >
                                  {applyingInterestId === debt.id ? 'Aplicando...' : 'Aplicar'}
                                </button>
                              </div>
                            )}
                            {debt.lastInterestAppliedAt && (
                              <p className="text-[7px] text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                                Última aplicação em {new Date(debt.lastInterestAppliedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                              </p>
                            )}
                          </div>
                        )}
                        {!debt.taxaMensal && (
                          <p className="text-[8px] text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                            Configure a taxa de juros no gerenciador de cartões
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => setSelectedDebtForProjection(debt)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all border border-slate-100 dark:border-slate-700"
                    >
                      <TrendingUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(debt)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-all border border-slate-100 dark:border-slate-700"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => debt.id && handleDelete(debt.id)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all border border-slate-100 dark:border-slate-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Progresso: {parcelasPagas}/{totalParcelas}
                    </span>
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{progressoPercentual}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300"
                      style={{ width: `${progressoPercentual}%` }}
                    />
                  </div>
                  {podeAbater && (
                    <button
                      type="button"
                      onClick={() => handleOpenAmortization(debt)}
                      disabled={isAmortizing}
                      className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={14} />
                      Abater Parcela {proximaParcela}/{totalParcelas}
                    </button>
                  )}
                  {!podeAbater && debt.originType !== 'rotativo_cartao' && debt.saldoDevedor > 0 && (
                    <div className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl font-black uppercase tracking-widest text-[10px] text-center">
                      Quitado
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(debt.saldoDevedor)}</h3>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {rankings.map(ranking => {
                const debt = ranking.debt;
                const isTopPriority = debt.id === topDebtId;
                const totalParcelas = debt.totalParcelas || debt.parcelasRestantes + debt.parcelasPagas || debt.parcelasRestantes;
                const parcelasPagas = debt.parcelasPagas || 0;
                const progressoPercentual = totalParcelas > 0 ? Math.round((parcelasPagas / totalParcelas) * 100) : 0;
                const proximaParcela = parcelasPagas + 1;
                const podeAbater = debt.saldoDevedor > 0 && debt.parcelasRestantes > 0 && debt.originType !== 'rotativo_cartao';
                return (
                  <tr
                    key={debt.id}
                    id={`debt-${debt.id}`}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/50 group ${debt.id === highlightDebtId ? 'bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-400 ring-inset' : ''}`}
                  >
                    <td className="px-8 py-5 font-black text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>
                          {debt.nome}
                          {isTopPriority && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[8px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                              Prioridade #1
                            </span>
                          )}
                          {debt.originType === 'rotativo_cartao' && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[8px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-widest">
                              Rotativo
                            </span>
                          )}
                        </span>
                        {(() => {
                          const impact = computeMonthlyImpact(debt);
                          if (impact <= 0) return null;
                          const label = debt.originType === 'rotativo_cartao'
                            ? `Juros: ${formatCurrency(impact)}/mês`
                            : `Parcela: ${formatCurrency(impact)}/mês`;
                          if (isTopPriority) {
                            return (
                              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                🔥 Impacto: {label}
                              </span>
                            );
                          }
                          return (
                            <span className="text-[8px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                              {label}
                            </span>
                          );
                        })()}
                        {debt.originType === 'rotativo_cartao' && debt.taxaMensal > 0 && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                              {debt.taxaMensal}% a.m. · {formatCurrency(computeRotativoMonthlyInterest(debt.saldoDevedor, debt.taxaMensal))}/mês
                            </span>
                            {hasInterestBeenAppliedThisMonth(debt.lastInterestAppliedAt) ? (
                              <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider">
                                Juros aplicados
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider">
                                  Pode aplicar
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleApplyInterest(debt)}
                                  disabled={applyingInterestId === debt.id}
                                  className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[8px] font-black uppercase tracking-wider hover:bg-amber-700 disabled:opacity-50 transition-all active:scale-95"
                                >
                                  {applyingInterestId === debt.id ? 'Aplicando...' : 'Aplicar'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {podeAbater && (
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1 max-w-xs">
                              <div className="flex items-center justify-between text-[9px] mb-1">
                                <span className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                  {parcelasPagas}/{totalParcelas} ({progressoPercentual}%)
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300"
                                  style={{ width: `${progressoPercentual}%` }}
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenAmortization(debt)}
                              disabled={isAmortizing}
                              className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-rose-500 transition-all disabled:opacity-50 flex items-center gap-1 shrink-0"
                            >
                              <ShieldCheck size={12} />
                              Abater {proximaParcela}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-rose-600 dark:text-rose-400">{formatCurrency(debt.saldoDevedor)}</td>
                    <td className="px-8 py-5">
                      <button
                        type="button"
                        onClick={() => handleEdit(debt)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => debt.id && handleDelete(debt.id)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
