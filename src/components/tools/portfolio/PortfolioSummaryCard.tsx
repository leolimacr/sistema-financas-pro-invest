import React from 'react';
import { AlertTriangle, PieChart, Wallet, Layers, TrendingUp, ArrowRight } from 'lucide-react';
import { PortfolioAllocationSummary } from '../../../core/portfolio/portfolioTypes';
import type { PortfolioInstitutionalMetrics } from './portfolioViewTypes';
import { formatCurrencyBRL, formatPercent } from './portfolioViewUtils';
import { PortfolioAllocationDonut } from './PortfolioAllocationDonut';

interface PortfolioSummaryCardProps {
  summary: PortfolioAllocationSummary;
  metrics?: PortfolioInstitutionalMetrics | null;
  onOpenTargets?: () => void;
}

export const PortfolioSummaryCard: React.FC<PortfolioSummaryCardProps> = ({ summary, metrics, onOpenTargets }) => {
  const {
    consolidatedTotalBRL,
    totalInvestedAssetsBRL,
    totalPortfolioCashBRL,
    categories,
    isTargetSumValid,
    sumTargetsPercentage,
    targetDiscrepancyPercent,
  } = summary;

  // Verifica se há alguma posição com custo desconhecido para calibrar transparência contábil
  const hasUnknownCostPositions = summary.assets.some((a) => !a.hasKnownCost || a.isBalanceOnly);

  return (
    <div className="space-y-6">
      {/* 1. Alerta de Metas que não somam 100% */}
      {!isTargetSumValid && (
        <div
          data-testid="target-discrepancy-warning"
          onClick={onOpenTargets}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && onOpenTargets) {
              e.preventDefault();
              onOpenTargets();
            }
          }}
          tabIndex={onOpenTargets ? 0 : undefined}
          role={onOpenTargets ? 'button' : 'alert'}
          aria-label="Aviso sobre Metas de Alocação. Clique para ajustar as metas."
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-sm ${
            onOpenTargets ? 'cursor-pointer hover:border-amber-400 dark:hover:border-amber-700 hover:bg-amber-100/50 dark:hover:bg-amber-950/60 transition-all group' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 ${onOpenTargets ? 'group-hover:scale-110 transition-transform' : ''}`} />
            <div className="text-xs md:text-sm">
              <span className="font-bold">Aviso sobre Metas de Alocação: </span>
              A soma das metas cadastradas é <strong>{formatPercent(sumTargetsPercentage)}</strong> (divergência de{' '}
              <strong>{targetDiscrepancyPercent > 0 ? '+' : ''}{formatPercent(targetDiscrepancyPercent)}</strong>).
              Para um rebalanceamento matematicamente equilibrado, as metas dos ativos devem somar 100,0%.
            </div>
          </div>
          {onOpenTargets && (
            <button
              type="button"
              data-testid="btn-adjust-targets-from-warning"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTargets();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 self-end sm:self-auto"
            >
              <span>Ajustar Metas Agora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 2. Grid de Cards Principais de Patrimônio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Patrimônio Total */}
        <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Patrimônio Consolidado</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {formatCurrencyBRL(consolidatedTotalBRL)}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Ativos em custódia somados ao saldo de caixa
          </p>
        </div>

        {/* Card 2: Ativos Investidos */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ativos Investidos</span>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            {formatCurrencyBRL(totalInvestedAssetsBRL)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Ações, FIIs, Renda Fixa e outros investimentos
          </p>
        </div>

        {/* Card 3: Caixa da Carteira */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Caixa da Carteira</span>
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
            {formatCurrencyBRL(totalPortfolioCashBRL)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Saldo livre em corretoras para compras estratégicas
          </p>
        </div>
      </div>

      {/* 2.1 Métricas Institucionais de Performance (Modified Dietz e Ganho Orgânico) */}
      {metrics && (
        <div
          data-testid="portfolio-institutional-metrics"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        >
          {/* Card: Rentabilidade Ponderada (Modified Dietz) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Rentabilidade Ponderada (Mês)</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-black ${
                  (metrics.modifiedDietzReturnPercent ?? 0) >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {metrics.modifiedDietzReturnPercent !== null && metrics.modifiedDietzReturnPercent !== undefined
                  ? `${metrics.modifiedDietzReturnPercent >= 0 ? '+' : ''}${formatPercent(metrics.modifiedDietzReturnPercent, true)}`
                  : '—'}
              </span>
              {metrics.modifiedDietzReturnPercent !== null && metrics.cdiBenchmarkPercent && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {Math.round((metrics.modifiedDietzReturnPercent / metrics.cdiBenchmarkPercent) * 100)}% CDI
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Retorno real ponderado no tempo (Modified Dietz)
            </p>
          </div>

          {/* Card: Crescimento Orgânico do Mês */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Variação Orgânica no Mês</span>
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div
              className={`text-xl font-black ${
                (metrics.monthlyOrganicGrowthBRL ?? 0) >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {metrics.monthlyOrganicGrowthBRL !== null && metrics.monthlyOrganicGrowthBRL !== undefined
                ? `${metrics.monthlyOrganicGrowthBRL >= 0 ? '+' : ''}${formatCurrencyBRL(metrics.monthlyOrganicGrowthBRL)}`
                : '—'}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Ganho de capital excluindo novos aportes
            </p>
          </div>

          {/* Card: Aportes Líquidos no Mês */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Aportes Líquidos no Mês</span>
              <Wallet className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {metrics.monthlyExternalInflowBRL !== null && metrics.monthlyExternalInflowBRL !== undefined
                ? formatCurrencyBRL(metrics.monthlyExternalInflowBRL)
                : '—'}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Recursos novos injetados na carteira
            </p>
          </div>
        </div>
      )}

      {/* 2.2 Gráfico Donut & Seção de Alocação Atual vs Meta */}
      {consolidatedTotalBRL > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6 flex flex-col">
            <PortfolioAllocationDonut summary={summary} className="h-full flex flex-col justify-between" />
          </div>
          <div className="lg:col-span-6 flex flex-col">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border-2 border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                    <h3 className="font-black text-slate-950 dark:text-white text-base md:text-lg">
                      Alocação Atual vs Meta
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    {categories.length} {categories.length === 1 ? 'classe' : 'classes'}
                  </span>
                </div>

                {categories.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                    Nenhuma categoria cadastrada.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {categories.map((cat) => {
                      const targetPct = cat.targetPercentage;
                      const currentPct = cat.currentPercentage;
                      const diffBRL = cat.differenceBRL;
                      const isOverAllocated = diffBRL > 0;

                      return (
                        <div key={cat.category} className="space-y-1.5" data-testid={`category-row-${cat.category}`}>
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="font-bold text-slate-900 dark:text-white">{cat.category}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {formatCurrencyBRL(cat.currentValueBRL)}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatPercent(currentPct)} <span className="text-slate-400 dark:text-slate-500 font-normal">/ Meta: {formatPercent(targetPct)}</span>
                              </span>
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  isOverAllocated
                                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {isOverAllocated ? '+' : ''}{formatCurrencyBRL(diffBRL)}
                              </span>
                            </div>
                          </div>

                          {/* Barra comparativa de progresso */}
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                            <div
                              className="bg-slate-900 dark:bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(currentPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Nota de Rigor Contábil sobre Rentabilidade */}
              {hasUnknownCostPositions && (
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
                  <span>
                    <strong>Nota de Rigor Contábil:</strong> Rentabilidade consolidada desativada temporariamente porque há ativos importados apenas por saldo inicial sem histórico de aquisição.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <h3 className="font-black text-slate-950 dark:text-white text-base md:text-lg">
                Alocação Atual vs Meta
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {categories.length} {categories.length === 1 ? 'classe' : 'classes'}
            </span>
          </div>

          {categories.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
              Nenhuma categoria cadastrada.
            </p>
          ) : (
            <div className="space-y-4">
              {categories.map((cat) => {
                const targetPct = cat.targetPercentage;
                const currentPct = cat.currentPercentage;
                const diffBRL = cat.differenceBRL;
                const isOverAllocated = diffBRL > 0;

                return (
                  <div key={cat.category} className="space-y-1.5" data-testid={`category-row-${cat.category}`}>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="font-bold text-slate-900 dark:text-white">{cat.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {formatCurrencyBRL(cat.currentValueBRL)}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatPercent(currentPct)} <span className="text-slate-400 dark:text-slate-500 font-normal">/ Meta: {formatPercent(targetPct)}</span>
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isOverAllocated
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {isOverAllocated ? '+' : ''}{formatCurrencyBRL(diffBRL)}
                        </span>
                      </div>
                    </div>

                    {/* Barra comparativa de progresso */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-slate-900 dark:bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(currentPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. Nota de Rigor Contábil sobre Rentabilidade */}
          {hasUnknownCostPositions && (
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
              <span>
                <strong>Nota de Rigor Contábil:</strong> Rentabilidade consolidada desativada temporariamente porque há ativos importados apenas por saldo inicial sem histórico de aquisição.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
