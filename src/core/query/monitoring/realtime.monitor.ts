import { realtimeRegistry } from '../realtime/realtime.registry';

export const realtimeMonitor = {
  logSubscriptionCount: () => {
    if (process.env.NODE_ENV === 'development') {
      const count = realtimeRegistry.getSubscriptionCount();
      console.log(`[Realtime Monitor] Active Subscriptions: ${count}`);
    }
  },
  
  warnOrphanDetection: (key: string) => {
    console.warn(`[Realtime Monitor] Potential orphan listener detected for key: ${key}`);
  }
};
