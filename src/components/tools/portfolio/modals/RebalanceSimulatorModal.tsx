import React, { useState, useMemo } from 'react';
import { X, Scale, ShieldAlert, Sparkles } from 'lucide-react';
import type {
  DerivedAssetPosition,
  PortfolioAllocationSummary,
} from '../../../../core/portfolio/portfolioTypes';
import {
  simulateRebalanceContribution,
  type RebalanceAssetInput,
  type RebalanceSimulationResult,
} from '../../../../core/portfolio/rebalanceEngine';
import { formatCurrencyBRL, formatPercent } from '../portfolioViewUtils';

interface RebalanceSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: DerivedAssetPosition[];
  summary: PortfolioAllocationSummary | null;
  availableFreeBalance?: number | null;
}

export const RebalanceSimulatorModal: React.FC<RebalanceSimulatorModalProps> = ({
  isOpen,
  onClose,
  positions,
  summary,
  availableFreeBalance,
}) => {
  const [contributionInput, setContributionInput] = useState<string>('5000');
  const [useCash, setUseCash] = useState(false);

  const availableCash = summary?.totalPortfolioCashBRL || 0;

  // Prepara inputs para o motor puro de rebalanceamento
  const assetInputs: RebalanceAssetInput[] = useMemo(() => {
    return positions.map((p) => ({
      assetId: p.assetId,
      ticker: p.ticker,
      name: p.name,
      category: p.category,
      market: p.market,
      currency: p.currency,
      currentPriceBRL:
        p.currentPriceBRL !== null && p.currentPriceBRL > 0
          ? p.currentPriceBRL
          : p.avgCostBRL !== null && p.avgCostBRL > 0
          ? p.avgCostBRL
          : 1.0,
      currentQuantity: p.quantity,
      currentValueBRL: p.currentValueBRL !== null ? p.currentValueBRL : (p.totalInvestedBRL ?? 0),
      targetPercentage: p.targetPercentage,
      isBalanceOnly: p.isBalanceOnly,
      allowFractional: p.market === 'CRYPTO' || p.isBalanceOnly,
    }));
  }, [positions]);

  const simulationResult: RebalanceSimulationResult | null = useMemo(() => {
    if (!isOpen) return null;
    const contribution = parseFloat(contributionInput) || 0;
    if (contribution <= 0 && (!useCash || availableCash <= 0)) return null;

    return simulateRebalanceContribution(assetInputs, {
      contributionAmountBRL: contribution,
      availablePortfolioCashBRL: availableCash,
      useAvailableCash: useCash,
    });
  }, [isOpen, assetInputs, contributionInput, useCash, availableCash]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold">Simulador de Aportes Inteligentes</h3>
              <p className="text-xs text-slate-300 dark:text-slate-400">
                Rebalanceamento sem vendas: direcione o dinheiro novo para os ativos mais distantes da meta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Sinergia Soberana: Conexão com Saldo Livre Real da Central */}
          {availableFreeBalance !== null && availableFreeBalance !== undefined && (
            availableFreeBalance > 0 ? (
              <div
                data-testid="rebalance-free-balance-bar"
                className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold leading-relaxed">
                    Saldo Livre Real apurado na Central: <strong>{formatCurrencyBRL(availableFreeBalance)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="btn-use-free-balance"
                  onClick={() => setContributionInput(String(Math.floor(availableFreeBalance)))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0 shadow-xs self-start sm:self-auto"
                >
                  <Sparkles className="w-3 h-3" />
                  Usar Saldo Livre
                </button>
              </div>
            ) : (
              <div
                data-testid="rebalance-free-balance-warning"
                className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 flex items-start gap-2.5 shadow-xs"
              >
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">
                  <strong>Atenção de Liquidez:</strong> Seu Saldo Livre Real do mês é de <strong>{formatCurrencyBRL(availableFreeBalance)}</strong>. Recomendamos priorizar a quitação de contas básicas e a formação da sua reserva de emergência antes de alocar recursos externos na carteira.
                </span>
              </div>
            )
          )}

          {/* Caixa de Entrada do Aporte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Valor do Novo Aporte (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400 dark:text-slate-500">R$</span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={contributionInput}
                  onChange={(e) => setContributionInput(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full pl-10 pr-4 py-2 text-lg font-black border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {availableCash > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                    Caixa de Oportunidade Atual: {formatCurrencyBRL(availableCash)}
                  </span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    Você possui saldo de caixa retido. Deseja incluir este saldo no rebalanceamento?
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={useCash}
                    onChange={(e) => setUseCash(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-900 focus:ring-amber-900"
                  />
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    Somar Caixa de Oportunidade ao Aporte
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Resultados da Simulação */}
          {simulationResult && (
            <div className="space-y-4">
              {/* Cards Resumo da Simulação */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Disponível Total</span>
                  <span className="text-base font-black text-slate-950 dark:text-white">
                    {formatCurrencyBRL(simulationResult.totalAvailableBRL)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase font-bold">Alocado Sugerido</span>
                  <span className="text-base font-black text-emerald-800 dark:text-emerald-300">
                    {formatCurrencyBRL(simulationResult.totalAllocatedBRL)}
                  </span>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <span className="text-blue-700 dark:text-blue-400 block text-[10px] uppercase font-bold">Caixa Restante (Troco)</span>
                  <span className="text-base font-black text-blue-900 dark:text-blue-200">
                    {formatCurrencyBRL(simulationResult.unallocatedCashBRL)}
                  </span>
                </div>
              </div>

              {/* Tabela de Sugestões de Aporte */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Plano de Compras Sugerido para Rebalanceamento</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Prioriza ativos abaixo do teto contratado
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Ativo</th>
                        <th className="py-2.5 px-3">Classe</th>
                        <th className="py-2.5 px-3 text-right">Meta %</th>
                        <th className="py-2.5 px-3 text-right">Atual %</th>
                        <th className="py-2.5 px-3 text-right">Comprar (Qtd)</th>
                        <th className="py-2.5 px-3 text-right">Aporte Sugerido (R$)</th>
                        <th className="py-2.5 px-3 text-right">Nova Alocação Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {simulationResult.orders.map((sug) => {
                        const isRecommended = sug.status === 'RECOMMENDED';
                        return (
                          <tr
                            key={sug.assetId}
                            className={
                              isRecommended
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/50 font-semibold'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }
                          >
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 dark:text-white">{sug.ticker}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{sug.category}</td>
                            <td className="py-2.5 px-3 text-right">{formatPercent(sug.targetPercentage)}</td>
                            <td className="py-2.5 px-3 text-right">{formatPercent(sug.currentPercentage)}</td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {isRecommended ? (
                                sug.suggestedBuyQuantity !== null ? (
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                    +{sug.suggestedBuyQuantity}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500">Saldo</span>
                                )
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {isRecommended ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-black">
                                  {formatCurrencyBRL(sug.suggestedAmountBRL)}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">R$ 0,00</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatPercent(sug.projectedPercentage)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Disclaimer de Autoridade Silenciosa */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>Simulação Matemática de Apoio à Decisão:</strong> Este plano é uma projeção determinística baseada estritamente nas metas percentuais cadastradas. O Finanças Pro Invest não é corretora nem consultoria e não envia ordens a mercados financeiros.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl shadow transition-colors"
          >
            Fechar Simulação
          </button>
        </div>
      </div>
    </div>
  );
};
