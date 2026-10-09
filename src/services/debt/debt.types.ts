export type DebtOriginType = 'rotativo_cartao' | 'manual';
export type AmortizacaoTipo = 'normal' | 'extraordinaria';

export type DebtAdjustmentType = 'fixed' | 'annual_percent' | 'manual_series';
export type DebtSeriesFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface DebtSeries {
  id: string;
  year: number;
  startMonth: number;
  installmentsCount: number;
  installmentValue: number;
  adjustmentRate?: number;
  effectiveRate?: number;
}

export interface DebtAdjustmentConfig {
  type: DebtAdjustmentType;
  annualPercentRate?: number;
  series?: DebtSeries[];
  frequency?: DebtSeriesFrequency;
}

export interface PagamentoHistorico {
  id: string;
  data: string;
  valor: number;
  tipo: AmortizacaoTipo;
  saldoAnterior: number;
  saldoPosterior: number;
  parcelaNumero: number;
}

export interface DebtItem {
  id?: string;
  nome: string;
  tipo: string;
  saldoDevedor: number;
  taxaMensal: number;
  parcelasRestantes: number;
  valorParcela: number;
  dataVencimento: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  proposito?: string;
  originType?: DebtOriginType;
  originCardId?: string;
  originInvoiceId?: string;
  originInvoicePeriodEnd?: string;
  lastInterestAppliedAt?: string;
  totalParcelas: number;
  parcelasPagas: number;
  historicoPagamentos: PagamentoHistorico[];
  adjustmentConfig?: DebtAdjustmentConfig;
  currentSeriesIndex?: number;
  nextAdjustmentDate?: string | null;
}