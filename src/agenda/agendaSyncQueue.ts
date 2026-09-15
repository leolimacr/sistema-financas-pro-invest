import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '../firebase';
import type { AgendaCommitmentInput } from '../services/agendaService';
import { replaceCachedCommitmentId, removeCachedCommitment } from './agendaCache';

/**
 * Fila de Sincronização Offline da Agenda (Offline Mutations Sync Queue)
 * Persiste mutações feitas sem internet no localStorage e processa
 * atômica e confiavelmente quando a conexão retorna.
 */

const SYNC_QUEUE_PREFIX = 'fpi_agenda_sync_queue';

export type AgendaSyncOp =
  | {
      type: 'add';
      opId: string;
      tempId: string;
      input: {
        dateStr: string; // ISO string para serialização segura
        title: string;
        time?: string;
        endTime?: string;
        completed: boolean;
        alarmAtStr?: string;
        reminderMode?: 'notification' | 'notification_alarm';
        seriesId?: string;
        recurrence?: any;
        detached?: boolean;
        detachedNote?: string;
        location?: string;
        participants?: string[];
        notes?: string;
        order?: number;
      };
      year: number;
      month: number;
      createdAt: number;
    }
  | {
      type: 'edit';
      opId: string;
      id: string;
      updates: Record<string, any>;
      year: number;
      month: number;
      createdAt: number;
    }
  | {
      type: 'delete';
      opId: string;
      id: string;
      year: number;
      month: number;
      createdAt: number;
    }
  | {
      type: 'toggle';
      opId: string;
      id: string;
      completed: boolean;
      year: number;
      month: number;
      createdAt: number;
    }
  | {
      type: 'reorder';
      opId: string;
      payload: Array<{ id: string; order: number }>;
      year: number;
      month: number;
      createdAt: number;
    };

function getQueueKey(userId: string): string {
  return `${SYNC_QUEUE_PREFIX}_${userId}`;
}

export function getPendingAgendaOps(userId: string): AgendaSyncOp[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(getQueueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingAgendaOps(userId: string, ops: AgendaSyncOp[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(getQueueKey(userId), JSON.stringify(ops));
  } catch {
    // Quota ou erro silencioso
  }
}

export function enqueueAgendaOp(userId: string, op: Omit<AgendaSyncOp, 'opId' | 'createdAt'>): void {
  const fullOp = {
    ...op,
    opId: `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
  } as AgendaSyncOp;

  const current = getPendingAgendaOps(userId);
  savePendingAgendaOps(userId, [...current, fullOp]);
}

export function clearAgendaSyncQueue(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.removeItem(getQueueKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Processa a fila de sincronização pendente com o Firestore.
 * Converte operações acumuladas em gravações reais.
 */
export async function processAgendaSyncQueue(
  userId: string,
  callbacks?: {
    onIdReplaced?: (tempId: string, realId: string, year: number, month: number) => void;
    onItemSynced?: (op: AgendaSyncOp) => void;
  }
): Promise<{ processed: number; errors: number }> {
  if (typeof window === 'undefined' || !userId) return { processed: 0, errors: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, errors: 0 };
  }

  const ops = getPendingAgendaOps(userId);
  if (ops.length === 0) return { processed: 0, errors: 0 };

  let processedCount = 0;
  let errorCount = 0;
  const remainingOps: AgendaSyncOp[] = [];

  // Mapeamento local de tempId -> realId nesta sessão de sincronização
  const idMap = new Map<string, string>();

  for (const op of ops) {
    try {
      if (op.type === 'add') {
        const date = new Date(op.input.dateStr);
        const now = Timestamp.now();
        const docData: Record<string, unknown> = {
          date: Timestamp.fromDate(date),
          title: op.input.title,
          completed: op.input.completed,
          createdAt: now,
          updatedAt: now,
          time: op.input.time ?? null,
          endTime: op.input.endTime ?? null,
          order: op.input.order ?? null,
        };

        if (op.input.alarmAtStr) {
          docData.alarmAt = Timestamp.fromDate(new Date(op.input.alarmAtStr));
        }
        if (op.input.reminderMode !== undefined) docData.reminderMode = op.input.reminderMode;
        if (op.input.seriesId !== undefined) docData.seriesId = op.input.seriesId;
        if (op.input.recurrence !== undefined) docData.recurrence = op.input.recurrence;
        if (op.input.detached !== undefined) docData.detached = op.input.detached;
        if (op.input.detachedNote !== undefined) docData.detachedNote = op.input.detachedNote;
        if (op.input.location !== undefined) docData.location = op.input.location;
        if (op.input.participants !== undefined) docData.participants = op.input.participants;
        if (op.input.notes !== undefined) docData.notes = op.input.notes;

        const docRef = await addDoc(collection(firestore, `users/${userId}/agenda`), docData);
        const realId = docRef.id;

        idMap.set(op.tempId, realId);
        replaceCachedCommitmentId(userId, op.year, op.month, op.tempId, realId);

        if (callbacks?.onIdReplaced) {
          callbacks.onIdReplaced(op.tempId, realId, op.year, op.month);
        }
        processedCount++;
      } else if (op.type === 'edit') {
        const targetId = idMap.get(op.id) || op.id;
        // Se ainda for um ID temporário não mapeado, adia
        if (targetId.startsWith('temp_') && !idMap.has(targetId)) {
          remainingOps.push(op);
          continue;
        }
        const ref = doc(firestore, `users/${userId}/agenda`, targetId);
        await updateDoc(ref, { ...op.updates, updatedAt: serverTimestamp() });
        processedCount++;
      } else if (op.type === 'delete') {
        const targetId = idMap.get(op.id) || op.id;
        if (targetId.startsWith('temp_') && !idMap.has(targetId)) {
          // Se foi criado offline e deletado offline sem ter ido ao Firestore, apenas remove do cache local
          removeCachedCommitment(userId, op.year, op.month, targetId);
          processedCount++;
          continue;
        }
        const ref = doc(firestore, `users/${userId}/agenda`, targetId);
        await deleteDoc(ref);
        processedCount++;
      } else if (op.type === 'toggle') {
        const targetId = idMap.get(op.id) || op.id;
        if (targetId.startsWith('temp_') && !idMap.has(targetId)) {
          remainingOps.push(op);
          continue;
        }
        const ref = doc(firestore, `users/${userId}/agenda`, targetId);
        await updateDoc(ref, { completed: op.completed, updatedAt: serverTimestamp() });
        processedCount++;
      } else if (op.type === 'reorder') {
        const batch = writeBatch(firestore);
        for (const item of op.payload) {
          const targetId = idMap.get(item.id) || item.id;
          if (targetId.startsWith('temp_')) continue;
          batch.update(doc(firestore, `users/${userId}/agenda`, targetId), {
            order: item.order,
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
        processedCount++;
      }

      if (callbacks?.onItemSynced) {
        callbacks.onItemSynced(op);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[agendaSyncQueue] Erro ao sincronizar op:', op, err);
      }
      errorCount++;
      remainingOps.push(op);
    }
  }

  savePendingAgendaOps(userId, remainingOps);
  return { processed: processedCount, errors: errorCount };
}
