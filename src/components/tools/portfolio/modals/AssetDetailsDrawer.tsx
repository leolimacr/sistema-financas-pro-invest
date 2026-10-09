import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Coins,
  Receipt,
  Calendar,
  Building2,
  Percent,
  ArrowRightLeft,
  Pencil,
  PlusCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  Layers,
  FileText,
  PieChart,
  Scale,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import type {
  DerivedAssetPosition,
  PortfolioAsset,
  PortfolioMovement,
  MovementType,
} from '../../../../core/portfolio/portfolioTypes';
import { isFixedIncomeTaxExempt } from '../../../../core/portfolio/fixedIncomeMath';
import type { PortfolioQuoteMeta } from '../portfolioViewTypes';
import {
  formatCurrencyBRL,
  formatCurrencyOriginal,
  formatPercent,
  formatQuantity,
  formatDateBR,
} from '../portfolioViewUtils';

export interface AssetDetailsDrawerProps {
  isOpen: boolean;
  position: DerivedAssetPosition | null;
  asset?: PortfolioAsset | null;
  movements: PortfolioMovement[];
  quoteMeta?: PortfolioQuoteMeta | null;
  onClose: () => void;
  onEditAsset?: (asset: PortfolioAsset) => void;
  onAddMovement?: (assetId: string) => void;
}

type DrawerTab = 'negotiations' | 'dividends' | 'targets';

export const AssetDetailsDrawer: React.FC<AssetDetailsDrawerProps> = ({
  isOpen,
  position,
  asset,
  movements,
  quoteMeta,
  onClose,
  onEditAsset,
  onAddMovement,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('negotiations');

  // Fecha no Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Movimentações filtradas deste ativo
  const assetMovements = useMemo(() => {
    if (!position) return [];
    return movements
      .filter((m) => m.assetId === position.assetId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [position, movements]);

  // Negociações (Compras, Vendas, Posição Inicial, Eventos)
  const negotiations = useMemo(() => {
    return assetMovements.filter(
      (m) =>
        m.type === 'BUY' ||
        m.type === 'SELL' ||
        m.type === 'INITIAL_POSITION' ||
        m.type === 'SPLIT' ||
        m.type === 'BONUS'
    );
  }, [assetMovements]);

  // Proventos exclusivos deste ativo
  const dividends = useMemo(() => {
    return assetMovements.filter(
      (m) =>
        m.type === 'DIVIDEND' ||
        m.type === 'JCP' ||
        m.type === 'INCOME' ||
        m.type === 'AMORTIZATION'
    );
  }, [assetMovements]);

  // Yield on Cost (YoC)
  const yocPercent = useMemo(() => {
    if (!position || !position.totalInvestedBRL || position.totalInvestedBRL <= 0) return null;
    return (position.totalDividendsBRL / position.totalInvestedBRL) * 100;
  }, [position]);

  // Retorno Total Consolidado (Ganho de capital não realizado + proventos + ganho realizado)
  const totalReturnBRL = useMemo(() => {
    if (!position) return 0;
    return (
      (position.unrealizedPnLBRL || 0) +
      position.totalDividendsBRL +
      position.realizedPnLBRL
    );
  }, [position]);

  if (!isOpen || !position) return null;

  const isBalanceOnly = position.isBalanceOnly || !position.hasKnownQuantity || position.quantity === null;
  const isTaxExempt = isFixedIncomeTaxExempt(position.ticker) || isFixedIncomeTaxExempt(position.name);
  const targetAsset: PortfolioAsset = asset || {
    id: position.assetId,
    userId: 'current',
    ticker: position.ticker,
    name: position.name,
    category: position.category,
    currency: position.currency,
    market: position.market,
    targetPercentage: position.targetPercentage,
    institution: position.institution,
    isBalanceOnly: position.isBalanceOnly,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const getMovementTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'BUY':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Compra
          </span>
        );
      case 'SELL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Venda
          </span>
        );
      case 'DIVIDEND':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Dividendo
          </span>
        );
      case 'JCP':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            JCP
          </span>
        );
      case 'INCOME':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Rendimento
          </span>
        );
      case 'INITIAL_POSITION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Posição Inicial
          </span>
        );
      case 'SPLIT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Desdobramento
          </span>
        );
      case 'BONUS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-pink-100 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
            Bonificação
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Raio-X do Ativo: ${position.ticker}`}
      data-testid="asset-details-drawer"
      className="fixed inset-0 z-[200] overflow-hidden bg-slate-950/60 backdrop-blur-sm animate-fade-in flex justify-end"
    >
      {/* Backdrop invisível para clique fora */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel Lateral / Drawer */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 overflow-hidden animate-slide-left">
        {/* 1. Cabeçalho Executivo */}
        <div className="px-6 pt-[max(1.25rem,calc(env(safe-area-inset-top)+1rem))] pb-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 font-mono font-black text-lg shadow-inner">
              {position.ticker.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  data-testid="drawer-asset-ticker"
                  className="text-xl font-black font-mono tracking-tight text-white"
                >
                  {position.ticker}
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase border border-slate-700">
                  {position.market}
                </span>
                {position.currency !== 'BRL' && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 uppercase border border-blue-700">
                    {position.currency}
                  </span>
                )}
                {position.institution && (
                  <span
                    data-testid="drawer-badge-institution"
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    <Building2 className="w-3 h-3 text-slate-400" />
                    {position.institution}
                  </span>
                )}
                {isTaxExempt && (
                  <span
                    data-testid="drawer-badge-tax-exempt"
                    className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Isento IR
                  </span>
                )}
              </div>
              <p
                data-testid="drawer-asset-name"
                className="text-xs text-slate-400 font-medium mt-0.5 truncate max-w-sm"
              >
                {position.name} • <span className="text-slate-300">{position.category}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAddMovement && (
              <button
                type="button"
                data-testid="drawer-btn-add-movement"
                onClick={() => onAddMovement(position.assetId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                title="Novo Lançamento para este ativo"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lançar</span>
              </button>
            )}
            {onEditAsset && (
              <button
                type="button"
                data-testid="drawer-btn-edit-asset"
                onClick={() => onEditAsset(targetAsset)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                title="Editar Ativo"
              >
                <Pencil className="w-4 h-4 text-blue-400" />
              </button>
            )}
            <button
              type="button"
              data-testid="drawer-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Fechar gaveta de detalhes"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Conteúdo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          {/* Grid de Métricas Soberanas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Posição / Cotas */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block mb-1">
                Posição Atual
              </span>
              <div className="text-base font-black text-slate-950 dark:text-white">
                {isBalanceOnly ? 'Apenas Saldo' : formatQuantity(position.quantity)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isBalanceOnly
                  ? 'Controle por Saldo'
                  : position.currentPriceOriginal !== null
                  ? `Cotação: ${formatCurrencyOriginal(position.currentPriceOriginal, position.currency)}`
                  : 'Sem cotação'}
              </div>
            </div>

            {/* Patrimônio Atual */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block mb-1">
                Valor Total (R$)
              </span>
              <div
                data-testid="drawer-total-value"
                className="text-base font-black text-slate-950 dark:text-white"
              >
                {formatCurrencyBRL(position.currentValueBRL)}
              </div>
              {position.currency !== 'BRL' && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatCurrencyOriginal(position.currentValueOriginal, position.currency)}
                </div>
              )}
            </div>

            {/* Preço Médio */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block mb-1">
                Preço Médio
              </span>
              <div className="text-base font-black text-slate-950 dark:text-white">
                {formatCurrencyBRL(position.avgCostBRL)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Total: {formatCurrencyBRL(position.totalInvestedBRL)}
              </div>
            </div>

            {/* Retorno Não Realizado */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block mb-1">
                Ganho de Capital
              </span>
              <div
                data-testid="drawer-unrealized-pnl"
                className={`text-base font-black ${
                  (position.unrealizedPnLBRL || 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {(position.unrealizedPnLBRL || 0) >= 0 ? '+' : ''}
                {formatCurrencyBRL(position.unrealizedPnLBRL)}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                Retorno: {formatPercent(position.unrealizedPnLPercent, true)}
              </div>
            </div>
          </div>

          {/* Card Especial de Marcação na Curva de Renda Fixa (se ativo for RF) */}
          {position.fixedIncomeDetails && (
            <div
              data-testid="drawer-rf-curve-card"
              className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                    Marcação na Curva (Anbima 252 d.u.)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 uppercase">
                  Taxa Efetiva: {position.fixedIncomeDetails.effectiveAnnualRatePercent}% a.a.
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-950">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase">
                    Valor Bruto
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {formatCurrencyBRL(position.fixedIncomeDetails.grossValueBRL)}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-950">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase">
                    Rendimento Bruto
                  </span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    +{formatCurrencyBRL(position.fixedIncomeDetails.grossYieldBRL)}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-950">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase">
                    IR / IOF Estimado
                  </span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                    {position.fixedIncomeDetails.isTaxExempt
                      ? 'Isento de IR'
                      : `-${formatCurrencyBRL(position.fixedIncomeDetails.taxAmountBRL + position.fixedIncomeDetails.iofAmountBRL)} (${position.fixedIncomeDetails.taxRatePercent}%)`}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-950">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase">
                    Valor Líquido Hoje
                  </span>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {formatCurrencyBRL(position.fixedIncomeDetails.netValueBRL)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>
                  Prazo: {position.fixedIncomeDetails.calendarDaysElapsed} dias corridos ({position.fixedIncomeDetails.businessDaysElapsed} úteis)
                </span>
                {position.fixedIncomeDetails.daysToMaturity !== null && (
                  <span>
                    Vencimento em: {position.fixedIncomeDetails.daysToMaturity} dias
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Card de Títulos Vinculados sob esta Meta (se possuir múltiplos certificados) */}
          {position.fixedIncomeCertificates && position.fixedIncomeCertificates.length > 0 && (
            <div
              data-testid="drawer-rf-certificates-card"
              className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Títulos Vinculados sob esta Meta ({position.fixedIncomeCertificates.length})
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                  Consolidado: {formatCurrencyBRL(position.currentValueBRL)}
                </span>
              </div>

              <div className="space-y-2">
                {position.fixedIncomeCertificates.map((cert, certIdx) => {
                  const share = position.currentValueBRL && position.currentValueBRL > 0
                    ? ((cert.balance / position.currentValueBRL) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div
                      key={cert.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                            {certIdx + 1}º Título
                          </span>
                          <span className="font-bold text-slate-950 dark:text-white font-mono truncate">
                            {cert.name}
                          </span>
                          {cert.ticker && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({cert.ticker})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{cert.institution || '—'}</span>
                          <span>•</span>
                          <span>{cert.indexation || 'CDI'} {cert.ratePercent !== undefined ? `${cert.ratePercent}%` : ''}</span>
                          {cert.startDate && (
                            <>
                              <span>•</span>
                              <span>Aplicação: {formatDateBR(cert.startDate)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Venc: {cert.maturityDate ? formatDateBR(cert.maturityDate) : '—'}</span>
                          {cert.quantity !== undefined && cert.quantity > 0 && (
                            <>
                              <span>•</span>
                              <span>Qtd: {cert.quantity} tit.</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="sm:text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrencyBRL(cert.balance)}
                          <span className="text-[10px] ml-1 text-slate-400 font-normal">
                            ({cert.isNetBalance ? 'Líq' : 'Bruto'})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {share}% do total
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card de Decomposição do Retorno (Breakdown Gorila/Kinvo) */}
          <div
            data-testid="drawer-return-decomposition-card"
            className="p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Decomposição do Retorno do Ativo
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  Resultado Consolidado
                </span>
                <span
                  data-testid="drawer-total-return-brl"
                  className={`text-sm font-black ${
                    totalReturnBRL >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {totalReturnBRL >= 0 ? '+' : ''}
                  {formatCurrencyBRL(totalReturnBRL)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Ganho Não Realizado</span>
                <span
                  className={`font-black ${
                    (position.unrealizedPnLBRL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrencyBRL(position.unrealizedPnLBRL)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Proventos Recebidos</span>
                <span
                  data-testid="drawer-total-dividends"
                  className="font-black text-amber-400"
                >
                  +{formatCurrencyBRL(position.totalDividendsBRL)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Ganho Realizado</span>
                <span
                  className={`font-black ${
                    position.realizedPnLBRL >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrencyBRL(position.realizedPnLBRL)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Yield on Cost (YoC)</span>
                <span
                  data-testid="drawer-yoc-metric"
                  className="font-black text-blue-400"
                >
                  {yocPercent !== null ? formatPercent(yocPercent) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Navegação entre Abas */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              data-testid="drawer-tab-negotiations"
              onClick={() => setActiveTab('negotiations')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'negotiations'
                  ? 'border-slate-950 dark:border-emerald-400 text-slate-950 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Negociações ({negotiations.length})</span>
            </button>
            <button
              type="button"
              data-testid="drawer-tab-dividends"
              onClick={() => setActiveTab('dividends')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'dividends'
                  ? 'border-slate-950 dark:border-emerald-400 text-slate-950 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>Proventos ({dividends.length})</span>
            </button>
            <button
              type="button"
              data-testid="drawer-tab-targets"
              onClick={() => setActiveTab('targets')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'targets'
                  ? 'border-slate-950 dark:border-emerald-400 text-slate-950 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-blue-500" />
              <span>Metas & Info</span>
            </button>
          </div>

          {/* 3. Conteúdo da Aba Selecionada */}
          {activeTab === 'negotiations' ? (
            <div data-testid="drawer-tab-content-negotiations" className="space-y-3">
              {negotiations.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  Nenhuma negociação registrada para este papel.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {negotiations.map((mov) => (
                    <div
                      key={mov.id}
                      data-testid={`drawer-movement-row-${mov.id}`}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">{getMovementTypeBadge(mov.type)}</div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {formatDateBR(mov.date)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {mov.quantity ? `${formatQuantity(mov.quantity)} cotas` : 'Saldo ajustado'}
                            {mov.unitPrice ? ` • Preço: ${formatCurrencyOriginal(mov.unitPrice, position.currency)}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-slate-950 dark:text-white">
                          {formatCurrencyBRL(mov.netAmountBRL)}
                        </div>
                        {mov.isVoided && (
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                            Anulado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'dividends' ? (
            <div data-testid="drawer-tab-content-dividends" className="space-y-3">
              {dividends.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  Nenhum provento recebido registrado para este papel.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {dividends.map((div) => (
                    <div
                      key={div.id}
                      data-testid={`drawer-dividend-row-${div.id}`}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">{getMovementTypeBadge(div.type)}</div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {formatDateBR(div.date)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {div.notes || 'Crédito em conta'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-emerald-600 dark:text-emerald-400">
                          +{formatCurrencyBRL(div.netAmountBRL)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div data-testid="drawer-tab-content-targets" className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Meta Alocada no Ativo</span>
                  <span className="font-black text-slate-950 dark:text-white">
                    {formatPercent(position.targetPercentage)}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Classe Soberana</span>
                  <span className="font-bold text-slate-900 dark:text-white">{position.category}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Corretora Custodiante</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {position.institution || 'Não especificada'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Modo de Acompanhamento</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isBalanceOnly ? 'Apenas Saldo (Caixa / Renda Fixa)' : 'Quantidade de Cotas & Preço Médio'}
                  </span>
                </div>
              </div>

              {asset?.notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Anotações Estratégicas do Investidor
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                    {asset.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
