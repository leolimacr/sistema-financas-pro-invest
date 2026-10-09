import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const getDocsMock = vi.fn();
const commitMock = vi.fn();
const batchUpdateMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  writeBatch: vi.fn(() => ({ update: (...a: unknown[]) => batchUpdateMock(...a), commit: () => commitMock() })),
  doc: vi.fn(() => ({})),
  Timestamp: { now: vi.fn(() => ({ seconds: 1 })) },
}));

vi.mock('../../../firebase', () => ({ firestore: {} }));

vi.mock('../../../services/PresenceEventService', () => ({
  PresenceEventService: { markActioned: vi.fn() },
}));

import { HomePresenceFeed } from '../HomePresenceFeed';

const future = Math.floor(Date.now() / 1000) + 3600;

const feedDoc = (id: string) => ({
  id,
  data: () => ({
    status: 'pending',
    channel: 'in_app',
    urgency: 'high',
    urgencyScore: 3,
    expiresAt: { seconds: future },
    message: { title: 'T', body: 'B', ctaLabel: 'Ver' },
    deepLink: 'manager',
    eventType: 'debt.due_soon_3d',
  }),
});

const props = {
  userId: 'u1',
  isAuthenticated: true,
  onNavigate: () => {},
  heroPersona: 'dividas' as const,
};

describe('HomePresenceFeed - markSeen em batch único por sessão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    commitMock.mockResolvedValue(undefined);
    getDocsMock.mockResolvedValue({ docs: [feedDoc('e1'), feedDoc('e2')] });
  });

  it('marca vistos com 1 batch no mount', async () => {
    const { unmount } = render(<HomePresenceFeed {...props} />);

    await waitFor(() => expect(commitMock).toHaveBeenCalledTimes(1));
    expect(batchUpdateMock).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('remount na mesma sessão não reescreve (guarda sessionStorage)', async () => {
    const r1 = render(<HomePresenceFeed {...props} />);
    await waitFor(() => expect(commitMock).toHaveBeenCalledTimes(1));
    r1.unmount();

    const r2 = render(<HomePresenceFeed {...props} />);
    await waitFor(() => expect(getDocsMock).toHaveBeenCalledTimes(2));
    await new Promise(r => setTimeout(r, 50));
    expect(commitMock).toHaveBeenCalledTimes(1);
    r2.unmount();
  });
});
