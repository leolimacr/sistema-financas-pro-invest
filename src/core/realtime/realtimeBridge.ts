import type { QueryKey } from '@tanstack/react-query';
import { queryClient } from '../query/queryClient';
import type { Query, DocumentSnapshot, QuerySnapshot, DocumentReference, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import type { DataSnapshot, Query as RTDBQuery } from 'firebase/database';
import { onValue } from 'firebase/database';

interface FirestoreBridgeOptions<T> {
  queryKey: QueryKey;
  type: 'firestore';
  query: Query | DocumentReference;
  mapSnapshot: (snapshot: QuerySnapshot | DocumentSnapshot) => T;
}

interface RTDBBridgeOptions<T> {
  queryKey: QueryKey;
  type: 'rtdb';
  query: RTDBQuery;
  mapSnapshot: (snapshot: DataSnapshot) => T;
}

export type RealtimeBridgeOptions<T> = FirestoreBridgeOptions<T> | RTDBBridgeOptions<T>;

const prevDataCache = new Map<string, unknown>();
const PREV_DATA_CACHE_MAX_ENTRIES = 256;

function cacheSetValue(key: string, value: unknown): void {
  prevDataCache.delete(key);
  prevDataCache.set(key, value);
  while (prevDataCache.size > PREV_DATA_CACHE_MAX_ENTRIES) {
    const oldestKey = prevDataCache.keys().next().value;
    if (oldestKey === undefined) break;
    prevDataCache.delete(oldestKey);
  }
}

function arraysEqualById(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const ai = a[i] as Record<string, unknown> | null;
    const bi = b[i] as Record<string, unknown> | null;
    if (ai && bi && typeof ai === 'object' && typeof bi === 'object') {
      if (JSON.stringify(ai) !== JSON.stringify(bi)) return false;
    } else if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function isDataEqual(prev: unknown, next: unknown): boolean {
  if (prev === next) return true;
  if (Array.isArray(prev) && Array.isArray(next)) return arraysEqualById(prev, next);
  return prev === next;
}

function shouldSkipSetQueryData<T>(queryKey: QueryKey, data: T): boolean {
  const key = JSON.stringify(queryKey);
  const prev = prevDataCache.get(key);
  if (isDataEqual(prev, data as unknown)) return true;
  cacheSetValue(key, data as unknown);
  return false;
}

export const createRealtimeBridge = <T>(options: RealtimeBridgeOptions<T>) => {
  return {
    subscribe: (onUpdate: (data: T) => void) => {
      let unsubscribe: () => void;

      if (options.type === 'firestore') {
        const { query, mapSnapshot, queryKey } = options;
        unsubscribe = onSnapshot(
          // O SDK expõe overloads separados para Query e DocumentReference;
          // o cast pontual preserva o union suportado por FirestoreBridgeOptions.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query as any,
          (snapshot: QuerySnapshot | DocumentSnapshot) => {
            const data = mapSnapshot(snapshot);
            const changed = !shouldSkipSetQueryData(queryKey, data);
            if (changed) {
              queryClient.setQueryData(queryKey, data);
              onUpdate(data);
            }
          },
          (error: FirestoreError) => {
            console.error(`Firestore listener error [${JSON.stringify(queryKey)}]:`, error?.code, error?.message);
          },
        );
      } else {
        const { query, mapSnapshot, queryKey } = options;
        unsubscribe = onValue(query, (snapshot) => {
          const data = mapSnapshot(snapshot);
          const changed = !shouldSkipSetQueryData(queryKey, data);
          if (changed) {
            queryClient.setQueryData(queryKey, data);
            onUpdate(data);
          }
        });
      }

      return unsubscribe;
    },
  };
};

export const useRealtimeBridge = <T>(options: RealtimeBridgeOptions<T>) => {
  return createRealtimeBridge(options);
};
