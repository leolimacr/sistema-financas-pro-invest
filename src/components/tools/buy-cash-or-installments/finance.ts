import type { CalculationInputs, CalculationResult, NormalizedInputs } from './types';

const CLOSE_CALL_THRESHOLD = 0.01;
const MODERATE_THRESHOLD = 0.03;

export function annualToMonthlyRate(annualRatePercent: number): number {
  const annual = Math.max(annualRatePercent, 0) / 100;
  return Math.pow(1 + annual, 1 / 12) - 1;
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, digits = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format((Number.isFinite(value) ? value : 0) / 100);
}

export function parsePtBrNumber(value: string): number {
  if (!value) return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function maskCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  const cents = Number(digits || '0') / 100;
  return cents.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function maskPercentInput(value: string): string {
  const cleaned = value.replace(/[^0-9,]/g, '');
  const parts = cleaned.split(',');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]},${parts.slice(1).join('')}`;
}

export function getIncomeTaxRateByInstallments(installmentCount: number): { taxRatePercent: number; estimatedDays: number } {
  const count = Math.max(Math.trunc(installmentCount || 0), 0);
  const estimatedDays = count * 30;

  if (estimatedDays <= 180) {
    return { taxRatePercent: 22.5, estimatedDays };
  }
  if (estimatedDays <= 360) {
    return { taxRatePercent: 20, estimatedDays };
  }
  if (estimatedDays <= 720) {
    return { taxRatePercent: 17.5, estimatedDays };
  }
  return { taxRatePercent: 15, estimatedDays };
}

export function normalizeInputs(input: CalculationInputs): NormalizedInputs {
  const cashPrice = Math.max(input.cashPrice || 0, 0);
  const installmentCount = Math.max(Math.trunc(input.installmentCount || 0), 0);
  const cashDiscountValue = Math.max(input.cashDiscount || 0, 0);
  const effectiveCashPrice = Math.max(cashPrice - cashDiscountValue, 0);
  const fees = Math.max(input.fees || 0, 0);
  const iof = Math.max(input.iof || 0, 0);

  let totalInstallmentPrice = Math.max(input.totalInstallmentPrice || 0, 0);
  let installmentValue = Math.max(input.installmentValue || 0, 0);

  if (totalInstallmentPrice > 0 && installmentCount > 0 && installmentValue <= 0) {
    installmentValue = totalInstallmentPrice / installmentCount;
  }

  if (installmentValue > 0 && installmentCount > 0 && totalInstallmentPrice <= 0) {
    totalInstallmentPrice = installmentValue * installmentCount;
  }

  const rateBase = input.netAnnualRate && input.netAnnualRate > 0 ? input.netAnnualRate : input.annualRate;
  const annualRate = Math.max(rateBase || 0, 0);
  const inflation = input.useInflation ? Math.max(input.inflationAnnualRate || 0, 0) / 100 : 0;
  const annualDecimal = annualRate / 100;
  const effectiveAnnualRateBeforeTaxes = input.useInflation
    ? (((1 + annualDecimal) / (1 + inflation)) - 1) * 100
    : annualRate;

  const { taxRatePercent } = getIncomeTaxRateByInstallments(installmentCount);
  const netFactor = 1 - taxRatePercent / 100;
  const effectiveAnnualRate = effectiveAnnualRateBeforeTaxes * netFactor;

  const monthlyRate = annualToMonthlyRate(effectiveAnnualRate);

  return {
    cashPrice,
    installmentCount,
    installmentValue,
    totalInstallmentPrice,
    cashDiscountValue,
    effectiveCashPrice,
    annualRate,
    monthlyRate,
    effectiveAnnualRate,
    fees,
    iof,
  };
}

export function validateCalculation(input: CalculationInputs): string[] {
  const errors: string[] = [];

  if (!input.cashPrice || input.cashPrice <= 0) errors.push('Informe um preço à vista maior que zero.');
  if (!input.installmentCount || input.installmentCount <= 0) errors.push('Informe a quantidade de parcelas.');

  const hasInstallmentValue = !!input.installmentValue && input.installmentValue > 0;
  const hasTotalInstallmentPrice = !!input.totalInstallmentPrice && input.totalInstallmentPrice > 0;

  if (!hasInstallmentValue && !hasTotalInstallmentPrice) {
    errors.push('Informe o valor da parcela ou o preço parcelado total.');
  }

  if (hasInstallmentValue && hasTotalInstallmentPrice && input.installmentCount > 0) {
    const calculatedTotal = (input.installmentValue || 0) * input.installmentCount;
    const informedTotal = input.totalInstallmentPrice || 0;
    const diff = Math.abs(calculatedTotal - informedTotal);
    if (diff > 0.1) {
      errors.push('O preço parcelado total e o valor da parcela estão inconsistentes.');
    }
  }

  return errors;
}

function presentValueOfInstallments(installmentValue: number, monthlyRate: number, installmentCount: number): number {
  let pv = 0;
  for (let i = 1; i <= installmentCount; i += 1) {
    pv += installmentValue / Math.pow(1 + monthlyRate, i);
  }
  return pv;
}

function futureValueOfInvestedCash(cashValue: number, monthlyRate: number, installmentCount: number): number {
  return cashValue * Math.pow(1 + monthlyRate, installmentCount);
}

function investedBalanceAfterInstallments(cashValue: number, monthlyRate: number, installmentValue: number, installmentCount: number): number {
  let balance = cashValue;
  for (let i = 1; i <= installmentCount; i += 1) {
    balance = balance * (1 + monthlyRate);
    balance -= installmentValue;
  }
  return balance;
}

function buildExplanation(result: CalculationResult): string {
  if (result.decision === 'pay_cash') {
    return 'O desconto à vista e o menor custo total superaram o rendimento estimado do dinheiro no período, então pagar agora tende a ser a escolha financeiramente mais eficiente.';
  }

  if (result.decision === 'installments_invest') {
    return 'Mesmo parcelando, o custo adicional ficou abaixo do rendimento estimado do capital mantido investido, então parcelar tende a ser matematicamente melhor.';
  }

  return 'A diferença final ficou pequena. Nesse caso, conveniência, disciplina para investir e controle do orçamento podem pesar mais do que a matemática.';
}

function buildWarnings(result: CalculationResult, normalized: NormalizedInputs): string[] {
  const warnings: string[] = [
    'Esta análise considera que o valor permanecerá investido durante todo o período.',
  ];

  if (result.decision === 'installments_invest') {
    warnings.push('Se você parcelar, mas usar o dinheiro no dia a dia, a vantagem matemática deixa de existir.');
  }

  if (normalized.totalInstallmentPrice === normalized.effectiveCashPrice) {
    warnings.push('O parcelamento tem o mesmo valor nominal do pagamento à vista. A decisão depende principalmente do rendimento do capital e da sua disciplina.');
  }

  if (normalized.annualRate > 30 || normalized.annualRate < 1) {
    warnings.push('A taxa informada está fora do padrão mais comum. Revise a taxa antes de decidir.');
  }

  if (result.isCloseCall) {
    warnings.push('O ganho marginal pode não compensar a complexidade da decisão.');
  }

  return warnings;
}

export function calculateDecision(input: CalculationInputs): CalculationResult {
  const normalized = normalizeInputs(input);
  const { taxRatePercent, estimatedDays } = getIncomeTaxRateByInstallments(normalized.installmentCount);
  const totalInstallmentWithCosts = normalized.totalInstallmentPrice + normalized.fees + normalized.iof;
  const pv = presentValueOfInstallments(normalized.installmentValue, normalized.monthlyRate, normalized.installmentCount);
  const fv = futureValueOfInvestedCash(normalized.effectiveCashPrice, normalized.monthlyRate, normalized.installmentCount);
  const endingBalance = investedBalanceAfterInstallments(
    normalized.effectiveCashPrice,
    normalized.monthlyRate,
    normalized.installmentValue,
    normalized.installmentCount,
  );

  const financingExtraCost = totalInstallmentWithCosts - normalized.effectiveCashPrice;
  const investmentGrossEarnings = Math.max(fv - normalized.effectiveCashPrice, 0);
  const finalDifference = endingBalance;
  const percentageDifference = normalized.effectiveCashPrice > 0
    ? Math.abs(finalDifference) / normalized.effectiveCashPrice
    : 0;

  let decision: CalculationResult['decision'] = 'tie';
  let headline = 'As duas opções são muito próximas';
  let summary = 'A decisão pode depender mais da sua disciplina financeira.';

  if (finalDifference > 0) {
    decision = 'installments_invest';
    headline = 'Vale mais a pena parcelar e investir';
    summary = `O saldo final estimado ao investir o valor e pagar as parcelas seria de ${formatCurrencyBRL(finalDifference)}.`;
  } else if (finalDifference < 0) {
    decision = 'pay_cash';
    headline = 'Vale mais a pena pagar à vista';
    summary = `O parcelamento consome mais do que o rendimento estimado e deixaria uma diferença de ${formatCurrencyBRL(Math.abs(finalDifference))}.`;
  }

  if (percentageDifference <= CLOSE_CALL_THRESHOLD) {
    decision = 'tie';
    headline = 'As duas opções são muito próximas';
    summary = 'A vantagem matemática é pequena e pode não justificar maior complexidade.';
  }

  const result: CalculationResult = {
    decision,
    headline,
    summary,
    effectiveCashPrice: normalized.effectiveCashPrice,
    totalInstallmentPrice: totalInstallmentWithCosts,
    installmentValue: normalized.installmentValue,
    installmentCount: normalized.installmentCount,
    presentValueOfInstallments: pv,
    futureValueOfInvestedCash: fv,
    investedBalanceAfterInstallments: endingBalance,
    investmentGrossEarnings,
    financingExtraCost,
    finalDifference,
    percentageDifference,
    monthlyRate: normalized.monthlyRate * 100,
    annualRate: normalized.effectiveAnnualRate,
    incomeTaxRatePercent: taxRatePercent,
    incomeTaxEstimatedDays: estimatedDays,
    explanation: '',
    warnings: [],
    notes: [],
    isCloseCall: percentageDifference <= CLOSE_CALL_THRESHOLD,
  };

  result.explanation = buildExplanation(result);
  result.warnings = buildWarnings(result, normalized);
  result.notes = [
    result.percentageDifference > MODERATE_THRESHOLD
      ? 'A vantagem estimada é relevante.'
      : 'A vantagem estimada existe, mas não é tão ampla.',
    `Valor presente das parcelas: ${formatCurrencyBRL(result.presentValueOfInstallments)}.`,
    `Valor futuro do dinheiro investido no período: ${formatCurrencyBRL(result.futureValueOfInvestedCash)}.`,
  ];

  return result;
}