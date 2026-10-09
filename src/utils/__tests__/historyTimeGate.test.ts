import { describe, it, expect } from 'vitest';
import {
  hasHistoryAccess,
  isMonthBeforeCurrent,
  isDateStringBeforeCurrentMonth,
  canUseViewMode,
  isPeriodRangeAllowed,
  isTransactionVisible,
  isMonthFetchAllowed,
} from '../historyTimeGate';

const JUNE_2026 = new Date(2026, 5, 15);

describe('historyTimeGate', () => {
  it('hasHistoryAccess: free negado, pro/premium liberado', () => {
    expect(hasHistoryAccess('free')).toBe(false);
    expect(hasHistoryAccess('pro')).toBe(true);
    expect(hasHistoryAccess('premium')).toBe(true);
  });

  it('isMonthBeforeCurrent: mês anterior bloqueado, atual e futuro liberados', () => {
    expect(isMonthBeforeCurrent(2026, 5, JUNE_2026)).toBe(true);
    expect(isMonthBeforeCurrent(2026, 6, JUNE_2026)).toBe(false);
    expect(isMonthBeforeCurrent(2026, 7, JUNE_2026)).toBe(false);
    expect(isMonthBeforeCurrent(2027, 1, JUNE_2026)).toBe(false);
  });

  it('isDateStringBeforeCurrentMonth', () => {
    expect(isDateStringBeforeCurrentMonth('2026-05-31', JUNE_2026)).toBe(true);
    expect(isDateStringBeforeCurrentMonth('2026-06-01', JUNE_2026)).toBe(false);
    expect(isDateStringBeforeCurrentMonth('2026-08-15', JUNE_2026)).toBe(false);
  });

  it('canUseViewMode: year/all/period só com Pro+', () => {
    expect(canUseViewMode('month', 'free')).toBe(true);
    expect(canUseViewMode('day', 'free')).toBe(true);
    expect(canUseViewMode('year', 'free')).toBe(false);
    expect(canUseViewMode('all', 'free')).toBe(false);
    expect(canUseViewMode('year', 'pro')).toBe(true);
  });

  it('isPeriodRangeAllowed: início antes do mês atual bloqueado no Free', () => {
    expect(isPeriodRangeAllowed('2026-05-01', '2026-06-30', 'free', JUNE_2026)).toBe(false);
    expect(isPeriodRangeAllowed('2026-06-01', '2026-08-31', 'free', JUNE_2026)).toBe(true);
    expect(isPeriodRangeAllowed('2026-05-01', '2026-06-30', 'pro', JUNE_2026)).toBe(true);
  });

  it('isTransactionVisible: espelho retrovisor bloqueado no Free', () => {
    expect(isTransactionVisible('2026-04-10', 'free', JUNE_2026)).toBe(false);
    expect(isTransactionVisible('2026-06-10', 'free', JUNE_2026)).toBe(true);
    expect(isTransactionVisible('2026-04-10', 'pro', JUNE_2026)).toBe(true);
  });

  it('isMonthFetchAllowed', () => {
    expect(isMonthFetchAllowed(2026, 5, 'free', JUNE_2026)).toBe(false);
    expect(isMonthFetchAllowed(2026, 6, 'free', JUNE_2026)).toBe(true);
    expect(isMonthFetchAllowed(2026, 9, 'free', JUNE_2026)).toBe(true);
  });
});
