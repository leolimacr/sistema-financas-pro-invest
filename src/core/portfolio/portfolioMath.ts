/**
 * Motor Matemático e Financeiro Puro da Carteira de Investimentos
 * Finanças Pro Invest
 */

import type {
  PortfolioMovement,
  DerivedAssetPosition,
  PortfolioAllocationSummary,
  PortfolioCategoryTarget,
  PortfolioCashBalance,
  CashReconciliationResult,
  CurrencyCode,
  QuoteMarket,
  FixedIncomeCertificate
} from './portfolioTypes';
import { validateTargetSum } from './portfolioValidators';
import {
  calculateFixedIncomeCurve,
  isFixedIncomeTaxExempt,
  FixedIncomeCurveResult,
  FixedIncomeIndexation,
} from './fixedIncomeMath';

/**
 * Ordena os lançamentos de forma determinística e respeita as regras de precedência temporal:
 * 1. Data do lançamento (YYYY-MM-DD)
 * 2. Em caso de mesma data: INITIAL_POSITION tem precedência absoluta como abertura de custódia
 * 3. Timestamp de criação (createdAt)
 * 4. Desempate estável por ID (garante determinismo 100% idêntico em qualquer runtime)
 */
export function sortPortfolioMovements(movements: PortfolioMovement[]): PortfolioMovement[] {
  return [...movements].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;

    // Mesma data: INITIAL_POSITION representa a custódia de abertura do dia
    if (a.type === 'INITIAL_POSITION' && b.type !== 'INITIAL_POSITION') return -1;
    if (b.type === 'INITIAL_POSITION' && a.type !== 'INITIAL_POSITION') return 1;

    const createdCmp = a.createdAt.localeCompare(b.createdAt);
    if (createdCmp !== 0) return createdCmp;

    return a.id.localeCompare(b.id);
  });
}

/**
 * Calcula um checksum determinístico FNV-1a dos lançamentos ativos ordenados
 */
export function computeLedgerChecksum(movements: PortfolioMovement[]): string {
  const activeSorted = sortPortfolioMovements(
    movements.filter((m) => m.status === 'ACTIVE')
  );

  const content = activeSorted
    .map((m) => `${m.id}:${m.date}:${m.type}:${m.quantity}:${m.netAmountBRL}:${m.updatedAt}`)
    .join('|');

  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Replay determinístico de todas as movimentações ativas de um ativo para apurar a posição atual
 */
export function replayAssetLedger(params: {
  assetId: string;
  ticker: string;
  name: string;
  category: string;
  currency: CurrencyCode;
  market: QuoteMarket;
  targetPercentage?: number;
  institution?: string;
  movements: PortfolioMovement[];
  currentPriceOriginal?: number | null;
  currentFxRateToBRL?: number;
  fixedIncomeIndexation?: FixedIncomeIndexation;
  fixedIncomeRatePercent?: number;
  fixedIncomeStartDate?: string;
  fixedIncomeMaturityDate?: string;
  fixedIncomeBenchmarkCdi?: number;
  fixedIncomeIsNetBalance?: boolean;
  fixedIncomeCertificates?: FixedIncomeCertificate[];
  todayISO?: string;
}): DerivedAssetPosition {
  const {
    assetId,
    ticker,
    name,
    category,
    currency,
    market,
    targetPercentage = 0,
    institution,
    movements,
    currentPriceOriginal = null,
    currentFxRateToBRL = 1.0,
    fixedIncomeIndexation,
    fixedIncomeRatePercent,
    fixedIncomeStartDate,
    fixedIncomeMaturityDate,
    fixedIncomeBenchmarkCdi,
    fixedIncomeIsNetBalance,
    fixedIncomeCertificates,
    todayISO,
  } = params;

  const activeMovements = sortPortfolioMovements(
    movements.filter((m) => m.status === 'ACTIVE' && m.assetId === assetId)
  );

  const initialMov = activeMovements.find((m) => m.type === 'INITIAL_POSITION');
  const effectiveIsNetBalance = fixedIncomeIsNetBalance ?? initialMov?.isNetBalance ?? false;

  let quantity = 0;
  let hasKnownCost = true;
  let hasKnownQuantity = true;
  let isBalanceOnly = false;
  let balanceAmountOriginal = 0;
  let avgCostOriginal: number | null = null;
  let avgCostBRL: number | null = null;
  let totalInvestedBRL: number | null = null;

  let realizedPnLOriginal = 0;
  let realizedPnLBRL = 0;
  let totalDividendsOriginal = 0;
  let totalDividendsBRL = 0;

  let hasIndeterminateIntradayOrder = false;
  const calculationWarnings: string[] = [];

  const EPSILON = 1e-9;

  // Verificação de ambiguidade intradiária entre operações com mesmo timestamp na mesma data
  for (let i = 0; i < activeMovements.length; i++) {
    for (let j = i + 1; j < activeMovements.length; j++) {
      const m1 = activeMovements[i];
      const m2 = activeMovements[j];
      if (m1.date !== m2.date) break; // ordenado por data

      if (
        m1.type !== 'INITIAL_POSITION' &&
        m2.type !== 'INITIAL_POSITION' &&
        m1.createdAt === m2.createdAt
      ) {
        const isTradeConflict = (m1.type === 'BUY' && m2.type === 'SELL') || (m1.type === 'SELL' && m2.type === 'BUY');
        const isSplitConflict = (m1.type === 'SPLIT_OR_BONUS' && (m2.type === 'BUY' || m2.type === 'SELL')) ||
                                (m2.type === 'SPLIT_OR_BONUS' && (m1.type === 'BUY' || m1.type === 'SELL'));

        if (isTradeConflict || isSplitConflict) {
          hasIndeterminateIntradayOrder = true;
          const warningKey = `INDETERMINATE_INTRADAY_ORDER:${m1.date}: Operações intradiárias concomitantes (${m1.type} e ${m2.type}) na data ${m1.date} com mesmo horário. A apuração de PM e PnL pode depender da ordem real de execução.`;
          if (!calculationWarnings.includes(warningKey)) {
            calculationWarnings.push(warningKey);
          }
        }
      }
    }
  }

  for (const mov of activeMovements) {
    switch (mov.type) {
      case 'INITIAL_POSITION': {
        if (mov.quantity === null || mov.hasKnownQuantity === false) {
          isBalanceOnly = true;
          hasKnownQuantity = false;
          hasKnownCost = false;
          avgCostOriginal = null;
          avgCostBRL = null;
          totalInvestedBRL = null;
          // Usa estritamente o campo financeiro validado sem fallback '||', preservando saldo zero
          const initialBalance = typeof mov.grossAmount === 'number' && Number.isFinite(mov.grossAmount)
            ? mov.grossAmount
            : (typeof mov.netAmount === 'number' && Number.isFinite(mov.netAmount) ? mov.netAmount : 0);
          balanceAmountOriginal += initialBalance;
        } else if (mov.hasKnownCost === false) {
          quantity += mov.quantity;
          hasKnownCost = false;
          avgCostOriginal = null;
          avgCostBRL = null;
          totalInvestedBRL = null;
        } else {
          quantity += mov.quantity;
          hasKnownCost = true;
          avgCostOriginal = mov.unitPrice;
          avgCostBRL = mov.unitPrice * mov.fxRateToBRL;
          totalInvestedBRL = quantity * avgCostBRL;
        }
        break;
      }

      case 'BUY': {
        if (isBalanceOnly && (mov.quantity === null || mov.hasKnownQuantity === false)) {
          balanceAmountOriginal += mov.netAmount;
        } else {
          const buyQty = mov.quantity ?? 0;
          const buyCostOriginal = mov.netAmount;
          const buyCostBRL = mov.netAmountBRL;

          if (quantity <= EPSILON) {
            // Posição estava zerada: inicia nova posição limpa com custo conhecido
            quantity = buyQty;
            hasKnownCost = true;
            hasKnownQuantity = true;
            isBalanceOnly = false;
            avgCostOriginal = buyQty > 0 ? buyCostOriginal / buyQty : 0;
            avgCostBRL = buyQty > 0 ? buyCostBRL / buyQty : 0;
            totalInvestedBRL = buyCostBRL;
          } else if (!hasKnownCost) {
            // Já existem cotas com custo inicial DESCONHECIDO.
            // Uma compra posterior aumenta a quantidade, mas o custo da posição inteira permanece DESCONHECIDO!
            quantity += buyQty;
            hasKnownQuantity = true;
            isBalanceOnly = false;
            hasKnownCost = false;
            avgCostOriginal = null;
            avgCostBRL = null;
            totalInvestedBRL = null;
          } else {
            // Posição com custo previamente conhecido: cálculo padrão de Preço Médio Ponderado
            const prevTotalOriginal: number = quantity * (avgCostOriginal ?? 0);
            const prevTotalBRL: number = quantity * (avgCostBRL ?? 0);
            const newQty = quantity + buyQty;

            avgCostOriginal = newQty > 0 ? (prevTotalOriginal + buyCostOriginal) / newQty : 0;
            avgCostBRL = newQty > 0 ? (prevTotalBRL + buyCostBRL) / newQty : 0;
            quantity = newQty;
            totalInvestedBRL = quantity * avgCostBRL;
          }
        }
        break;
      }

      case 'SELL': {
        if (isBalanceOnly && (mov.quantity === null || mov.hasKnownQuantity === false)) {
          balanceAmountOriginal = Math.max(0, balanceAmountOriginal - mov.netAmount);
        } else {
          const sellQty = mov.quantity ?? 0;

          // Sinaliza se a quantidade vendida supera a custódia disponível
          if (sellQty > quantity + EPSILON) {
            calculationWarnings.push(
              `INSUFFICIENT_POSITION_FOR_SALE:${mov.date}: Venda de ${sellQty} cotas quando a custódia disponível era de ${quantity.toFixed(4)} cotas. Quantidade ajustada para zero.`
            );
          }

          // Lucro/prejuízo realizado só é apurável se o custo for conhecido
          if (quantity > EPSILON && hasKnownCost && avgCostOriginal !== null && avgCostBRL !== null) {
            const effectiveSellQty = Math.min(sellQty, quantity);
            const soldCostOriginal = effectiveSellQty * avgCostOriginal;
            const soldCostBRL = effectiveSellQty * avgCostBRL;

            const pnlOriginal = mov.netAmount - soldCostOriginal;
            const pnlBRL = mov.netAmountBRL - soldCostBRL;

            realizedPnLOriginal += pnlOriginal;
            realizedPnLBRL += pnlBRL;
          }

          quantity -= sellQty;

          if (quantity <= EPSILON) {
            // Posição zerada: encerra custódia e limpa custo
            quantity = 0;
            avgCostOriginal = null;
            avgCostBRL = null;
            totalInvestedBRL = 0;
            hasKnownCost = true; // Zerado: novas compras começam com custo limpo
          } else if (hasKnownCost && avgCostBRL !== null) {
            totalInvestedBRL = quantity * avgCostBRL;
          } else {
            totalInvestedBRL = null;
          }
        }
        break;
      }

      case 'DIVIDEND':
      case 'INTEREST': {
        totalDividendsOriginal += mov.netAmount;
        totalDividendsBRL += mov.netAmountBRL;
        if (isBalanceOnly && mov.type === 'INTEREST') {
          balanceAmountOriginal += mov.netAmount;
        }
        break;
      }

      case 'SPLIT_OR_BONUS': {
        if (mov.quantity && mov.quantity > 0) {
          const prevQty = quantity;
          quantity = mov.quantity;
          if (hasKnownCost && totalInvestedBRL !== null && quantity > 0 && prevQty > 0) {
            avgCostBRL = totalInvestedBRL / quantity;
            if (avgCostOriginal !== null) {
              avgCostOriginal = avgCostOriginal * (prevQty / quantity);
            }
          } else if (!hasKnownCost) {
            avgCostOriginal = null;
            avgCostBRL = null;
            totalInvestedBRL = null;
          }
        }
        break;
      }

      case 'ADJUSTMENT': {
        if (isBalanceOnly && (mov.quantity === null || mov.hasKnownQuantity === false)) {
          balanceAmountOriginal = Math.max(0, mov.grossAmount || mov.netAmount || 0);
        } else {
          quantity = Math.max(0, mov.quantity ?? 0);
          if (quantity <= EPSILON) {
            quantity = 0;
            avgCostOriginal = null;
            avgCostBRL = null;
            totalInvestedBRL = 0;
            hasKnownCost = true;
          } else if (hasKnownCost && avgCostBRL !== null) {
            totalInvestedBRL = quantity * avgCostBRL;
          } else {
            avgCostOriginal = null;
            avgCostBRL = null;
            totalInvestedBRL = null;
          }
        }
        break;
      }

      case 'FEE_OR_TAX': {
        if (isBalanceOnly) {
          balanceAmountOriginal = Math.max(0, balanceAmountOriginal - mov.netAmount);
        } else if (hasKnownCost && avgCostBRL !== null && quantity > EPSILON) {
          totalInvestedBRL = (totalInvestedBRL || 0) + mov.netAmountBRL;
          avgCostBRL = totalInvestedBRL / quantity;
        }
        break;
      }

      default:
        break;
    }
  }

  // Cotações e Valores Atuais
  const effectiveFx = currency === 'BRL' ? 1.0 : currentFxRateToBRL;
  let hasValidQuote = currentPriceOriginal !== null && currentPriceOriginal !== undefined && currentPriceOriginal > 0;
  let resolvedPriceOriginal: number | null = currentPriceOriginal ?? null;
  let currentPriceBRL = hasValidQuote && resolvedPriceOriginal !== null ? (resolvedPriceOriginal * effectiveFx) : null;
  let currentValueOriginal: number | null = null;
  let currentValueBRL: number | null = null;

  // Marcação na Curva Automática para Renda Fixa (Anbima 252 dias úteis)
  let fixedIncomeDetails: FixedIncomeCurveResult | undefined = undefined;
  const isFixedIncomeEligible =
    (fixedIncomeIndexation && fixedIncomeRatePercent !== undefined && fixedIncomeRatePercent > 0) ||
    (market === 'RF' && fixedIncomeIndexation && fixedIncomeRatePercent !== undefined);

  if (isFixedIncomeEligible && fixedIncomeIndexation && fixedIncomeRatePercent !== undefined) {
    const principalBRL = isBalanceOnly
      ? balanceAmountOriginal * effectiveFx
      : (totalInvestedBRL !== null && totalInvestedBRL > 0
          ? totalInvestedBRL
          : (quantity > EPSILON && avgCostBRL !== null ? quantity * avgCostBRL : 0));

    if (principalBRL > 0) {
      const firstActiveDate = activeMovements[0]?.date;
      const startDate = fixedIncomeStartDate || firstActiveDate || new Date().toISOString().slice(0, 10);
      const currentDate = todayISO || new Date().toISOString().slice(0, 10);

      const curve = calculateFixedIncomeCurve({
        principalBRL,
        startDate,
        currentDate,
        maturityDate: fixedIncomeMaturityDate,
        indexation: fixedIncomeIndexation,
        ratePercent: fixedIncomeRatePercent,
        assetType: `${category} ${ticker} ${name}`,
        isTaxExempt: isFixedIncomeTaxExempt(category) || isFixedIncomeTaxExempt(ticker) || isFixedIncomeTaxExempt(name),
        benchmarkCdiAnnual: fixedIncomeBenchmarkCdi ?? 10.5,
      });

      fixedIncomeDetails = curve;

      // Se não há cotação de mercado externa explícita, a curva determina o valor atual e rendimento
      if (!hasValidQuote) {
        currentValueBRL = curve.grossValueBRL;
        currentValueOriginal = currentValueBRL / effectiveFx;
        if (isBalanceOnly) {
          balanceAmountOriginal = currentValueOriginal;
        } else if (quantity > EPSILON) {
          currentPriceBRL = currentValueBRL / quantity;
          resolvedPriceOriginal = currentPriceBRL / effectiveFx;
          hasValidQuote = true;
        }
      }
    }
  }

  if (currentValueBRL === null) {
    if (isBalanceOnly) {
      currentValueOriginal = balanceAmountOriginal;
      currentValueBRL = balanceAmountOriginal * effectiveFx;
    } else if (hasValidQuote && resolvedPriceOriginal !== null) {
      currentValueOriginal = quantity * resolvedPriceOriginal;
      currentValueBRL = currentValueOriginal * effectiveFx;
    } else {
      // Sem cotação real ou manual informada: NÃO calcula valor de mercado fictício!
      currentValueOriginal = null;
      currentValueBRL = null;
    }
  }

  // Ganhos Não Realizados
  let unrealizedPnLBRL: number | null = null;
  let unrealizedPnLPercent: number | null = null;
  let assetReturnPercentOriginal: number | null = null;
  let fxReturnPercent: number | null = null;

  if (fixedIncomeDetails && currentValueBRL !== null) {
    unrealizedPnLBRL = fixedIncomeDetails.grossYieldBRL;
    const baseCost = isBalanceOnly
      ? Math.max(0.01, balanceAmountOriginal * effectiveFx - fixedIncomeDetails.grossYieldBRL)
      : (totalInvestedBRL || (quantity * (avgCostBRL || 0)));
    unrealizedPnLPercent = baseCost > 0 ? (fixedIncomeDetails.grossYieldBRL / baseCost) * 100 : 0;
  } else if (
    !isBalanceOnly &&
    hasValidQuote &&
    currentValueBRL !== null &&
    currentPriceBRL !== null &&
    hasKnownCost &&
    quantity > EPSILON &&
    avgCostBRL !== null &&
    avgCostBRL > 0
  ) {
    unrealizedPnLBRL = currentValueBRL - (quantity * avgCostBRL);
    unrealizedPnLPercent = ((currentPriceBRL / avgCostBRL) - 1) * 100;

    if (currency !== 'BRL' && avgCostOriginal !== null && avgCostOriginal > 0 && resolvedPriceOriginal !== null) {
      assetReturnPercentOriginal = ((resolvedPriceOriginal / avgCostOriginal) - 1) * 100;
      const avgPurchaseFx = avgCostBRL / avgCostOriginal;
      if (avgPurchaseFx > 0) {
        fxReturnPercent = ((effectiveFx / avgPurchaseFx) - 1) * 100;
      }
    }
  }

  const lastMovement = activeMovements[activeMovements.length - 1];

  let netCurrentValueBRL: number | null = null;
  if (fixedIncomeDetails) {
    netCurrentValueBRL = fixedIncomeDetails.netValueBRL;
  } else if (currentValueBRL !== null) {
    netCurrentValueBRL = currentValueBRL;
  }

  return {
    assetId,
    ticker,
    name,
    category,
    currency,
    market,
    targetPercentage,
    quantity: isBalanceOnly ? null : Number(quantity.toFixed(8)),
    hasKnownQuantity,
    isBalanceOnly,
    hasKnownCost,
    avgCostOriginal: avgCostOriginal !== null ? Number(avgCostOriginal.toFixed(4)) : null,
    avgCostBRL: avgCostBRL !== null ? Number(avgCostBRL.toFixed(4)) : null,
    totalInvestedBRL: totalInvestedBRL !== null ? Number(totalInvestedBRL.toFixed(2)) : null,
    realizedPnLOriginal: Number(realizedPnLOriginal.toFixed(2)),
    realizedPnLBRL: Number(realizedPnLBRL.toFixed(2)),
    totalDividendsOriginal: Number(totalDividendsOriginal.toFixed(2)),
    totalDividendsBRL: Number(totalDividendsBRL.toFixed(2)),
    currentPriceOriginal: (hasValidQuote || (fixedIncomeDetails && !isBalanceOnly)) && resolvedPriceOriginal !== null ? Number(resolvedPriceOriginal.toFixed(4)) : null,
    currentFxRateToBRL: Number(effectiveFx.toFixed(4)),
    currentPriceBRL: (hasValidQuote || (fixedIncomeDetails && !isBalanceOnly)) && currentPriceBRL !== null ? Number(currentPriceBRL.toFixed(4)) : null,
    currentValueOriginal: currentValueOriginal !== null ? Number(currentValueOriginal.toFixed(2)) : null,
    currentValueBRL: currentValueBRL !== null ? Number(currentValueBRL.toFixed(2)) : null,
    hasMarketQuote: hasValidQuote || fixedIncomeDetails !== undefined,
    unrealizedPnLBRL: unrealizedPnLBRL !== null ? Number(unrealizedPnLBRL.toFixed(2)) : null,
    unrealizedPnLPercent: unrealizedPnLPercent !== null ? Number(unrealizedPnLPercent.toFixed(2)) : null,
    assetReturnPercentOriginal: assetReturnPercentOriginal !== null ? Number(assetReturnPercentOriginal.toFixed(2)) : null,
    fxReturnPercent: fxReturnPercent !== null ? Number(fxReturnPercent.toFixed(2)) : null,
    movementCount: activeMovements.length,
    ledgerChecksum: computeLedgerChecksum(activeMovements),
    lastMovementDate: lastMovement ? lastMovement.date : null,
    hasIndeterminateIntradayOrder: hasIndeterminateIntradayOrder || undefined,
    calculationWarnings: calculationWarnings.length > 0 ? calculationWarnings : undefined,
    institution: institution || undefined,
    fixedIncomeDetails,
    fixedIncomeIsNetBalance: effectiveIsNetBalance,
    netCurrentValueBRL: netCurrentValueBRL !== null ? Number(netCurrentValueBRL.toFixed(2)) : null,
    fixedIncomeCertificates,
  };
}

/**
 * Calcula o fluxo líquido externo de recursos (F_m) para uma determinada competência YYYY-MM
 * Exclui rigorosamente compras ou vendas pagas com Caixa Interno da Carteira (PORTFOLIO_CASH)
 */
export function calculateExternalNetInflow(
  movements: PortfolioMovement[],
  targetMonthKey: string
): number {
  let netInflowBRL = 0;

  for (const mov of movements) {
    if (mov.status !== 'ACTIVE') continue;
    if (!mov.date.startsWith(targetMonthKey)) continue;

    if (mov.type === 'EXTERNAL_DEPOSIT') {
      netInflowBRL += mov.netAmountBRL;
    } else if (mov.type === 'EXTERNAL_WITHDRAWAL') {
      netInflowBRL -= mov.netAmountBRL;
    } else if (mov.type === 'BUY' && mov.fundingSource === 'EXTERNAL_NEW_MONEY') {
      netInflowBRL += mov.netAmountBRL;
    } else if (mov.type === 'SELL' && mov.settlementTarget === 'EXTERNAL_OUTSIDE') {
      netInflowBRL -= mov.netAmountBRL;
    }
    // NOTA: Se mov.fundingSource === 'PORTFOLIO_CASH' ou settlementTarget === 'PORTFOLIO_CASH', F_m = 0.
  }

  return Number(netInflowBRL.toFixed(2));
}

/**
 * Calcula a variação orgânica mensal descontando aportes e retiradas líquidas externas
 */
export function calculateMonthlyOrganicGrowth(
  openingValueBRL: number,
  closingValueBRL: number,
  netInflowBRL: number
): number {
  return Number(((closingValueBRL - openingValueBRL) - netInflowBRL).toFixed(2));
}

/**
 * Retorno percentual ponderado pelo tempo e dinheiro (Modified Dietz) para um mês
 */
export function calculateModifiedDietzReturn(
  openingValueBRL: number,
  closingValueBRL: number,
  dailyExternalFlows: Array<{ day: number; amountBRL: number }>,
  daysInMonth: number
): number | null {
  if (daysInMonth <= 0 || openingValueBRL < 0) return null;

  let totalFlows = 0;
  let weightedFlows = 0;

  for (const flow of dailyExternalFlows) {
    totalFlows += flow.amountBRL;
    const weight = Math.max(0, (daysInMonth - flow.day) / daysInMonth);
    weightedFlows += flow.amountBRL * weight;
  }

  const denominator = openingValueBRL + weightedFlows;
  if (denominator <= 0) return null;

  const gain = (closingValueBRL - openingValueBRL) - totalFlows;
  return Number(((gain / denominator) * 100).toFixed(2));
}

/**
 * Decomposição formal entre retorno do ativo e efeito cambial
 */
export function calculateFxAndAssetReturnDecomposition(
  avgCostOriginal: number,
  currentPriceOriginal: number,
  avgFxRate: number,
  currentFxRate: number
): { assetReturnPercent: number; fxReturnPercent: number; totalReturnPercentBRL: number } {
  if (avgCostOriginal <= 0 || avgFxRate <= 0) {
    return { assetReturnPercent: 0, fxReturnPercent: 0, totalReturnPercentBRL: 0 };
  }

  const rAsset = (currentPriceOriginal / avgCostOriginal) - 1;
  const rFx = (currentFxRate / avgFxRate) - 1;
  const rTotalBRL = ((1 + rAsset) * (1 + rFx)) - 1;

  return {
    assetReturnPercent: Number((rAsset * 100).toFixed(2)),
    fxReturnPercent: Number((rFx * 100).toFixed(2)),
    totalReturnPercentBRL: Number((rTotalBRL * 100).toFixed(2)),
  };
}

/**
 * Consolidação e Raio-X de Alocação por Classe e Ativo com Denominador Explícito
 */
export function computePortfolioAllocation(
  assets: DerivedAssetPosition[],
  cashAssets: DerivedAssetPosition[],
  includeCashInTargets: boolean
): PortfolioAllocationSummary {
  // Para cada ativo: se possui valor de mercado (currentValueBRL), usa mercado;
  // se não possui cotação, usa o custo conhecido (totalInvestedBRL) para representar o capital alocado;
  // para balanceOnly, usa currentValueBRL (saldo em conta)
  const getAssetHoldingValue = (a: DerivedAssetPosition): number => {
    if (a.isBalanceOnly) return a.currentValueBRL ?? 0;
    if (a.currentValueBRL !== null) return a.currentValueBRL;
    if (a.totalInvestedBRL !== null) return a.totalInvestedBRL;
    return 0;
  };

  const totalInvestedAssetsBRL = assets.reduce((sum, a) => sum + getAssetHoldingValue(a), 0);
  const totalPortfolioCashBRL = cashAssets.reduce((sum, a) => sum + (a.currentValueBRL ?? 0), 0);
  const consolidatedTotalBRL = totalInvestedAssetsBRL + totalPortfolioCashBRL;

  const denominatorUsedBRL = includeCashInTargets ? consolidatedTotalBRL : totalInvestedAssetsBRL;

  const allApplicableAssets = includeCashInTargets ? [...assets, ...cashAssets] : assets;

  // Agrupa por categoria
  const categoryMap = new Map<string, { targetSum: number; valueSum: number }>();

  for (const asset of allApplicableAssets) {
    const existing = categoryMap.get(asset.category) || { targetSum: 0, valueSum: 0 };
    existing.targetSum += asset.targetPercentage;
    existing.valueSum += getAssetHoldingValue(asset);
    categoryMap.set(asset.category, existing);
  }

  const categories: PortfolioCategoryTarget[] = Array.from(categoryMap.entries()).map(
    ([category, data]) => {
      const currentPercentage = denominatorUsedBRL > 0
        ? Number(((data.valueSum / denominatorUsedBRL) * 100).toFixed(2))
        : 0;
      const targetValueBRL = denominatorUsedBRL > 0
        ? (data.targetSum / 100) * denominatorUsedBRL
        : 0;
      const differenceBRL = Number((data.valueSum - targetValueBRL).toFixed(2));
      const allocationRatio = data.targetSum > 0
        ? Number((currentPercentage / data.targetSum).toFixed(4))
        : (data.valueSum > 0 ? 999.0 : 1.0);

      return {
        category,
        targetPercentage: Number(data.targetSum.toFixed(2)),
        currentValueBRL: Number(data.valueSum.toFixed(2)),
        currentPercentage,
        differenceBRL,
        allocationRatio,
      };
    }
  );

  const targets = allApplicableAssets.map((a) => a.targetPercentage);
  const targetValidation = validateTargetSum(targets);

  return {
    totalInvestedAssetsBRL: Number(totalInvestedAssetsBRL.toFixed(2)),
    totalPortfolioCashBRL: Number(totalPortfolioCashBRL.toFixed(2)),
    consolidatedTotalBRL: Number(consolidatedTotalBRL.toFixed(2)),
    denominatorUsedBRL: Number(denominatorUsedBRL.toFixed(2)),
    includeCashInTargets,
    sumTargetsPercentage: targetValidation.sum,
    isTargetSumValid: targetValidation.isValid,
    targetDiscrepancyPercent: targetValidation.discrepancy,
    categories,
    assets: allApplicableAssets,
  };
}

/**
 * Calcula o saldo derivado estritamente a partir das movimentações ativas do livro-razão para um ativo de caixa
 */
export function calculateLedgerCashBalance(
  movements: PortfolioMovement[],
  cashAssetId: string
): number {
  const activeMovements = sortPortfolioMovements(
    movements.filter((m) => m.assetId === cashAssetId && m.status === 'ACTIVE')
  );

  let balance = 0;
  for (const mov of activeMovements) {
    switch (mov.type) {
      case 'INITIAL_POSITION': {
        const val =
          typeof mov.grossAmount === 'number' && Number.isFinite(mov.grossAmount)
            ? mov.grossAmount
            : (typeof mov.netAmount === 'number' && Number.isFinite(mov.netAmount) ? mov.netAmount : 0);
        balance += val;
        break;
      }
      case 'EXTERNAL_DEPOSIT':
      case 'BUY': // No ativo de caixa, BUY representa entrada/crédito (contrapartida de venda ou aporte)
      case 'INTEREST':
      case 'DIVIDEND':
        balance += mov.netAmountBRL;
        break;

      case 'EXTERNAL_WITHDRAWAL':
      case 'SELL': // No ativo de caixa, SELL representa saída/débito (contrapartida de compra ou saque)
      case 'FEE_OR_TAX':
        balance -= mov.netAmountBRL;
        break;

      case 'ADJUSTMENT':
        balance = Math.max(0, mov.grossAmount || mov.netAmountBRL || 0);
        break;

      default:
        break;
    }
  }

  return Number(balance.toFixed(2));
}

/**
 * Reconciliador Soberano: Compara o saldo persistido de controle transacional
 * com o saldo apurado pelo livro-razão auditável.
 * Sinaliza qualquer divergência com precisão sem mascarar ou alterar silenciosamente.
 */
export function reconcileCashBalance(
  cashAssetId: string,
  movements: PortfolioMovement[],
  persistedBalance?: PortfolioCashBalance | null
): CashReconciliationResult {
  const cashMovements = movements.filter((m) => m.assetId === cashAssetId);
  const activeMovements = cashMovements.filter((m) => m.status === 'ACTIVE');
  const voidedMovements = cashMovements.filter((m) => m.status === 'VOIDED');

  const ledgerBalance = calculateLedgerCashBalance(movements, cashAssetId);

  if (!persistedBalance) {
    return {
      cashAssetId,
      isDivergent: true,
      persistedBalance: null,
      ledgerBalance,
      difference: ledgerBalance,
      activeMovementCount: activeMovements.length,
      voidedMovementCount: voidedMovements.length,
    };
  }

  const persistedVal = Number(persistedBalance.availableBalanceBRL.toFixed(2));
  const difference = Number((persistedVal - ledgerBalance).toFixed(2));
  const isDivergent = Math.abs(difference) > 0.005;

  return {
    cashAssetId,
    isDivergent,
    persistedBalance: persistedVal,
    ledgerBalance,
    difference,
    activeMovementCount: activeMovements.length,
    voidedMovementCount: voidedMovements.length,
  };
}
