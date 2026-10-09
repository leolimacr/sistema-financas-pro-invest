/**
 * Motor Puro de Simulação de Aportes e Rebalanceamento de Carteira
 * Finanças Pro Invest
 *
 * Função estritamente determinística e de simulação:
 * - Não efetua gravações no Firestore
 * - Não envia ordens a corretoras
 * - Não altera movimentações existentes
 */

import type { QuoteMarket } from './portfolioTypes';
import { validateTargetSum } from './portfolioValidators';

export interface RebalanceAssetInput {
  assetId: string;
  ticker: string;
  name: string;
  category: string;
  market: QuoteMarket;
  currency: 'BRL' | 'USD' | 'EUR';
  currentPriceBRL: number;
  currentQuantity: number | null;  // Null se for ativo puramente em saldo (ex: CDB sem cotas ou Conta Caixa)
  currentValueBRL: number;
  targetPercentage: number;       // Ex: 10.0 para 10%
  allowFractional?: boolean;       // True para criptomoedas ou fundos que aceitam frações; False para Ações/FIIs
  minLotSize?: number;             // Ex: 1 cota para FIIs e fracionário B3, 100 para lote padrão
  minContributionBRL?: number;     // Valor mínimo opcional para justificar aporte no ativo
  isQuoteStaleOrMissing?: boolean; // True se cotação for <= 0, desatualizada ou desconhecida
  isBalanceOnly?: boolean;         // True para ativos estritamente em saldo monetário
}

export interface RebalanceSimulationOptions {
  contributionAmountBRL: number;   // Valor do novo aporte em R$
  availablePortfolioCashBRL?: number; // Saldo de caixa interno da carteira em R$
  useAvailableCash?: boolean;      // Se true, soma availablePortfolioCashBRL ao aporte
  lockedAssetIds?: string[];       // IDs de ativos travados pelo usuário (não recebem compras)
  includeCashInTargets?: boolean;  // Se true, o caixa entra no denominador de metas
}

export interface RebalanceSuggestionOrder {
  assetId: string;
  ticker: string;
  name: string;
  category: string;
  currentPriceBRL: number;
  targetPercentage: number;
  currentPercentage: number;
  projectedPercentage: number;
  currentValueBRL: number;
  suggestedBuyQuantity: number | null; // Null para ativos puramente em saldo financeiro
  suggestedAmountBRL: number;
  projectedValueBRL: number;
  status: 'RECOMMENDED' | 'LOCKED' | 'SKIPPED_STALE_QUOTE' | 'SKIPPED_BELOW_MINIMUM' | 'ON_OR_ABOVE_TARGET';
  skipReason?: string;
}

export interface RebalanceSimulationResult {
  canRebalance: boolean;
  blockReason?: string;
  totalAvailableBRL: number;       // contributionAmountBRL + (useCash ? cash : 0)
  totalAllocatedBRL: number;       // Soma dos valores sugeridos para compra
  unallocatedCashBRL: number;      // Saldo restante não alocado (resíduo de cotas inteiras)
  portfolioBeforeTotalBRL: number;
  portfolioProjectedTotalBRL: number;
  orders: RebalanceSuggestionOrder[];
}

/**
 * Simula a distribuição de um novo aporte entre os ativos mais descontados em relação à meta
 * Aplica lógica "Comprar apenas o que está para trás" (sem vender ativos com excesso)
 */
export function simulateRebalanceContribution(
  assets: RebalanceAssetInput[],
  options: RebalanceSimulationOptions
): RebalanceSimulationResult {
  const {
    contributionAmountBRL,
    availablePortfolioCashBRL = 0,
    useAvailableCash = false,
    lockedAssetIds = [],
  } = options;

  // 1. Validação do montante de aporte
  if (contributionAmountBRL < 0 || availablePortfolioCashBRL < 0) {
    return {
      canRebalance: false,
      blockReason: 'Os valores de aporte e saldo de caixa devem ser maiores ou iguais a zero.',
      totalAvailableBRL: 0,
      totalAllocatedBRL: 0,
      unallocatedCashBRL: 0,
      portfolioBeforeTotalBRL: 0,
      portfolioProjectedTotalBRL: 0,
      orders: [],
    };
  }

  const totalAvailableBRL = Number(
    (contributionAmountBRL + (useAvailableCash ? availablePortfolioCashBRL : 0)).toFixed(2)
  );

  // 2. Validação da soma de metas dos ativos (precisão de 4 casas decimais)
  const targets = assets.map((a) => a.targetPercentage);
  const targetCheck = validateTargetSum(targets);

  if (!targetCheck.isValid) {
    const signal = targetCheck.discrepancy > 0 ? `+${targetCheck.discrepancy}%` : `${targetCheck.discrepancy}%`;
    return {
      canRebalance: false,
      blockReason: `A soma das metas percentuais é ${targetCheck.sum}% (${signal} em relação a 100%). Ajuste as metas antes de simular o rebalanceamento.`,
      totalAvailableBRL,
      totalAllocatedBRL: 0,
      unallocatedCashBRL: totalAvailableBRL,
      portfolioBeforeTotalBRL: assets.reduce((sum, a) => sum + a.currentValueBRL, 0),
      portfolioProjectedTotalBRL: assets.reduce((sum, a) => sum + a.currentValueBRL, 0),
      orders: [],
    };
  }

  if (totalAvailableBRL <= 0) {
    return {
      canRebalance: false,
      blockReason: 'O valor disponível para aporte deve ser maior que zero.',
      totalAvailableBRL: 0,
      totalAllocatedBRL: 0,
      unallocatedCashBRL: 0,
      portfolioBeforeTotalBRL: assets.reduce((sum, a) => sum + a.currentValueBRL, 0),
      portfolioProjectedTotalBRL: assets.reduce((sum, a) => sum + a.currentValueBRL, 0),
      orders: [],
    };
  }

  const currentTotalInvestedBRL = assets.reduce((sum, a) => sum + a.currentValueBRL, 0);
  const projectedTotalBRL = currentTotalInvestedBRL + totalAvailableBRL;

  const lockedSet = new Set(lockedAssetIds);

  // 3. Primeira passagem: identifica o déficit financeiro ideal de cada ativo frente ao patrimônio projetado
  // deficit_ideal = (projectedTotal * target%) - currentValue
  interface Candidate {
    asset: RebalanceAssetInput;
    idealDeficitBRL: number;
    allocatedBRL: number;
    allocatedQuantity: number | null;
    status: RebalanceSuggestionOrder['status'];
    skipReason?: string;
  }

  const candidates: Candidate[] = assets.map((asset) => {
    const isBalanceOnly = Boolean(asset.isBalanceOnly || asset.currentQuantity === null);
    const effectivePrice = isBalanceOnly ? (asset.currentPriceBRL > 0 ? asset.currentPriceBRL : 1.0) : asset.currentPriceBRL;

    // Ativo travado pelo usuário
    if (lockedSet.has(asset.assetId)) {
      return {
        asset,
        idealDeficitBRL: 0,
        allocatedBRL: 0,
        allocatedQuantity: isBalanceOnly ? null : 0,
        status: 'LOCKED',
        skipReason: 'Ativo travado manualmente pelo investidor para não receber aportes.',
      };
    }

    // Ativo com cotação zerada, ausente ou desatualizada (não se aplica a saldo puro)
    if (!isBalanceOnly && (asset.isQuoteStaleOrMissing || effectivePrice <= 0)) {
      return {
        asset,
        idealDeficitBRL: 0,
        allocatedBRL: 0,
        allocatedQuantity: 0,
        status: 'SKIPPED_STALE_QUOTE',
        skipReason: 'Cotação ausente, nula ou desatualizada. Aporte suspenso por segurança.',
      };
    }

    const idealTargetValueBRL = (asset.targetPercentage / 100) * projectedTotalBRL;
    const idealDeficitBRL = idealTargetValueBRL - asset.currentValueBRL;

    if (idealDeficitBRL <= 0.01) {
      return {
        asset,
        idealDeficitBRL: 0,
        allocatedBRL: 0,
        allocatedQuantity: isBalanceOnly ? null : 0,
        status: 'ON_OR_ABOVE_TARGET',
        skipReason: 'Ativo já se encontra na meta ou acima dela.',
      };
    }

    return {
      asset,
      idealDeficitBRL,
      allocatedBRL: 0,
      allocatedQuantity: isBalanceOnly ? null : 0,
      status: 'RECOMMENDED',
    };
  });

  // 4. Distribuição iterativa do capital disponível entre os ativos recomendados
  // Ordena prioritariamente pelo maior déficit absoluto em R$
  let remainingCash = totalAvailableBRL;
  const eligibleCandidates = candidates.filter((c) => c.status === 'RECOMMENDED' && c.idealDeficitBRL > 0);

  if (eligibleCandidates.length === 0) {
    // Todos os ativos já estão na meta ou travados
    return {
      canRebalance: true,
      totalAvailableBRL,
      totalAllocatedBRL: 0,
      unallocatedCashBRL: totalAvailableBRL,
      portfolioBeforeTotalBRL: Number(currentTotalInvestedBRL.toFixed(2)),
      portfolioProjectedTotalBRL: Number(currentTotalInvestedBRL.toFixed(2)),
      orders: candidates.map((c) => createOrder(c, currentTotalInvestedBRL, currentTotalInvestedBRL)),
    };
  }

  // Abordagem proporcional contínua inicial com quantização respeitando cotas inteiras / lotes
  const totalEligibleDeficit = eligibleCandidates.reduce((sum, c) => sum + c.idealDeficitBRL, 0);

  for (const candidate of eligibleCandidates) {
    const rawShareBRL = Math.min(
      candidate.idealDeficitBRL,
      (candidate.idealDeficitBRL / totalEligibleDeficit) * totalAvailableBRL
    );

    const isBalanceOnly = Boolean(candidate.asset.isBalanceOnly || candidate.asset.currentQuantity === null);
    const price = isBalanceOnly ? (candidate.asset.currentPriceBRL > 0 ? candidate.asset.currentPriceBRL : 1.0) : candidate.asset.currentPriceBRL;
    const isFractional = candidate.asset.allowFractional ?? (candidate.asset.market === 'CRYPTO');
    const lotSize = Math.max(1, candidate.asset.minLotSize || 1);

    let buyQty: number | null = 0;
    let buyAmount = 0;

    if (isBalanceOnly) {
      buyQty = null;
      buyAmount = Number(rawShareBRL.toFixed(2));
    } else if (isFractional) {
      buyQty = rawShareBRL / price;
      buyAmount = Number((buyQty * price).toFixed(2));
    } else {
      // Cotas inteiras respeitando lotes (ex: múltiplos de 1 ou múltiplos de 100)
      const rawLots = Math.floor(rawShareBRL / (price * lotSize));
      buyQty = rawLots * lotSize;
      buyAmount = Number((buyQty * price).toFixed(2));
    }

    // Validação de aporte mínimo por ativo se configurado
    if (candidate.asset.minContributionBRL && buyAmount > 0 && buyAmount < candidate.asset.minContributionBRL) {
      candidate.status = 'SKIPPED_BELOW_MINIMUM';
      candidate.skipReason = `Aporte calculado (R$ ${buyAmount.toFixed(2)}) abaixo do piso mínimo configurado (R$ ${candidate.asset.minContributionBRL.toFixed(2)}).`;
      candidate.allocatedBRL = 0;
      candidate.allocatedQuantity = isBalanceOnly ? null : 0;
    } else {
      candidate.allocatedQuantity = isBalanceOnly ? null : (isFractional && buyQty !== null ? Number(buyQty.toFixed(8)) : buyQty);
      candidate.allocatedBRL = buyAmount;
      remainingCash -= buyAmount;
    }
  }

  // 5. Segunda passagem gulosa: aloca o resíduo (troco) naqueles que ainda possuem déficit e cujo preço cabe no saldo
  let progressed = true;
  while (progressed && remainingCash > 0.01) {
    progressed = false;

    // Re-ordena pelo ativo com maior distância percentual remanescente da meta
    const stillNeeding = eligibleCandidates
      .filter((c) => c.status === 'RECOMMENDED')
      .map((c) => {
        const currentProjectedVal = c.asset.currentValueBRL + c.allocatedBRL;
        const targetVal = (c.asset.targetPercentage / 100) * projectedTotalBRL;
        const remainingDeficit = targetVal - currentProjectedVal;
        const isBal = Boolean(c.asset.isBalanceOnly || c.asset.currentQuantity === null);
        const effectiveP = isBal ? 1.0 : c.asset.currentPriceBRL;
        return { candidate: c, remainingDeficit, isBalanceOnly: isBal, effectivePrice: effectiveP };
      })
      .filter((item) => item.remainingDeficit > 0.01 && (item.isBalanceOnly || item.effectivePrice <= remainingCash))
      .sort((a, b) => b.remainingDeficit - a.remainingDeficit);

    for (const item of stillNeeding) {
      const c = item.candidate;
      if (item.isBalanceOnly) {
        const addAmount = Number(Math.min(item.remainingDeficit, remainingCash).toFixed(2));
        if (addAmount > 0.01) {
          c.allocatedQuantity = null;
          c.allocatedBRL = Number((c.allocatedBRL + addAmount).toFixed(2));
          remainingCash -= addAmount;
          progressed = true;
          break;
        }
      } else {
        const price = c.asset.currentPriceBRL;
        const isFractional = c.asset.allowFractional ?? (c.asset.market === 'CRYPTO');
        const lotSize = Math.max(1, c.asset.minLotSize || 1);
        const minStepCost = price * (isFractional ? 1 : lotSize);

        if (remainingCash >= minStepCost) {
          if (isFractional) {
            const addQty = Math.min(item.remainingDeficit, remainingCash) / price;
            const addAmount = Number((addQty * price).toFixed(2));
            if (addAmount > 0.01) {
              c.allocatedQuantity = Number(((c.allocatedQuantity || 0) + addQty).toFixed(8));
              c.allocatedBRL = Number((c.allocatedBRL + addAmount).toFixed(2));
              remainingCash -= addAmount;
              progressed = true;
            }
          } else {
            // Adiciona 1 lote
            c.allocatedQuantity = (c.allocatedQuantity || 0) + lotSize;
            c.allocatedBRL = Number((c.allocatedBRL + minStepCost).toFixed(2));
            remainingCash -= minStepCost;
            progressed = true;
            break; // Recalcula prioridades na próxima iteração do while
          }
        }
      }
    }
  }

  const totalAllocatedBRL = Number((totalAvailableBRL - remainingCash).toFixed(2));
  const unallocatedCashBRL = Number(Math.max(0, remainingCash).toFixed(2));
  const finalProjectedTotalBRL = Number((currentTotalInvestedBRL + totalAllocatedBRL).toFixed(2));

  const orders = candidates.map((c) => createOrder(c, currentTotalInvestedBRL, finalProjectedTotalBRL));

  return {
    canRebalance: true,
    totalAvailableBRL,
    totalAllocatedBRL,
    unallocatedCashBRL,
    portfolioBeforeTotalBRL: Number(currentTotalInvestedBRL.toFixed(2)),
    portfolioProjectedTotalBRL: finalProjectedTotalBRL,
    orders,
  };
}

function createOrder(
  candidate: {
    asset: RebalanceAssetInput;
    allocatedBRL: number;
    allocatedQuantity: number | null;
    status: RebalanceSuggestionOrder['status'];
    skipReason?: string;
  },
  beforeTotalBRL: number,
  projectedTotalBRL: number
): RebalanceSuggestionOrder {
  const { asset, allocatedBRL, allocatedQuantity, status, skipReason } = candidate;

  const currentPercentage = beforeTotalBRL > 0
    ? Number(((asset.currentValueBRL / beforeTotalBRL) * 100).toFixed(2))
    : 0;

  const projectedValueBRL = Number((asset.currentValueBRL + allocatedBRL).toFixed(2));

  const projectedPercentage = projectedTotalBRL > 0
    ? Number(((projectedValueBRL / projectedTotalBRL) * 100).toFixed(2))
    : 0;

  return {
    assetId: asset.assetId,
    ticker: asset.ticker,
    name: asset.name,
    category: asset.category,
    currentPriceBRL: asset.currentPriceBRL,
    targetPercentage: asset.targetPercentage,
    currentPercentage,
    projectedPercentage,
    currentValueBRL: asset.currentValueBRL,
    suggestedBuyQuantity: allocatedQuantity,
    suggestedAmountBRL: allocatedBRL,
    projectedValueBRL,
    status,
    skipReason,
  };
}
