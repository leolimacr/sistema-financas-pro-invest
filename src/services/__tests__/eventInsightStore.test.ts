import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NexusInsight } from '../nexusInsightEngine';
import {
  extractEventFamily,
  getEventInsight,
  getEventFeed,
  setEventInsight,
  dismissCurrentInsight,
  dismissFeedEntry,
  acknowledgeCurrentInsight,
  acknowledgeFeedEntry,
  subscribe,
  clearEventInsightStore,
} from '../eventInsightStore';

function makeInsight(overrides: Partial<NexusInsight> = {}): NexusInsight {
  return {
    id: 'test-insight',
    message: { title: 'Test', body: 'Body', ctaLabel: 'CTA' },
    deepLink: 'home',
    priority: 'baixa',
    ...overrides,
  };
}

describe('eventInsightStore', () => {
  beforeEach(() => {
    localStorage.clear();
    clearEventInsightStore();
  });

  it('returns null initially', () => {
    expect(getEventInsight()).toBeNull();
  });

  it('returns empty feed initially', () => {
    expect(getEventFeed()).toEqual([]);
  });

  describe('core insight lifecycle', () => {
    it('sets and retrieves an insight', () => {
      setEventInsight(makeInsight());
      expect(getEventInsight()?.id).toBe('test-insight');
    });

    it('feed shows current insight as unacknowledged', () => {
      setEventInsight(makeInsight({ id: 'abc' }));
      const feed = getEventFeed();
      expect(feed).toHaveLength(1);
      expect(feed[0].insight.id).toBe('abc');
      expect(feed[0].acknowledgedAt).toBeNull();
    });

    it('dismissCurrentInsight clears the insight', () => {
      setEventInsight(makeInsight());
      dismissCurrentInsight();
      expect(getEventInsight()).toBeNull();
    });

    it('dismissed insight is removed from feed', () => {
      setEventInsight(makeInsight({ id: 'abc' }));
      dismissCurrentInsight();
      expect(getEventFeed()).toHaveLength(0);
    });
  });

  describe('feed — archive on replace', () => {
    it('archives old current to feed when replaced by new insight', () => {
      setEventInsight(makeInsight({ id: 'first', priority: 'baixa' }));
      setEventInsight(makeInsight({ id: 'second', priority: 'media' }));
      // media replaces baixa
      expect(getEventInsight()?.id).toBe('second');

      const feed = getEventFeed();
      expect(feed).toHaveLength(2);
      expect(feed[0].insight.id).toBe('second'); // current
      expect(feed[0].acknowledgedAt).toBeNull();
      expect(feed[1].insight.id).toBe('first'); // archived
      expect(feed[1].acknowledgedAt).toBeNull();
    });

    it('does NOT archive current when new insight fails replacement rules', () => {
      setEventInsight(makeInsight({ id: 'high', priority: 'alta' }));
      setEventInsight(makeInsight({ id: 'low', priority: 'baixa' }));
      // baixa should NOT replace alta
      expect(getEventInsight()?.id).toBe('high');

      const feed = getEventFeed();
      expect(feed).toHaveLength(1);
      expect(feed[0].insight.id).toBe('high');
    });
  });

  describe('feed — acknowledge', () => {
    it('acknowledgeCurrentInsight moves current to history with timestamp', () => {
      setEventInsight(makeInsight({ id: 'abc' }));
      acknowledgeCurrentInsight();

      expect(getEventInsight()).toBeNull();
      const feed = getEventFeed();
      expect(feed).toHaveLength(1);
      expect(feed[0].insight.id).toBe('abc');
      expect(feed[0].acknowledgedAt).not.toBeNull();
      expect(typeof feed[0].acknowledgedAt).toBe('number');
    });

    it('acknowledgeFeedEntry works for current insight by ID', () => {
      setEventInsight(makeInsight({ id: 'abc' }));
      acknowledgeFeedEntry('abc');

      expect(getEventInsight()).toBeNull();
      const feed = getEventFeed();
      expect(feed[0].acknowledgedAt).not.toBeNull();
    });

    it('acknowledgeFeedEntry works for history entry by ID', () => {
      setEventInsight(makeInsight({ id: 'first', priority: 'media' }));
      acknowledgeCurrentInsight(); // first → history
      expect(getEventFeed()).toHaveLength(1);

      setEventInsight(makeInsight({ id: 'second', priority: 'media' }));
      // feed: [second (current), first (acknowledged)]
      expect(getEventFeed()).toHaveLength(2);

      acknowledgeFeedEntry('first'); // acknowledge the history entry
      const feed = getEventFeed();
      const firstEntry = feed.find((e) => e.insight.id === 'first');
      expect(firstEntry?.acknowledgedAt).not.toBeNull();
    });

    it('archive preserves acknowledgedAt when replaced', () => {
      setEventInsight(makeInsight({ id: 'first', priority: 'media' }));
      acknowledgeCurrentInsight(); // first → history (acknowledged)
      expect(getEventFeed()).toHaveLength(1);

      setEventInsight(makeInsight({ id: 'second', priority: 'media' }));
      const feed = getEventFeed();
      expect(feed).toHaveLength(2);
      // First entry should still be acknowledged
      const firstEntry = feed.find((e) => e.insight.id === 'first');
      expect(firstEntry?.acknowledgedAt).not.toBeNull();
    });
  });

  describe('feed — dismiss by ID', () => {
    it('dismissFeedEntry removes current insight', () => {
      setEventInsight(makeInsight({ id: 'abc' }));
      dismissFeedEntry('abc');
      expect(getEventInsight()).toBeNull();
      expect(getEventFeed()).toHaveLength(0);
    });

    it('dismissFeedEntry removes history insight', () => {
      setEventInsight(makeInsight({ id: 'first', priority: 'media' }));
      acknowledgeCurrentInsight();
      setEventInsight(makeInsight({ id: 'second', priority: 'media' }));
      expect(getEventFeed()).toHaveLength(2);

      dismissFeedEntry('first');
      const feed = getEventFeed();
      expect(feed).toHaveLength(1);
      expect(feed[0].insight.id).toBe('second');
    });

    it('dismissed insight does not reappear', () => {
      setEventInsight(makeInsight({ id: 'abc' }));
      dismissFeedEntry('abc');
      setEventInsight(makeInsight({ id: 'abc' }));
      expect(getEventInsight()).toBeNull();
    });
  });

  describe('feed — history size limit', () => {
    it('total feed (current + history) does not exceed MAX_HISTORY', () => {
      setEventInsight(makeInsight({ id: 'h1', priority: 'baixa' }));
      acknowledgeCurrentInsight();
      setEventInsight(makeInsight({ id: 'h2', priority: 'baixa' }));
      acknowledgeCurrentInsight();
      setEventInsight(makeInsight({ id: 'h3', priority: 'baixa' }));
      acknowledgeCurrentInsight();
      setEventInsight(makeInsight({ id: 'h4', priority: 'baixa' }));
      acknowledgeCurrentInsight();
      setEventInsight(makeInsight({ id: 'h5', priority: 'baixa' }));
      acknowledgeCurrentInsight();
      // history now has 5 items, no current
      expect(getEventFeed()).toHaveLength(5);
      // Set one more → current + 4 history = 5 total
      setEventInsight(makeInsight({ id: 'h6', priority: 'media' }));
      expect(getEventFeed()).toHaveLength(5);
      expect(getEventFeed()[0].insight.id).toBe('h6');
      expect(getEventFeed()[1].insight.id).toBe('h5');
      // h1 should be gone
      expect(getEventFeed().find((e) => e.insight.id === 'h1')).toBeUndefined();
    });
  });

  describe('notify subscribers', () => {
    it('notifies insight listeners on set', () => {
      const fn = vi.fn();
      const unsub = subscribe(fn);
      expect(fn).toHaveBeenCalledWith(null);

      setEventInsight(makeInsight({ id: 'abc' }));
      expect(fn).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'abc' }));
      unsub();
    });

    it('notifies insight listeners on dismiss', () => {
      const fn = vi.fn();
      setEventInsight(makeInsight({ id: 'abc' }));
      fn.mockClear();
      const unsub = subscribe(fn);

      dismissCurrentInsight();
      expect(fn).toHaveBeenCalledWith(null);
      unsub();
    });
  });

  describe('priority replacement rules', () => {
    it('alta replaces baixa', () => {
      setEventInsight(makeInsight({ id: 'low', priority: 'baixa' }));
      setEventInsight(makeInsight({ id: 'high', priority: 'alta' }));
      expect(getEventInsight()?.id).toBe('high');
    });

    it('media replaces baixa', () => {
      setEventInsight(makeInsight({ id: 'low', priority: 'baixa' }));
      setEventInsight(makeInsight({ id: 'med', priority: 'media' }));
      expect(getEventInsight()?.id).toBe('med');
    });

    it('baixa does NOT replace media', () => {
      setEventInsight(makeInsight({ id: 'med', priority: 'media' }));
      setEventInsight(makeInsight({ id: 'low', priority: 'baixa' }));
      expect(getEventInsight()?.id).toBe('med');
    });

    it('baixa does NOT replace baixa', () => {
      setEventInsight(makeInsight({ id: 'first', priority: 'baixa' }));
      setEventInsight(makeInsight({ id: 'second', priority: 'baixa' }));
      expect(getEventInsight()?.id).toBe('first');
    });

    it('same evaluator base ID replaces regardless of priority', () => {
      setEventInsight(makeInsight({ id: 'nexus-event-large-income-abc123', priority: 'media' }));
      setEventInsight(makeInsight({ id: 'nexus-event-large-income-def456', priority: 'media' }));
      expect(getEventInsight()?.id).toBe('nexus-event-large-income-def456');
    });

    it('different evaluator base IDs keep current for same priority', () => {
      setEventInsight(makeInsight({ id: 'nexus-event-large-income-abc', priority: 'media' }));
      setEventInsight(makeInsight({ id: 'nexus-event-card-pressure-def', priority: 'media' }));
      expect(getEventInsight()?.id).toBe('nexus-event-large-income-abc');
    });

    it('extractEventFamily usa o separador duplo (correlationId com traços)', () => {
      expect(extractEventFamily('nexus-event-bill-payment--a1b2-c3d4')).toBe('nexus-event-bill-payment');
      expect(extractEventFamily('nexus-event-large-income-abc123')).toBeNull();
      expect(extractEventFamily('home-sovereign-deficit')).toBeNull();
    });
  });

  describe('supressão por família de evento (N14)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('mesma família em sequência não troca o card atual', () => {
      setEventInsight(makeInsight({ id: 'nexus-event-bill-payment--evt-1', priority: 'media' }));
      const second = setEventInsight(makeInsight({ id: 'nexus-event-bill-payment--evt-2', priority: 'media' }));
      expect(second).toBe(false);
      expect(getEventInsight()?.id).toBe('nexus-event-bill-payment--evt-1');
    });

    it('família volta a exibir após a janela de 5 min', () => {
      setEventInsight(makeInsight({ id: 'nexus-event-bill-payment--evt-1', priority: 'media' }));
      vi.advanceTimersByTime(6 * 60 * 1000);
      const second = setEventInsight(makeInsight({ id: 'nexus-event-bill-payment--evt-2', priority: 'media' }));
      expect(second).toBe(true);
      expect(getEventInsight()?.id).toBe('nexus-event-bill-payment--evt-2');
    });

    it('prioridade alta ignora a supressão da família', () => {
      setEventInsight(makeInsight({ id: 'nexus-event-debt-paid-off--evt-1', priority: 'media' }));
      const second = setEventInsight(makeInsight({ id: 'nexus-event-debt-paid-off--evt-2', priority: 'alta' }));
      expect(second).toBe(true);
      expect(getEventInsight()?.id).toBe('nexus-event-debt-paid-off--evt-2');
    });

    it('famílias diferentes não se suprimem', () => {
      setEventInsight(makeInsight({ id: 'nexus-event-bill-payment--evt-1', priority: 'media' }));
      acknowledgeCurrentInsight();
      const second = setEventInsight(makeInsight({ id: 'nexus-event-card-pressure--evt-9', priority: 'media' }));
      expect(second).toBe(true);
    });
  });

  describe('localStorage dedup', () => {    it('does not show an insight already in localStorage', () => {
      const SEEN_KEY = 'nexus-event-driven-seen-v1';
      localStorage.setItem(SEEN_KEY, JSON.stringify(['nexus-event-large-income-test-123']));
      setEventInsight(makeInsight({ id: 'nexus-event-large-income-test-123' }));
      expect(getEventInsight()).toBeNull();
    });

    it('does show an insight not yet in localStorage', () => {
      setEventInsight(makeInsight({ id: 'fresh-insight' }));
      expect(getEventInsight()?.id).toBe('fresh-insight');
    });
  });
});
