import type { CardInvoice, CreditCard, Transaction, InvoiceStatus } from '../types';
import { saveInvoiceIfChanged, type InvoiceDerivedFields } from './invoiceService';
import { getInvoiceBillingMonth } from '../utils/invoiceUtils';

interface PeriodGroup {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  transactions: Transaction[];
  billPayments: Transaction[];
}

function getPeriodKey(card: CreditCard, tx: Transaction): string | null {
  if (!card.closingDay) return null;
  const billing = getInvoiceBillingMonth(card, tx.date);
  return `${billing.year}-${String(billing.month + 1).padStart(2, '0')}`;
}

function getPeriodDates(card: CreditCard, year: number, month: number): { periodStart: string; periodEnd: string; dueDate: string } {
  const closingDay = card.closingDay || 1;
  const dueDay = card.dueDay || 10;

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const startDay = closingDay + 1;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  const clampedStartDay = Math.min(startDay, daysInPrevMonth);

  const periodStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(clampedStartDay).padStart(2, '0')}`;

  const periodEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`;

  let dueMonth = month;
  let dueYear = year;
  if (dueDay < closingDay) {
    dueMonth = month + 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear = year + 1;
    }
  }
  const dueDate = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

  return { periodStart, periodEnd, dueDate };
}

function groupTransactionsByPeriod(card: CreditCard, transactions: Transaction[]): Map<string, PeriodGroup> {
  const groups = new Map<string, PeriodGroup>();

  const cardExpenses = transactions.filter(t => t.cardId === card.id && t.type === 'expense' && !(t.isBillPayment && !t.linkedRecurringBillId));

  for (const tx of cardExpenses) {
    const key = getPeriodKey(card, tx);
    if (!key) continue;

    const [y, m] = key.split('-').map(Number);
    const dates = getPeriodDates(card, y, m - 1);

    if (!groups.has(key)) {
      groups.set(key, {
        periodStart: dates.periodStart,
        periodEnd: dates.periodEnd,
        dueDate: dates.dueDate,
        transactions: [],
        billPayments: [],
      });
    }
    groups.get(key)!.transactions.push(tx);
  }

  const billPayments = transactions.filter(t => t.isBillPayment && t.linkedCardId === card.id);
  for (const bp of billPayments) {
    if (bp.linkedInvoicePeriodEnd) {
      for (const [, group] of groups) {
        if (group.periodEnd === bp.linkedInvoicePeriodEnd) {
          group.billPayments.push(bp);
          break;
        }
      }
    }
  }

  return groups;
}

function buildInvoiceFromGroup(
  card: CreditCard,
  group: PeriodGroup
): InvoiceDerivedFields {
  const total = Math.round(group.transactions.reduce((sum, t) => sum + (t.amount || 0), 0) * 100) / 100;
  const paidAmount = Math.round(group.billPayments.reduce((sum, t) => sum + (t.amount || 0), 0) * 100) / 100;

  let status: InvoiceStatus = 'open';
  if (total > 0 && paidAmount >= total) status = 'paid';
  else if (paidAmount > 0) status = 'partial';

  const remainingAmount = Math.max(0, Math.round((total - paidAmount) * 100) / 100);
  const lastTxDate = group.transactions.length > 0
    ? group.transactions.reduce((latest, t) => t.date > latest ? t.date : latest, group.transactions[0].date)
    : undefined;

  return {
    cardId: card.id,
    periodStart: group.periodStart,
    periodEnd: group.periodEnd,
    dueDate: group.dueDate,
    total,
    status,
    paidAmount,
    remainingAmount,
    transactionCount: group.transactions.length,
    lastTransactionDate: lastTxDate,
  };
}

export interface SyncCardsInvoicesResult {
  synced: number;
  changed: number;
  skipped: number;
  errors: number;
}

export async function syncCardInvoices(
  userId: string,
  card: CreditCard,
  transactions: Transaction[],
  existingInvoices: CardInvoice[] = [],
): Promise<SyncCardsInvoicesResult> {
  let synced = 0;
  let changed = 0;
  let skipped = 0;
  let errors = 0;

  if (!card.closingDay || !card.dueDay) {
    return { synced, changed, skipped, errors };
  }

  try {
    const existingById = new Map(existingInvoices.map((invoice) => [invoice.id, invoice]));
    const groups = groupTransactionsByPeriod(card, transactions);

    for (const [, group] of groups) {
      if (group.transactions.length === 0) continue;

      try {
        const invoice = buildInvoiceFromGroup(card, group);
        const result = await saveInvoiceIfChanged(userId, invoice, existingById);
        synced++;
        if (result.written) {
          changed++;
        } else {
          skipped++;
        }
      } catch {
        errors++;
      }
    }
  } catch {
    errors++;
  }

  return { synced, changed, skipped, errors };
}

export async function syncAllCardsInvoices(
  userId: string,
  cards: CreditCard[],
  transactions: Transaction[],
  existingInvoices: CardInvoice[] = [],
): Promise<{ synced: number; errors: number; cardCount: number }> {
  let totalChanged = 0;
  let totalErrors = 0;
  let cardCount = 0;

  for (const card of cards) {
    if (card.type === 'voucher') continue;
    if (!card.closingDay || !card.dueDay) continue;
    cardCount++;
    const result = await syncCardInvoices(userId, card, transactions, existingInvoices);
    totalChanged += result.changed;
    totalErrors += result.errors;
  }

  return { synced: totalChanged, errors: totalErrors, cardCount };
}
