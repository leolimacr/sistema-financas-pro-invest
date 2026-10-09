import type { Plan } from './plan';
import { hasPlanAccess } from './plan';

export type HistoryViewMode = 'day' | 'month' | 'year' | 'all' | 'period';

/** Pro ou Premium podem ler o passado. */
export function hasHistoryAccess(plan: Plan): boolean {
  return hasPlanAccess(plan, 'pro');
}

export function getCurrentMonthAnchor(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), 1);
}

export function toMonthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function getCurrentMonthIndex(ref: Date = new Date()): number {
  return toMonthIndex(ref.getFullYear(), ref.getMonth() + 1);
}

export function isMonthBeforeCurrent(year: number, month: number, ref: Date = new Date()): boolean {
  return toMonthIndex(year, month) < getCurrentMonthIndex(ref);
}

export function isDateBeforeCurrentMonth(date: Date, ref: Date = new Date()): boolean {
  return toMonthIndex(date.getFullYear(), date.getMonth() + 1) < getCurrentMonthIndex(ref);
}

export function isDateStringBeforeCurrentMonth(dateStr: string, ref: Date = new Date()): boolean {
  if (!dateStr) return false;
  const [year, month] = dateStr.split('-').map(Number);
  if (!year || !month) return false;
  return isMonthBeforeCurrent(year, month, ref);
}

export function getCurrentMonthStartIso(ref: Date = new Date()): string {
  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Modos que expõem histórico agregado — bloqueados no Free. */
export function isRestrictedViewMode(viewMode: HistoryViewMode): boolean {
  return viewMode === 'year' || viewMode === 'all' || viewMode === 'period';
}

export function canUseViewMode(viewMode: HistoryViewMode, plan: Plan): boolean {
  if (!isRestrictedViewMode(viewMode)) return true;
  return hasHistoryAccess(plan);
}

export function isPeriodRangeAllowed(
  startDate: string,
  _endDate: string,
  plan: Plan,
  ref: Date = new Date()
): boolean {
  if (hasHistoryAccess(plan)) return true;
  if (!startDate) return true;
  return !isDateStringBeforeCurrentMonth(startDate, ref);
}

export function isTransactionVisible(
  dateStr: string | undefined,
  plan: Plan,
  ref: Date = new Date()
): boolean {
  if (!dateStr || hasHistoryAccess(plan)) return true;
  return !isDateStringBeforeCurrentMonth(dateStr, ref);
}

export function isMonthFetchAllowed(
  year: number,
  month: number,
  plan: Plan,
  ref: Date = new Date()
): boolean {
  if (hasHistoryAccess(plan)) return true;
  return !isMonthBeforeCurrent(year, month, ref);
}
