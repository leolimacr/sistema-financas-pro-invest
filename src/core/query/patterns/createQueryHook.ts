import type { UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { normalizeError } from '../errors/normalizeError';

export const createQueryHook = <TQueryFnData, TError, TData = TQueryFnData>(
  domain: string,
  key: QueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<UseQueryOptions<TQueryFnData, TError, TData>, 'queryKey' | 'queryFn'>
) => {
  return () => {
    return useQuery<TQueryFnData, TError, TData>({
      queryKey: key,
      queryFn,
      ...options,
    });
  };
};
