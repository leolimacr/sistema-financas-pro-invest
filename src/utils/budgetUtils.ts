import type { Transaction } from '../types';

export function buildCategoryKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function buildBudgetId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getCurrentBudgetId(): string {
  const now = new Date();
  return buildBudgetId(now.getFullYear(), now.getMonth() + 1);
}

export function getPreviousBudgetId(budgetId?: string): string {
  const [yearStr, monthStr] = (budgetId || getCurrentBudgetId()).split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return buildBudgetId(year, month);
}

export function formatBudgetMonthName(budgetId: string): string {
  const [yearStr, monthStr] = budgetId.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year || !month) return budgetId;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function isCreditCardInvoiceCategory(name?: string, userCardNames?: string[]): boolean {
  if (!name) return false;
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Padrões explícitos do sistema Finanças Pro Invest
  if (normalized.startsWith('fatura - cartao')) return true;
  if (normalized.includes('fatura de cartao') || normalized.includes('fatura do cartao') || normalized.includes('fatura cartao')) return true;
  if (normalized.includes('pagamento de fatura') || normalized.includes('pagamento fatura')) return true;
  if (normalized === 'cartao de credito' || normalized === 'cartao credito') return true;

  // Se o usuário tem cartões específicos (ex: Nubank, Inter) e a categoria é "Fatura Nubank"
  if (userCardNames && userCardNames.length > 0) {
    for (const cardName of userCardNames) {
      const normCard = cardName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (normCard && normalized.includes('fatura') && normalized.includes(normCard)) {
        return true;
      }
    }
  }

  return false;
}

export function isCreditCardPaymentTransaction(t: Partial<Transaction>, userCardNames?: string[]): boolean {
  // Flag explícita do sistema com vínculo a cartão
  if (t.isBillPayment && (t.linkedCardId || t.linkedInvoiceId || t.linkedInvoicePeriodEnd)) {
    return true;
  }
  // Categoria de fatura de cartão
  if (isCreditCardInvoiceCategory(t.category, userCardNames)) {
    return true;
  }
  // Descrição inequívoca de quitação de fatura
  const desc = (t.description || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (desc.startsWith('pagamento fatura') || desc.startsWith('pagamento de fatura') || desc.startsWith('fatura cartao')) {
    return true;
  }

  if (userCardNames && userCardNames.length > 0) {
    for (const cardName of userCardNames) {
      const normCard = cardName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (normCard && desc.includes('fatura') && desc.includes(normCard)) {
        return true;
      }
    }
  }

  return false;
}
