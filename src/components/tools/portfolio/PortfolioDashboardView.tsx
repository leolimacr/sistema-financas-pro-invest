import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
  PlusCircle,
  FileSpreadsheet,
  Target,
  SlidersHorizontal,
  Download,
  Receipt,
  PieChart,
  ShieldCheck,
  Building2,
  Coins,
  FileText,
  Trash2,
  ArrowRight,
  Compass,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { PortfolioDashboardViewProps } from './portfolioViewTypes';
import { PortfolioEmptyState } from './PortfolioEmptyState';
import { PortfolioSummaryCard } from './PortfolioSummaryCard';
import { PortfolioPositionsList } from './PortfolioPositionsList';
import { PortfolioMovementsList } from './PortfolioMovementsList';
import { PortfolioDividendsPanel } from './PortfolioDividendsPanel';
import { PortfolioNexusCard } from './PortfolioNexusCard';
import {
  AssetModal,
  MovementModal,
  ClassTargetsModal,
  ImportSpreadsheetModal,
  RebalanceSimulatorModal,
  ExportPortfolioModal,
  ReconcileCashModal,
  ConnectInstitutionsModal,
  PortfolioTaxModal,
  AssetDetailsDrawer,
  AssetCalibrationModal,
  PortfolioTargetsModal,
} from './modals';
import { reconcileCashBalance } from '../../../core/portfolio/portfolioMath';
import type { PortfolioAsset, DerivedAssetPosition, PortfolioMovement } from '../../../core/portfolio/portfolioTypes';
import { getB3MarketStatus, formatCurrencyBRL, formatDateBR } from './portfolioViewUtils';

export const PortfolioDashboardView: React.FC<PortfolioDashboardViewProps> = ({
  summary,
  positions = [],
  quoteMetaMap = {},
  isLoading = false,
  errorMessage = null,
  onRetry,
  onStartSetup,
  userId = 'anon',
  assets = [],
  classes = [],
  movements = [],
  cashBalances = {},
  onRefreshQuotes,
  isRefreshingQuotes = false,
  lastQuotesUpdate = null,
  metrics = null,
  taxSummary = { reports: [], accumulatedStocksLossBRL: 0, accumulatedFiisLossBRL: 0, totalTaxPaidOrDueBRL: 0, totalExemptProfitBRL: 0 },
  nexusInsights = [],
  availableFreeBalance = null,
  onNavigateToReserve,
  onNavigateToCentral,
  onSaveAsset,
  onSaveAllAssets,
  onDeleteAsset,
  onAddMovement,
  onVoidMovement,
  onSaveAllClasses,
  onImportBatch,
  onSyncCashBalance,
}) => {
  // Controle de abas: Custódia vs Livro Razão vs Proventos
  const [activeTab, setActiveTab] = useState<'custody' | 'movements' | 'dividends'>('custody');

  // Modais interativos
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);
  const [isClassTargetsModalOpen, setIsClassTargetsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);
  const [calibrationAssetId, setCalibrationAssetId] = useState<string | undefined>(undefined);

  // Estados de gestão operacional por ativo (Etapa 1 & 2)
  const [editingAsset, setEditingAsset] = useState<PortfolioAsset | null>(null);
  const [assetForMovementId, setAssetForMovementId] = useState<string | undefined>(undefined);
  const [assetToDelete, setAssetToDelete] = useState<PortfolioAsset | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [selectedPositionForDetails, setSelectedPositionForDetails] = useState<DerivedAssetPosition | null>(null);

  // Manipulador de salvamento de calibração sincronizado (Ativo + Movimentação)
  const handleSaveCalibration = async (
    updatedAsset: PortfolioAsset,
    movementData: { quantity: number | null; unitPrice: number; grossAmount: number; isNetBalance?: boolean },
    applyInstitutionToAllPending?: boolean,
    additionalAssets?: {
      asset: PortfolioAsset;
      movementData: { quantity: number | null; unitPrice: number; grossAmount: number; isNetBalance?: boolean };
    }[],
    absorbedAssetIds?: string[]
  ) => {
    const assetsToUpdate: PortfolioAsset[] = [updatedAsset];
    const movementsToUpdate: PortfolioMovement[] = [];

    // Se o usuário solicitou propagação da mesma corretora para outros ativos pendentes
    if (applyInstitutionToAllPending && updatedAsset.institution) {
      const otherPending = positions.filter((p) => !p.institution && p.assetId !== updatedAsset.id);
      for (const p of otherPending) {
        const a = assets.find((item) => item.id === p.assetId);
        if (a) {
          assetsToUpdate.push({
            ...a,
            institution: updatedAsset.institution,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    // Localiza a movimentação inicial existente para atualização
    const existingMov = movements.find(
      (m) => m.assetId === updatedAsset.id && !m.isVoided && (m.type === 'INITIAL_POSITION' || m.type === 'BUY')
    );

    const now = new Date().toISOString();
    if (existingMov) {
      const isBalanceOnly = Boolean(updatedAsset.isBalanceOnly);
      const updatedMov: PortfolioMovement = {
        ...existingMov,
        date: updatedAsset.fixedIncomeStartDate || existingMov.date,
        quantity: isBalanceOnly ? null : movementData.quantity,
        hasKnownQuantity: !isBalanceOnly && movementData.quantity !== null && movementData.quantity > 0,
        unitPrice: movementData.unitPrice,
        hasKnownCost: movementData.unitPrice > 0,
        grossAmount: movementData.grossAmount,
        netAmount: movementData.grossAmount + (existingMov.fees || 0),
        netAmountBRL: (movementData.grossAmount + (existingMov.fees || 0)) * (existingMov.fxRateToBRL || 1.0),
        isNetBalance: movementData.isNetBalance,
        updatedAt: now,
      };
      movementsToUpdate.push(updatedMov);
    } else {
      const isBalanceOnly = Boolean(updatedAsset.isBalanceOnly);
      const newMov: PortfolioMovement = {
        id: `mov_init_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        assetId: updatedAsset.id,
        type: 'INITIAL_POSITION',
        date: updatedAsset.fixedIncomeStartDate || now.slice(0, 10),
        quantity: isBalanceOnly ? null : movementData.quantity,
        hasKnownQuantity: !isBalanceOnly && movementData.quantity !== null && movementData.quantity > 0,
        unitPrice: movementData.unitPrice,
        fees: 0,
        grossAmount: movementData.grossAmount,
        netAmount: movementData.grossAmount,
        currency: updatedAsset.currency,
        fxRateToBRL: 1.0,
        fxSource: 'FIXED_ONE',
        netAmountBRL: movementData.grossAmount,
        hasKnownCost: movementData.unitPrice > 0,
        isNetBalance: movementData.isNetBalance,
        status: 'ACTIVE',
        notes: 'Calibração inicial da posição',
        createdAt: now,
        updatedAt: now,
      };
      movementsToUpdate.push(newMov);
    }

    // Processa títulos adicionais vinculados à mesma meta/categoria (se houver)
    if (additionalAssets && additionalAssets.length > 0) {
      for (const item of additionalAssets) {
        assetsToUpdate.push(item.asset);
        const siblingMov: PortfolioMovement = {
          id: `mov_sib_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          userId,
          assetId: item.asset.id,
          type: 'INITIAL_POSITION',
          date: now.slice(0, 10),
          quantity: item.asset.isBalanceOnly ? null : item.movementData.quantity,
          hasKnownQuantity: !item.asset.isBalanceOnly && item.movementData.quantity !== null && item.movementData.quantity > 0,
          unitPrice: item.movementData.unitPrice,
          fees: 0,
          grossAmount: item.movementData.grossAmount,
          netAmount: item.movementData.grossAmount,
          currency: item.asset.currency,
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: item.movementData.grossAmount,
          hasKnownCost: item.movementData.unitPrice > 0,
          isNetBalance: item.movementData.isNetBalance,
          status: 'ACTIVE',
          notes: 'Aplicação adicional na mesma meta/categoria',
          createdAt: now,
          updatedAt: now,
        };
        movementsToUpdate.push(siblingMov);
      }
    }

    if (onImportBatch) {
      await onImportBatch(assetsToUpdate, movementsToUpdate);
    } else if (onSaveAsset) {
      for (const a of assetsToUpdate) {
        await onSaveAsset(a);
      }
      if (onAddMovement) {
        for (const m of movementsToUpdate) {
          await onAddMovement(m);
        }
      }
    }

    // Exclui de forma limpa eventuais títulos avulsos que foram incorporados neste ativo
    if (absorbedAssetIds && absorbedAssetIds.length > 0 && onDeleteAsset) {
      for (const delId of absorbedAssetIds) {
        try {
          await onDeleteAsset(delId);
        } catch (err) {
          console.error(`Falha ao remover ativo incorporado ${delId}:`, err);
        }
      }
    }
  };

  // Status oficial do pregão B3 (horário de Brasília)
  const b3Status = useMemo(() => getB3MarketStatus(), []);

  // Quantidade de movimentações vinculadas ao ativo selecionado para exclusão
  const linkedMovementsCount = useMemo(() => {
    if (!assetToDelete) return 0;
    return movements.filter((m) => m.assetId === assetToDelete.id && !m.isVoided).length;
  }, [assetToDelete, movements]);

  const handleConfirmDeleteAsset = async () => {
    if (!assetToDelete || !onDeleteAsset) return;
    try {
      setIsDeletingAsset(true);
      await onDeleteAsset(assetToDelete.id);
      setIsDeleteModalOpen(false);
      setAssetToDelete(null);
    } catch (err) {
      console.error('Falha ao excluir ativo:', err);
    } finally {
      setIsDeletingAsset(false);
    }
  };

  const handleSaveTargets = async (updatedAssets: PortfolioAsset[]) => {
    if (onSaveAllAssets) {
      await onSaveAllAssets(updatedAssets);
    } else if (onImportBatch) {
      await onImportBatch(updatedAssets, []);
    } else if (onSaveAsset) {
      for (const a of updatedAssets) {
        await onSaveAsset(a);
      }
    }
  };

  // Contas de Caixa e Auditoria de Reconciliação
  const cashAssets = useMemo(() => {
    return assets.filter(
      (a) =>
        a.isOpportunityCash ||
        a.category === 'Caixa de Oportunidade' ||
        a.category === 'Caixa' ||
        a.market === 'CASH'
    );
  }, [assets]);

  const hasCashDivergence = useMemo(() => {
    return cashAssets.some((ca) => {
      const rec = reconcileCashBalance(ca.id, movements, cashBalances[ca.id] || null);
      return rec.isDivergent && rec.persistedBalance !== null;
    });
  }, [cashAssets, movements, cashBalances]);

  // Movimentações recentes para o widget de extrato na visão de custódia
  const recentMovements = useMemo(() => {
    return movements.filter((m) => !m.isVoided).slice(0, 4);
  }, [movements]);

  // Mapa de ativos por ID para busca rápida de tickers
  const assetLookup = useMemo(() => {
    const map = new Map<string, PortfolioAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  // Resumo executivo de proventos para o radar de renda passiva
  const dividendSummary = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const activeDivs = movements.filter(
      (m) =>
        !m.isVoided &&
        (m.type === 'DIVIDEND' || m.type === 'JCP' || m.type === 'AMORTIZATION')
    );
    const received = activeDivs
      .filter((m) => m.date <= todayStr)
      .reduce((sum, m) => sum + (m.totalNetAmountBRL || 0), 0);
    const provisioned = activeDivs
      .filter((m) => m.date > todayStr)
      .reduce((sum, m) => sum + (m.totalNetAmountBRL || 0), 0);
    const upcoming = activeDivs
      .filter((m) => m.date > todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const latestReceived = activeDivs
      .filter((m) => m.date <= todayStr)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    return { received, provisioned, upcoming, latestReceived, count: activeDivs.length };
  }, [movements]);

  // 1. Estado de Carregamento (Loading Skeleton)
  if (isLoading) {
    return (
      <div
        data-testid="portfolio-loading-skeleton"
        role="status"
        aria-label="Carregando carteira de investimentos..."
        className="space-y-6 max-w-6xl mx-auto p-4 md:p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="w-32 h-4 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>

        {/* Skeleton dos Cards de Patrimônio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
        </div>

        {/* Skeleton da Tabela de Posições */}
        <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // 2. Estado de Erro
  if (errorMessage) {
    return (
      <div
        data-testid="portfolio-error-state"
        role="alert"
        className="max-w-2xl mx-auto p-6 md:p-8 bg-white dark:bg-slate-900 rounded-2xl border-2 border-red-200 dark:border-red-900/50 text-center shadow-sm"
      >
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-slate-950 dark:text-white mb-2">
          Não foi possível carregar a carteira
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
          {errorMessage}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>
        )}
      </div>
    );
  }

  const handleStartSetupClick = () => {
    if (onStartSetup) {
      onStartSetup();
    } else {
      setEditingAsset(null);
      setIsAssetModalOpen(true);
    }
  };

  // 3. Renderização Principal (Com Barra de Ações Soberana)
  return (
    <div
      data-testid="portfolio-dashboard-view"
      className="space-y-6 max-w-6xl mx-auto p-4 md:p-6"
    >
      {/* Cabeçalho Executivo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-950 dark:bg-slate-800 text-emerald-400 flex items-center justify-center shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                Carteira de Investimentos
              </h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Soberana V1
              </span>
              <span
                data-testid="b3-market-status-badge"
                title={b3Status.tooltip}
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  b3Status.isOpen
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${b3Status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {b3Status.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Alocação estratégica, livro razão contábil e rebalanceamento
            </p>
          </div>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {onSaveAsset && (
            <button
              type="button"
              onClick={() => {
                setEditingAsset(null);
                setIsAssetModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm"
              title="Cadastrar novo ativo ou saldo de oportunidade"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Novo Ativo</span>
            </button>
          )}

          {onAddMovement && assets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setAssetForMovementId(undefined);
                setIsMovementModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              title="Registrar movimentação (compra, venda, provento)"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Lançamento</span>
            </button>
          )}

          {(onSaveAllAssets || onSaveAllClasses || onImportBatch) && (
            <button
              type="button"
              data-testid="top-bar-metas-button"
              onClick={() => setIsTargetsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              title="Definir e calibrar metas percentuais da carteira"
            >
              <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Metas</span>
            </button>
          )}

          {onImportBatch && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              title="Importar movimentações via CSV ou planilha Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Importar</span>
            </button>
          )}

          {/* Conectar Instituições (Em desenvolvimento) */}
          <button
            type="button"
            data-testid="top-bar-connect-button"
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Conectar instituições financeiras e corretoras (Em desenvolvimento)"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Conectar</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 leading-none">
              Em breve
            </span>
          </button>

          {positions.length > 0 && (
            <button
              type="button"
              onClick={() => setIsSimulatorModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              title="Simular aportes matemáticos para rebalancear a carteira"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Simular</span>
            </button>
          )}

          {(positions.length > 0 || movements.length > 0) && (
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              title="Exportar dados da carteira em CSV ou JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Exportar</span>
            </button>
          )}

          {(positions.length > 0 || movements.length > 0) && (
            <button
              type="button"
              data-testid="top-bar-tax-button"
              onClick={() => setIsTaxModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              title="Apuração fiscal de IRPF sobre ganho de capital, isenção de R$ 20k e DARF 6015"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>IRPF / DARF</span>
              {taxSummary.totalTaxPaidOrDueBRL > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          )}

          {onRefreshQuotes && assets.length > 0 && (
            <button
              type="button"
              data-testid="refresh-quotes-button"
              disabled={isRefreshingQuotes}
              onClick={() => onRefreshQuotes()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60"
              title={
                lastQuotesUpdate
                  ? `Atualizar cotações de mercado (última atualização: ${new Date(lastQuotesUpdate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`
                  : 'Atualizar cotações de mercado'
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isRefreshingQuotes ? 'animate-spin' : ''}`} />
              <span>{isRefreshingQuotes ? 'Atualizando...' : 'Cotações'}</span>
              {lastQuotesUpdate && !isRefreshingQuotes && (
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  {new Date(lastQuotesUpdate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>
          )}

          {cashAssets.length > 0 && (
            <button
              type="button"
              onClick={() => setIsReconcileModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors shadow-sm ${
                hasCashDivergence
                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-black animate-pulse'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Auditar integridade contábil do Caixa de Oportunidade"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>{hasCashDivergence ? '⚠️ Reconciliar Caixa' : 'Verificar Caixa'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Alerta de Divergência Contábil no Caixa */}
      {hasCashDivergence && (
        <div
          data-testid="cash-divergence-banner"
          className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-fade-in"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-950 dark:text-amber-200">
                Divergência contábil detectada no Caixa de Oportunidade
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-0.5">
                O saldo registrado no controle transacional difere do livro-razão. Novas compras e estornos com caixa estão bloqueados até a reconciliação explícita.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReconcileModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow transition-colors shrink-0"
          >
            Reconciliar Agora
          </button>
        </div>
      )}

      {/* Se não houver posições nem movimentações cadastradas, exibe o Estado Vazio */}
      {positions.length === 0 && movements.length === 0 ? (
        <PortfolioEmptyState
          onStartSetup={handleStartSetupClick}
          onOpenImport={() => setIsImportModalOpen(true)}
          onOpenConnect={() => setIsConnectModalOpen(true)}
        />
      ) : (
        <>
          {/* Recomendações Estratégicas do Nexus Copilot */}
          {nexusInsights && nexusInsights.length > 0 && (
            <PortfolioNexusCard
              insights={nexusInsights}
              onOpenSimulator={() => setIsSimulatorModalOpen(true)}
              onOpenTaxReport={() => setIsTaxModalOpen(true)}
              onOpenCalibration={() => {
                setCalibrationAssetId(undefined);
                setIsCalibrationModalOpen(true);
              }}
              onNavigateToReserve={onNavigateToReserve}
              onNavigateToCentral={onNavigateToCentral}
              onOpenPositionDetails={(assetId) => {
                const pos = positions.find((p) => p.assetId === assetId);
                if (pos) {
                  setSelectedPositionForDetails(pos);
                }
              }}
            />
          )}

          {/* Seletor de Abas (Custódia vs Movimentações vs Proventos) */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('custody')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'custody'
                  ? 'border-slate-950 dark:border-emerald-400 text-slate-950 dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Custódia & Metas ({positions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('movements')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'movements'
                  ? 'border-slate-950 dark:border-emerald-400 text-slate-950 dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Livro Razão ({movements.length})</span>
            </button>
            <button
              type="button"
              data-testid="tab-dividends"
              onClick={() => setActiveTab('dividends')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'dividends'
                  ? 'border-slate-950 dark:border-emerald-400 text-slate-950 dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Proventos & Renda Passiva</span>
            </button>
          </div>

          {/* Conteúdo da Aba Ativa */}
          {activeTab === 'custody' ? (
            <div className="space-y-6">
              {summary && (
                <PortfolioSummaryCard
                  summary={summary}
                  metrics={metrics}
                  onOpenTargets={() => setIsTargetsModalOpen(true)}
                />
              )}
              <PortfolioPositionsList
                positions={positions}
                assets={assets}
                quoteMetaMap={quoteMetaMap}
                onEditAsset={(asset) => {
                  setEditingAsset(asset);
                  setIsAssetModalOpen(true);
                }}
                onAddMovementForAsset={(assetId) => {
                  setAssetForMovementId(assetId);
                  setIsMovementModalOpen(true);
                }}
                onDeleteAsset={(asset) => {
                  setAssetToDelete(asset);
                  setIsDeleteModalOpen(true);
                }}
                onSelectAssetDetails={(pos) => {
                  setSelectedPositionForDetails(pos);
                }}
                onCalibrateAsset={(pos) => {
                  setCalibrationAssetId(pos.assetId);
                  setIsCalibrationModalOpen(true);
                }}
                onOpenNewAsset={() => {
                  setEditingAsset(null);
                  setIsAssetModalOpen(true);
                }}
                onOpenImport={() => {
                  setIsImportModalOpen(true);
                }}
              />

              {/* Widgets Complementares de Atividade da Carteira (Eliminam o vazio visual e fornecem visão 360°) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* 1. Extrato Recente do Livro Razão */}
                <div
                  data-testid="widget-recent-movements"
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-black text-slate-950 dark:text-white text-sm">
                          Últimas Movimentações
                        </h4>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-view-all-movements"
                        onClick={() => setActiveTab('movements')}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                      >
                        <span>Ver Livro Razão ({movements.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {recentMovements.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        Nenhuma movimentação registrada no Livro Razão.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentMovements.map((m) => {
                          const asset = assetLookup.get(m.assetId);
                          const isBuy = m.type === 'BUY';
                          const isSell = m.type === 'SELL';
                          const isDiv = m.type === 'DIVIDEND' || m.type === 'JCP' || m.type === 'AMORTIZATION';
                          const isInitial = m.type === 'INITIAL_POSITION';

                          const typeBadgeClass = isBuy
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : isSell
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : isDiv
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300';

                          const typeLabel = isBuy
                            ? 'Compra'
                            : isSell
                            ? 'Venda'
                            : isDiv
                            ? (m.type === 'JCP' ? 'JCP' : 'Dividendo')
                            : isInitial
                            ? 'Pos. Inicial'
                            : m.type;

                          return (
                            <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${typeBadgeClass}`}>
                                  {typeLabel}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {asset?.ticker || 'Caixa/Outro'}
                                  </span>
                                  <span className="text-slate-400 dark:text-slate-500 text-[11px] ml-1.5">
                                    {formatDateBR(m.date)}
                                  </span>
                                </div>
                              </div>
                              <span className="font-black text-slate-950 dark:text-white">
                                {formatCurrencyBRL(m.totalNetAmountBRL ?? m.totalAmountBRL ?? 0)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {onAddMovement && (
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setAssetForMovementId(undefined);
                          setIsMovementModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Novo Lançamento</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Radar de Proventos & Renda Passiva */}
                <div
                  data-testid="widget-dividends-radar"
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <h4 className="font-black text-slate-950 dark:text-white text-sm">
                          Radar de Proventos
                        </h4>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-view-all-dividends"
                        onClick={() => setActiveTab('dividends')}
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors inline-flex items-center gap-1"
                      >
                        <span>Ver Painel Completo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Total Recebido
                        </span>
                        <span className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                          {formatCurrencyBRL(dividendSummary.received)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Provisionado
                        </span>
                        <span className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5 block">
                          {formatCurrencyBRL(dividendSummary.provisioned)}
                        </span>
                      </div>
                    </div>

                    {dividendSummary.count === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Nenhum dividendo ou JCP registrado. Quando seus ativos pagarem rendimentos, o fluxo de caixa será consolidado aqui.
                      </p>
                    ) : (
                      <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                        {dividendSummary.upcoming && (
                          <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-between text-xs">
                            <span className="font-semibold text-blue-900 dark:text-blue-200">
                              Próximo ({assetLookup.get(dividendSummary.upcoming.assetId)?.ticker || 'Ativo'}):
                            </span>
                            <span className="font-black text-blue-700 dark:text-blue-300">
                              {formatCurrencyBRL(dividendSummary.upcoming.totalNetAmountBRL)} em {formatDateBR(dividendSummary.upcoming.date)}
                            </span>
                          </div>
                        )}
                        {dividendSummary.latestReceived && !dividendSummary.upcoming && (
                          <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                              Último ({assetLookup.get(dividendSummary.latestReceived.assetId)?.ticker || 'Ativo'}):
                            </span>
                            <span className="font-black text-emerald-700 dark:text-emerald-300">
                              {formatCurrencyBRL(dividendSummary.latestReceived.totalNetAmountBRL)} em {formatDateBR(dividendSummary.latestReceived.date)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400 dark:text-slate-500">
                    <span>{dividendSummary.count} {dividendSummary.count === 1 ? 'provento registrado' : 'proventos registrados'}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dividends')}
                      className="font-bold text-slate-700 dark:text-slate-300 hover:underline"
                    >
                      Acessar calendário
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Guia de Expansão e Diversificação Soberana (Ativado quando há <= 4 ativos) */}
              {positions.length <= 4 && (
                <div
                  data-testid="widget-portfolio-expansion-guide"
                  className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-md relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <Compass className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-black text-white text-base">
                          Carteira em Construção: Expanda sua Diversificação
                        </h4>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {positions.length} {positions.length === 1 ? 'ativo' : 'ativos'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Sua custódia está nos primeiros passos. Uma alocação soberana e antifrágil combina diferentes classes para proteger contra ciclos de mercado:
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid="btn-expansion-simulator"
                      onClick={() => setIsSimulatorModalOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-colors shrink-0 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Simular Aportes</span>
                    </button>
                  </div>

                  {/* 4 Pilares da Alocação Estratégica */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                          <span>🛡️</span>
                          <span>Renda Fixa & Reserva</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          CDB, LCI/LCA e Tesouro Selic para previsibilidade, liquidez e blindagem de crises.
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-add-fixed-income"
                        onClick={() => {
                          setEditingAsset({
                            id: '',
                            userId: userId || 'anon',
                            ticker: '',
                            name: '',
                            category: 'Renda Fixa',
                            currency: 'BRL',
                            market: 'B3',
                            targetPercentage: 0,
                            hasKnownQuantity: true,
                            isBalanceOnly: false,
                            createdAt: '',
                            updatedAt: '',
                          });
                          setIsAssetModalOpen(true);
                        }}
                        className="mt-3 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 text-left transition-colors flex items-center gap-1"
                      >
                        <span>+ Adicionar Renda Fixa</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 mb-1">
                          <span>🏢</span>
                          <span>Fundos Imobiliários</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Renda passiva mensal com isenção de IR direto na conta corrente (tijolo e papel).
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-add-fiis"
                        onClick={() => {
                          setEditingAsset({
                            id: '',
                            userId: userId || 'anon',
                            ticker: '',
                            name: '',
                            category: 'Fundos Imobiliários',
                            currency: 'BRL',
                            market: 'B3',
                            targetPercentage: 0,
                            hasKnownQuantity: true,
                            isBalanceOnly: false,
                            createdAt: '',
                            updatedAt: '',
                          });
                          setIsAssetModalOpen(true);
                        }}
                        className="mt-3 text-[11px] font-bold text-blue-400 hover:text-blue-300 text-left transition-colors flex items-center gap-1"
                      >
                        <span>+ Adicionar FII</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 mb-1">
                          <span>📈</span>
                          <span>Ações Brasil</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Participação nas empresas mais rentáveis da B3, dividendos e ganho de capital.
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-add-stocks"
                        onClick={() => {
                          setEditingAsset({
                            id: '',
                            userId: userId || 'anon',
                            ticker: '',
                            name: '',
                            category: 'Ações Brasil',
                            currency: 'BRL',
                            market: 'B3',
                            targetPercentage: 0,
                            hasKnownQuantity: true,
                            isBalanceOnly: false,
                            createdAt: '',
                            updatedAt: '',
                          });
                          setIsAssetModalOpen(true);
                        }}
                        className="mt-3 text-[11px] font-bold text-purple-400 hover:text-purple-300 text-left transition-colors flex items-center gap-1"
                      >
                        <span>+ Adicionar Ações</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                          <span>🌐</span>
                          <span>Caixa de Oportunidade</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Recurso livre para aproveitar quedas bruscas de mercado sem resgatar patrimônio.
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-add-cash"
                        onClick={() => {
                          setEditingAsset({
                            id: '',
                            userId: userId || 'anon',
                            ticker: 'CAIXA_OPORTUNIDADE',
                            name: 'Caixa de Oportunidade',
                            category: 'Caixa / Oportunidade',
                            currency: 'BRL',
                            market: 'OTHER',
                            targetPercentage: 0,
                            hasKnownQuantity: false,
                            isBalanceOnly: true,
                            createdAt: '',
                            updatedAt: '',
                          });
                          setIsAssetModalOpen(true);
                        }}
                        className="mt-3 text-[11px] font-bold text-amber-400 hover:text-amber-300 text-left transition-colors flex items-center gap-1"
                      >
                        <span>+ Cadastrar Caixa</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'movements' ? (
            <PortfolioMovementsList
              movements={movements}
              assets={assets}
              onVoidMovement={onVoidMovement}
            />
          ) : (
            <PortfolioDividendsPanel
              movements={movements}
              assets={assets}
              positions={positions}
            />
          )}
        </>
      )}

      {/* Modais da Aplicação */}
      {onSaveAsset && (
        <AssetModal
          isOpen={isAssetModalOpen}
          onClose={() => {
            setIsAssetModalOpen(false);
            setEditingAsset(null);
          }}
          classes={classes}
          onSave={onSaveAsset}
          userId={userId || 'anon'}
          initialAsset={editingAsset}
        />
      )}

      {onAddMovement && (
        <MovementModal
          isOpen={isMovementModalOpen}
          onClose={() => {
            setIsMovementModalOpen(false);
            setAssetForMovementId(undefined);
          }}
          assets={assets}
          positions={positions}
          onSave={onAddMovement}
          userId={userId || 'anon'}
          defaultAssetId={assetForMovementId}
        />
      )}

      {/* Modal Panorâmico de Metas de Alocação da Carteira */}
      <PortfolioTargetsModal
        isOpen={isTargetsModalOpen}
        onClose={() => setIsTargetsModalOpen(false)}
        assets={assets}
        positions={positions}
        classes={classes}
        onSaveTargets={handleSaveTargets}
      />

      {onSaveAllClasses && (
        <ClassTargetsModal
          isOpen={isClassTargetsModalOpen}
          onClose={() => setIsClassTargetsModalOpen(false)}
          initialClasses={classes}
          onSave={onSaveAllClasses}
        />
      )}

      {onImportBatch && isImportModalOpen && (
        <ImportSpreadsheetModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          classes={classes}
          existingAssets={assets}
          onConfirmImport={onImportBatch}
          userId={userId || 'anon'}
          onOpenCalibration={() => {
            setCalibrationAssetId(undefined);
            setIsCalibrationModalOpen(true);
          }}
        />
      )}

      {/* Modal de Calibração Guiada de Ativos Nexus */}
      <AssetCalibrationModal
        isOpen={isCalibrationModalOpen}
        onClose={() => {
          setIsCalibrationModalOpen(false);
          setCalibrationAssetId(undefined);
        }}
        positions={positions}
        assets={assets}
        movements={movements}
        classes={classes}
        initialAssetId={calibrationAssetId}
        onSaveCalibration={handleSaveCalibration}
        onRefreshQuotes={onRefreshQuotes}
      />

      {positions.length > 0 && (
        <RebalanceSimulatorModal
          isOpen={isSimulatorModalOpen}
          onClose={() => setIsSimulatorModalOpen(false)}
          summary={summary || null}
          positions={positions}
          availableFreeBalance={availableFreeBalance}
        />
      )}

      {(positions.length > 0 || movements.length > 0) && (
        <ExportPortfolioModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          positions={positions}
          movements={movements}
          portfolioData={{ classes, assets, movements, cashBalances }}
        />
      )}

      {cashAssets.length > 0 && isReconcileModalOpen && (
        <ReconcileCashModal
          isOpen={isReconcileModalOpen}
          onClose={() => setIsReconcileModalOpen(false)}
          cashAssets={cashAssets}
          movements={movements}
          cashBalances={cashBalances}
          onConfirmSync={async (cashAssetId) => {
            if (onSyncCashBalance) {
              await onSyncCashBalance(cashAssetId);
            }
          }}
        />
      )}

      {/* Modal Informativo: Conexão de Instituições em Desenvolvimento */}
      <ConnectInstitutionsModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenManual={() => setIsAssetModalOpen(true)}
      />

      {/* Modal de Apuração Fiscal de IRPF e DARF (Etapa 4) */}
      <PortfolioTaxModal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        taxSummary={taxSummary}
      />

      {/* Modal Defensivo de Confirmação de Exclusão de Ativo (Etapa 1) */}
      {isDeleteModalOpen && assetToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="delete-asset-modal"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold">Excluir Ativo da Carteira</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingAsset) {
                    setIsDeleteModalOpen(false);
                    setAssetToDelete(null);
                  }
                }}
                disabled={isDeletingAsset}
                className="p-1 rounded-lg text-red-200 hover:text-white hover:bg-red-700 transition-colors"
                aria-label="Fechar modal"
              >
                <span className="text-lg font-bold leading-none">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Tem certeza de que deseja excluir o ativo{' '}
                <strong className="text-slate-950 dark:text-white font-black font-mono">
                  {assetToDelete.ticker}
                </strong>{' '}
                ({assetToDelete.name})?
              </p>

              {linkedMovementsCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Lançamentos vinculados encontrados</span>
                  </p>
                  <p>
                    Existem {linkedMovementsCount} movimentação(ões) associada(s) a este ativo no livro-razão.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta ação removerá o ativo do cadastro da sua custódia soberana.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  data-testid="cancel-delete-asset-btn"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setAssetToDelete(null);
                  }}
                  disabled={isDeletingAsset}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  data-testid="confirm-delete-asset-btn"
                  onClick={handleConfirmDeleteAsset}
                  disabled={isDeletingAsset}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isDeletingAsset ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isDeletingAsset ? 'Excluindo...' : 'Excluir Ativo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raio-X Individual do Ativo (Etapa 2) */}
      <AssetDetailsDrawer
        isOpen={Boolean(selectedPositionForDetails)}
        position={selectedPositionForDetails}
        asset={
          selectedPositionForDetails
            ? assets.find((a) => a.id === selectedPositionForDetails.assetId) || null
            : null
        }
        movements={movements}
        quoteMeta={
          selectedPositionForDetails
            ? quoteMetaMap[selectedPositionForDetails.assetId] || null
            : null
        }
        onClose={() => setSelectedPositionForDetails(null)}
        onEditAsset={(assetToEdit) => {
          setSelectedPositionForDetails(null);
          setEditingAsset(assetToEdit);
          setIsAssetModalOpen(true);
        }}
        onAddMovement={(assetId) => {
          setSelectedPositionForDetails(null);
          setAssetForMovementId(assetId);
          setIsMovementModalOpen(true);
        }}
      />
    </div>
  );
};
