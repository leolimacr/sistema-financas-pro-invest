import { useMemo, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PortfolioAsset,
  PortfolioAssetClass,
  PortfolioMovement,
  PortfolioUserData,
  PortfolioCashBalance,
  CashReconciliationResult,
  DerivedAssetPosition,
  PortfolioAllocationSummary,
} from '../core/portfolio/portfolioTypes';
import {
  replayAssetLedger,
  computePortfolioAllocation,
  calculateLedgerCashBalance,
  reconcileCashBalance,
  calculateExternalNetInflow,
  calculateMonthlyOrganicGrowth,
  calculateModifiedDietzReturn,
} from '../core/portfolio/portfolioMath';
import * as portfolioService from '../services/portfolioService';
import { DEMO_USER_ID } from '../constants/demoDataset';
import {
  fetchPortfolioQuotes,
  getCachedQuotes,
  MarketQuoteResult,
} from '../services/portfolio/marketQuoteEngine';
import type {
  PortfolioQuoteMeta,
  PortfolioInstitutionalMetrics,
} from '../components/tools/portfolio/portfolioViewTypes';
import { computePortfolioTaxes, PortfolioTaxSummary } from '../core/portfolio/taxEngine';
import { evaluatePortfolioInsights, PortfolioAdvisorInsight } from '../core/portfolio/nexusPortfolioAdvisor';

export interface UsePortfolioReturn {
  classes: PortfolioAssetClass[];
  assets: PortfolioAsset[];
  movements: PortfolioMovement[];
  positions: DerivedAssetPosition[];
  summary: PortfolioAllocationSummary | null;
  cashBalances: Record<string, PortfolioCashBalance>;
  cashReconciliations: Record<string, CashReconciliationResult>;
  hasCashDivergence: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  // Cotações e Métricas (Etapa 3)
  quotesMap: Record<string, MarketQuoteResult>;
  quoteMetaMap: Record<string, PortfolioQuoteMeta>;
  refreshQuotes: (force?: boolean) => Promise<void>;
  isRefreshingQuotes: boolean;
  lastQuotesUpdate: string | null;
  institutionalMetrics: PortfolioInstitutionalMetrics | null;
  // IRPF e Nexus Copilot (Etapa 4)
  taxSummary: PortfolioTaxSummary;
  nexusInsights: PortfolioAdvisorInsight[];
  // Mutações e Auditoria
  reconcileCash: (cashAssetId: string) => CashReconciliationResult;
  syncCashBalance: (cashAssetId: string) => Promise<void>;
  saveClass: (assetClass: PortfolioAssetClass) => Promise<void>;
  saveAllClasses: (classes: PortfolioAssetClass[]) => Promise<void>;
  saveAsset: (asset: PortfolioAsset) => Promise<void>;
  saveAllAssets: (assets: PortfolioAsset[]) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;
  addMovement: (movement: PortfolioMovement) => Promise<void>;
  voidMovement: (movementId: string, reason?: string) => Promise<void>;
  importBatch: (newAssets: PortfolioAsset[], newMovements: PortfolioMovement[]) => Promise<void>;
  resetPortfolio: () => Promise<void>;
}

// Chaves efêmeras restritas ao modo demonstração (sessionStorage)
const DEMO_CLASSES_KEY = 'fpi_demo_portfolio_classes';
const DEMO_ASSETS_KEY = 'fpi_demo_portfolio_assets';
const DEMO_MOVEMENTS_KEY = 'fpi_demo_portfolio_movements';

export interface UsePortfolioOptions {
  availableFreeBalance?: number | null;
  hasEmergencyReserveAlert?: boolean;
}

export function usePortfolio(userId?: string, options?: UsePortfolioOptions): UsePortfolioReturn {
  const queryClient = useQueryClient();
  const activeUserId = userId || 'anon';
  const isDemo = activeUserId === DEMO_USER_ID;

  const queryKey = useMemo(() => ['portfolio', activeUserId], [activeUserId]);

  // Purga defensiva de chaves legadas do localStorage para garantir privacidade absoluta
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(`fpi_portfolio_${activeUserId}_classes`);
        localStorage.removeItem(`fpi_portfolio_${activeUserId}_assets`);
        localStorage.removeItem(`fpi_portfolio_${activeUserId}_movements`);
      } catch {
        // Silencioso
      }
    }
  }, [activeUserId]);

  // Leitura efêmera exclusiva para Sandbox/Demo via sessionStorage
  const readDemoState = (): PortfolioUserData => {
    try {
      const rawClasses = sessionStorage.getItem(DEMO_CLASSES_KEY);
      const rawAssets = sessionStorage.getItem(DEMO_ASSETS_KEY);
      const rawMovements = sessionStorage.getItem(DEMO_MOVEMENTS_KEY);

      return {
        classes: rawClasses ? JSON.parse(rawClasses) : portfolioService.DEFAULT_PORTFOLIO_CLASSES,
        assets: rawAssets ? JSON.parse(rawAssets) : [],
        movements: rawMovements ? JSON.parse(rawMovements) : [],
      };
    } catch {
      return {
        classes: portfolioService.DEFAULT_PORTFOLIO_CLASSES,
        assets: [],
        movements: [],
      };
    }
  };

  const writeDemoState = (data: PortfolioUserData) => {
    try {
      sessionStorage.setItem(DEMO_CLASSES_KEY, JSON.stringify(data.classes));
      sessionStorage.setItem(DEMO_ASSETS_KEY, JSON.stringify(data.assets));
      sessionStorage.setItem(DEMO_MOVEMENTS_KEY, JSON.stringify(data.movements));
    } catch {
      // Silencioso
    }
  };

  // Consulta principal gerenciada 100% em memória RAM via React Query
  const {
    data: portfolioData,
    isLoading,
    error,
  } = useQuery<PortfolioUserData, Error>({
    queryKey,
    queryFn: async () => {
      if (isDemo) {
        return readDemoState();
      }
      if (!userId) {
        return {
          classes: portfolioService.DEFAULT_PORTFOLIO_CLASSES,
          assets: [],
          movements: [],
        };
      }
      return portfolioService.loadPortfolioData(userId);
    },
    initialData: isDemo ? readDemoState : undefined,
    staleTime: 60_000,
    gcTime: 300_000, // 5 min de retenção em memória
    enabled: !!userId,
  });

  const currentData: PortfolioUserData = portfolioData || {
    classes: portfolioService.DEFAULT_PORTFOLIO_CLASSES,
    assets: [],
    movements: [],
  };

  // Estado local das cotações em tempo real (AwesomeAPI + Brapi + Yahoo + Cache)
  const [quotesMap, setQuotesMap] = useState<Record<string, MarketQuoteResult>>(() => getCachedQuotes() || {});
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState(false);
  const [lastQuotesUpdate, setLastQuotesUpdate] = useState<string | null>(null);

  const refreshQuotes = useCallback(async (force = false) => {
    if (!currentData.assets || currentData.assets.length === 0) return;
    const assetsToFetch = currentData.assets.map((a) => ({
      ticker: a.ticker,
      market: a.market,
      currency: a.currency,
    }));
    setIsRefreshingQuotes(true);
    try {
      const res = await fetchPortfolioQuotes(assetsToFetch, force);
      setQuotesMap((prev) => ({ ...prev, ...res }));
      setLastQuotesUpdate(new Date().toISOString());
    } catch (err) {
      console.warn('[usePortfolio] Falha ao atualizar cotações:', err);
    } finally {
      setIsRefreshingQuotes(false);
    }
  }, [currentData.assets]);

  useEffect(() => {
    if (currentData.assets && currentData.assets.length > 0) {
      refreshQuotes(false);
    }
  }, [currentData.assets.length]);

  // Cálculo Soberano de Posições Derivadas por Ativo (Livro Razão Puro)
  const positions: DerivedAssetPosition[] = useMemo(() => {
    if (!currentData.assets || currentData.assets.length === 0) return [];

    return currentData.assets.map((asset) => {
      const assetMovements = (currentData.movements || []).filter(
        (m) => m.assetId === asset.id && m.status === 'ACTIVE'
      );

      // Cotação atual: prioriza manualPrice se definido; caso contrário, consome o motor de cotações
      const quoteResult = quotesMap[asset.ticker.toUpperCase()];
      const currentPriceOriginal =
        asset.manualPrice !== undefined && asset.manualPrice !== null && asset.manualPrice > 0
          ? asset.manualPrice
          : quoteResult && quoteResult.price > 0
          ? quoteResult.price
          : null;

      const currentFxRateToBRL =
        asset.currency === 'BRL'
          ? 1.0
          : (quotesMap['USD']?.price || (asset.currency === 'EUR' ? quotesMap['EUR']?.price : 5.5) || 5.5);

      return replayAssetLedger({
        assetId: asset.id,
        ticker: asset.ticker,
        name: asset.name,
        category: asset.category,
        currency: asset.currency,
        market: asset.market,
        targetPercentage: asset.targetPercentage || 0,
        institution: asset.institution,
        movements: assetMovements,
        currentPriceOriginal,
        currentFxRateToBRL,
        fixedIncomeIndexation: asset.fixedIncomeIndexation,
        fixedIncomeRatePercent: asset.fixedIncomeRatePercent,
        fixedIncomeStartDate: asset.fixedIncomeStartDate,
        fixedIncomeMaturityDate: asset.fixedIncomeMaturityDate,
        fixedIncomeBenchmarkCdi: asset.fixedIncomeBenchmarkCdi,
        fixedIncomeIsNetBalance: asset.fixedIncomeIsNetBalance,
        fixedIncomeCertificates: asset.fixedIncomeCertificates,
      });
    });
  }, [currentData.assets, currentData.movements, quotesMap]);

  // Metadados de integridade e cotação de cada ativo
  const quoteMetaMap = useMemo(() => {
    const map: Record<string, PortfolioQuoteMeta> = {};
    (currentData.assets || []).forEach((asset) => {
      const quoteResult = quotesMap[asset.ticker.toUpperCase()];
      if (asset.fixedIncomeIndexation && asset.fixedIncomeRatePercent) {
        map[asset.id] = { quoteStatus: 'UP_TO_DATE', sourceLabel: 'Marcação na Curva (Anbima)' };
      } else if (asset.isBalanceOnly) {
        map[asset.id] = { quoteStatus: 'MANUAL', sourceLabel: 'Saldo Financeiro' };
      } else if (asset.manualPrice && asset.manualPrice > 0) {
        map[asset.id] = { quoteStatus: 'MANUAL', sourceLabel: 'Cotação Manual' };
      } else if (quoteResult && quoteResult.price > 0) {
        map[asset.id] = {
          quoteStatus: quoteResult.quoteStatus,
          lastUpdateDate: quoteResult.updatedAt,
          sourceLabel: quoteResult.source,
        };
      } else {
        map[asset.id] = { quoteStatus: 'UNAVAILABLE', sourceLabel: 'Sem Cotação Informada' };
      }
    });
    return map;
  }, [currentData.assets, quotesMap]);

  // Reconciliação do Caixa ao Carregar
  const cashReconciliations = useMemo(() => {
    const cashAssets = (currentData.assets || []).filter(
      (a) =>
        a.isOpportunityCash ||
        a.category === 'Caixa de Oportunidade' ||
        a.category === 'Caixa' ||
        a.market === 'CASH'
    );
    const map: Record<string, CashReconciliationResult> = {};
    cashAssets.forEach((ca) => {
      map[ca.id] = reconcileCashBalance(
        ca.id,
        currentData.movements || [],
        currentData.cashBalances?.[ca.id] || null
      );
    });
    return map;
  }, [currentData.assets, currentData.movements, currentData.cashBalances]);

  const hasCashDivergence = useMemo(() => {
    return Object.values(cashReconciliations).some(
      (r) => r.isDivergent && r.persistedBalance !== null
    );
  }, [cashReconciliations]);

  // Cálculo Soberano de Alocação e Metas da Carteira
  const summary: PortfolioAllocationSummary | null = useMemo(() => {
    if (positions.length === 0) return null;

    const cashAssets = positions.filter(
      (p) =>
        p.category === 'Caixa de Oportunidade' ||
        p.category === 'Caixa' ||
        p.market === 'CASH'
    );
    const riskAssets = positions.filter((p) => !cashAssets.some((c) => c.assetId === p.assetId));

    // Se houver qualquer ativo de caixa com meta percentual atribuída (> 0),
    // ou se a soma das metas de todas as posições (risco + caixa) fechar exatamente em 100%,
    // incluímos o caixa nos ativos aplicáveis e no denominador para manter
    // paridade matemática exata e sincronizada com o modal de metas (PortfolioTargetsModal)
    const hasCashTarget = cashAssets.some((c) => (c.targetPercentage ?? 0) > 0);
    const totalTargetsAll = positions.reduce((sum, p) => sum + (p.targetPercentage || 0), 0);
    const isTotalSumValidWithCash = Math.abs(totalTargetsAll - 100) < 0.005;

    const shouldIncludeCashInTargets = hasCashTarget || isTotalSumValidWithCash;

    return computePortfolioAllocation(riskAssets, cashAssets, shouldIncludeCashInTargets);
  }, [positions]);

  // Métricas Institucionais de Performance (Modified Dietz, Ganho Orgânico e Aportes Líquidos)
  const institutionalMetrics: PortfolioInstitutionalMetrics | null = useMemo(() => {
    if (!summary || positions.length === 0) return null;

    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const monthlyExternalInflowBRL = calculateExternalNetInflow(
      currentData.movements || [],
      currentMonthKey
    );

    const dailyFlowsMap: Record<number, number> = {};
    for (const mov of currentData.movements || []) {
      if (mov.status !== 'ACTIVE' || !mov.date.startsWith(currentMonthKey)) continue;
      const day = parseInt(mov.date.slice(8, 10), 10) || 1;
      let flow = 0;
      if (mov.type === 'EXTERNAL_DEPOSIT') flow += mov.netAmountBRL;
      else if (mov.type === 'EXTERNAL_WITHDRAWAL') flow -= mov.netAmountBRL;
      else if (mov.type === 'BUY' && mov.fundingSource === 'EXTERNAL_NEW_MONEY') flow += mov.netAmountBRL;
      else if (mov.type === 'SELL' && mov.settlementTarget === 'EXTERNAL_OUTSIDE') flow -= mov.netAmountBRL;
      if (flow !== 0) {
        dailyFlowsMap[day] = (dailyFlowsMap[day] || 0) + flow;
      }
    }
    const dailyExternalFlows = Object.entries(dailyFlowsMap).map(([d, amountBRL]) => ({
      day: Number(d),
      amountBRL,
    }));

    const closingValueBRL = summary.consolidatedTotalBRL;
    const hasMovementsPriorToMonth = (currentData.movements || []).some(
      (m) => m.status === 'ACTIVE' && m.date < `${currentMonthKey}-01`
    );

    let openingValueBRL = 0;
    if (hasMovementsPriorToMonth) {
      openingValueBRL = Math.max(0, closingValueBRL - monthlyExternalInflowBRL);
    }

    const monthlyOrganicGrowthBRL = calculateMonthlyOrganicGrowth(
      openingValueBRL,
      closingValueBRL,
      monthlyExternalInflowBRL
    );

    const modifiedDietzReturnPercent = calculateModifiedDietzReturn(
      openingValueBRL,
      closingValueBRL,
      dailyExternalFlows,
      daysInMonth
    );

    const cdiBenchmarkPercent = 0.85; // Benchmark médio mensal CDI

    return {
      monthlyOrganicGrowthBRL,
      monthlyExternalInflowBRL,
      modifiedDietzReturnPercent,
      cdiBenchmarkPercent,
    };
  }, [summary, positions, currentData.movements]);

  // Apuração Fiscal de IRPF (Etapa 4)
  const taxSummary: PortfolioTaxSummary = useMemo(() => {
    return computePortfolioTaxes(currentData.assets || [], currentData.movements || []);
  }, [currentData.assets, currentData.movements]);

  // Consciência Estratégica Nexus Copilot (Etapa 4 & 6)
  const nexusInsights: PortfolioAdvisorInsight[] = useMemo(() => {
    return evaluatePortfolioInsights({
      summary,
      positions,
      taxSummary,
      availableFreeBalance: options?.availableFreeBalance,
      hasEmergencyReserveAlert: options?.hasEmergencyReserveAlert,
    });
  }, [summary, positions, taxSummary, options?.availableFreeBalance, options?.hasEmergencyReserveAlert]);

  // MUTAÇÕES COM ATUALIZAÇÃO OTIMISTA EM MEMÓRIA
  const saveClassMutation = useMutation({
    mutationFn: async (assetClass: PortfolioAssetClass) => {
      if (!isDemo && userId) {
        await portfolioService.savePortfolioClass(userId, assetClass);
      }
      return assetClass;
    },
    onSuccess: (assetClass) => {
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      const currentClasses = (current.classes || []).filter((c) => c.id !== assetClass.id);
      const nextClasses = [...currentClasses, assetClass];
      const nextData: PortfolioUserData = { ...current, classes: nextClasses };
      if (isDemo) writeDemoState(nextData);
      queryClient.setQueryData(queryKey, nextData);
    },
  });

  const saveAllClassesMutation = useMutation({
    mutationFn: async (classes: PortfolioAssetClass[]) => {
      if (!isDemo && userId) {
        await portfolioService.saveAllPortfolioClasses(userId, classes);
      }
      return classes;
    },
    onSuccess: (classes) => {
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      const nextData: PortfolioUserData = { ...current, classes };
      if (isDemo) writeDemoState(nextData);
      queryClient.setQueryData(queryKey, nextData);
    },
  });

  const saveAssetMutation = useMutation({
    mutationFn: async (asset: PortfolioAsset) => {
      if (!isDemo && userId) {
        await portfolioService.savePortfolioAsset(userId, asset);
      }
      return asset;
    },
    onSuccess: (asset) => {
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      const currentAssets = (current.assets || []).filter((a) => a.id !== asset.id);
      const nextAssets = [...currentAssets, asset];
      const nextData: PortfolioUserData = { ...current, assets: nextAssets };
      if (isDemo) writeDemoState(nextData);
      queryClient.setQueryData(queryKey, nextData);
    },
  });

  const saveAllAssetsMutation = useMutation({
    mutationFn: async (updatedAssets: PortfolioAsset[]) => {
      if (!isDemo && userId) {
        await portfolioService.saveAllPortfolioAssets(userId, updatedAssets);
      }
      return updatedAssets;
    },
    onSuccess: (updatedAssets) => {
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      const updatedMap = new Map(updatedAssets.map((a) => [a.id, a]));
      const nextAssets = (current.assets || []).map((a) => updatedMap.get(a.id) || a);
      const nextData: PortfolioUserData = { ...current, assets: nextAssets };
      if (isDemo) writeDemoState(nextData);
      queryClient.setQueryData(queryKey, nextData);
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      if (!isDemo && userId) {
        await portfolioService.deletePortfolioAsset(userId, assetId, currentData.movements);
      }
      return assetId;
    },
    onSuccess: (assetId) => {
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      const nextAssets = (current.assets || []).filter((a) => a.id !== assetId);
      const nextMovements = (current.movements || []).filter((m) => m.assetId !== assetId);
      const nextData: PortfolioUserData = { ...current, assets: nextAssets, movements: nextMovements };
      if (isDemo) writeDemoState(nextData);
      queryClient.setQueryData(queryKey, nextData);
    },
  });

  // Mutação com suporte atômico a partidas dobradas para Caixa de Oportunidade
  const addMovementMutation = useMutation({
    mutationFn: async (movement: PortfolioMovement) => {
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      let cashAsset: PortfolioAsset | undefined = undefined;
      let counterpartMovement: PortfolioMovement | undefined = undefined;

      const needsCashCounterpart =
        (movement.fundingSource === 'PORTFOLIO_CASH' && (movement.type === 'BUY' || movement.type === 'FEE_OR_TAX')) ||
        (movement.settlementTarget === 'PORTFOLIO_CASH' && (movement.type === 'SELL' || movement.type === 'DIVIDEND' || movement.type === 'INTEREST'));

      if (needsCashCounterpart) {
        const cashAssets = current.assets.filter(
          (a) => a.isOpportunityCash || a.category === 'Caixa de Oportunidade' || a.category === 'Caixa' || a.market === 'CASH'
        );

        // Se houver mais de um caixa, não escolhe silenciosamente: bloqueia e exige cashAssetId explícito
        if (cashAssets.length > 1) {
          if (!movement.cashAssetId) {
            throw new Error(
              'Existem múltiplos ativos de caixa cadastrados na carteira. Selecione explicitamente qual conta de caixa deseja utilizar.'
            );
          }
          const chosen = cashAssets.find((a) => a.id === movement.cashAssetId);
          if (!chosen) {
            throw new Error('A conta de caixa selecionada não foi encontrada.');
          }
          cashAsset = chosen;
        } else if (cashAssets.length === 1) {
          cashAsset = cashAssets[0];
        } else {
          // Cria automaticamente um único ativo de Caixa de Oportunidade se não houver nenhum
          const now = new Date().toISOString();
          cashAsset = {
            id: `asset-caixa-${Date.now()}`,
            userId: activeUserId,
            ticker: 'CAIXA',
            name: 'Caixa de Oportunidade',
            category: 'Caixa de Oportunidade',
            currency: 'BRL',
            market: 'CASH',
            isBalanceOnly: true,
            isOpportunityCash: true,
            targetPercentage: 5,
            createdAt: now,
            updatedAt: now,
          };
        }

        const isOutflow = movement.type === 'BUY' || movement.type === 'FEE_OR_TAX';

        // Reconciliação prévia: se detectar divergência entre ledger e portfolio_cash_balances, bloqueia a operação
        const rec = reconcileCashBalance(
          cashAsset.id,
          current.movements || [],
          current.cashBalances?.[cashAsset.id] || null
        );
        if (rec.isDivergent && rec.persistedBalance !== null) {
          throw new Error(
            `Operação com Caixa bloqueada: Divergência detectada entre o livro-razão (R$ ${rec.ledgerBalance.toFixed(2)}) e o controle transacional (R$ ${rec.persistedBalance.toFixed(2)}). Reconcilie o caixa antes de continuar.`
          );
        }

        // Validação de saldo: impede que compra ou taxa com PORTFOLIO_CASH gaste valor maior que o saldo atual
        if (isOutflow) {
          const cashPos = positions.find((p) => p.assetId === cashAsset!.id);
          const availableCash = cashPos?.currentValueBRL ?? 0;
          if (movement.netAmountBRL > availableCash) {
            throw new Error(
              `Saldo insuficiente no caixa (${cashAsset.name}). Saldo disponível: R$ ${availableCash.toFixed(2)}. Valor da operação: R$ ${movement.netAmountBRL.toFixed(2)}.`
            );
          }
        }

        const targetAsset = current.assets.find((a) => a.id === movement.assetId);
        const tickerLabel = targetAsset?.ticker || 'Ativo';
        const now = new Date().toISOString();

        counterpartMovement = {
          id: `mov_cash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          userId: activeUserId,
          assetId: cashAsset.id,
          type: isOutflow ? 'SELL' : (movement.type === 'SELL' ? 'BUY' : 'INTEREST'),
          date: movement.date,
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: movement.netAmountBRL,
          netAmount: movement.netAmountBRL,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: movement.netAmountBRL,
          hasKnownCost: false,
          status: 'ACTIVE',
          counterpartMovementId: movement.id,
          notes: isOutflow
            ? `Débito automático para compra de ${tickerLabel}`
            : `Crédito automático referente a ${tickerLabel}`,
          createdAt: now,
          updatedAt: now,
        };
        movement.counterpartMovementId = counterpartMovement.id;
      }

      let saveResult: { updatedCashBalance?: PortfolioCashBalance } | undefined = undefined;
      if (!isDemo && userId) {
        const isCashAssetDirect =
          !counterpartMovement &&
          current.assets.some(
            (a) =>
              a.id === movement.assetId &&
              (a.isOpportunityCash ||
                a.category === 'Caixa de Oportunidade' ||
                a.category === 'Caixa' ||
                a.market === 'CASH')
          );

        const targetCashId = counterpartMovement
          ? counterpartMovement.assetId
          : (isCashAssetDirect ? movement.assetId : undefined);
        const currentLedgerBal = targetCashId
          ? calculateLedgerCashBalance(current.movements, targetCashId)
          : undefined;

        saveResult = await portfolioService.savePortfolioMovement(userId, movement, {
          cashAsset: cashAsset && !current.assets.some((a) => a.id === cashAsset!.id) ? cashAsset : undefined,
          counterpartMovement,
          currentLedgerBalance: currentLedgerBal,
          isCashAssetDirect,
        });
      }

      return {
        movement,
        cashAsset,
        counterpartMovement,
        updatedCashBalance: saveResult?.updatedCashBalance,
      };
    },
    onSuccess: ({ movement, cashAsset, counterpartMovement, updatedCashBalance }) => {
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      let nextAssets = current.assets || [];
      if (cashAsset && !nextAssets.some((a) => a.id === cashAsset.id)) {
        nextAssets = [...nextAssets, cashAsset];
      }

      const filtered = (current.movements || []).filter((m) => m.id !== movement.id);
      const toAppend = [movement];
      if (counterpartMovement) {
        toAppend.push(counterpartMovement);
      }
      const nextMovements = [...filtered, ...toAppend].sort((a, b) => a.date.localeCompare(b.date));

      let nextBalances = current.cashBalances || {};
      if (updatedCashBalance) {
        nextBalances = { ...nextBalances, [updatedCashBalance.cashAssetId]: updatedCashBalance };
      }

      const nextData: PortfolioUserData = {
        ...current,
        assets: nextAssets,
        movements: nextMovements,
        cashBalances: nextBalances,
      };
      if (isDemo) writeDemoState(nextData);
      queryClient.setQueryData(queryKey, nextData);
    },
  });

  const voidMovementMutation = useMutation({
    mutationFn: async ({ movementId, reason }: { movementId: string; reason: string }) => {
      const target = currentData.movements.find((m) => m.id === movementId);
      if (!target) return null;

      // Localiza a perna de contrapartida vinculada, se houver
      let counterpart: PortfolioMovement | undefined = undefined;
      if (target.counterpartMovementId) {
        counterpart = currentData.movements.find(
          (m) => m.id === target.counterpartMovementId && m.status === 'ACTIVE'
        );
      }

      const isTargetCash = currentData.assets.some(
        (a) => a.id === target.assetId && (a.isOpportunityCash || a.market === 'CASH')
      );
      const cashAssetId = counterpart ? counterpart.assetId : (isTargetCash ? target.assetId : undefined);

      if (cashAssetId) {
        const rec = reconcileCashBalance(
          cashAssetId,
          currentData.movements || [],
          currentData.cashBalances?.[cashAssetId] || null
        );
        if (rec.isDivergent && rec.persistedBalance !== null) {
          throw new Error(
            `Estorno bloqueado: Divergência detectada no Caixa de Oportunidade entre o livro-razão (R$ ${rec.ledgerBalance.toFixed(2)}) e o controle transacional (R$ ${rec.persistedBalance.toFixed(2)}). Reconcilie o caixa antes de estornar.`
          );
        }
      }

      const currentLedgerBalance = cashAssetId
        ? calculateLedgerCashBalance(currentData.movements || [], cashAssetId)
        : undefined;

      let voidResult: { updatedCashBalance?: PortfolioCashBalance } | undefined = undefined;
      if (!isDemo && userId) {
        voidResult = await portfolioService.voidPortfolioMovement(userId, target, reason, counterpart, {
          cashAssetId,
          currentLedgerBalance,
        });
      }
      return {
        movementId,
        reason,
        target,
        counterpart,
        updatedCashBalance: voidResult?.updatedCashBalance,
      };
    },
    onSuccess: (payload) => {
      if (!payload) return;
      const { movementId, reason, target, counterpart, updatedCashBalance } = payload;
      const now = new Date().toISOString();
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      const voidedIds = new Set<string>([movementId]);
      if (counterpart) voidedIds.add(counterpart.id);

      const nextMovements = (current.movements || []).map((m) => {
        if (!voidedIds.has(m.id)) return m;
        const isOriginalTarget = m.id === movementId;
        const prevSnapshot = isOriginalTarget ? target.status : counterpart?.status;
        const revReason = isOriginalTarget ? reason : `Estorno vinculado: ${reason}`;

        return {
          ...m,
          status: 'VOIDED' as const,
          updatedAt: now,
          revisions: [
            ...(m.revisions || []),
            { editedAt: now, previousSnapshot: { status: prevSnapshot || 'ACTIVE' }, reason: revReason },
          ],
        };
      });

      let nextBalances = current.cashBalances || {};
      if (updatedCashBalance) {
        nextBalances = { ...nextBalances, [updatedCashBalance.cashAssetId]: updatedCashBalance };
      }

      const nextData: PortfolioUserData = {
        ...current,
        movements: nextMovements,
        cashBalances: nextBalances,
      };
      if (isDemo) writeDemoState(nextData);
      queryClient.setQueryData(queryKey, nextData);
    },
  });

  const importBatchMutation = useMutation({
    mutationFn: async ({
      newAssets,
      newMovements,
    }: {
      newAssets: PortfolioAsset[];
      newMovements: PortfolioMovement[];
    }) => {
      if (!isDemo && userId) {
        await portfolioService.importMovementsBatch(userId, newAssets, newMovements);
      }
      return { newAssets, newMovements };
    },
    onSuccess: ({ newAssets, newMovements }) => {
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      const assetMap = new Map((current.assets || []).map((a) => [a.id, a]));
      newAssets.forEach((a) => assetMap.set(a.id, a));

      const movMap = new Map((current.movements || []).map((m) => [m.id, m]));
      newMovements.forEach((m) => movMap.set(m.id, m));

      const mergedAssets = Array.from(assetMap.values());
      const mergedMovements = Array.from(movMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      const nextData: PortfolioUserData = {
        ...current,
        assets: mergedAssets,
        movements: mergedMovements,
      };

      if (isDemo) writeDemoState(nextData);
      queryClient.setQueryData(queryKey, nextData);
    },
  });

  const resetPortfolioMutation = useMutation({
    mutationFn: async () => {
      if (!isDemo && userId) {
        const cashAssetIds = (currentData.assets || [])
          .filter(
            (a) =>
              a.isOpportunityCash ||
              a.category === 'Caixa de Oportunidade' ||
              a.category === 'Caixa' ||
              a.market === 'CASH'
          )
          .map((a) => a.id);
        await portfolioService.clearAllPortfolioData(
          userId,
          currentData.assets,
          currentData.movements,
          cashAssetIds
        );
      }
    },
    onSuccess: () => {
      const nextData: PortfolioUserData = {
        classes: portfolioService.DEFAULT_PORTFOLIO_CLASSES,
        assets: [],
        movements: [],
        cashBalances: {},
      };
      if (isDemo) writeDemoState(nextData);
      queryClient.setQueryData(queryKey, nextData);
    },
  });

  const isSaving =
    saveClassMutation.isPending ||
    saveAllClassesMutation.isPending ||
    saveAssetMutation.isPending ||
    deleteAssetMutation.isPending ||
    addMovementMutation.isPending ||
    voidMovementMutation.isPending ||
    importBatchMutation.isPending ||
    resetPortfolioMutation.isPending;

  return {
    classes: currentData.classes,
    assets: currentData.assets,
    movements: currentData.movements,
    positions,
    summary,
    cashBalances: currentData.cashBalances || {},
    cashReconciliations,
    hasCashDivergence,
    isLoading,
    isSaving,
    error: error || null,
    // Cotações e Métricas (Etapa 3)
    quotesMap,
    quoteMetaMap,
    refreshQuotes,
    isRefreshingQuotes,
    lastQuotesUpdate,
    institutionalMetrics,
    // IRPF e Nexus Copilot (Etapa 4)
    taxSummary,
    nexusInsights,
    reconcileCash: (cashAssetId: string) =>
      reconcileCashBalance(
        cashAssetId,
        currentData.movements,
        currentData.cashBalances?.[cashAssetId]
      ),
    syncCashBalance: async (cashAssetId: string) => {
      if (!userId || isDemo) return;
      const res = await portfolioService.reconcileAndSyncCashBalance(
        userId,
        cashAssetId,
        currentData.movements,
        true
      );
      const current = queryClient.getQueryData<PortfolioUserData>(queryKey) || currentData;
      const nextData: PortfolioUserData = {
        ...current,
        cashBalances: { ...(current.cashBalances || {}), [cashAssetId]: res.balanceDoc },
      };
      queryClient.setQueryData(queryKey, nextData);
    },
    saveClass: async (c) => { await saveClassMutation.mutateAsync(c); },
    saveAllClasses: async (classes) => { await saveAllClassesMutation.mutateAsync(classes); },
    saveAsset: async (a) => { await saveAssetMutation.mutateAsync(a); },
    saveAllAssets: async (assets) => { await saveAllAssetsMutation.mutateAsync(assets); },
    deleteAsset: async (id) => { await deleteAssetMutation.mutateAsync(id); },
    addMovement: async (m) => { await addMovementMutation.mutateAsync(m); },
    voidMovement: async (id, reason) => { await voidMovementMutation.mutateAsync({ movementId: id, reason: reason || 'Estorno' }); },
    importBatch: async (newAssets, newMovements) => { await importBatchMutation.mutateAsync({ newAssets, newMovements }); },
    resetPortfolio: async () => { await resetPortfolioMutation.mutateAsync(); },
  };
}
