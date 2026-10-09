import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useDashboardState } from './useDashboardState';
import type { Transaction } from '../../../../types';

vi.mock('../../../../contexts/AuthContext', () => {
  const user = { uid: 'user-smoke' };
  return { useAuth: () => ({ user }) };
});

vi.mock('../../../../hooks/useCards', () => {
  const cards: Array<{ id: string }> = [];
  return { useCards: () => ({ cards }) };
});

vi.mock('../../../../hooks/useBills', () => {
  const bills: Array<{ id: string }> = [];
  return { useBills: () => ({ bills }) };
});

vi.mock('../../../../hooks/useBudget', () => {
  return { useBudget: () => ({ budget: null, isLoading: false, deleteBudget: vi.fn() }) };
});

vi.mock('../../../../hooks/useCardInvoices', () => {
  const invoices: Array<{ id: string }> = [];
  return { useInvoicesByUser: () => ({ invoices }) };
});

vi.mock('../../../../services/debt', () => {
  const debts: Array<{ id: string }> = [];
  return { useDebts: () => ({ data: debts }) };
});

vi.mock('../../../../contexts/ExclusionsContext', () => {
  return { useExclusionAmount: () => 0 };
});

vi.mock('../../../../hooks/useIsMobile', () => {
  return { useIsMobile: () => false };
});

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleDeadline) => void;

const today = new Date();
const pad = (value: number) => String(value).padStart(2, '0');
const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

const hydratingTransaction: Transaction = {
  id: 'tx-smoke-1',
  userId: 'user-smoke',
  type: 'income',
  date: todayIso,
  description: 'Receita smoke',
  category: 'Smoke',
  amount: 100
};

const baseProps = {
  transactions: [],
  categories: [],
  isLoading: false,
  onDeleteTransaction: vi.fn(),
  onOpenForm: vi.fn(),
  onSaveCategory: vi.fn(),
  onDeleteCategory: vi.fn(),
  userMeta: null,
  isPremium: false,
  isPrivacyMode: false,
  onTogglePrivacy: vi.fn(),
  onEditTransaction: vi.fn(),
  onNavigate: vi.fn(),
  fetchMonth: vi.fn(),
  userMetaLoading: false,
  isSyncing: false,
  isStale: false
} as unknown as Parameters<typeof useDashboardState>[0];

const hydratingProps = {
  ...baseProps,
  transactions: [hydratingTransaction]
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/']}>
    {children}
  </MemoryRouter>
);

let scheduleCount = 0;
let executionCount = 0;
let pendingHandle: ReturnType<typeof setTimeout> | null = null;
let requestSpy: ReturnType<typeof vi.fn>;
let cancelSpy: ReturnType<typeof vi.fn>;

describe('useDashboardState - smoke runtime', () => {
  beforeEach(() => {
    scheduleCount = 0;
    executionCount = 0;
    pendingHandle = null;
    vi.useFakeTimers();

    requestSpy = vi.fn((callback: IdleCallback) => {
      scheduleCount += 1;
      pendingHandle = setTimeout(() => {
        executionCount += 1;
        callback({ didTimeout: false, timeRemaining: () => 50 });
      }, 0);
      return pendingHandle;
    });
    cancelSpy = vi.fn((id: ReturnType<typeof setTimeout>) => clearTimeout(id));

    vi.stubGlobal('requestIdleCallback', requestSpy);
    vi.stubGlobal('cancelIdleCallback', cancelSpy);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('monta sem loop contínuo', () => {
    const { result, unmount } = renderHook(() => useDashboardState(hydratingProps), { wrapper });
    act(() => vi.advanceTimersByTime(10));

    expect(typeof result.current).toBe('object');
    expect(scheduleCount).toBeGreaterThanOrEqual(1);
    expect(executionCount).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it('estabiliza sem mudança de dependência', () => {
    const { unmount } = renderHook(() => useDashboardState(hydratingProps), { wrapper });
    act(() => vi.advanceTimersByTime(10));

    const baselineSchedule = scheduleCount;
    const baselineExecution = executionCount;

    act(() => vi.advanceTimersByTime(100));

    expect(scheduleCount).toBe(baselineSchedule);
    expect(executionCount).toBe(baselineExecution);
    unmount();
  });

  it('novo ciclo controlado após setViewMode year e estabilização', () => {
    const { result, unmount } = renderHook(() => useDashboardState(hydratingProps), { wrapper });
    act(() => vi.advanceTimersByTime(10));

    const baselineSchedule = scheduleCount;
    const baselineExecution = executionCount;

    act(() => {
      result.current.setViewMode('year');
      result.current.setTypeFilter('income');
      result.current.setSelectedCategories(['Alimentação']);
    });
    act(() => vi.advanceTimersByTime(10));

    expect(result.current.viewMode).toBe('year');
    expect(result.current.typeFilter).toBe('income');
    expect(result.current.selectedCategories).toEqual(['Alimentação']);
    expect(scheduleCount - baselineSchedule).toBe(1);
    expect(executionCount - baselineExecution).toBe(1);

    act(() => vi.advanceTimersByTime(100));
    expect(scheduleCount - baselineSchedule).toBe(1);
    expect(executionCount - baselineExecution).toBe(1);
    unmount();
  });

  it('cleanup cancela callback pendente e impede execução', () => {
    const { unmount } = renderHook(() => useDashboardState(hydratingProps), { wrapper });
    const scheduledHandle = pendingHandle;
    const baselineExecution = executionCount;

    expect(scheduledHandle).not.toBeNull();
    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(scheduledHandle);

    act(() => vi.advanceTimersByTime(100));
    expect(executionCount).toBe(baselineExecution);
  });
});
