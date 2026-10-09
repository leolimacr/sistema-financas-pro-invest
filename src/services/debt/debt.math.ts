import { DebtItem, DebtAdjustmentConfig, DebtSeries, DebtAdjustmentType, DebtSeriesFrequency } from './debt.types';

export type ScheduleRow = {
  month: number;
  payment: number;
  interest: number;
  amortization: number;
  balance: number;
  seriesIndex?: number;
  installmentInSeries?: number;
  year?: number;
  monthInYear?: number;
};

export type StructuredResult = {
  valid: boolean;
  firstPayment: number;
  lastPayment: number;
  totalPaid: number;
  totalInterest: number;
  rows: ScheduleRow[];
};

export type RotativeResult = {
  valid: boolean;
  months: number | null;
  totalPaid: number | null;
  totalInterest: number | null;
  rows: ScheduleRow[];
};

export type InterestRatePeriod = 'monthly' | 'annual';

/**
 * Converte taxa anual (% a.a.) para taxa mensal equivalente (% a.m.)
 * Usa juros compostos: i_m = (1 + i_a)^(1/12) - 1
 * @param annualRate Taxa anual em porcentagem (ex: 12 para 12% a.a.)
 * @returns Taxa mensal em porcentagem (ex: 0.9488 para ~0,95% a.m.)
 */
export function convertAnnualToMonthlyRate(annualRate: number): number {
  if (annualRate < 0) return 0;
  const annualDecimal = annualRate / 100;
  const monthlyDecimal = Math.pow(1 + annualDecimal, 1 / 12) - 1;
  return monthlyDecimal * 100;
}

/**
 * Converte taxa mensal (% a.m.) para taxa anual equivalente (% a.a.)
 * Usa juros compostos: i_a = (1 + i_m)^12 - 1
 * @param monthlyRate Taxa mensal em porcentagem (ex: 1 para 1% a.m.)
 * @returns Taxa anual em porcentagem (ex: 12.68 para ~12,68% a.a.)
 */
export function convertMonthlyToAnnualRate(monthlyRate: number): number {
  if (monthlyRate < 0) return 0;
  const monthlyDecimal = monthlyRate / 100;
  const annualDecimal = Math.pow(1 + monthlyDecimal, 12) - 1;
  return annualDecimal * 100;
}

export const buildSacSchedule = (
  principal: number,
  monthlyRatePercent: number,
  months: number,
  extraMonthly: number = 0
): StructuredResult => {
  if (principal <= 0 || monthlyRatePercent < 0 || months <= 0) {
    return { valid: false, firstPayment: 0, lastPayment: 0, totalPaid: 0, totalInterest: 0, rows: [] };
  }

  const rate = monthlyRatePercent / 100;
  const baseAmortization = principal / months;
  const extra = Math.max(extraMonthly, 0);

  let balance = principal;
  let totalPaid = 0;
  let totalInterest = 0;
  const rows: ScheduleRow[] = [];

  for (let i = 1; i <= months && balance > 0.01; i += 1) {
    const interest = balance * rate;
    const regularAmortization = Math.min(baseAmortization, balance);

    let payment = regularAmortization + interest;
    let amortization = regularAmortization;
    let newBalance = balance - regularAmortization;

    const extraApplied = Math.min(extra, newBalance);
    amortization += extraApplied;
    payment += extraApplied;
    newBalance -= extraApplied;

    totalPaid += payment;
    totalInterest += interest;

    rows.push({
      month: i,
      payment,
      interest,
      amortization,
      balance: Math.max(newBalance, 0),
    });

    balance = Math.max(newBalance, 0);
  }

  return {
    valid: rows.length > 0,
    firstPayment: rows[0]?.payment || 0,
    lastPayment: rows[rows.length - 1]?.payment || 0,
    totalPaid,
    totalInterest,
    rows,
  };
};

export const buildPriceSchedule = (
  principal: number,
  monthlyRatePercent: number,
  months: number,
  extraMonthly: number = 0
): StructuredResult => {
  if (principal <= 0 || monthlyRatePercent < 0 || months <= 0) {
    return { valid: false, firstPayment: 0, lastPayment: 0, totalPaid: 0, totalInterest: 0, rows: [] };
  }

  const rate = monthlyRatePercent / 100;
  const extra = Math.max(extraMonthly, 0);

  const fixedPayment =
    rate === 0
      ? principal / months
      : principal * ((rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1));

  let balance = principal;
  let totalPaid = 0;
  let totalInterest = 0;
  const rows: ScheduleRow[] = [];

  for (let i = 1; i <= months && balance > 0.01; i += 1) {
    const interest = balance * rate;
    let regularAmortization = fixedPayment - interest;
    regularAmortization = Math.min(regularAmortization, balance);

    let payment = regularAmortization + interest;
    let amortization = regularAmortization;
    let newBalance = balance - regularAmortization;

    const extraApplied = Math.min(extra, newBalance);
    amortization += extraApplied;
    payment += extraApplied;
    newBalance -= extraApplied;

    totalPaid += payment;
    totalInterest += interest;

    rows.push({
      month: i,
      payment,
      interest,
      amortization,
      balance: Math.max(newBalance, 0),
    });

    balance = Math.max(newBalance, 0);
  }

  return {
    valid: rows.length > 0,
    firstPayment: rows[0]?.payment || 0,
    lastPayment: rows[rows.length - 1]?.payment || 0,
    totalPaid,
    totalInterest,
    rows,
  };
};

export const buildRotativeSchedule = (
  principal: number,
  monthlyRatePercent: number,
  monthlyPayment: number
): RotativeResult => {
  if (principal <= 0 || monthlyRatePercent < 0 || monthlyPayment <= 0) {
    return { valid: false, months: null, totalPaid: null, totalInterest: null, rows: [] };
  }

  const rate = monthlyRatePercent / 100;

  if (rate > 0 && monthlyPayment <= principal * rate) {
    return { valid: false, months: null, totalPaid: null, totalInterest: null, rows: [] };
  }

  let balance = principal;
  let totalPaid = 0;
  let totalInterest = 0;
  let months = 0;
  const rows: ScheduleRow[] = [];

  while (balance > 0.01 && months < 600) {
    const interest = balance * rate;
    balance += interest;

    const payment = Math.min(monthlyPayment, balance);
    const amortization = payment - interest;
    balance = Math.max(balance - payment, 0);

    months += 1;
    totalPaid += payment;
    totalInterest += interest;

    rows.push({
      month: months,
      payment,
      interest,
      amortization: Math.max(amortization, 0),
      balance,
    });
  }

  if (balance > 0.01) {
    return { valid: false, months: null, totalPaid: null, totalInterest: null, rows: [] };
  }

  return {
    valid: true,
    months,
    totalPaid,
    totalInterest,
    rows,
  };
};

function getMonthsPerFrequency(frequency: DebtSeriesFrequency): number {
  switch (frequency) {
    case 'monthly': return 1;
    case 'quarterly': return 3;
    case 'semi_annual': return 6;
    case 'annual': return 12;
    default: return 1;
  }
}

export const buildInstallmentSchedule = (
  principal: number,
  monthlyRatePercent: number,
  adjustmentConfig: DebtAdjustmentConfig,
  extraMonthly: number = 0
): StructuredResult => {
  if (principal <= 0 || monthlyRatePercent < 0) {
    return { valid: false, firstPayment: 0, lastPayment: 0, totalPaid: 0, totalInterest: 0, rows: [] };
  }

  const config = adjustmentConfig || { type: 'fixed' as DebtAdjustmentType, series: [], frequency: 'monthly' as DebtSeriesFrequency };
  
  if (config.type === 'fixed' || !config.series || config.series.length === 0) {
    const months = config.series?.[0]?.installmentsCount || 0;
    return buildPriceSchedule(principal, monthlyRatePercent, months, extraMonthly);
  }

  const rate = monthlyRatePercent / 100;
  const extra = Math.max(extraMonthly, 0);
  const series = config.series || [];
  
  let balance = principal;
  let totalPaid = 0;
  let totalInterest = 0;
  const rows: ScheduleRow[] = [];
  let absoluteMonth = 0;

  for (let s = 0; s < series.length; s++) {
    const ser = series[s];
    const installments = ser.installmentsCount;
    const paymentBase = ser.installmentValue;
    const monthStep = getMonthsPerFrequency(config.frequency || 'monthly');

    for (let i = 1; i <= installments && balance > 0.01; i++) {
      absoluteMonth++;
      const year = ser.year;
      const monthInYear = ser.startMonth + (i - 1) * monthStep;
      
      const interest = balance * rate;
      const regularAmortization = Math.min(paymentBase - interest, balance);
      
      let payment = regularAmortization + interest;
      let amortization = regularAmortization;
      let newBalance = balance - regularAmortization;

      const extraApplied = Math.min(extra, newBalance);
      amortization += extraApplied;
      payment += extraApplied;
      newBalance -= extraApplied;

      totalPaid += payment;
      totalInterest += interest;

      rows.push({
        month: absoluteMonth,
        payment,
        interest,
        amortization,
        balance: Math.max(newBalance, 0),
        seriesIndex: s,
        installmentInSeries: i,
        year,
        monthInYear: monthInYear <= 12 ? monthInYear : monthInYear % 12 || 12,
      });

      balance = Math.max(newBalance, 0);
    }
  }

  return {
    valid: rows.length > 0,
    firstPayment: rows[0]?.payment || 0,
    lastPayment: rows[rows.length - 1]?.payment || 0,
    totalPaid,
    totalInterest,
    rows,
  };
};

export function computeCurrentInstallment(debt: DebtItem): number {
  const config = debt.adjustmentConfig;
  
  if (!config || config.type === 'fixed' || !config.series || config.series.length === 0) {
    return debt.valorParcela;
  }

  const currentIndex = debt.currentSeriesIndex ?? 0;
  const series = config.series;
  
  if (currentIndex >= 0 && currentIndex < series.length) {
    return series[currentIndex].installmentValue;
  }
  
  return series[0]?.installmentValue || debt.valorParcela;
}

export function computeRemainingInstallments(debt: DebtItem): number {
  const config = debt.adjustmentConfig;
  
  if (!config || config.type === 'fixed' || !config.series || config.series.length === 0) {
    return debt.parcelasRestantes;
  }

  const paidInstallments = debt.parcelasPagas || 0;
  let remaining = 0;
  let counted = 0;

  for (const series of config.series) {
    if (counted + series.installmentsCount <= paidInstallments) {
      counted += series.installmentsCount;
    } else {
      remaining += series.installmentsCount - Math.max(0, paidInstallments - counted);
      counted = paidInstallments;
    }
  }

  return remaining;
}

export function getCurrentSeriesInfo(debt: DebtItem): { seriesIndex: number; series: DebtSeries | null; installmentInSeries: number } {
  const config = debt.adjustmentConfig;
  
  if (!config || config.type === 'fixed' || !config.series || config.series.length === 0) {
    return { seriesIndex: 0, series: null, installmentInSeries: 0 };
  }

  const paidInstallments = debt.parcelasPagas || 0;
  let counted = 0;

  for (let s = 0; s < config.series.length; s++) {
    const series = config.series[s];
    if (counted + series.installmentsCount <= paidInstallments) {
      counted += series.installmentsCount;
    } else {
      return {
        seriesIndex: s,
        series,
        installmentInSeries: paidInstallments - counted + 1,
      };
    }
  }

  const lastSeries = config.series[config.series.length - 1];
  return {
    seriesIndex: config.series.length - 1,
    series: lastSeries,
    installmentInSeries: lastSeries.installmentsCount,
  };
}

export interface DebtRanking {
  debt: DebtItem;
  score: number;
  breakdown: {
    cost: number;
    urgency: number;
    opportunity: number;
    cashflowImpact: number;
  };
}

export function rankDebts(debts: DebtItem[], heroValue?: number): DebtRanking[] {
  if (debts.length === 0) return [];

  const maxSaldo = Math.max(...debts.map(d => d.saldoDevedor), 1);
  const now = new Date();

  const rankings = debts.map(debt => {
    const cost = Math.min((debt.taxaMensal || 0) / 10, 1) * 100;

    let urgency = 0;
    if (debt.dataVencimento) {
      const dueDate = new Date(debt.dataVencimento);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0) {
        urgency = 100;
      } else if (daysUntilDue <= 7) {
        urgency = 80;
      } else {
        urgency = Math.max(0, 100 - daysUntilDue);
      }
    }
    if (debt.parcelasRestantes > 0 && debt.parcelasRestantes <= 3) {
      urgency = Math.max(urgency, 60);
    }
    urgency = Math.min(urgency, 100);

    const opportunity = maxSaldo > 0
      ? Math.max(0, 1 - debt.saldoDevedor / maxSaldo) * 100
      : 0;

    const currentInstallment = computeCurrentInstallment(debt);
    let cashflowImpact = 0;
    if (heroValue !== undefined && heroValue > 0 && currentInstallment > 0) {
      cashflowImpact = Math.min(currentInstallment / heroValue, 1) * 100;
    }

    const score = cost * 0.45 + urgency * 0.30 + opportunity * 0.15 + cashflowImpact * 0.10;

    return {
      debt,
      score: Math.round(score),
      breakdown: {
        cost: Math.round(cost),
        urgency: Math.round(urgency),
        opportunity: Math.round(opportunity),
        cashflowImpact: Math.round(cashflowImpact),
      },
    };
  });

  return rankings.sort((a, b) => b.score - a.score);
}

export function computeMonthlyImpact(debt: DebtItem): number {
  if (debt.originType === 'rotativo_cartao' && debt.taxaMensal > 0) {
    return debt.saldoDevedor * (debt.taxaMensal / 100);
  }
  const currentInstallment = computeCurrentInstallment(debt);
  if (currentInstallment > 0) {
    return currentInstallment;
  }
  if (debt.taxaMensal > 0) {
    return debt.saldoDevedor * (debt.taxaMensal / 100);
  }
  return 0;
}