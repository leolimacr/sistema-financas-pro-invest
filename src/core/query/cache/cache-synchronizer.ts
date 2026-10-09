import type { QueryKey } from '@tanstack/react-query';
import { queryClient } from '../queryClient';

export const cacheSynchronizer = {
  sync: <T>(queryKey: QueryKey, data: T) => {
    queryClient.setQueryData(queryKey, data);
  },
  
  rollback: <T>(queryKey: QueryKey, previousData: T) => {
    queryClient.setQueryData(queryKey, previousData);
  },
  
  invalidate: async (queryKey: QueryKey) => {
    await queryClient.invalidateQueries({ queryKey });
  }
};
