import type { Transaction } from '../types';

/**
 * Etapa 8 (E8-01) — Dashboard Principal.
 *
 * Funções puras de consulta/agregação do dashboard. Operam sobre
 * `Transaction[]` já carregados pelo hook `useTransactions` (RTDB
 * `transactions/${userId}`), sem criar leituras, coleções ou índices novos:
 * o filtro de mês é client-side via prefixo `date.startsWith('YYYY-MM')`,
 * mesmo padrão usado em `AppLayout` e `utils/calculations.ts`.
 *
 * Formato de data esperado: string local `YYYY-MM-DD`
 * (ver `getLocalDateString` em `utils/dateHelpers.ts`).
 */

export interface MonthTotals {
  /** Chave do mês de referência (`YYYY-MM`). */
  monthKey: string;
  /** Soma das receitas (`type === 'income'`) do mês. */
  totalIncome: number;
  /** Soma das despesas (`type === 'expense'`) do mês. */
  totalExpense: number;
  /** Saldo do mês: receitas − despesas. */
  balance: number;
  /** Quantidade de transações no mês. */
  count: number;
}

const MONTH_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonthKey(monthKey: string): boolean {
  return MONTH_KEY_REGEX.test(monthKey);
}

/** Monta a chave `YYYY-MM` a partir de ano + mês (1–12). */
export function getMonthKey(year: number, month: number): string {
  const safeMonth = Math.min(12, Math.max(1, Math.trunc(month)));
  return `${year}-${String(safeMonth).padStart(2, '0')}`;
}

/** Chave do mês corrente (ou do `ref` informado — útil em testes). */
export function getCurrentMonthKey(ref: Date = new Date()): string {
  return getMonthKey(ref.getFullYear(), ref.getMonth() + 1);
}

/**
 * Desloca uma chave `YYYY-MM` por N meses (negativo = anteriores).
 * Retorna a chave original se a entrada for inválida.
 */
export function shiftMonthKey(monthKey: string, offset: number): string {
  if (!isValidMonthKey(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-').map(Number);
  const total = y * 12 + (m - 1) + Math.trunc(offset);
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return getMonthKey(year, month);
}

/** Filtra as transações do mês (`t.date` iniciado por `YYYY-MM`). */
export function filterTransactionsByMonth(
  transactions: Transaction[],
  monthKey: string,
): Transaction[] {
  if (!isValidMonthKey(monthKey)) return [];
  return transactions.filter((t) => typeof t.date === 'string' && t.date.startsWith(monthKey));
}

function toAmount(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Calcula os totais do mês: receitas, despesas e saldo.
 * Transações com `type` diferente de `income`/`expense` entram na
 * contagem, mas não nos totais (não há terceiro tipo no modelo atual).
 */
export function calculateMonthTotals(
  transactions: Transaction[],
  monthKey: string,
): MonthTotals {
  const monthTransactions = filterTransactionsByMonth(transactions, monthKey);
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of monthTransactions) {
    const amount = toAmount(t.amount);
    if (t.type === 'income') totalIncome += amount;
    else if (t.type === 'expense') totalExpense += amount;
  }
  return {
    monthKey,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    count: monthTransactions.length,
  };
}

/** Rótulo pt-BR da chave (`2026-09` → `setembro de 2026`). */
export function formatMonthLabel(monthKey: string): string {
  if (!isValidMonthKey(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label;
}
