import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useEventInsightStore } from '../useEventInsightStore';
import {
  setEventInsight,
  clearEventInsightStore,
} from '../../services/eventInsightStore';
import type { NexusInsight } from '../../services/nexusInsightEngine';

function makeInsight(id = 'test', priority: NexusInsight['priority'] = 'media'): NexusInsight {
  return {
    id,
    message: { title: 'T', body: 'B', ctaLabel: 'C' },
    deepLink: 'home',
    priority,
  };
}

describe('useEventInsightStore', () => {
  beforeEach(() => {
    localStorage.clear();
    clearEventInsightStore();
  });

  it('returns null and empty feed initially', () => {
    const { result } = renderHook(() => useEventInsightStore());
    expect(result.current.eventInsight).toBeNull();
    expect(result.current.feed).toEqual([]);
  });

  it('updates when an insight is set', () => {
    const { result } = renderHook(() => useEventInsightStore());

    act(() => {
      setEventInsight(makeInsight('test-1'));
    });

    expect(result.current.eventInsight).not.toBeNull();
    expect(result.current.eventInsight?.id).toBe('test-1');
    expect(result.current.feed).toHaveLength(1);
    expect(result.current.feed[0].insight.id).toBe('test-1');
    expect(result.current.feed[0].acknowledgedAt).toBeNull();
  });

  it('dismissEventInsight without ID clears current insight', () => {
    const { result } = renderHook(() => useEventInsightStore());

    act(() => {
      setEventInsight(makeInsight('test-2'));
    });
    expect(result.current.eventInsight).not.toBeNull();

    act(() => {
      result.current.dismissEventInsight();
    });
    expect(result.current.eventInsight).toBeNull();
    expect(result.current.feed).toHaveLength(0);
  });

  it('dismissEventInsight with ID removes the specific entry', () => {
    const { result } = renderHook(() => useEventInsightStore());

    act(() => {
      setEventInsight(makeInsight('first'));
    });

    act(() => {
      result.current.dismissEventInsight('first');
    });

    expect(result.current.eventInsight).toBeNull();
    expect(result.current.feed).toHaveLength(0);
  });

  it('acknowledgeEventInsight acknowledges the current insight', () => {
    const { result } = renderHook(() => useEventInsightStore());

    act(() => {
      setEventInsight(makeInsight('abc'));
    });

    act(() => {
      result.current.acknowledgeEventInsight('abc');
    });

    expect(result.current.eventInsight).toBeNull();
    expect(result.current.feed).toHaveLength(1);
    expect(result.current.feed[0].acknowledgedAt).not.toBeNull();
  });

  it('updates across hook instances', () => {
    const { result: r1 } = renderHook(() => useEventInsightStore());
    const { result: r2 } = renderHook(() => useEventInsightStore());

    act(() => {
      setEventInsight(makeInsight('shared'));
    });

    expect(r1.current.eventInsight?.id).toBe('shared');
    expect(r2.current.eventInsight?.id).toBe('shared');
    expect(r1.current.feed[0].insight.id).toBe('shared');
    expect(r2.current.feed[0].insight.id).toBe('shared');
  });

  it('feed preserves acknowledged items after new insight arrives', () => {
    const { result } = renderHook(() => useEventInsightStore());

    act(() => {
      setEventInsight(makeInsight('first', 'media'));
    });

    act(() => {
      result.current.acknowledgeEventInsight('first');
    });

    act(() => {
      setEventInsight(makeInsight('second', 'media'));
    });

    expect(result.current.feed).toHaveLength(2);
    expect(result.current.feed[0].insight.id).toBe('second');
    expect(result.current.feed[0].acknowledgedAt).toBeNull();
    expect(result.current.feed[1].insight.id).toBe('first');
    expect(result.current.feed[1].acknowledgedAt).not.toBeNull();
  });
});
