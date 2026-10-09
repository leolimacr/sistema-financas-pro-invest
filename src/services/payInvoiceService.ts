import { ref, push, set } from 'firebase/database';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, firestore } from '../firebase';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../core/query/queryKeys';
import { eventBus } from '../core/orchestration/event-bus';
import { EVENT_TYPES } from '../core/orchestration/domainEvents';
import { buildInvoiceId, getInvoice, syncInvoiceAfterPayment, updateInvoiceAfterPayment } from './invoiceService';
import { getLocalDateString } from '../utils/dateHelpers';
import { updateDebt } from './debt/debtService';
import type { DebtItem } from './debt/debt.types';

export interface PayInvoiceParams {
  userId: string;
  cardId: string;
  cardName: string;
  amount: number;
  date?: string;
  invoiceId?: string;
  periodEnd?: string;
  queryClient: QueryClient;
}

/**
 * Fluxo unificado de pagamento de fatura de cartão de crédito.
 *
 * 1. Lê saldoUtilizadoTotal atual do cartão no Firestore
 * 2. Decrementa saldoUtilizadoTotal (libera limite)
 * 3. Cria transação de despesa no RTDB com isBillPayment e linkedCardId
 * 4. Publica eventos de domínio (transaction.created + card.usage.updated)
 * 5. Invalida caches de transações e cartões
 *
 * Usado tanto pelo CardManager quanto pelo NexusAction para garantir
 * comportamento idêntico independentemente do ponto de entrada.
 */
export async function payInvoice(params: PayInvoiceParams): Promise<{ success: boolean; error?: string }> {
  const { userId, cardId, cardName, amount, date: rawDate, invoiceId, periodEnd, queryClient } = params;
  const date = rawDate || getLocalDateString();

  if (!userId || !cardId || amount <= 0) {
    return { success: false, error: 'Parâmetros inválidos' };
  }

  try {
    const cardRef = doc(firestore, `users/${userId}/cartoes/${cardId}`);
    const cardSnap = await getDoc(cardRef);
    if (!cardSnap.exists()) {
      return { success: false, error: 'Cartão não encontrado' };
    }

    const cardData = cardSnap.data() as { saldoUtilizadoTotal?: number; closingDay?: number; dueDay?: number; name: string; id?: string };
    const currentSaldo = cardData.saldoUtilizadoTotal || 0;
    const newSaldo = Math.max(0, currentSaldo - amount);

    await updateDoc(cardRef, { saldoUtilizadoTotal: newSaldo });

    const transactionsRef = ref(db, `transactions/${userId}`);
    const txRef = push(transactionsRef);
    const savedTransaction: Record<string, unknown> = {
      id: txRef.key!,
      userId,
      type: 'expense' as const,
      category: `Fatura - Cartão ${cardName}`,
      amount,
      description: `Pagamento Fatura ${cardName}`,
      date,
      paymentMethod: 'money' as const,
      isBillPayment: true,
      linkedCardId: cardId,
      createdAt: new Date().toISOString(),
    };

    if (periodEnd) {
      savedTransaction.linkedInvoicePeriodEnd = periodEnd;
    }
    if (invoiceId) {
      savedTransaction.linkedInvoiceId = invoiceId;
    }
    await set(txRef, savedTransaction);

    eventBus.publish({
      type: EVENT_TYPES.card.usageUpdated,
      payload: {
        cardId,
        userId,
        previousSaldoUtilizado: currentSaldo,
        newSaldoUtilizado: newSaldo,
        reason: 'bill_payment',
      },
    });

    eventBus.publish({
      type: EVENT_TYPES.transaction.created,
      payload: {
        transaction: savedTransaction,
        isNew: true,
        userId,
      },
    });

    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byUser(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.cards.byUser(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.byUser(userId) });

    const targetInvoiceId = invoiceId || (periodEnd ? buildInvoiceId(cardId, periodEnd) : null);
    const invoice = targetInvoiceId ? await getInvoice(userId, targetInvoiceId).catch(() => null) : null;

    if (invoice?.rotativoConverted && invoice.rotativoDebtId) {
      const debtRef = doc(firestore, `users/${userId}/dividas`, invoice.rotativoDebtId);
      const debtSnap = await getDoc(debtRef);
      if (debtSnap.exists()) {
        const debt = { id: debtSnap.id, ...debtSnap.data() } as DebtItem;
        const newSaldo = Math.max(0, (debt.saldoDevedor || 0) - amount);
        await updateDebt(userId, invoice.rotativoDebtId, { saldoDevedor: newSaldo });
        if (newSaldo <= 0) {
          const { settleRotativoConversion } = await import('./rotativoService');
          await settleRotativoConversion(userId, { ...debt, saldoDevedor: 0 });
        }
      }
    } else {
      if (invoice) {
        const newPaidAmount = Math.max(0, Math.round(((invoice.paidAmount || 0) + amount) * 100) / 100);
        const total = Math.round((invoice.total || 0) * 100) / 100;
        const newRemaining = Math.max(0, Math.round((total - newPaidAmount) * 100) / 100);
        const newStatus = newPaidAmount >= total ? 'paid' : 'partial';

        await updateInvoiceAfterPayment(userId, invoice.cardId || cardId, invoice.periodEnd, {
          paidAmount: newPaidAmount,
          status: newStatus,
          remainingAmount: newRemaining,
          total,
          updatedAt: new Date().toISOString(),
        });
      } else if (!invoiceId && !periodEnd) {
        syncInvoiceAfterPayment(userId, cardId, amount, date, { id: cardId, ...cardData } as any).catch(() => {});
      }
    }

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  }
}
