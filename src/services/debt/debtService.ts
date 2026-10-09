import type {
  DocumentData,
  CollectionReference} from 'firebase/firestore';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { firestore } from '../../firebase';
import { queryClient } from '../../core/query/queryClient';
import { queryKeys } from '../../core/query/queryKeys';
import type { DebtItem, PagamentoHistorico, AmortizacaoTipo } from './debt.types';
import { mapDebtFromFirestore, mapDebtToFirestore } from './debt.mapper';
import { computeRemainingInstallments, getCurrentSeriesInfo } from './debt.math';
import { eventBus } from '../../core/orchestration/event-bus';
import { createDomainEvent, EVENT_TYPES } from '../../core/orchestration/domainEvents';
import type { DebtAmortizedEvent } from '../../core/orchestration/domainEvents';

const getDebtsCollection = (userId: string): CollectionReference<DocumentData> => {
  return collection(firestore, `users/${userId}/dividas`);
};

export const saveDebt = async (userId: string, debt: DebtItem): Promise<string> => {
  const docRef = await addDoc(getDebtsCollection(userId), mapDebtToFirestore(debt));
  queryClient.invalidateQueries({ queryKey: queryKeys.debts.byUser(userId) });
  return docRef.id;
};

export const updateDebt = async (userId: string, debtId: string, debt: Partial<DebtItem>): Promise<void> => {
  const debtRef = doc(getDebtsCollection(userId), debtId);
  await updateDoc(debtRef, debt);
  queryClient.invalidateQueries({ queryKey: queryKeys.debts.byUser(userId) });
};

export const deleteDebt = async (userId: string, debtId: string): Promise<void> => {
  const debtRef = doc(getDebtsCollection(userId), debtId);
  await deleteDoc(debtRef);
  queryClient.invalidateQueries({ queryKey: queryKeys.debts.byUser(userId) });
};

/**
 * Abate uma parcela de todas as dívidas ativas (Amortização Automática Mensal)
 * @deprecated Use amortizeSingleDebt para amortização individual por dívida
 */
export const amortizeDebts = async (userId: string): Promise<void> => {
  const querySnapshot = await getDocs(getDebtsCollection(userId));
  const promises = querySnapshot.docs.map(async (d) => {
    const data = mapDebtFromFirestore(d.id, d.data());
    if (data.saldoDevedor > 0 && data.parcelasRestantes > 0 && data.originType !== 'rotativo_cartao') {
      const newSaldo = Math.max(0, data.saldoDevedor - data.valorParcela);
      const newParcelas = Math.max(0, data.parcelasRestantes - 1);
      await updateDebt(userId, d.id, { 
        saldoDevedor: newSaldo, 
        parcelasRestantes: newParcelas 
      });
    }
  });
  await Promise.all(promises);
};

export interface AmortizeSingleDebtOptions {
  tipo: AmortizacaoTipo;
  valorExtra?: number;
}

export interface AmortizeResult {
  debtId: string;
  previousSaldo: number;
  newSaldo: number;
  previousParcelas: number;
  newParcelas: number;
  parcelaPaga: number;
  valorAbatido: number;
  tipo: AmortizacaoTipo;
}

/**
 * Abate uma parcela de uma dívida específica
 * - tipo 'normal': abate exatamente uma parcela (valorParcela)
 * - tipo 'extraordinaria': abate parcela normal + valorExtra
 */
export const amortizeSingleDebt = async (
  userId: string,
  debtId: string,
  options: AmortizeSingleDebtOptions
): Promise<AmortizeResult> => {
  const snapshot = await getDocs(collection(firestore, `users/${userId}/dividas`));
  const debtDoc = snapshot.docs.find(d => d.id === debtId);
  
  if (!debtDoc) {
    throw new Error('Dívida não encontrada');
  }

  const debt = mapDebtFromFirestore(debtDoc.id, debtDoc.data());
  
  if (debt.saldoDevedor <= 0) {
    throw new Error('Dívida já quitada');
  }
  if (debt.parcelasRestantes <= 0) {
    throw new Error('Nenhuma parcela restante para abater');
  }
  if (debt.originType === 'rotativo_cartao') {
    throw new Error('Não é possível abater parcelas de dívida rotativa. Use a função de aplicar juros.');
  }

  const config = debt.adjustmentConfig;
  const isSeriesDebt = config && config.type !== 'fixed' && config.series && config.series.length > 0;

  let valorParcelaNormal: number;
  let newCurrentSeriesIndex = debt.currentSeriesIndex ?? 0;
  let newNextAdjustmentDate = debt.nextAdjustmentDate || null;

  if (isSeriesDebt) {
    const currentSeriesInfo = getCurrentSeriesInfo(debt);
    valorParcelaNormal = currentSeriesInfo.series?.installmentValue || debt.valorParcela;
  } else {
    valorParcelaNormal = debt.valorParcela;
  }

  const valorExtra = options.valorExtra || 0;
  const valorAbatido = options.tipo === 'extraordinaria' 
    ? valorParcelaNormal + valorExtra 
    : valorParcelaNormal;

  const newSaldo = Math.max(0, debt.saldoDevedor - valorAbatido);
  
  // Calculate installments paid in this amortization
  const parcelasPagasNestaAmortizacao = Math.ceil(valorAbatido / valorParcelaNormal);
  
  // Calculate new remaining installments
  let newParcelasRestantes: number;
  let newParcelasPagas: number;
  
  if (isSeriesDebt) {
    newParcelasPagas = (debt.parcelasPagas || 0) + parcelasPagasNestaAmortizacao;
    newParcelasRestantes = computeRemainingInstallments({
      ...debt,
      parcelasPagas: newParcelasPagas,
    } as DebtItem);
    
    // Check if we advanced to a new series
    const oldSeriesInfo = getCurrentSeriesInfo(debt);
    const newSeriesInfo = getCurrentSeriesInfo({
      ...debt,
      parcelasPagas: newParcelasPagas,
    } as DebtItem);
    
    if (newSeriesInfo.seriesIndex !== oldSeriesInfo.seriesIndex) {
      newCurrentSeriesIndex = newSeriesInfo.seriesIndex;
      // Set next adjustment date to the start of the new series
      if (newSeriesInfo.series) {
        const startDate = new Date(newSeriesInfo.series.year, newSeriesInfo.series.startMonth - 1, 1);
        newNextAdjustmentDate = startDate.toISOString();
      }
    }
  } else {
    newParcelasRestantes = Math.max(0, debt.parcelasRestantes - parcelasPagasNestaAmortizacao);
    newParcelasPagas = (debt.parcelasPagas || 0) + parcelasPagasNestaAmortizacao;
  }

  const novoHistorico: PagamentoHistorico = {
    id: crypto.randomUUID(),
    data: new Date().toISOString(),
    valor: valorAbatido,
    tipo: options.tipo,
    saldoAnterior: debt.saldoDevedor,
    saldoPosterior: newSaldo,
    parcelaNumero: (debt.parcelasPagas || 0) + 1,
  };

  const updatedDebt: Partial<DebtItem> = {
    saldoDevedor: newSaldo,
    parcelasRestantes: newParcelasRestantes,
    parcelasPagas: newParcelasPagas,
    historicoPagamentos: [...debt.historicoPagamentos, novoHistorico],
    currentSeriesIndex: newCurrentSeriesIndex,
    nextAdjustmentDate: newNextAdjustmentDate,
  };

  await updateDebt(userId, debtId, updatedDebt);

  await eventBus.publish(createDomainEvent<DebtAmortizedEvent['payload']>(
    'debt',
    EVENT_TYPES.debt.amortized,
    {
      debtId,
      userId,
      amount: valorAbatido,
      previousSaldo: debt.saldoDevedor,
      newSaldo,
      previousParcelas: debt.parcelasRestantes,
      newParcelas: newParcelasRestantes,
    },
    'debtService.amortizeSingleDebt'
  ));

  return {
    debtId,
    previousSaldo: debt.saldoDevedor,
    newSaldo,
    previousParcelas: debt.parcelasRestantes,
    newParcelas: newParcelasRestantes,
    parcelaPaga: parcelasPagasNestaAmortizacao,
    valorAbatido,
    tipo: options.tipo,
  };
};
