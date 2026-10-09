/**
 * Finanças Pro Invest - Motor Matemático Especializado de Renda Fixa
 * Suporte a CDB, LCI, LCA, CRI, CRA, Debêntures e Tesouro Direto
 * Marcação na Curva, Tabela Regressiva de IR e IOF
 */

export type FixedIncomeCategory =
  | 'CDB'
  | 'LCI'
  | 'LCA'
  | 'CRI'
  | 'CRA'
  | 'DEBENTURE'
  | 'DEBENTURE_INCENTIVADA'
  | 'TESOURO_SELIC'
  | 'TESOURO_IPCA'
  | 'TESOURO_PREFIXADO'
  | 'OUTROS';

export type FixedIncomeIndexation = 'PRE' | 'CDI' | 'IPCA' | 'SELIC';

export interface FixedIncomeCurveParams {
  principalBRL: number;
  startDate: string;           // YYYY-MM-DD
  currentDate?: string;        // YYYY-MM-DD (default: hoje)
  maturityDate?: string;       // YYYY-MM-DD
  indexation: FixedIncomeIndexation;
  ratePercent: number;         // ex: 12.5 (para 12,5% pré), 110 (para 110% CDI), 6.0 (para IPCA+6%)
  assetType?: FixedIncomeCategory | string;
  isTaxExempt?: boolean;
  benchmarkCdiAnnual?: number; // ex: 10.5 (10,5% a.a.)
  benchmarkIpcaAnnual?: number;// ex: 4.5 (4,5% a.a.)
}

export interface FixedIncomeCurveResult {
  calendarDaysElapsed: number;
  businessDaysElapsed: number;
  daysToMaturity: number | null;
  isMatured: boolean;
  effectiveAnnualRatePercent: number;
  grossYieldBRL: number;
  grossValueBRL: number;
  iofRatePercent: number;
  iofAmountBRL: number;
  taxRatePercent: number;
  taxAmountBRL: number;
  netYieldBRL: number;
  netValueBRL: number;
  netReturnPercent: number;
  isTaxExempt: boolean;
}

/** Tabela regressiva de IOF por dia corrido (dias 1 a 29) */
const IOF_TABLE: Record<number, number> = {
  1: 96, 2: 93, 3: 90, 4: 86, 5: 83, 6: 80, 7: 76, 8: 73, 9: 70, 10: 66,
  11: 63, 12: 60, 13: 56, 14: 53, 15: 50, 16: 46, 17: 43, 18: 40, 19: 36, 20: 33,
  21: 30, 22: 26, 23: 23, 24: 20, 25: 16, 26: 13, 27: 10, 28: 6, 29: 3,
};

/**
 * Verifica se o ativo é isento de Imposto de Renda para pessoa física (LCI, LCA, CRI, CRA, Debênture Incentivada)
 */
export function isFixedIncomeTaxExempt(assetType?: string): boolean {
  if (!assetType) return false;
  const upper = assetType.toUpperCase();
  return (
    upper.includes('LCI') ||
    upper.includes('LCA') ||
    upper.includes('CRI') ||
    upper.includes('CRA') ||
    upper.includes('INCENTIVADA')
  );
}

/**
 * Alíquota regressiva de Imposto de Renda conforme prazo decorrido em dias corridos
 */
export function calculateRegressiveTaxRate(calendarDaysElapsed: number, isTaxExempt = false): number {
  if (isTaxExempt) return 0;
  if (calendarDaysElapsed <= 180) return 22.5;
  if (calendarDaysElapsed <= 360) return 20.0;
  if (calendarDaysElapsed <= 720) return 17.5;
  return 15.0;
}

/**
 * Alíquota regressiva de IOF para resgates nos primeiros 29 dias
 */
export function calculateIofRate(calendarDaysElapsed: number): number {
  if (calendarDaysElapsed <= 0) return 100;
  if (calendarDaysElapsed >= 30) return 0;
  return IOF_TABLE[calendarDaysElapsed] || 0;
}

/**
 * Calcula a diferença em dias corridos entre duas datas no formato YYYY-MM-DD
 */
export function getCalendarDaysBetween(startDate: string, endDate: string): number {
  const d1 = new Date(`${startDate}T00:00:00Z`);
  const d2 = new Date(`${endDate}T00:00:00Z`);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Estimativa precisa de dias úteis (considera fins de semana ~252 dias úteis/ano)
 */
export function estimateBusinessDays(calendarDays: number): number {
  if (calendarDays <= 0) return 0;
  return Math.max(0, Math.round((calendarDays * 252) / 365));
}

/**
 * Calcula a taxa anual efetiva do título considerando a indexação e benchmarks
 */
export function calculateEffectiveAnnualRate(
  indexation: FixedIncomeIndexation,
  ratePercent: number,
  benchmarkCdiAnnual = 10.5,
  benchmarkIpcaAnnual = 4.5
): number {
  switch (indexation) {
    case 'PRE':
      return ratePercent;
    case 'CDI':
      // ex: 110% do CDI -> (110 / 100) * 10.5% = 11.55%
      return (ratePercent / 100) * benchmarkCdiAnnual;
    case 'SELIC':
      return (ratePercent / 100) * benchmarkCdiAnnual;
    case 'IPCA':
      // Equação de Fisher: (1 + IPCA) * (1 + spread) - 1
      const ipcaFactor = 1 + benchmarkIpcaAnnual / 100;
      const spreadFactor = 1 + ratePercent / 100;
      return (ipcaFactor * spreadFactor - 1) * 100;
    default:
      return ratePercent;
  }
}

/**
 * Motor de Marcação na Curva para Títulos de Renda Fixa
 * Calcula com rigor matemático o valor bruto, IOF, IR projetado e valor líquido hoje
 */
export function calculateFixedIncomeCurve(params: FixedIncomeCurveParams): FixedIncomeCurveResult {
  const {
    principalBRL,
    startDate,
    currentDate = new Date().toISOString().slice(0, 10),
    maturityDate,
    indexation,
    ratePercent,
    assetType,
    benchmarkCdiAnnual = 10.5,
    benchmarkIpcaAnnual = 4.5,
  } = params;

  if (principalBRL <= 0) {
    return {
      calendarDaysElapsed: 0,
      businessDaysElapsed: 0,
      daysToMaturity: null,
      isMatured: false,
      effectiveAnnualRatePercent: 0,
      grossYieldBRL: 0,
      grossValueBRL: 0,
      iofRatePercent: 0,
      iofAmountBRL: 0,
      taxRatePercent: 0,
      taxAmountBRL: 0,
      netYieldBRL: 0,
      netValueBRL: 0,
      netReturnPercent: 0,
      isTaxExempt: false,
    };
  }

  const calendarDaysElapsed = getCalendarDaysBetween(startDate, currentDate);
  const businessDaysElapsed = estimateBusinessDays(calendarDaysElapsed);

  let daysToMaturity: number | null = null;
  let isMatured = false;
  if (maturityDate) {
    daysToMaturity = getCalendarDaysBetween(currentDate, maturityDate);
    const maturityDiff = new Date(`${maturityDate}T00:00:00Z`).getTime() - new Date(`${currentDate}T00:00:00Z`).getTime();
    if (maturityDiff < 0) {
      daysToMaturity = 0;
      isMatured = true;
    }
  }

  const taxExempt = params.isTaxExempt ?? isFixedIncomeTaxExempt(assetType);
  const effectiveAnnualRatePercent = calculateEffectiveAnnualRate(
    indexation,
    ratePercent,
    benchmarkCdiAnnual,
    benchmarkIpcaAnnual
  );

  // Capitalização composta com base em dias úteis (padrão Anbima 252 dias úteis)
  const annualFactor = 1 + effectiveAnnualRatePercent / 100;
  const growthFactor = Math.pow(annualFactor, businessDaysElapsed / 252);

  const grossValueBRL = Number((principalBRL * growthFactor).toFixed(2));
  const grossYieldBRL = Math.max(0, Number((grossValueBRL - principalBRL).toFixed(2)));

  // IOF (incide antes do IR para resgates < 30 dias)
  const iofRatePercent = calculateIofRate(calendarDaysElapsed);
  const iofAmountBRL = Number(((grossYieldBRL * iofRatePercent) / 100).toFixed(2));

  // Base de cálculo do IR: Rendimento bruto deduzido do IOF
  const taxableBase = Math.max(0, grossYieldBRL - iofAmountBRL);
  const taxRatePercent = calculateRegressiveTaxRate(calendarDaysElapsed, taxExempt);
  const taxAmountBRL = Number(((taxableBase * taxRatePercent) / 100).toFixed(2));

  const netYieldBRL = Math.max(0, Number((grossYieldBRL - iofAmountBRL - taxAmountBRL).toFixed(2)));
  const netValueBRL = Number((principalBRL + netYieldBRL).toFixed(2));
  const netReturnPercent = Number(((netYieldBRL / principalBRL) * 100).toFixed(2));

  return {
    calendarDaysElapsed,
    businessDaysElapsed,
    daysToMaturity,
    isMatured,
    effectiveAnnualRatePercent: Number(effectiveAnnualRatePercent.toFixed(2)),
    grossYieldBRL,
    grossValueBRL,
    iofRatePercent,
    iofAmountBRL,
    taxRatePercent,
    taxAmountBRL,
    netYieldBRL,
    netValueBRL,
    netReturnPercent,
    isTaxExempt: taxExempt,
  };
}
