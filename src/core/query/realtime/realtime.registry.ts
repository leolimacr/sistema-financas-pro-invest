import type { RealtimeSubscription } from './realtime.types';

class SubscriptionRegistry {
  private subscriptions: Map<string, { subscription: RealtimeSubscription, count: number }> = new Map();

  register(key: string, subscription: RealtimeSubscription) {
    const existing = this.subscriptions.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    this.subscriptions.set(key, { subscription, count: 1 });
  }

  unregister(key: string) {
    const entry = this.subscriptions.get(key);
    if (entry) {
      entry.count -= 1;
      if (entry.count <= 0) {
        entry.subscription.unsubscribe();
        this.subscriptions.delete(key);
      }
    }
  }

  cleanupAll() {
    this.subscriptions.forEach(({ subscription }) => subscription.unsubscribe());
    this.subscriptions.clear();
  }

  getSubscriptionCount() {
    return this.subscriptions.size;
  }
}

export const realtimeRegistry = new SubscriptionRegistry();
