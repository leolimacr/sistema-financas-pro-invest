import { useMemo } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import type { PresenceEvent } from '../services/presence.realtime';

export const usePresenceEvents = (_userId?: string) => {
  const { unreadEvents } = useNotifications();

  const data = useMemo<PresenceEvent[]>(() => {
    return unreadEvents.map((ev) => ({
      eventId: ev.id,
      eventType: ev.eventType ?? '',
      urgency: ev.urgency ?? 'low',
      message: { title: ev.message.title, body: ev.message.body, ctaLabel: ev.message.ctaLabel ?? '' },
      deepLink: ev.deepLink ?? '',
    }));
  }, [unreadEvents]);

  return { data, isLoading: false, error: null };
};
