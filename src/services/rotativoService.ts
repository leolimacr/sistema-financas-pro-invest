import { saveInvoice, getInvoice } from './invoiceService';
import { runTransaction, doc, collection, deleteDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { eventBus } from '../core/orchestration/event-bus';
import { EVENT_TYPES, createDomainEvent } from '../core/orchestration/domainEvents';
import type { CardInvoice, CreditCard } from '../types';
import type { DebtItem } from './debt/debt.types';
import { computeRotativoMonthlyInterest, hasInterestBeenAppliedThisMonth } from './rotativo.math';
import { PresenceEventService } from './PresenceEventService';
import { prepareConversionRecord, prepareManualInterestRecord, prepareRevertMark } from './rotativoInterestHistory';

export interface OverdueInvoiceInfo {
  cardId: string;
  cardName: string;
  invoiceId: string;
  periodEnd: string;
  remainingAmount: number;
  dueDate: string;
  taxaJuros?: number;
}

export function checkOverdueInvoices(
  cards: CreditCard[],
  invoices: CardInvoice[]
): OverdueInvoiceInfo[] {
  const now = new Date();
  const cardMap = new Map(cards.map(c => [c.id, c]));
  const results: OverdueInvoiceInfo[] = [];

  for (const invoice of invoices) {
    if (invoice.rotativoConverted) continue;
    if (invoice.rotativoSettled) continue;
    if (invoice.remainingAmount <= 0) continue;
    if (!invoice.dueDate) continue;

    if (new Date(invoice.dueDate) < now) {
      const card = cardMap.get(invoice.cardId);
      results.push({
        cardId: invoice.cardId,
        cardName: card?.name || 'Cartão',
        invoiceId: invoice.id,
        periodEnd: invoice.periodEnd,
        remainingAmount: invoice.remainingAmount,
        dueDate: invoice.dueDate,
        taxaJuros: card?.taxaJuros,
      });
    }
  }

  return results;
}

export async function convertToDebt(
  userId: string,
  info: OverdueInvoiceInfo
): Promise<{ success: boolean; debtId?: string; error?: string }> {
  try {
    const debtRef = doc(collection(firestore, `users/${userId}/dividas`));
    const debtId = debtRef.id;
    const invoiceRef = doc(firestore, `users/${userId}/faturas`, info.invoiceId);
    const now = new Date().toISOString();
    const nowDate = new Date();

    await runTransaction(firestore, async (transaction) => {
      const invoiceSnap = await transaction.get(invoiceRef);
      if (!invoiceSnap.exists()) {
        throw new Error('Fatura não encontrada');
      }
      const invoiceData = invoiceSnap.data();
      if (invoiceData.rotativoConverted) {
        throw new Error('Fatura já convertida para rotativo');
      }

      transaction.set(debtRef, {
        nome: `Rotativo - ${info.cardName} - ${info.periodEnd}`,
        tipo: 'Rotativo cartão',
        saldoDevedor: info.remainingAmount,
        taxaMensal: info.taxaJuros ?? 0,
        parcelasRestantes: 1,
        valorParcela: info.remainingAmount,
        dataVencimento: info.dueDate || null,
        originType: 'rotativo_cartao',
        originCardId: info.cardId,
        originInvoiceId: info.invoiceId,
        originInvoicePeriodEnd: info.periodEnd,
        createdAt: nowDate,
      });

      transaction.set(invoiceRef, {
        rotativoConverted: true,
        rotativoDebtId: debtId,
        rotativoConvertedAt: now,
        updatedAt: now,
      }, { merge: true });

      const convRecord = prepareConversionRecord(userId, {
        debtId,
        debtName: `Rotativo - ${info.cardName} - ${info.periodEnd}`,
        competence: info.periodEnd.slice(0, 7),
        principal: info.remainingAmount,
        taxaMensal: info.taxaJuros ?? 0,
      });
      transaction.set(convRecord.ref, convRecord.data);
    });

    eventBus.publish(createDomainEvent(
      'debt',
      EVENT_TYPES.debt.created,
      {
        debt: {
          id: debtId,
          nome: `Rotativo - ${info.cardName} - ${info.periodEnd}`,
          tipo: 'Rotativo cartão',
          saldoDevedor: info.remainingAmount,
          taxaMensal: info.taxaJuros ?? 0,
          parcelasRestantes: 1,
          valorParcela: info.remainingAmount,
          dataVencimento: info.dueDate || null,
          originType: 'rotativo_cartao' as const,
          originCardId: info.cardId,
          originInvoiceId: info.invoiceId,
          originInvoicePeriodEnd: info.periodEnd,
          createdAt: nowDate,
        },
        userId,
      },
      'rotativoService',
    ));

    PresenceEventService.create({
      uid: userId,
      eventType: 'debt.rotativo_converted',
      persona: 'debts',
      urgency: 'high',
      message: {
        title: 'Fatura convertida para rotativo',
        body: `Fatura de ${info.cardName} (${info.periodEnd}) convertida para dívida rotativa de R$ ${info.remainingAmount.toFixed(2)}.`,
        ctaLabel: 'Ver dívida',
      },
      deepLink: `minhas-dividas?highlight=${debtId}`,
      cooldownHours: 0,
      expiresInHours: 720,
      resourceId: debtId,
      payload: { cardName: info.cardName, amount: info.remainingAmount, periodEnd: info.periodEnd },
    });

    return { success: true, debtId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

async function findLinkedInvoice(
  userId: string,
  debt: DebtItem
): Promise<CardInvoice | null> {
  if (!debt.originCardId || !debt.originInvoicePeriodEnd) return null;
  const invoiceId = `${debt.originCardId}_${debt.originInvoicePeriodEnd}`;
  return getInvoice(userId, invoiceId);
}

export async function revertRotativoConversion(
  userId: string,
  debt: DebtItem
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!debt.id) return { success: false, error: 'Debt has no id' };

    const debtRef = doc(collection(firestore, `users/${userId}/dividas`), debt.id);
    const invoiceId = debt.originCardId && debt.originInvoicePeriodEnd
      ? `${debt.originCardId}_${debt.originInvoicePeriodEnd}`
      : null;
    const invoiceRef = invoiceId ? doc(firestore, `users/${userId}/faturas`, invoiceId) : null;
    const now = new Date().toISOString();

    let preRevertInvoice: {
      cardId: string;
      total: number;
      status: string;
      paidAmount: number;
      remainingAmount: number;
    } | null = null;

    await runTransaction(firestore, async (transaction) => {
      transaction.delete(debtRef);

      if (invoiceRef) {
        const invoiceSnap = await transaction.get(invoiceRef);
        if (invoiceSnap.exists()) {
          const data = invoiceSnap.data();
          if (data.rotativoConverted && data.rotativoDebtId === debt.id) {
            preRevertInvoice = {
              cardId: data.cardId || debt.originCardId || '',
              total: data.total || 0,
              status: data.status || 'open',
              paidAmount: data.paidAmount || 0,
              remainingAmount: data.remainingAmount || 0,
            };
            transaction.set(invoiceRef, {
              rotativoConverted: false,
              rotativoDebtId: null,
              rotativoConvertedAt: null,
              rotativoSettled: null,
              updatedAt: now,
            }, { merge: true });

            if (debt.originInvoicePeriodEnd) {
              const revertMark = prepareRevertMark(
                userId,
                debt.id!,
                debt.originInvoicePeriodEnd.slice(0, 7),
              );
              transaction.set(revertMark.ref, revertMark.data, { merge: true });
            }
          }
        }
      }
    });

    eventBus.publish(createDomainEvent(
      'debt',
      EVENT_TYPES.debt.deleted,
      {
        debtId: debt.id,
        userId,
        previousDebt: debt,
      },
      'rotativoService.revertRotativoConversion',
    ));

    if (preRevertInvoice) {
      eventBus.publish(createDomainEvent(
        'invoice',
        EVENT_TYPES.invoice.updated,
        {
          cardId: preRevertInvoice.cardId,
          userId,
          periodEnd: debt.originInvoicePeriodEnd || '',
          total: preRevertInvoice.total,
          status: preRevertInvoice.status,
          paidAmount: preRevertInvoice.paidAmount,
          remainingAmount: preRevertInvoice.remainingAmount,
        },
        'rotativoService.revertRotativoConversion',
      ));
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function settleRotativoConversion(
  userId: string,
  debt: DebtItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const invoice = await findLinkedInvoice(userId, debt);
    if (invoice && invoice.rotativoConverted && invoice.rotativoDebtId === debt.id) {
      const now = new Date().toISOString();
      await saveInvoice(userId, {
        ...invoice,
        rotativoSettled: true,
        updatedAt: now,
      });

      eventBus.publish(createDomainEvent(
        'invoice',
        EVENT_TYPES.invoice.updated,
        {
          cardId: invoice.cardId,
          userId,
          periodEnd: invoice.periodEnd,
          total: invoice.total,
          status: invoice.status,
          paidAmount: invoice.paidAmount,
          remainingAmount: invoice.remainingAmount,
        },
        'rotativoService.settleRotativoConversion',
      ));
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function amortizeRotativoDebt(
  userId: string,
  debt: DebtItem,
): Promise<{ success: boolean; interest?: number; newSaldo?: number; error?: string }> {
  if (debt.originType !== 'rotativo_cartao') {
    return { success: false, error: 'Não é dívida rotativa' };
  }
  if (debt.saldoDevedor <= 0) {
    return { success: false, error: 'Saldo devedor zerado' };
  }
  if (debt.taxaMensal <= 0) {
    return { success: false, error: 'Taxa mensal zerada' };
  }
  if (!debt.id) {
    return { success: false, error: 'Dívida sem ID' };
  }
  if (hasInterestBeenAppliedThisMonth(debt.lastInterestAppliedAt)) {
    return { success: false, error: 'Juros já aplicados neste mês' };
  }

  try {
    const debtRef = doc(collection(firestore, `users/${userId}/dividas`), debt.id);
    const now = new Date().toISOString();

    let interest = 0;
    let newSaldo = 0;

    await runTransaction(firestore, async (transaction) => {
      const snap = await transaction.get(debtRef);
      if (!snap.exists) {
        throw new Error('Dívida não encontrada');
      }
      const data = snap.data() as { saldoDevedor: number; taxaMensal: number; lastInterestAppliedAt?: string };
      const currentSaldo = data.saldoDevedor ?? 0;
      const currentTaxa = data.taxaMensal ?? 0;

      if (currentSaldo <= 0 || currentTaxa <= 0) return;
      if (hasInterestBeenAppliedThisMonth(data.lastInterestAppliedAt)) return;

      const computed = computeRotativoMonthlyInterest(currentSaldo, currentTaxa);
      interest = computed;
      newSaldo = currentSaldo + computed;

      transaction.update(debtRef, { saldoDevedor: newSaldo, lastInterestAppliedAt: now });

      const nowDate = new Date();
      const competence = nowDate.getFullYear() + '-' + String(nowDate.getMonth() + 1).padStart(2, '0');
      const manualRecord = prepareManualInterestRecord(userId, {
        debtId: debt.id!,
        debtName: debt.nome,
        competence,
        principal: currentSaldo,
        taxaMensal: currentTaxa,
        interestAmount: interest,
        newBalance: newSaldo,
        monthsLost: 1,
      });
      transaction.set(manualRecord.ref, manualRecord.data);
    });

    eventBus.publish(createDomainEvent(
      'debt',
      EVENT_TYPES.debt.updated,
      {
        debtId: debt.id,
        userId,
        previousDebt: debt,
        changes: { saldoDevedor: newSaldo, lastInterestAppliedAt: now },
      },
      'rotativoService.amortizeRotativoDebt',
    ));

    PresenceEventService.create({
      uid: userId,
      eventType: 'debt.rotativo_interest_applied',
      persona: 'debts',
      urgency: 'medium',
      message: {
        title: 'Juros do rotativo aplicados',
        body: `R$ ${interest.toFixed(2)} em juros aplicados ao saldo rotativo de ${debt.nome}. Novo saldo: R$ ${newSaldo.toFixed(2)}.`,
        ctaLabel: 'Ver dívida',
      },
      deepLink: `minhas-dividas?highlight=${debt.id}`,
      cooldownHours: 0,
      expiresInHours: 720,
      resourceId: debt.id,
      payload: { debtId: debt.id, debtName: debt.nome, interest: Math.round(interest * 100) / 100, newSaldo: Math.round(newSaldo * 100) / 100 },
    });

    return { success: true, interest, newSaldo };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
