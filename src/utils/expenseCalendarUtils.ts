import type { Transaction } from '../types';
import { isCreditCardPaymentTransaction } from './budgetUtils';
import { getLocalDateString, isPreviousInstallment } from './dateHelpers';

export interface CalendarDayCell {
  dateIso: string; // 'YYYY-MM-DD'
  dayNumber: number; // 1..31
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0 (Dom) .. 6 (Sáb)
}

export interface DayExpenseSummary {
  dateIso: string;
  totalAmount: number;
  transactionCount: number;
  transactions: Transaction[];
}

export interface MonthExpenseSummary {
  monthKey: string; // 'YYYY-MM'
  totalMonthExpenses: number;
  daysWithExpensesCount: number;
  totalTransactionsCount: number;
  dailyMap: Map<string, DayExpenseSummary>;
  highestExpenseDay: { dateIso: string; amount: number } | null;
}

export const WEEKDAY_LABELS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;
export const WEEKDAY_LABELS_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

/**
 * Monta os dias da grade mensal (calendário clássico de 7 colunas, iniciando no Domingo).
 * Inclui os dias de preenchimento (padding) do mês anterior e próximo para manter a grade alinhada.
 */
export function getCalendarGridDays(year: number, month: number, refToday: Date = new Date()): CalendarDayCell[] {
  const safeYear = Math.trunc(year);
  const safeMonth = Math.min(12, Math.max(1, Math.trunc(month)));
  const todayIso = getLocalDateString(refToday);

  // Primeiro dia do mês (0 = Domingo, 1 = Segunda, ...)
  const firstDayOfWeek = new Date(safeYear, safeMonth - 1, 1).getDay();
  // Quantidade de dias no mês
  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();
  // Quantidade de dias no mês anterior
  const daysInPrevMonth = new Date(safeYear, safeMonth - 1, 0).getDate();

  const prevMonthYear = safeMonth === 1 ? safeYear - 1 : safeYear;
  const prevMonth = safeMonth === 1 ? 12 : safeMonth - 1;
  const nextMonthYear = safeMonth === 12 ? safeYear + 1 : safeYear;
  const nextMonth = safeMonth === 12 ? 1 : safeMonth + 1;

  const cells: CalendarDayCell[] = [];

  // Dias do mês anterior (padding inicial)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    const dateIso = `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const dayOfWeek = (firstDayOfWeek - 1 - i) % 7;
    cells.push({
      dateIso,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateIso === todayIso,
      dayOfWeek,
    });
  }

  // Dias do mês corrente
  for (let day = 1; day <= daysInMonth; day++) {
    const dateIso = `${safeYear}-${String(safeMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
    cells.push({
      dateIso,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateIso === todayIso,
      dayOfWeek,
    });
  }

  // Dias do próximo mês (padding final até fechar múltiplas semanas completas de 7 dias)
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const daysToAdd = 7 - remainder;
    for (let day = 1; day <= daysToAdd; day++) {
      const dateIso = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = (cells.length) % 7;
      cells.push({
        dateIso,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateIso === todayIso,
        dayOfWeek,
      });
    }
  }

  return cells;
}

/**
 * Agrupa as saídas/despesas de um mês em um mapa diário, aplicando rigor contábil estrito:
 * - Apenas despesas (type === 'expense').
 * - Desconsidera lançamentos virtuais (isVirtual === true).
 * - Desconsidera quitações técnicas de fatura de cartão (isCreditCardPaymentTransaction) para evitar duplicidade.
 */
export function computeDailyExpenseMap(
  transactions: Transaction[],
  monthKey: string,
  userCardNames?: string[]
): MonthExpenseSummary {
  const dailyMap = new Map<string, DayExpenseSummary>();

  if (!monthKey || typeof monthKey !== 'string') {
    return {
      monthKey: '',
      totalMonthExpenses: 0,
      daysWithExpensesCount: 0,
      totalTransactionsCount: 0,
      dailyMap,
      highestExpenseDay: null,
    };
  }

  let totalMonthExpenses = 0;
  let totalTransactionsCount = 0;
  let highestExpenseDay: { dateIso: string; amount: number } | null = null;

  for (const t of transactions) {
    if (!t || typeof t.date !== 'string') continue;
    if (!t.date.startsWith(monthKey)) continue;
    if (t.type !== 'expense') continue;
    if (t.isVirtual) continue;
    if (isCreditCardPaymentTransaction(t, userCardNames)) continue;
    if (isPreviousInstallment(t)) continue;

    const amount = Number(t.amount) || 0;
    if (amount <= 0) continue;

    const dateIso = t.date;
    const existing = dailyMap.get(dateIso);

    if (existing) {
      existing.totalAmount += amount;
      existing.transactionCount += 1;
      existing.transactions.push(t);
    } else {
      dailyMap.set(dateIso, {
        dateIso,
        totalAmount: amount,
        transactionCount: 1,
        transactions: [t],
      });
    }

    totalMonthExpenses += amount;
    totalTransactionsCount += 1;
  }

  // Ordena transações internas de cada dia por valor decrescente
  for (const summary of dailyMap.values()) {
    summary.transactions.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));

    if (!highestExpenseDay || summary.totalAmount > highestExpenseDay.amount) {
      highestExpenseDay = {
        dateIso: summary.dateIso,
        amount: summary.totalAmount,
      };
    }
  }

  return {
    monthKey,
    totalMonthExpenses,
    daysWithExpensesCount: dailyMap.size,
    totalTransactionsCount,
    dailyMap,
    highestExpenseDay,
  };
}

/**
 * Formata um valor monetário para exibição no quadradinho do calendário ou resumo.
 * Suporta modo de privacidade (••••••) e formatação compacta para telas móveis estreitas.
 */
export function formatDayExpenseAmount(
  amount: number,
  options?: {
    isPrivacyMode?: boolean;
    compact?: boolean;
  }
): string {
  if (options?.isPrivacyMode) {
    return '••••••';
  }

  if (amount <= 0 || !Number.isFinite(amount)) {
    return '';
  }

  if (options?.compact) {
    if (amount >= 1000) {
      const thousands = (amount / 1000).toLocaleString('pt-BR', {
        minimumFractionDigits: amount % 1000 === 0 ? 0 : 1,
        maximumFractionDigits: 1,
      });
      return `R$ ${thousands}k`;
    }
    return `R$ ${Math.round(amount)}`;
  }

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata um valor monetário especificamente para células móveis do calendário sem truncar:
 * - Se modo privacidade: retorna '••••'
 * - Até R$ 99,99: preserva centavos (ex: "9,90", "45,70")
 * - De R$ 100 até R$ 9.999: arredonda centavos (ex: "154", "220", "1.450")
 * - A partir de R$ 10.000: compacta em milhar 'k' (ex: "12,5k")
 */
export function formatMobileExpenseAmount(
  amount: number,
  isPrivacyMode?: boolean
): string {
  if (isPrivacyMode) {
    return '••••';
  }

  if (amount <= 0 || !Number.isFinite(amount)) {
    return '';
  }

  if (amount < 100) {
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (amount < 10000) {
    return Math.round(amount).toLocaleString('pt-BR');
  }

  const thousands = (amount / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: amount % 1000 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
  return `${thousands}k`;
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para texto amigável em pt-BR (ex: "25 de setembro de 2026").
 */
export function formatCalendarFullDate(dateIso: string): string {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return dateIso;
  const [year, month, day] = dateIso.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Retorna o nome por extenso do dia da semana para uma data ISO (ex: "Sexta-feira").
 */
export function getWeekdayNameFromIso(dateIso: string): string {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return '';
  const [year, month, day] = dateIso.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return WEEKDAY_LABELS_FULL[dateObj.getDay()] || '';
}
