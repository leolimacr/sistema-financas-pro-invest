import type { Transaction, CreditCard, CardInvoice } from '../../types';
import type { DebtItem } from '../../services/debt';

export interface DomainEvent<T = any> {
  timestamp: number;
  domain: string;
  type: string;
  payload: T;
  correlationId: string;
  source: string;
}

export type TransactionCreatedEvent = DomainEvent<{
  transaction: Transaction;
  isNew: boolean;
  userId: string;
}>;

export type TransactionUpdatedEvent = DomainEvent<{
  transaction: Transaction;
  previousTransaction: Transaction | null;
  userId: string;
  changedFields: string[];
}>;

export type TransactionDeletedEvent = DomainEvent<{
  transactionId: string;
  userId: string;
  previousTransaction: Transaction;
}>;

export type DebtCreatedEvent = DomainEvent<{
  debt: DebtItem;
  userId: string;
}>;

export type DebtUpdatedEvent = DomainEvent<{
  debtId: string;
  userId: string;
  previousDebt: DebtItem | null;
  changes: Partial<DebtItem>;
}>;

export type DebtAmortizedEvent = DomainEvent<{
  debtId: string;
  userId: string;
  amount: number;
  previousSaldo: number;
  newSaldo: number;
  previousParcelas: number;
  newParcelas: number;
}>;

export type DebtDeletedEvent = DomainEvent<{
  debtId: string;
  userId: string;
  previousDebt: DebtItem;
}>;

export type CardUsageUpdatedEvent = DomainEvent<{
  cardId: string;
  userId: string;
  previousSaldoUtilizado: number;
  newSaldoUtilizado: number;
  reason: 'purchase' | 'bill_payment' | 'installment' | 'edit' | 'delete' | 'rollback';
  transactionId?: string;
}>;

export type TransactionEvent = 
  | TransactionCreatedEvent 
  | TransactionUpdatedEvent 
  | TransactionDeletedEvent;

export type DebtEvent = 
  | DebtCreatedEvent 
  | DebtUpdatedEvent 
  | DebtAmortizedEvent 
  | DebtDeletedEvent;

export type InvoiceUpdatedEvent = DomainEvent<{
  cardId: string;
  userId: string;
  periodEnd: string;
  total: number;
  status: CardInvoice['status'];
  paidAmount: number;
  remainingAmount: number;
}>;

export type CardInvoiceOverdueEvent = DomainEvent<{
  cardId: string;
  userId: string;
  invoiceId: string;
  periodEnd: string;
  remainingAmount: number;
  dueDate: string;
  cardName: string;
}>;

export type CardEvent = 
  | CardUsageUpdatedEvent
  | CardInvoiceOverdueEvent;

export const EVENT_TYPES = {
  transaction: {
    created: 'transaction.created',
    updated: 'transaction.updated',
    deleted: 'transaction.deleted',
  },
  debt: {
    created: 'debt.created',
    updated: 'debt.updated',
    amortized: 'debt.amortized',
    deleted: 'debt.deleted',
  },
  card: {
    usageUpdated: 'card.usage.updated',
    invoiceOverdue: 'card.invoice.overdue',
  },
  invoice: {
    updated: 'invoice.updated',
  },
} as const;

export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createDomainEvent<T>(
  domain: string,
  type: string,
  payload: T,
  source: string,
  correlationId?: string
): DomainEvent<T> {
  return {
    timestamp: Date.now(),
    domain,
    type,
    payload,
    correlationId: correlationId ?? generateCorrelationId(),
    source,
  };
}