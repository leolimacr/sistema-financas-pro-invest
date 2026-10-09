export class EventDeduplicator {
  private cache: Map<string, number> = new Map();
  private readonly TTL = 5000; // 5 segundos

  isDuplicate(correlationId: string): boolean {
    const now = Date.now();
    const lastSeen = this.cache.get(correlationId);

    if (lastSeen && now - lastSeen < this.TTL) {
      return true;
    }

    this.cache.set(correlationId, now);
    return false;
  }

  cleanup() {
    const now = Date.now();
    for (const [id, time] of this.cache.entries()) {
      if (now - time > this.TTL) this.cache.delete(id);
    }
  }
}

export const eventDeduplicator = new EventDeduplicator();
