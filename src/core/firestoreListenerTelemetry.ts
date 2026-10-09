const activeListeners = new Map<string, { owner: string; collection: string; createdAt: number }>();

const LISTENER_LOG_PREFIX = '[FinOps/Listener]';

export function trackListener(
  owner: string,
  collection: string,
): () => void {
  const key = `${owner}::${collection}`;
  const now = Date.now();

  if (activeListeners.has(key)) {
    const existing = activeListeners.get(key)!;
    const age = now - existing.createdAt;
    console.warn(
      `${LISTENER_LOG_PREFIX} DUPLICATE: "${owner}" já possui listener ativo em "${collection}" (criado há ${age}ms)`,
    );
  }

  activeListeners.set(key, { owner, collection, createdAt: now });
  console.log(
    `${LISTENER_LOG_PREFIX} CREATED: "${owner}" → "${collection}" (total ativos: ${activeListeners.size})`,
  );

  return () => {
    const removed = activeListeners.delete(key);
    if (removed) {
      console.log(
        `${LISTENER_LOG_PREFIX} UNSUBSCRIBED: "${owner}" → "${collection}" (total ativos: ${activeListeners.size})`,
      );
    }
  };
}

export function getActiveListenerCount(): number {
  return activeListeners.size;
}

export function getActiveListeners(): Map<string, { owner: string; collection: string; createdAt: number }> {
  return new Map(activeListeners);
}
