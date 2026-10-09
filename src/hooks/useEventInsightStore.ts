import { useState, useEffect, useCallback } from 'react';
import type { NexusInsight } from '../services/nexusInsightEngine';
import type { FeedEntry } from '../services/eventInsightStore';
import {
  getEventInsight,
  getEventFeed,
  subscribe,
  subscribeFeed,
  dismissCurrentInsight,
  dismissFeedEntry,
  acknowledgeFeedEntry,
} from '../services/eventInsightStore';

export function useEventInsightStore(): {
  eventInsight: NexusInsight | null;
  feed: FeedEntry[];
  dismissEventInsight: (id?: string, surface?: string) => void;
  acknowledgeEventInsight: (id: string, surface?: string) => void;
} {
  const [insight, setInsight] = useState<NexusInsight | null>(getEventInsight);
  const [feed, setFeed] = useState<FeedEntry[]>(getEventFeed);

  useEffect(() => {
    const unsub1 = subscribe(setInsight);
    const unsub2 = subscribeFeed(setFeed);
    return () => { unsub1(); unsub2(); };
  }, []);

  const dismissEventInsight = useCallback((id?: string, surface?: string) => {
    if (id) {
      dismissFeedEntry(id, surface);
    } else {
      dismissCurrentInsight(surface);
    }
  }, []);

  const acknowledgeEventInsight = useCallback((id: string, surface?: string) => {
    acknowledgeFeedEntry(id, surface);
  }, []);

  return { eventInsight: insight, feed, dismissEventInsight, acknowledgeEventInsight };
}
