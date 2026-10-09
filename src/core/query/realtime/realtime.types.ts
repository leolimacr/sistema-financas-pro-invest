export interface RealtimeSubscription {
  unsubscribe: () => void;
  key: string;
}

export type SnapshotBinder<T> = (data: T) => void;

export interface RealtimeQueryConfig<T> {
  queryKey: any[];
  subscribe: (onUpdate: (data: T) => void) => () => void;
}
