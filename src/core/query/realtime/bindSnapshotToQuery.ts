import type { QueryKey } from '@tanstack/react-query';
import { queryClient } from '../queryClient';

export const bindSnapshotToQuery = <T>(queryKey: QueryKey, data: T) => {
  queryClient.setQueryData(queryKey, data);
};
