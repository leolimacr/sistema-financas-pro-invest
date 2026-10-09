import { describe, it, expect, vi, beforeEach } from 'vitest';

const onSnapshotMock = vi.fn();
const onValueMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
}));

vi.mock('firebase/database', () => ({
  onValue: (...args: unknown[]) => onValueMock(...args),
}));

import { createRealtimeBridge } from '../realtimeBridge';
import { queryClient } from '../../query/queryClient';

describe('realtimeBridge - onUpdate só quando há mudança', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSnapshotMock.mockReturnValue(() => {});
    onValueMock.mockReturnValue(() => {});
  });

  it('firestore: snapshots idênticos disparam onUpdate 1×', () => {
    let handler: (snap: unknown) => void = () => {};
    onSnapshotMock.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      handler = cb;
      return () => {};
    });

    const bridge = createRealtimeBridge<string[]>({
      queryKey: ['rtb-test', 'a'],
      type: 'firestore',
      query: {} as never,
      mapSnapshot: (snap: unknown) => (snap as { docs: { id: string }[] }).docs.map(d => d.id),
    });

    const onUpdate = vi.fn();
    bridge.subscribe(onUpdate);

    const snap = { docs: [{ id: '1' }, { id: '2' }] };
    handler(snap);
    handler({ docs: [{ id: '1' }, { id: '2' }] });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['rtb-test', 'a'])).toEqual(['1', '2']);
  });

  it('firestore: snapshot alterado dispara onUpdate de novo', () => {
    let handler: (snap: unknown) => void = () => {};
    onSnapshotMock.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      handler = cb;
      return () => {};
    });

    const bridge = createRealtimeBridge<string[]>({
      queryKey: ['rtb-test', 'b'],
      type: 'firestore',
      query: {} as never,
      mapSnapshot: (snap: unknown) => (snap as { docs: { id: string }[] }).docs.map(d => d.id),
    });

    const onUpdate = vi.fn();
    bridge.subscribe(onUpdate);

    handler({ docs: [{ id: '1' }] });
    handler({ docs: [{ id: '1' }, { id: '2' }] });

    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('rtdb: valor repetido não re-dispara onUpdate nem reescreve localStorage do chamador', () => {
    let handler: (snap: unknown) => void = () => {};
    onValueMock.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      handler = cb;
      return () => {};
    });

    const bridge = createRealtimeBridge<number>({
      queryKey: ['rtb-test', 'c'],
      type: 'rtdb',
      query: {} as never,
      mapSnapshot: (snap: unknown) => (snap as { val: () => number }).val(),
    });

    const onUpdate = vi.fn();
    bridge.subscribe(onUpdate);

    handler({ val: () => 42 });
    handler({ val: () => 42 });
    handler({ val: () => 43 });

    expect(onUpdate).toHaveBeenCalledTimes(2);
  });
});
