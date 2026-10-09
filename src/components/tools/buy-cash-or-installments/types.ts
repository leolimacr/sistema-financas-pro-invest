export type TaxMode = 'automatic' | 'manual';
export type DecisionKind = 'pay_cash' | 'installments_invest' | 'tie';

export interface CalculationInputs {
  cashPrice: number;
  installmentCount: number;
  installmentValue?: number;
  totalInstallmentPrice?: number;
  cashDiscount?: number;
  annualRate: number;
  netAnnualRate?: number;
  inflationAnnualRate?: number;
  fees?: number;
  iof?: number;
  taxMode: TaxMode;
  useInflation?: boolean;
  ignoreIR: boolean;
}

export interface NormalizedInputs {
  cashPrice: number;
  installmentCount: number;
  installmentValue: number;
  totalInstallmentPrice: number;
  cashDiscountValue: number;
  effectiveCashPrice: number;
  annualRate: number;
  monthlyRate: number;
  effectiveAnnualRate: number;
  fees: number;
  iof: number;
}

export interface CalculationResult {
  decision: DecisionKind;
  headline: string;
  summary: string;
  effectiveCashPrice: number;
  totalInstallmentPrice: number;
  installmentValue: number;
  installmentCount: number;
  presentValueOfInstallments: number;
  futureValueOfInvestedCash: number;
  investedBalanceAfterInstallments: number;
  investmentGrossEarnings: number;
  financingExtraCost: number;
  finalDifference: number;
  percentageDifference: number;
  monthlyRate: number;
  annualRate: number;
  incomeTaxRatePercent?: number;
  incomeTaxEstimatedDays?: number;
  explanation: string;
  warnings: string[];
  notes: string[];
  isCloseCall: boolean;
}

export interface SelicApiResponseItem {
  data: string;
  valor: string;
}