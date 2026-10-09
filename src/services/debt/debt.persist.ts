import type { Timestamp } from 'firebase/firestore';
import type { DebtAdjustmentConfig } from './debt.types';

export interface DebtPersist {
  nome: string;
  tipo: string;
  saldoDevedor: number;
  taxaMensal: number;
  parcelasRestantes: number;
  valorParcela: number;
  dataVencimento?: string | null;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  originType?: string;
  originCardId?: string;
  originInvoiceId?: string;
  originInvoicePeriodEnd?: string;
  lastInterestAppliedAt?: string;
  totalParcelas: number;
  parcelasPagas: number;
  historicoPagamentos: {
    id: string;
    data: string;
    valor: number;
    tipo: string;
    saldoAnterior: number;
    saldoPosterior: number;
    parcelaNumero: number;
  }[];
  adjustmentConfig?: DebtAdjustmentConfig;
  currentSeriesIndex?: number;
  nextAdjustmentDate?: string | null;
}