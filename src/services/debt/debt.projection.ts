import type { DebtItem } from './debt.types';
import * as math from './debt.math';

export interface DebtProjectionParams {
  debt: DebtItem;
  extraPayment: number;
  scenario: 'sac' | 'price' | 'rotativo' | 'auto';
}

const getScenario = (debt: DebtItem): 'sac' | 'price' | 'rotativo' | 'series' => {
  const config = debt.adjustmentConfig;
  
  if (!config || config.type === 'fixed') {
    return debt.tipo === 'Cartão rotativo' || debt.originType === 'rotativo_cartao' ? 'rotativo' : 'price';
  }
  
  return 'series';
};

export const projectDebt = (params: DebtProjectionParams) => {
  const { debt, extraPayment, scenario } = params;
  const effectiveScenario = scenario === 'auto' ? getScenario(debt) : scenario;

  if (effectiveScenario === 'series') {
    return math.buildInstallmentSchedule(
      debt.saldoDevedor,
      debt.taxaMensal,
      debt.adjustmentConfig!,
      extraPayment
    );
  }

  if (effectiveScenario === 'sac') {
    return math.buildSacSchedule(
      debt.saldoDevedor,
      debt.taxaMensal,
      debt.parcelasRestantes,
      extraPayment
    );
  }

  if (effectiveScenario === 'price') {
    return math.buildPriceSchedule(
      debt.saldoDevedor,
      debt.taxaMensal,
      debt.parcelasRestantes,
      extraPayment
    );
  }

  return math.buildRotativeSchedule(
    debt.saldoDevedor,
    debt.taxaMensal,
    debt.valorParcela + extraPayment
  );
};