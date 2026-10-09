import { realtimeRegistry } from './realtime.registry';
import { bindSnapshotToQuery } from './bindSnapshotToQuery';
import type { RealtimeQueryConfig } from './realtime.types';
import { queryClient } from '../queryClient';

export const createRealtimeQuery = <T>(config: RealtimeQueryConfig<T>) => {
  const keyString = JSON.stringify(config.queryKey);

  // Se o dado já existe no cache, não bloqueia o início, 
  // mas garante que o snapshot vai atualizar o cache assim que chegar.
  const unsubscribe = config.subscribe((data) => {
    bindSnapshotToQuery(config.queryKey, data);
  });

  realtimeRegistry.register(keyString, {
    key: keyString,
    unsubscribe,
  });

  return () => realtimeRegistry.unregister(keyString);
};
