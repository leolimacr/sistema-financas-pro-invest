import type { DocumentData, CollectionReference } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../firebase';
import { queryClient } from '../core/query/queryClient';
import { queryKeys } from '../core/query/queryKeys';
import type { CardInvoice, CreditCard, InvoiceStatus } from '../types';
import { getInvoiceBillingMonth } from '../utils/invoiceUtils';

const getInvoicesCollection = (userId: string): CollectionReference<DocumentData> => {
  return collection(firestore, `users/${userId}/faturas`);
};

export const buildInvoiceId = (cardId: string, periodEnd: string): string => {
  return `${cardId}_${periodEnd}`;
};

export const getInvoice = async (userId: string, invoiceId: string): Promise<CardInvoice | null> => {
  const ref = doc(firestore, `users/${userId}/faturas`, invoiceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CardInvoice;
};

export const getInvoicesByCard = async (userId: string, cardId: string): Promise<CardInvoice[]> => {
  const col = getInvoicesCollection(userId);
  const q = query(col, where('cardId', '==', cardId), orderBy('periodEnd', 'desc'), limit(24));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CardInvoice));
};

export const getAllInvoices = async (userId: string): Promise<CardInvoice[]> => {
  const q = query(getInvoicesCollection(userId), orderBy('periodEnd', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CardInvoice));
};

export const getCurrentStoredInvoice = async (userId: string, cardId: string, periodEnd: string): Promise<CardInvoice | null> => {
  const invoiceId = buildInvoiceId(cardId, periodEnd);
  return getInvoice(userId, invoiceId);
};

export type InvoiceDerivedFields = Pick<
  CardInvoice,
  'cardId' | 'periodStart' | 'periodEnd' | 'dueDate' | 'total' | 'status' |
  'paidAmount' | 'remainingAmount' | 'transactionCount'
> & {
  lastTransactionDate?: string;
};

export const INVOICE_FINGERPRINT_VERSION = 'v1';

const FINGERPRINT_FIELDS: Array<keyof InvoiceDerivedFields> = [
  'cardId', 'periodStart', 'periodEnd', 'dueDate', 'total', 'status',
  'paidAmount', 'remainingAmount', 'transactionCount', 'lastTransactionDate',
];

function normalizeMoney(value: unknown): string {
  if (value == null) return 'null';
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n * 100)) : 'null';
}

function normalizeCount(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n)) : '0';
}

function normalizeText(value: unknown): string {
  return value == null ? 'null' : String(value);
}

export function computeInvoiceFingerprintV1(invoice: InvoiceDerivedFields): string {
  const parts: string[] = [INVOICE_FINGERPRINT_VERSION];
  for (const field of FINGERPRINT_FIELDS) {
    const value = (invoice as Record<string, unknown>)[field];
    const normalized = field === 'total' || field === 'paidAmount' || field === 'remainingAmount'
      ? normalizeMoney(value)
      : field === 'transactionCount'
        ? normalizeCount(value)
        : normalizeText(value);
    parts.push(field, normalized);
  }
  return parts.join('\u001f');
}

function invalidateInvoiceQueries(userId: string, cardId: string): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.byUser(userId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.byCard(userId, cardId) });
}

export interface InvoiceSyncResult {
  written: boolean;
  reason: 'created' | 'updated' | 'unchanged';
}

/**
 * Write-if-changed: only persists when the computed business payload differs from
 * the already-loaded invoice (in-memory `existingById`, no extra Firestore read).
 * - identical document  -> no write at all (createdAt/updatedAt untouched);
 * - business change     -> merge update WITHOUT createdAt (preserved);
 * - missing document    -> create WITH createdAt.
 * `_fingerprint` is derived from business fields only (never createdAt/updatedAt).
 */
export const saveInvoiceIfChanged = async (
  userId: string,
  invoice: InvoiceDerivedFields,
  existingById: Map<string, CardInvoice>,
): Promise<InvoiceSyncResult> => {
  const invoiceId = buildInvoiceId(invoice.cardId, invoice.periodEnd);
  const ref = doc(firestore, `users/${userId}/faturas`, invoiceId);
  const fingerprint = computeInvoiceFingerprintV1(invoice);
  const existing = existingById.get(invoiceId);
  const now = new Date().toISOString();

  if (existing) {
    const existingFingerprint = typeof existing._fingerprint === 'string'
      ? existing._fingerprint
      : computeInvoiceFingerprintV1(existing);
    if (existingFingerprint === fingerprint) {
      return { written: false, reason: 'unchanged' };
    }
    await setDoc(ref, { ...invoice, updatedAt: now, _fingerprint: fingerprint }, { merge: true });
    invalidateInvoiceQueries(userId, invoice.cardId);
    return { written: true, reason: 'updated' };
  }

  await setDoc(ref, { ...invoice, createdAt: now, updatedAt: now, _fingerprint: fingerprint }, { merge: true });
  invalidateInvoiceQueries(userId, invoice.cardId);
  return { written: true, reason: 'created' };
};

export const saveInvoice = async (userId: string, invoice: Omit<CardInvoice, 'id'>): Promise<void> => {
  const invoiceId = buildInvoiceId(invoice.cardId, invoice.periodEnd);
  const ref = doc(firestore, `users/${userId}/faturas`, invoiceId);
  await setDoc(ref, invoice, { merge: true });
  invalidateInvoiceQueries(userId, invoice.cardId);
};

export const deleteInvoice = async (userId: string, invoiceId: string): Promise<void> => {
  const ref = doc(firestore, `users/${userId}/faturas`, invoiceId);
  await deleteDoc(ref);
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.byUser(userId) });
};

export interface InvoiceUpdateData {
  paidAmount: number;
  status: InvoiceStatus;
  remainingAmount: number;
  total: number;
  updatedAt: string;
}

export const updateInvoiceAfterPayment = async (
  userId: string,
  cardId: string,
  periodEnd: string,
  data: InvoiceUpdateData
): Promise<void> => {
  const invoiceId = buildInvoiceId(cardId, periodEnd);
  const ref = doc(firestore, `users/${userId}/faturas`, invoiceId);
  await setDoc(ref, {
    cardId,
    periodEnd,
    ...data,
  }, { merge: true });
};

function getPeriodDatesForPayment(card: CreditCard, paymentDate: string): { periodEnd: string; dueDate: string } | null {
  if (!card.closingDay || !card.dueDay) return null;
  const billing = getInvoiceBillingMonth(card, paymentDate);
  const y = billing.year;
  const m = billing.month;
  const periodEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(card.closingDay).padStart(2, '0')}`;
  return { periodEnd, dueDate: billing.dueDate };
}

export async function syncInvoiceAfterPayment(
  userId: string,
  cardId: string,
  paymentAmount: number,
  paymentDate: string,
  card: CreditCard
): Promise<void> {
  const period = getPeriodDatesForPayment(card, paymentDate);
  if (!period) return;

  const invoiceId = buildInvoiceId(cardId, period.periodEnd);
  const existing = await getInvoice(userId, invoiceId);

  if (existing?.rotativoConverted) return;

  const now = new Date().toISOString();
  if (existing) {
    const newPaidAmount = Math.max(0, Math.round(((existing.paidAmount || 0) + paymentAmount) * 100) / 100);
    const existingTotal = Math.round((existing.total || 0) * 100) / 100;
    const newRemaining = Math.max(0, Math.round((existingTotal - newPaidAmount) * 100) / 100);
    const newStatus: InvoiceStatus = newPaidAmount >= existingTotal ? 'paid' : 'partial';
    await updateInvoiceAfterPayment(userId, cardId, period.periodEnd, {
      paidAmount: newPaidAmount,
      status: newStatus,
      remainingAmount: newRemaining,
      total: existingTotal,
      updatedAt: now,
    });
  } else {
    await updateInvoiceAfterPayment(userId, cardId, period.periodEnd, {
      paidAmount: paymentAmount,
      status: 'partial',
      remainingAmount: 0,
      total: 0,
      updatedAt: now,
    });
  }
}
