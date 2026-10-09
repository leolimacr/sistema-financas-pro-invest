import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '../event-bus';
import { EventDeduplicator } from '../runtime/event-deduplicator';

const makeEvent = (type: string, correlationId?: string) => ({
  timestamp: Date.now(),
  domain: 'test',
  type,
  payload: { value: 1 },
  correlationId: correlationId ?? `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  source: 'test',
});

describe('eventBus', () => {
  it('publishes to a subscriber', async () => {
    const handler = vi.fn();
    eventBus.subscribe('test.event', handler);

    const event = makeEvent('test.event');
    await eventBus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'test.event', correlationId: event.correlationId }));
  });

  it('does NOT call handler for a different event type', async () => {
    const handler = vi.fn();
    eventBus.subscribe('other.event', handler);

    await eventBus.publish(makeEvent('test.event'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls multiple subscribers for the same event', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    eventBus.subscribe('multi.event', handler1);
    eventBus.subscribe('multi.event', handler2);

    await eventBus.publish(makeEvent('multi.event'));

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('stops calling handler after unsubscribe', async () => {
    const handler = vi.fn();
    const unsub = eventBus.subscribe('unsub.event', handler);
    unsub();

    await eventBus.publish(makeEvent('unsub.event'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when publishing with no subscribers', async () => {
    await expect(eventBus.publish(makeEvent('lonely.event'))).resolves.toBeUndefined();
  });

  it('supports async handlers', async () => {
    const handler = vi.fn(async () => {});
    eventBus.subscribe('async.event', handler);

    await eventBus.publish(makeEvent('async.event'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('blocks duplicate correlationId via deduplicator', async () => {
    const handler = vi.fn();
    eventBus.subscribe('dedup.event', handler);

    const id = `dedup-${Date.now()}`;
    await eventBus.publish(makeEvent('dedup.event', id));
    await eventBus.publish(makeEvent('dedup.event', id));

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('EventDeduplicator', () => {
  it('allows a new correlationId', () => {
    const dedup = new EventDeduplicator();
    expect(dedup.isDuplicate('fresh-id')).toBe(false);
  });

  it('blocks duplicate within TTL', () => {
    const dedup = new EventDeduplicator();
    const id = 'dup-id';
    dedup.isDuplicate(id);
    expect(dedup.isDuplicate(id)).toBe(true);
  });

  it('allows different correlationIds', () => {
    const dedup = new EventDeduplicator();
    expect(dedup.isDuplicate('a')).toBe(false);
    expect(dedup.isDuplicate('b')).toBe(false);
    expect(dedup.isDuplicate('c')).toBe(false);
  });
});
