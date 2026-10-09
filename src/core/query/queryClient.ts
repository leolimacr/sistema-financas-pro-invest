import { QueryClient } from '@tanstack/react-query';
import { queryConfig } from './queryConfig';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: queryConfig.retry,
      staleTime: queryConfig.staleTime,
      gcTime: queryConfig.gcTime,
      refetchOnWindowFocus: false,
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});
