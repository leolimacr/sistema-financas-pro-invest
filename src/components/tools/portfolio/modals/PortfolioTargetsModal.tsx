import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Target,
  Check,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type {
  PortfolioAsset,
  DerivedAssetPosition,
  PortfolioAssetClass,
} from '../../../../core/portfolio/portfolioTypes';
import { formatCurrencyBRL, formatPercent } from '../portfolioViewUtils';

export interface PortfolioTargetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: PortfolioAsset[];
  positions: DerivedAssetPosition[];
  classes?: PortfolioAssetClass[];
  onSaveTargets: (updatedAssets: PortfolioAsset[]) => Promise<void>;
}

export const PortfolioTargetsModal: React.FC<PortfolioTargetsModalProps> = ({
  isOpen,
  onClose,
  assets,
  positions,
  onSaveTargets,
}) => {
  // Mapa de metas locais indexado por assetId para edição instantânea
  const [targetsMap, setTargetsMap] = useState<Record<string, number | ''>>(() => {
    const initialMap: Record<string, number | ''> = {};
    assets.forEach((a) => {
      initialMap[a.id] = a.targetPercentage !== undefined && a.targetPercentage !== null ? a.targetPercentage : 0;
    });
    return initialMap;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincroniza o estado inicial sempre que o modal abre ou os ativos mudam
  useEffect(() => {
    if (isOpen) {
      const initialMap: Record<string, number | ''> = {};
      assets.forEach((a) => {
        initialMap[a.id] = a.targetPercentage !== undefined && a.targetPercentage !== null ? a.targetPercentage : 0;
      });
      setTargetsMap(initialMap);
      setErrorMsg(null);
    }
  }, [isOpen, assets]);

  // Mapa rápido de posições derivadas
  const positionsMap = useMemo(() => {
    return new Map(positions.map((p) => [p.assetId, p]));
  }, [positions]);

  // Patrimônio total para apuração de percentual atual em carteira
  const totalPortfolioValueBRL = useMemo(() => {
    return positions.reduce((sum, p) => sum + (p.currentValueBRL ?? p.totalInvestedBRL ?? 0), 0);
  }, [positions]);

  // Cálculo da soma em tempo real com precisão de 2 casas decimais
  const totalSum = useMemo(() => {
    const sum = assets.reduce((acc, a) => {
      const val = targetsMap[a.id];
      const num = val === '' || val === undefined ? 0 : Number(val);
      return acc + (Number.isFinite(num) ? num : 0);
    }, 0);
    return Number(sum.toFixed(2));
  }, [assets, targetsMap]);

  // Diferença em relação ao objetivo perfeito de 100%
  const discrepancy = useMemo(() => {
    return Number((totalSum - 100).toFixed(2));
  }, [totalSum]);

  const isBalanced = Math.abs(discrepancy) < 0.005;

  // Atualização atômica de um ativo individual no mapa local
  const handleTargetChange = (assetId: string, rawValue: string) => {
    if (rawValue === '') {
      setTargetsMap((prev) => ({ ...prev, [assetId]: '' }));
      return;
    }
    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(0, Math.min(100, parsed));
    setTargetsMap((prev) => ({ ...prev, [assetId]: clamped }));
  };

  // Atalho: soma a diferença residual diretamente em um ativo específico
  const handleApplyDifferenceToAsset = (assetId: string) => {
    if (discrepancy >= 0) return;
    const needed = Math.abs(discrepancy);
    const currentVal = targetsMap[assetId] === '' ? 0 : Number(targetsMap[assetId] || 0);
    const nextVal = Number((currentVal + needed).toFixed(2));
    setTargetsMap((prev) => ({ ...prev, [assetId]: nextVal }));
  };

  // Identifica o ativo de maior patrimônio para o botão de conveniência rápida no topo
  const largestAsset = useMemo(() => {
    if (assets.length === 0) return null;
    let maxVal = -1;
    let chosen: PortfolioAsset | null = null;
    for (const a of assets) {
      const pos = positionsMap.get(a.id);
      const val = pos?.currentValueBRL ?? pos?.totalInvestedBRL ?? 0;
      if (val > maxVal) {
        maxVal = val;
        chosen = a;
      }
    }
    return chosen || assets[0];
  }, [assets, positionsMap]);

  // Atalho global: equilibra a diferença faltante no ativo de maior patrimônio
  const handleAutoCompleteLargest = () => {
    if (!largestAsset || discrepancy >= 0) return;
    handleApplyDifferenceToAsset(largestAsset.id);
  };

  // Agrupamento de ativos por Categoria para leitura estruturada
  const groupedCategories = useMemo(() => {
    const groups: Record<string, PortfolioAsset[]> = {};
    assets.forEach((a) => {
      const cat = a.category || 'Geral';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => {
        const catSubtotal = items.reduce((acc, item) => {
          const val = targetsMap[item.id];
          const num = val === '' || val === undefined ? 0 : Number(val);
          return acc + (Number.isFinite(num) ? num : 0);
        }, 0);

        const catCurrentValue = items.reduce((acc, item) => {
          const pos = positionsMap.get(item.id);
          return acc + (pos?.currentValueBRL ?? pos?.totalInvestedBRL ?? 0);
        }, 0);

        return {
          category,
          items,
          subtotalTarget: Number(catSubtotal.toFixed(2)),
          currentValueBRL: catCurrentValue,
        };
      });
  }, [assets, targetsMap, positionsMap]);

  // Submissão coordenada de todos os ativos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const updatedAssets: PortfolioAsset[] = assets.map((a) => {
        const val = targetsMap[a.id];
        const num = val === '' || val === undefined ? 0 : Number(val);
        return {
          ...a,
          targetPercentage: Math.max(0, Math.min(100, Number(num.toFixed(2)))),
        };
      });

      await onSaveTargets(updatedAssets);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar as metas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-targets-title"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 1. Header Soberano */}
        <div className="px-5 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 id="portfolio-targets-title" className="text-base sm:text-lg font-bold text-white">
                Metas de Alocação da Carteira
              </h3>
              <p className="text-xs text-slate-300 dark:text-slate-400">
                Visualize e calibre todos os percentuais em uma visão única. A soma atualiza imediatamente.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-targets-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Barra de Status / Régua Dinâmica de 100% (Sticky) */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0">
          <div
            data-testid="targets-status-panel"
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors ${
              isBalanced
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                : discrepancy < 0
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-950 dark:text-red-200'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              {isBalanced ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : discrepancy < 0 ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div>
                <span className="text-sm font-bold block">
                  {isBalanced
                    ? 'Distribuição Equilibrada Concluída (100,00%)'
                    : discrepancy < 0
                    ? `Soma Atual: ${totalSum.toFixed(2).replace('.', ',')}% (Falta ${Math.abs(discrepancy).toFixed(2).replace('.', ',')}%)`
                    : `Soma Atual: ${totalSum.toFixed(2).replace('.', ',')}% (Excesso de +${discrepancy.toFixed(2).replace('.', ',')}%)`}
                </span>
                <span className="text-xs opacity-85 block mt-0.5">
                  {isBalanced
                    ? 'A soma de todos os ativos fecha exatamente em 100,00%. As diretrizes de rebalanceamento serão matematicamente perfeitas.'
                    : discrepancy < 0
                    ? `Divergência de -${Math.abs(discrepancy).toFixed(2).replace('.', ',')}%. Para que o rebalanceamento funcione sem distorções, o total deve fechar em 100,00%.`
                    : `A soma não deve ultrapassar 100,00%. Reduza a meta de um ou mais ativos para equilibrar.`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              {/* Botão de conveniência inteligente quando falta % */}
              {discrepancy < 0 && largestAsset && (
                <button
                  type="button"
                  data-testid="btn-auto-complete-largest"
                  onClick={handleAutoCompleteLargest}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
                  title={`Somar os ${Math.abs(discrepancy).toFixed(2).replace('.', ',')}% faltantes no maior ativo (${largestAsset.ticker})`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Completar no {largestAsset.ticker}</span>
                </button>
              )}

              <div className="text-right">
                <span
                  data-testid="live-total-targets"
                  className={`text-2xl font-black tracking-tight ${
                    isBalanced
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : discrepancy < 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {totalSum.toFixed(2).replace('.', ',')}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Corpo com Formulário Panorâmico */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {assets.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <Target className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
              <p className="font-semibold text-sm">Nenhum ativo cadastrado na carteira.</p>
              <p className="text-xs">Cadastre ativos ou importe uma planilha para definir suas metas de alocação.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedCategories.map((group) => (
                <div
                  key={group.category}
                  className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900"
                >
                  {/* Cabeçalho da Categoria */}
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {group.category}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                        ({group.items.length} {group.items.length === 1 ? 'ativo' : 'ativos'})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                        Custódia: {formatCurrencyBRL(group.currentValueBRL)}
                      </span>
                      <span
                        data-testid={`subtotal-category-${group.category}`}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        Subtotal da Classe: <strong>{group.subtotalTarget.toFixed(2).replace('.', ',')}%</strong>
                      </span>
                    </div>
                  </div>

                  {/* Linhas de Ativos da Categoria */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {group.items.map((asset) => {
                      const pos = positionsMap.get(asset.id);
                      const currentVal = pos?.currentValueBRL ?? pos?.totalInvestedBRL ?? 0;
                      const currentPct = totalPortfolioValueBRL > 0
                        ? (currentVal / totalPortfolioValueBRL) * 100
                        : 0;
                      const val = targetsMap[asset.id];
                      const certificatesCount = asset.fixedIncomeCertificates?.length || pos?.fixedIncomeCertificates?.length || 0;

                      return (
                        <div
                          key={asset.id}
                          className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Identificação do Ativo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {asset.ticker}
                              </span>
                              {certificatesCount > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  {certificatesCount} {certificatesCount === 1 ? 'título' : 'títulos'}
                                </span>
                              )}
                              {asset.institution && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  {asset.institution}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {asset.name}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2 sm:hidden">
                              <span>Custódia: {formatCurrencyBRL(currentVal)}</span>
                              <span>•</span>
                              <span>Atual: {formatPercent(currentPct)}</span>
                            </div>
                          </div>

                          {/* Valor em Custódia e Alocação Atual (Desktop) */}
                          <div className="hidden sm:block text-right px-4 shrink-0">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrencyBRL(currentVal)}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              Alocação atual: {formatPercent(currentPct)}
                            </div>
                          </div>

                          {/* Campo de Meta (%) e Atalho Inline */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Botão de ajuste residual rápido inline quando falta % */}
                            {discrepancy < 0 && (
                              <button
                                type="button"
                                data-testid={`btn-add-diff-inline-${asset.ticker}`}
                                onClick={() => handleApplyDifferenceToAsset(asset.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                                title={`Somar +${Math.abs(discrepancy).toFixed(2).replace('.', ',')}% neste ativo para fechar em 100,00%`}
                              >
                                <span>+{Math.abs(discrepancy).toFixed(2).replace('.', ',')}%</span>
                              </button>
                            )}

                            <div className="relative w-28">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                data-testid={`input-target-${asset.ticker}`}
                                value={val ?? ''}
                                onChange={(e) => handleTargetChange(asset.id, e.target.value)}
                                placeholder="0,00"
                                className="w-full pl-3 pr-7 py-2 text-right text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-none"
                              />
                              <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold pointer-events-none">
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* 4. Rodapé Soberano com Ações */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            {isBalanced ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Pronto para salvar com equilíbrio matemático
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Ajuste para 100% para salvar a configuração ideal
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              data-testid="btn-save-all-targets"
              onClick={handleSubmit}
              disabled={isSubmitting || assets.length === 0}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                isBalanced
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/20'
                  : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Metas'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
