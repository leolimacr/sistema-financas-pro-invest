import type { QueryKey} from '@tanstack/react-query';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeError } from '../errors/normalizeError';
import { createRealtimeQuery } from '../realtime/createRealtimeQuery';
import { useEffect } from 'react';

// Factory para Queries com Realtime
export const createRealtimeDomainHook = <TData>(config: {
  domain: string;
  queryKey: (arg: string) => QueryKey;
  subscribe: (id: string, onUpdate: (data: TData) => void) => () => void;
}) => {
  return (id: string) => {
    const key = config.queryKey(id);

    useEffect(() => {
      const cleanup = createRealtimeQuery<TData>({
        queryKey: [...key] as any[],
        subscribe: (onUpdate) => config.subscribe(id, onUpdate),
      });
      return cleanup;
    }, [id, key]);

    return useQuery<TData, Error>({
      queryKey: key,
      queryFn: () => Promise.resolve([] as any), // Placeholder para hidratar via realtime
      enabled: !!id,
    });
  };
};

// Factory para Mutations com Invalidação e Erro Normalizado
export const createDomainMutation = <TData, TVariables>(
  domain: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKey: QueryKey
) => {
  return () => {
    const queryClient = useQueryClient();
    return useMutation<TData, Error, TVariables>({
      mutationFn,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: invalidateKey });
      },
      onError: (error) => {
        throw normalizeError(error, domain);
      },
    });
  };
};
