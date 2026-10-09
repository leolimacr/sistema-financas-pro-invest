const roundToCentavos = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export interface CompoundInterestProjection {
  finalBalance: number;
  totalInterest: number;
}

export function computeRotativoMonthlyInterest(
  saldoDevedor: number,
  taxaMensal: number,
): number {
  if (saldoDevedor <= 0 || taxaMensal <= 0) return 0;
  const interest = saldoDevedor * (taxaMensal / 100);
  return roundToCentavos(interest);
}

export function projectRotativoCompoundInterest(
  saldoDevedor: number,
  taxaMensal: number,
  meses: number,
): CompoundInterestProjection {
  if (saldoDevedor <= 0 || taxaMensal <= 0 || meses <= 0) {
    return { finalBalance: saldoDevedor, totalInterest: 0 };
  }

  const rate = taxaMensal / 100;
  const finalBalance = saldoDevedor * Math.pow(1 + rate, meses);
  const roundedBalance = roundToCentavos(finalBalance);
  const totalInterest = roundToCentavos(finalBalance - saldoDevedor);

  return { finalBalance: roundedBalance, totalInterest };
}

export function hasInterestBeenAppliedThisMonth(
  lastAppliedAt: string | undefined | null,
  now?: Date,
): boolean {
  if (!lastAppliedAt) return false;
  const currentDate = now ?? new Date();
  const last = new Date(lastAppliedAt);
  return last.getUTCFullYear() === currentDate.getUTCFullYear()
    && last.getUTCMonth() === currentDate.getUTCMonth();
}
