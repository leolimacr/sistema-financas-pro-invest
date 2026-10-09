import type { DebtItem, DebtAdjustmentConfig, DebtSeries } from './debt.types';

export const validateDebt = (debt: DebtItem): { isValid: boolean; error?: string } => {
  if (!debt.nome || debt.nome.trim() === '') return { isValid: false, error: 'Nome é obrigatório' };
  if (debt.saldoDevedor <= 0) return { isValid: false, error: 'Saldo devedor deve ser maior que zero' };

  const config = debt.adjustmentConfig;

  if (!config || config.type === 'fixed') {
    if (debt.parcelasRestantes <= 0) return { isValid: false, error: 'Parcelas devem ser maiores que zero' };
    if (debt.valorParcela <= 0) return { isValid: false, error: 'Valor da parcela deve ser maior que zero' };
    return { isValid: true };
  }

  if (config.type === 'annual_percent') {
    if (!config.series || config.series.length === 0) {
      return { isValid: false, error: 'Pelo menos uma série de parcelas é obrigatória para reajuste anual' };
    }
    if (config.annualPercentRate === undefined || config.annualPercentRate <= 0) {
      return { isValid: false, error: 'Taxa de reajuste anual (% a.a.) é obrigatória e deve ser maior que zero' };
    }
    return validateSeries(config.series, debt.valorParcela);
  }

  if (config.type === 'manual_series') {
    if (!config.series || config.series.length === 0) {
      return { isValid: false, error: 'Pelo menos uma série de parcelas é obrigatória para série manual' };
    }
    return validateSeries(config.series, debt.valorParcela);
  }

  return { isValid: true };
};

function validateSeries(series: DebtSeries[], firstInstallmentValue: number): { isValid: boolean; error?: string } {
  if (series.length === 0) {
    return { isValid: false, error: 'Nenhuma série definida' };
  }

  let previousYear: number | null = null;

  for (let i = 0; i < series.length; i++) {
    const s = series[i];

    if (!s.id || s.id.trim() === '') {
      return { isValid: false, error: `Série ${i + 1}: ID é obrigatório` };
    }
    if (s.year < 2000 || s.year > 2100) {
      return { isValid: false, error: `Série ${i + 1}: Ano inválido` };
    }
    if (previousYear !== null && s.year <= previousYear) {
      return { isValid: false, error: `Série ${i + 1}: Os anos devem ser crescentes` };
    }
    if (s.startMonth < 1 || s.startMonth > 12) {
      return { isValid: false, error: `Série ${i + 1}: Mês inicial deve ser entre 1 e 12` };
    }
    if (s.installmentsCount <= 0) {
      return { isValid: false, error: `Série ${i + 1}: Número de parcelas deve ser maior que zero` };
    }
    if (s.installmentValue <= 0) {
      return { isValid: false, error: `Série ${i + 1}: Valor da parcela deve ser maior que zero` };
    }
    if (i === 0 && Math.abs(s.installmentValue - firstInstallmentValue) > 0.01) {
      return { isValid: false, error: `Série 1: Valor da parcela (R$ ${s.installmentValue.toFixed(2)}) deve ser igual ao valor informado no campo principal (R$ ${firstInstallmentValue.toFixed(2)})` };
    }

    previousYear = s.year;
  }

  return { isValid: true };
}

export const validateAdjustmentConfig = (config: DebtAdjustmentConfig, firstInstallmentValue: number): { isValid: boolean; error?: string } => {
  if (!config) return { isValid: true };
  if (config.type === 'fixed') return { isValid: true };
  if (!config.series || config.series.length === 0) {
    return { isValid: false, error: 'Pelo menos uma série é obrigatória' };
  }
  return validateSeries(config.series, firstInstallmentValue);
};