import type { DebtItem, DebtSeries, DebtAdjustmentConfig } from './debt.types';
import type { DebtPersist } from './debt.persist';
import { Timestamp } from 'firebase/firestore';

const mapSeriesFromFirestore = (series: any[]): DebtSeries[] => {
  if (!series) return [];
  return series.map((s: any) => ({
    id: s.id,
    year: s.year,
    startMonth: s.startMonth,
    installmentsCount: s.installmentsCount,
    installmentValue: s.installmentValue,
    adjustmentRate: s.adjustmentRate,
    effectiveRate: s.effectiveRate,
  }));
};

const mapSeriesToFirestore = (series: DebtSeries[]): any[] => {
  if (!series) return [];
  return series.map(s => ({
    id: s.id,
    year: s.year,
    startMonth: s.startMonth,
    installmentsCount: s.installmentsCount,
    installmentValue: s.installmentValue,
    adjustmentRate: s.adjustmentRate,
    effectiveRate: s.effectiveRate,
  }));
};

const mapAdjustmentConfigFromFirestore = (config: any): DebtAdjustmentConfig | undefined => {
  if (!config) return undefined;
  return {
    type: config.type,
    annualPercentRate: config.annualPercentRate,
    series: mapSeriesFromFirestore(config.series),
    frequency: config.frequency,
  };
};

const mapAdjustmentConfigToFirestore = (config: DebtAdjustmentConfig | undefined): any => {
  if (!config) return undefined;
  return {
    type: config.type,
    annualPercentRate: config.annualPercentRate,
    series: mapSeriesToFirestore(config.series || []),
    frequency: config.frequency,
  };
};

export const mapDebtFromFirestore = (docId: string, data: any): DebtItem => {
  const persistData = data as DebtPersist;
  return {
    id: docId,
    nome: persistData.nome,
    tipo: persistData.tipo,
    saldoDevedor: persistData.saldoDevedor,
    taxaMensal: persistData.taxaMensal,
    parcelasRestantes: persistData.parcelasRestantes,
    valorParcela: persistData.valorParcela,
    dataVencimento: persistData.dataVencimento || null,
    createdAt: persistData.createdAt instanceof Timestamp ? persistData.createdAt.toDate() : new Date(persistData.createdAt),
    updatedAt: persistData.updatedAt instanceof Timestamp ? persistData.updatedAt.toDate() : (persistData.updatedAt ? new Date(persistData.updatedAt) : undefined),
    originType: (persistData.originType as DebtItem['originType']) || undefined,
    originCardId: persistData.originCardId || undefined,
    originInvoiceId: persistData.originInvoiceId || undefined,
    originInvoicePeriodEnd: persistData.originInvoicePeriodEnd || undefined,
    lastInterestAppliedAt: persistData.lastInterestAppliedAt || undefined,
    totalParcelas: persistData.totalParcelas ?? persistData.parcelasRestantes,
    parcelasPagas: persistData.parcelasPagas ?? 0,
    historicoPagamentos: (persistData.historicoPagamentos || []).map((p: any) => ({
      id: p.id,
      data: p.data,
      valor: p.valor,
      tipo: p.tipo,
      saldoAnterior: p.saldoAnterior,
      saldoPosterior: p.saldoPosterior,
      parcelaNumero: p.parcelaNumero,
    })),
    adjustmentConfig: mapAdjustmentConfigFromFirestore(persistData.adjustmentConfig),
    currentSeriesIndex: persistData.currentSeriesIndex ?? 0,
    nextAdjustmentDate: persistData.nextAdjustmentDate || null,
  };
};

export const mapDebtToFirestore = (debt: Omit<DebtItem, 'id'>): DebtPersist => {
  return {
    nome: debt.nome,
    tipo: debt.tipo,
    saldoDevedor: debt.saldoDevedor,
    taxaMensal: debt.taxaMensal,
    parcelasRestantes: debt.parcelasRestantes,
    valorParcela: debt.valorParcela,
    dataVencimento: debt.dataVencimento,
    createdAt: debt.createdAt || new Date(),
    updatedAt: debt.updatedAt || new Date(),
    originType: debt.originType,
    originCardId: debt.originCardId,
    originInvoiceId: debt.originInvoiceId,
    originInvoicePeriodEnd: debt.originInvoicePeriodEnd,
    lastInterestAppliedAt: debt.lastInterestAppliedAt,
    totalParcelas: debt.totalParcelas ?? debt.parcelasRestantes,
    parcelasPagas: debt.parcelasPagas ?? 0,
    historicoPagamentos: (debt.historicoPagamentos || []).map(p => ({
      id: p.id,
      data: p.data,
      valor: p.valor,
      tipo: p.tipo,
      saldoAnterior: p.saldoAnterior,
      saldoPosterior: p.saldoPosterior,
      parcelaNumero: p.parcelaNumero,
    })),
    adjustmentConfig: mapAdjustmentConfigToFirestore(debt.adjustmentConfig),
    currentSeriesIndex: debt.currentSeriesIndex ?? 0,
    nextAdjustmentDate: debt.nextAdjustmentDate || null,
  };
};