import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOnboarding } from '../useOnboarding';

describe('useOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('não ativa se launchCount > 0', () => {
    const { result } = renderHook(() => useOnboarding(5));
    expect(result.current.isActive).toBe(false);
    expect(result.current.step).toBe(0);
  });

  it('não ativa se flag onboarding_op_completed existe no localStorage (nova ou legada)', () => {
    localStorage.setItem('financas-pro-invest_onboarding_op_completed', 'true');
    const { result } = renderHook(() => useOnboarding(0));
    expect(result.current.isActive).toBe(false);
    expect(result.current.step).toBe(0);
  });

  it('ativa se launchCount === 0 e flag não existe', () => {
    const { result } = renderHook(() => useOnboarding(0));
    expect(result.current.isActive).toBe(true);
    expect(result.current.step).toBe(1);
  });

  it('skip() salva flag e desativa', () => {
    const { result } = renderHook(() => useOnboarding(0));
    act(() => {
      result.current.skip();
    });
    expect(result.current.isActive).toBe(false);
    expect(localStorage.getItem('financas-pro-invest_onboarding_op_completed')).toBe('true');
  });

  it('finish() salva flag e desativa', () => {
    const { result } = renderHook(() => useOnboarding(0));
    act(() => {
      result.current.finish();
    });
    expect(result.current.isActive).toBe(false);
    expect(localStorage.getItem('financas-pro-invest_onboarding_op_completed')).toBe('true');
  });

  it('nextStep() avança do passo 1 ao 2, 2 ao 3', () => {
    const { result } = renderHook(() => useOnboarding(0));
    expect(result.current.step).toBe(1);
    
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.step).toBe(2);

    act(() => {
      result.current.nextStep();
    });
    expect(result.current.step).toBe(3);
  });
});
