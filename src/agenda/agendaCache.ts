import { Timestamp } from 'firebase/firestore';
import type { AgendaCommitment } from '../services/agendaService';

/**
 * Módulo Soberano de Cache Local da Agenda (FinOps & Offline-First)
 * Salva e recupera compromissos vistos por mês no localStorage,
 * garantindo leitura instantânea sem requisições excessivas ao Firestore.
 */

const CACHE_PREFIX = 'fpi_agenda_cache';

export interface SerializedCommitment {
  id?: string;
  date: { seconds: number; nanoseconds: number };
  title: string;
  time?: string;
  endTime?: string;
  completed: boolean;
  alarmAt?: { seconds: number; nanoseconds: number } | null;
  reminderMode?: 'notification' | 'notification_alarm';
  seriesId?: string;
  recurrence?: any;
  detached?: boolean;
  detachedNote?: string;
  location?: string;
  participants?: string[];
  notes?: string;
  order?: number;
  createdAt?: { seconds: number; nanoseconds: number };
  updatedAt?: { seconds: number; nanoseconds: number };
}

function serializeTimestamp(ts: Timestamp | Date | undefined | null): { seconds: number; nanoseconds: number } | null {
  if (!ts) return null;
  if (ts instanceof Date) {
    const s = Math.floor(ts.getTime() / 1000);
    const ns = (ts.getTime() % 1000) * 1e6;
    return { seconds: s, nanoseconds: ns };
  }
  if (typeof ts.toDate === 'function') {
    return { seconds: ts.seconds, nanoseconds: ts.nanoseconds };
  }
  if (typeof (ts as any).seconds === 'number') {
    return { seconds: (ts as any).seconds, nanoseconds: (ts as any).nanoseconds || 0 };
  }
  return null;
}

export function createTimestamp(seconds: number, nanoseconds = 0): Timestamp {
  try {
    if (typeof Timestamp === 'function') {
      return new (Timestamp as any)(seconds, nanoseconds);
    }
  } catch {
    // fallback
  }
  const d = new Date(seconds * 1000 + nanoseconds / 1e6);
  return {
    seconds,
    nanoseconds,
    toDate: () => d,
    toMillis: () => d.getTime(),
    isEqual: (other: any) => other && other.seconds === seconds,
    valueOf: () => d.toISOString(),
  } as unknown as Timestamp;
}

function deserializeTimestamp(raw: { seconds: number; nanoseconds: number } | undefined | null): Timestamp | undefined {
  if (!raw || typeof raw.seconds !== 'number') return undefined;
  return createTimestamp(raw.seconds, raw.nanoseconds || 0);
}

export function serializeCommitment(c: AgendaCommitment): SerializedCommitment {
  const dateObj = serializeTimestamp(c.date) || { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
  return {
    ...c,
    date: dateObj,
    alarmAt: serializeTimestamp(c.alarmAt),
    createdAt: serializeTimestamp(c.createdAt) || undefined,
    updatedAt: serializeTimestamp(c.updatedAt) || undefined,
  };
}

export function deserializeCommitment(raw: SerializedCommitment): AgendaCommitment {
  const dateTs = deserializeTimestamp(raw.date) || createTimestamp(Math.floor(Date.now() / 1000));
  const res: AgendaCommitment = {
    ...raw,
    date: dateTs,
    alarmAt: deserializeTimestamp(raw.alarmAt),
    createdAt: deserializeTimestamp(raw.createdAt),
    updatedAt: deserializeTimestamp(raw.updatedAt),
  };
  return res;
}

export function getMonthCacheKey(userId: string, year: number, month: number): string {
  return `${CACHE_PREFIX}_${userId}_${year}_${month}`;
}

export function loadMonthCache(userId: string, year: number, month: number): AgendaCommitment[] | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const key = getMonthCacheKey(userId, year, month);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: SerializedCommitment[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(deserializeCommitment);
  } catch {
    return null;
  }
}

export function saveMonthCache(
  userId: string,
  year: number,
  month: number,
  commitments: AgendaCommitment[]
): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const key = getMonthCacheKey(userId, year, month);
    const serialized = commitments.map(serializeCommitment);
    localStorage.setItem(key, JSON.stringify(serialized));
  } catch {
    // Quota do localStorage ou erro silencioso
  }
}

export function upsertCachedCommitment(
  userId: string,
  year: number,
  month: number,
  commitment: AgendaCommitment
): void {
  const current = loadMonthCache(userId, year, month) || [];
  const index = current.findIndex((c) => c.id === commitment.id);
  let updated: AgendaCommitment[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...commitment };
  } else {
    updated = [...current, commitment];
  }
  saveMonthCache(userId, year, month, updated);
}

export function removeCachedCommitment(
  userId: string,
  year: number,
  month: number,
  commitmentId: string
): void {
  const current = loadMonthCache(userId, year, month);
  if (!current) return;
  const updated = current.filter((c) => c.id !== commitmentId);
  saveMonthCache(userId, year, month, updated);
}

export function replaceCachedCommitmentId(
  userId: string,
  year: number,
  month: number,
  tempId: string,
  realId: string
): void {
  const current = loadMonthCache(userId, year, month);
  if (!current) return;
  const updated = current.map((c) => (c.id === tempId ? { ...c, id: realId } : c));
  saveMonthCache(userId, year, month, updated);
}

export function clearUserAgendaCache(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const prefix = `${CACHE_PREFIX}_${userId}_`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export const clearAllAgendaCache = clearUserAgendaCache;

