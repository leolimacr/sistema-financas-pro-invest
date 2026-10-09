/**
 * Validadores Puros de Dados e Negócio para o Módulo de Carteira
 * Finanças Pro Invest
 */

import type { 
  MovementType, 
  CurrencyCode, 
  FundingSource, 
  SettlementTarget,
  QuoteMarket
} from './portfolioTypes';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function validateMovementInput(data: {
  assetId?: string;
  type?: MovementType;
  date?: string;
  quantity?: number | null;
  unitPrice?: number;
  fees?: number;
  grossAmount?: number;
  currency?: CurrencyCode;
  fxRateToBRL?: number;
  fundingSource?: FundingSource;
  settlementTarget?: SettlementTarget;
  cashAssetId?: string;
  hasKnownQuantity?: boolean;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.assetId || data.assetId.trim().length === 0) {
    errors.push('O identificador do ativo (assetId) é obrigatório.');
  }

  if (!data.type) {
    errors.push('O tipo de movimentação é obrigatório.');
  }

  if (!data.date || !DATE_REGEX.test(data.date)) {
    errors.push('A data da movimentação é obrigatória e deve estar no formato YYYY-MM-DD.');
  }

  // Validação de quantidade vs saldo financeiro
  if (data.type === 'INITIAL_POSITION' && data.quantity === null) {
    // Posição inicial baseada estritamente em saldo monetário: exige grossAmount explicitamente
    if (typeof data.grossAmount !== 'number' || !Number.isFinite(data.grossAmount) || data.grossAmount < 0) {
      errors.push('Para posições iniciais baseadas em saldo sem cotas, o saldo financeiro (grossAmount) é obrigatório e deve ser um número finito maior ou igual a zero.');
    }
  } else if (data.type === 'DIVIDEND' || data.type === 'INTEREST' || data.type === 'FEE_OR_TAX') {
    // Proventos ou taxas avulsas podem ter quantidade nula ou zero
    if (data.quantity !== undefined && data.quantity !== null) {
      if (typeof data.quantity !== 'number' || !Number.isFinite(data.quantity) || data.quantity < 0) {
        errors.push('A quantidade deve ser um número finito maior ou igual a zero.');
      }
    }
  } else {
    // Compras, vendas, desdobramentos, ajustes e posições iniciais com cotas exigem quantidade finita >= 0
    if (typeof data.quantity !== 'number' || !Number.isFinite(data.quantity) || data.quantity < 0) {
      errors.push('A quantidade deve ser um número finito maior ou igual a zero.');
    }
  }

  // Preço unitário obrigatório exceto em posições puras de saldo (onde unitPrice não se aplica)
  if (data.type === 'INITIAL_POSITION' && data.quantity === null) {
    // Ativos em saldo puro não possuem preço unitário; unitPrice não é exigido nem substitui grossAmount
  } else if (typeof data.unitPrice !== 'number' || !Number.isFinite(data.unitPrice) || data.unitPrice < 0) {
    errors.push('O preço unitário deve ser um número finito maior ou igual a zero.');
  }

  if (data.fees !== undefined) {
    if (typeof data.fees !== 'number' || !Number.isFinite(data.fees) || data.fees < 0) {
      errors.push('As taxas devem ser um número finito maior ou igual a zero.');
    }
  }

  if (data.currency === 'BRL') {
    if (data.fxRateToBRL !== undefined && data.fxRateToBRL !== 1.0) {
      errors.push('Para operações em BRL, a taxa de câmbio (fxRateToBRL) deve ser exatamente 1.0.');
    }
  } else if (data.currency === 'USD' || data.currency === 'EUR') {
    if (typeof data.fxRateToBRL !== 'number' || !Number.isFinite(data.fxRateToBRL) || data.fxRateToBRL <= 0) {
      errors.push('Para operações em moeda estrangeira, a taxa de câmbio (fxRateToBRL) deve ser um número positivo maior que zero.');
    }
  }

  // Validação de origem e destino dos recursos
  if (data.type === 'BUY' || data.type === 'FEE_OR_TAX') {
    if (!data.fundingSource) {
      errors.push(`Lançamentos do tipo ${data.type} exigem declarar a fonte de recursos (fundingSource: EXTERNAL_NEW_MONEY ou PORTFOLIO_CASH).`);
    } else if (data.fundingSource === 'PORTFOLIO_CASH' && (!data.cashAssetId || data.cashAssetId.trim().length === 0)) {
      errors.push('Quando a fonte de recursos for PORTFOLIO_CASH, o ativo de caixa debitado (cashAssetId) deve ser informado.');
    }
  }

  if (data.type === 'SELL' || data.type === 'DIVIDEND' || data.type === 'INTEREST') {
    if (!data.settlementTarget) {
      errors.push(`Lançamentos do tipo ${data.type} exigem declarar o destino dos recursos (settlementTarget: EXTERNAL_OUTSIDE ou PORTFOLIO_CASH).`);
    } else if (data.settlementTarget === 'PORTFOLIO_CASH' && (!data.cashAssetId || data.cashAssetId.trim().length === 0)) {
      errors.push('Quando o destino dos recursos for PORTFOLIO_CASH, o ativo de caixa creditado (cashAssetId) deve ser informado.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateSellFeasibility(
  currentAvailableQuantity: number,
  sellQuantity: number
): ValidationResult {
  const errors: string[] = [];

  if (typeof sellQuantity !== 'number' || !Number.isFinite(sellQuantity) || sellQuantity <= 0) {
    errors.push('A quantidade de venda deve ser maior que zero.');
  }

  // Tolerância de ponto flutuante para evitar erro de arredondamento em frações de cotas/cripto
  const EPSILON = 1e-9;
  if (sellQuantity > currentAvailableQuantity + EPSILON) {
    errors.push(
      `Saldo insuficiente para venda. Disponível: ${currentAvailableQuantity}, Solicitado: ${sellQuantity}.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateTargetSum(targets: number[]): {
  isValid: boolean;
  sum: number;
  discrepancy: number;
} {
  const sum = targets.reduce((acc, curr) => acc + (Number.isFinite(curr) ? curr : 0), 0);
  const discrepancy = Number((sum - 100).toFixed(4));
  // Tolerância estrita para 4 casas decimais: qualquer resíduo >= 0.0001% é sinalizado
  const isValid = Math.abs(discrepancy) < 0.0001;

  return {
    isValid,
    sum: Number(sum.toFixed(4)),
    discrepancy,
  };
}

export function validateAssetRegistration(data: {
  ticker?: string;
  name?: string;
  category?: string;
  currency?: CurrencyCode;
  market?: QuoteMarket;
  targetPercentage?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.ticker || data.ticker.trim().length === 0) {
    errors.push('O código/ticker do ativo é obrigatório.');
  } else if (data.ticker.trim().length > 20) {
    errors.push('O código/ticker deve ter no máximo 20 caracteres.');
  }

  if (!data.name || data.name.trim().length === 0) {
    errors.push('O nome do ativo é obrigatório.');
  } else if (data.name.trim().length > 140) {
    errors.push('O nome do ativo deve ter no máximo 140 caracteres.');
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.push('A classe do ativo é obrigatória.');
  }

  if (data.targetPercentage !== undefined) {
    if (
      typeof data.targetPercentage !== 'number' ||
      !Number.isFinite(data.targetPercentage) ||
      data.targetPercentage < 0 ||
      data.targetPercentage > 100
    ) {
      errors.push('A meta percentual deve ser um número entre 0 e 100.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
