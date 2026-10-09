import { useEffect, useMemo, useState } from 'react';
import { useTransactions } from './useTransactions';
import {
  calculateMonthTotals,
  filterTransactionsByMonth,
  getCurrentMonthKey,
  shiftMonthKey,
  type MonthTotals,
} from '../services/dashboardService';

export interface DashboardMonthData extends MonthTotals {
  /** Transações do mês selecionado (ordenadas como vieram do hook). */
  monthTransactions: ReturnType<typeof filterTransactionsByMonth>;
  /** Chave `YYYY-MM` selecionada. */
  monthKey: string;
  /** Troca direta do mês (aceita `YYYY-MM` de `<input type="month">`). */
  setMonthKey: (monthKey: string) => void;
  /** Navega −1 mês / +1 mês. */
  goPrevMonth: () => void;
  goNextMonth: () => void;
  isLoading: boolean;
  /** Mensagem de erro da consulta, ou `null`. */
  error: string | null;
}

function parseMonthKey(monthKey: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthKey);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

/**
 * Etapa 8 (E8-01) — dados do Dashboard Principal.
 *
 * Reusa `useTransactions(userId)` (RTDB `transactions/${userId}`; mesma
 * fonte do Controla). Dispara `fetchMonth` sob demanda para o mês
 * selecionado e agrega os totais client-side via `dashboardService`.
 * Não cria coleções, índices ou escritas.
 */
export function useDashboardMonth(userId?: string, initialMonthKey?: string): DashboardMonthData {
  const [monthKey, setMonthKeyState] = useState<string>(
    () => initialMonthKey ?? getCurrentMonthKey(),
  );
  const { transactions, loading, error, fetchMonth } = useTransactions(userId);

  // Busca o mês selecionado sob demanda (no-op interno se já buscado ou bloqueado por plano).
  useEffect(() => {
    if (!userId) return;
    const parsed = parseMonthKey(monthKey);
    if (!parsed) return;
    void fetchMonth(parsed.year, parsed.month);
  }, [userId, monthKey, fetchMonth]);

  const setMonthKey = (next: string) => {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(next)) setMonthKeyState(next);
  };
  const goPrevMonth = () => setMonthKeyState((prev) => shiftMonthKey(prev, -1));
  const goNextMonth = () => setMonthKeyState((prev) => shiftMonthKey(prev, 1));

  const monthTransactions = useMemo(
    () => filterTransactionsByMonth(transactions ?? [], monthKey),
    [transactions, monthKey],
  );
  const totals = useMemo(
    () => calculateMonthTotals(transactions ?? [], monthKey),
    [transactions, monthKey],
  );

  return {
    ...totals,
    monthTransactions,
    monthKey,
    setMonthKey,
    goPrevMonth,
    goNextMonth,
    isLoading: loading,
    error,
  };
}
