import type { DocumentData, CollectionReference } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import {
  collection,
  addDoc,
  getDocs,

  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from '../firebase';
import type { RecurringBill } from '../types';
import {
  loadMonthCache,
  saveMonthCache,
  upsertCachedCommitment,
  removeCachedCommitment,
  searchCachedCommitments,
} from '../agenda/agendaCache';
import {
  enqueueAgendaOp,
  getPendingAgendaOps,
} from '../agenda/agendaSyncQueue';

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly';

/**
 * Modo de aviso de um compromisso:
 * 'notification' = apenas notificação visual/sonora padrão (rápida, sem loop);
 * 'alarm' = alarme contínuo em loop com tela ativa de despertar até dispensar;
 * 'notification_alarm' = notificação de sistema E alarme contínuo em loop.
 * Ausência (undefined) significa que o compromisso não tem aviso ativo.
 */
export type AgendaReminderMode = 'notification' | 'alarm' | 'notification_alarm';

/**
 * Regra de recorrência de uma série de compromissos (espelho do que o Nexus
 * interpreta em linguagem natural). `until` é a última ocorrência da série.
 */
export interface AgendaRecurrence {
  freq: RecurrenceFreq;
  /** 1..7, seg=1 — obrigatório quando freq === 'weekly' */
  byDay?: number;
  until?: Timestamp;
}

export interface AgendaCommitment {
  id?: string;
  date: Timestamp;
  title: string;
  time?: string;
  /** Hora de término (ex.: '17h às 18h' → '18:00'). Opcional. */
  endTime?: string;
  completed: boolean;
  alarmAt?: Timestamp;
  /** Modo de aviso ativo quando alarmAt existe (default implícito: 'notification'). */
  reminderMode?: AgendaReminderMode;
  /** Vínculo com a série original. Todos os membros de uma recorrência compartilham o mesmo id. */
  seriesId?: string;
  /** Regra de recorrência da qual este compromisso faz parte. */
  recurrence?: AgendaRecurrence;
  /** TRUE = exceção desmembrada da regra original (movida/editada individualmente). */
  detached?: boolean;
  detachedNote?: string;
  location?: string;
  participants?: string[];
  notes?: string;
  /** Ordem manual dentro do dia (reordenação pela UI). Ausente em compromissos
   * legados — estes caem no fallback (time → createdAt) ao ordenar. */
  order?: number;
  /** Origem do compromisso */
  source?: 'controla_bill' | 'manual' | 'nexus';
  /** ID da conta fixa vinculada no Controla */
  linkedBillId?: string;
  /** Valor monetário associado */
  amount?: number;
  /** Categoria da despesa associada */
  category?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** Input para criar um compromisso (date é Date, convertido para Timestamp pelo Firestore) */
export interface AgendaCommitmentInput {
  date: Date;
  title: string;
  time?: string;
  endTime?: string;
  completed: boolean;
  alarmAt?: Date;
  reminderMode?: AgendaReminderMode;
  seriesId?: string;
  recurrence?: AgendaRecurrence;
  detached?: boolean;
  detachedNote?: string;
  location?: string;
  participants?: string[];
  notes?: string;
  order?: number;
  source?: 'controla_bill' | 'manual' | 'nexus';
  linkedBillId?: string;
  amount?: number;
  category?: string;
}

const getCollection = (userId: string): CollectionReference<DocumentData> => {
  return collection(firestore, `users/${userId}/agenda`);
};

/** Requer índice composto Firestore: date ASC, time ASC */
export const fetchMonthCommitments = async (
  userId: string,
  year: number,
  month: number
): Promise<AgendaCommitment[]> => {
  // Se estiver comprovadamente offline, recupera imediatamente do cache local
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = loadMonthCache(userId, year, month);
    if (cached) return cached;
    return [];
  }

  const startOfMonth = new Date(year, month, 1);
  const startOfNextMonth = new Date(year, month + 1, 1);

  const q = query(
    getCollection(userId),
    where('date', '>=', startOfMonth),
    where('date', '<', startOfNextMonth),
    orderBy('date', 'asc')
  );

  try {
    const snapshot = await getDocs(q);
    const remoteData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AgendaCommitment));
    remoteData.sort((a, b) => {
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });

    // Mescla itens pendentes na fila de sync local para este mês que ainda não subiram
    const pendingOps = getPendingAgendaOps(userId);
    const pendingAdds = pendingOps
      .filter((op): op is Extract<typeof op, { type: 'add' }> => op.type === 'add' && op.year === year && op.month === month)
      .map((op) => ({
        id: op.tempId,
        date: Timestamp.fromDate(new Date(op.input.dateStr)),
        title: op.input.title,
        time: op.input.time,
        endTime: op.input.endTime,
        completed: op.input.completed,
        alarmAt: op.input.alarmAtStr ? Timestamp.fromDate(new Date(op.input.alarmAtStr)) : undefined,
        reminderMode: op.input.reminderMode,
        seriesId: op.input.seriesId,
        recurrence: op.input.recurrence,
        detached: op.input.detached,
        detachedNote: op.input.detachedNote,
        location: op.input.location,
        participants: op.input.participants,
        notes: op.input.notes,
        order: op.input.order,
        source: op.input.source,
        linkedBillId: op.input.linkedBillId,
        amount: op.input.amount,
        category: op.input.category,
      } as AgendaCommitment));

    const combined = [...remoteData];
    for (const pending of pendingAdds) {
      if (!combined.some((c) => c.id === pending.id)) {
        combined.push(pending);
      }
    }

    saveMonthCache(userId, year, month, combined);
    return combined;
  } catch (err) {
    const fallback = loadMonthCache(userId, year, month);
    if (fallback) {
      return fallback;
    }
    throw err;
  }
};

export const fetchUpcomingCommitments = async (
  userId: string,
  max = 10
): Promise<AgendaCommitment[]> => {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isOffline) {
    const currentMonthData = loadMonthCache(userId, today.getFullYear(), today.getMonth()) || [];
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthData = loadMonthCache(userId, nextMonth.getFullYear(), nextMonth.getMonth()) || [];
    const all = [...currentMonthData, ...nextMonthData];
    return all
      .filter((c) => {
        const d = c.date instanceof Date ? c.date : c.date?.toDate?.() || new Date();
        return d.getTime() >= today.getTime();
      })
      .slice(0, max);
  }

  const q = query(
    getCollection(userId),
    where('date', '>=', today),
    orderBy('date', 'asc'),
    limit(max * 2)
  );

  try {
    const snapshot = await getDocs(q);
    const remoteData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AgendaCommitment));
    remoteData.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date.getTime() : a.date?.toDate?.().getTime() || 0;
      const dateB = b.date instanceof Date ? b.date.getTime() : b.date?.toDate?.().getTime() || 0;
      if (dateA !== dateB) return dateA - dateB;
      return (a.time || '').localeCompare(b.time || '');
    });
    return remoteData.slice(0, max);
  } catch (err) {
    const currentMonthData = loadMonthCache(userId, today.getFullYear(), today.getMonth()) || [];
    return currentMonthData
      .filter((c) => {
        const d = c.date instanceof Date ? c.date : c.date?.toDate?.() || new Date();
        return d.getTime() >= today.getTime();
      })
      .slice(0, max);
  }
};

export const addCommitment = async (
  userId: string,
  data: AgendaCommitmentInput
): Promise<string> => {
  const year = data.date.getFullYear();
  const month = data.date.getMonth();
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  const now = Timestamp.now();
  const docData: Record<string, unknown> = {
    date: Timestamp.fromDate(data.date),
    title: data.title,
    completed: data.completed,
    createdAt: now,
    updatedAt: now,
  };
  docData.time = data.time ?? null;
  docData.endTime = data.endTime ?? null;
  if (data.alarmAt) docData.alarmAt = Timestamp.fromDate(data.alarmAt);
  if (data.reminderMode !== undefined) docData.reminderMode = data.reminderMode;
  if (data.seriesId !== undefined) docData.seriesId = data.seriesId;
  if (data.recurrence !== undefined) docData.recurrence = data.recurrence;
  if (data.detached !== undefined) docData.detached = data.detached;
  if (data.detachedNote !== undefined) docData.detachedNote = data.detachedNote;
  if (data.location !== undefined) docData.location = data.location;
  if (data.participants !== undefined) docData.participants = data.participants;
  if (data.notes !== undefined) docData.notes = data.notes;
  docData.order = data.order ?? null;
  if (data.source !== undefined) docData.source = data.source;
  if (data.linkedBillId !== undefined) docData.linkedBillId = data.linkedBillId;
  if (data.amount !== undefined) docData.amount = data.amount;
  if (data.category !== undefined) docData.category = data.category;

  if (isOffline) {
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const localCommitment: AgendaCommitment = {
      id: tempId,
      date: Timestamp.fromDate(data.date),
      title: data.title,
      time: data.time,
      endTime: data.endTime,
      completed: data.completed,
      alarmAt: data.alarmAt ? Timestamp.fromDate(data.alarmAt) : undefined,
      reminderMode: data.reminderMode,
      seriesId: data.seriesId,
      recurrence: data.recurrence,
      detached: data.detached,
      detachedNote: data.detachedNote,
      location: data.location,
      participants: data.participants,
      notes: data.notes,
      order: data.order,
      source: data.source,
      linkedBillId: data.linkedBillId,
      amount: data.amount,
      category: data.category,
      createdAt: now,
      updatedAt: now,
    };

    upsertCachedCommitment(userId, year, month, localCommitment);
    enqueueAgendaOp(userId, {
      type: 'add',
      tempId,
      input: {
        dateStr: data.date.toISOString(),
        title: data.title,
        time: data.time,
        endTime: data.endTime,
        completed: data.completed,
        alarmAtStr: data.alarmAt?.toISOString(),
        reminderMode: data.reminderMode,
        seriesId: data.seriesId,
        recurrence: data.recurrence,
        detached: data.detached,
        detachedNote: data.detachedNote,
        location: data.location,
        participants: data.participants,
        notes: data.notes,
        order: data.order,
        source: data.source,
        linkedBillId: data.linkedBillId,
        amount: data.amount,
        category: data.category,
      },
      year,
      month,
    });
    return tempId;
  }

  try {
    const docRef = await addDoc(getCollection(userId), docData);
    const realId = docRef.id;

    const localCommitment: AgendaCommitment = {
      id: realId,
      ...docData,
      date: docData.date as Timestamp,
      createdAt: now,
      updatedAt: now,
    } as AgendaCommitment;
    upsertCachedCommitment(userId, year, month, localCommitment);

    return realId;
  } catch (err) {
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const localCommitment: AgendaCommitment = {
      id: tempId,
      date: Timestamp.fromDate(data.date),
      title: data.title,
      time: data.time,
      endTime: data.endTime,
      completed: data.completed,
      alarmAt: data.alarmAt ? Timestamp.fromDate(data.alarmAt) : undefined,
      reminderMode: data.reminderMode,
      seriesId: data.seriesId,
      recurrence: data.recurrence,
      detached: data.detached,
      detachedNote: data.detachedNote,
      location: data.location,
      participants: data.participants,
      notes: data.notes,
      order: data.order,
      source: data.source,
      linkedBillId: data.linkedBillId,
      amount: data.amount,
      category: data.category,
      createdAt: now,
      updatedAt: now,
    };

    upsertCachedCommitment(userId, year, month, localCommitment);
    enqueueAgendaOp(userId, {
      type: 'add',
      tempId,
      input: {
        dateStr: data.date.toISOString(),
        title: data.title,
        time: data.time,
        endTime: data.endTime,
        completed: data.completed,
        alarmAtStr: data.alarmAt?.toISOString(),
        reminderMode: data.reminderMode,
        seriesId: data.seriesId,
        recurrence: data.recurrence,
        detached: data.detached,
        detachedNote: data.detachedNote,
        location: data.location,
        participants: data.participants,
        notes: data.notes,
        order: data.order,
        source: data.source,
        linkedBillId: data.linkedBillId,
        amount: data.amount,
        category: data.category,
      },
      year,
      month,
    });
    return tempId;
  }
};

export const updateCommitment = async (
  userId: string,
  commitmentId: string,
  data: Record<string, unknown>,
  yearMonth?: { year: number; month: number }
): Promise<void> => {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (yearMonth) {
    const current = loadMonthCache(userId, yearMonth.year, yearMonth.month);
    const item = current?.find((c) => c.id === commitmentId);
    if (item) {
      upsertCachedCommitment(userId, yearMonth.year, yearMonth.month, {
        ...item,
        ...data,
      } as AgendaCommitment);
    }
  }

  if (isOffline) {
    enqueueAgendaOp(userId, {
      type: 'edit',
      id: commitmentId,
      updates: data,
      year: yearMonth?.year ?? new Date().getFullYear(),
      month: yearMonth?.month ?? new Date().getMonth(),
    });
    return;
  }

  try {
    const ref = doc(firestore, `users/${userId}/agenda`, commitmentId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } catch {
    enqueueAgendaOp(userId, {
      type: 'edit',
      id: commitmentId,
      updates: data,
      year: yearMonth?.year ?? new Date().getFullYear(),
      month: yearMonth?.month ?? new Date().getMonth(),
    });
  }
};

export const deleteCommitment = async (
  userId: string,
  commitmentId: string,
  yearMonth?: { year: number; month: number }
): Promise<void> => {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (yearMonth) {
    removeCachedCommitment(userId, yearMonth.year, yearMonth.month, commitmentId);
  }

  if (isOffline) {
    enqueueAgendaOp(userId, {
      type: 'delete',
      id: commitmentId,
      year: yearMonth?.year ?? new Date().getFullYear(),
      month: yearMonth?.month ?? new Date().getMonth(),
    });
    return;
  }

  try {
    const ref = doc(firestore, `users/${userId}/agenda`, commitmentId);
    await deleteDoc(ref);
  } catch {
    enqueueAgendaOp(userId, {
      type: 'delete',
      id: commitmentId,
      year: yearMonth?.year ?? new Date().getFullYear(),
      month: yearMonth?.month ?? new Date().getMonth(),
    });
  }
};

export const toggleCommitment = async (
  userId: string,
  commitmentId: string,
  completed: boolean,
  yearMonth?: { year: number; month: number }
): Promise<void> => {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (yearMonth) {
    const current = loadMonthCache(userId, yearMonth.year, yearMonth.month);
    const item = current?.find((c) => c.id === commitmentId);
    if (item) {
      upsertCachedCommitment(userId, yearMonth.year, yearMonth.month, {
        ...item,
        completed,
      } as AgendaCommitment);
    }
  }

  if (isOffline) {
    enqueueAgendaOp(userId, {
      type: 'toggle',
      id: commitmentId,
      completed,
      year: yearMonth?.year ?? new Date().getFullYear(),
      month: yearMonth?.month ?? new Date().getMonth(),
    });
    return;
  }

  try {
    const ref = doc(firestore, `users/${userId}/agenda`, commitmentId);
    await updateDoc(ref, { completed, updatedAt: serverTimestamp() });
  } catch {
    enqueueAgendaOp(userId, {
      type: 'toggle',
      id: commitmentId,
      completed,
      year: yearMonth?.year ?? new Date().getFullYear(),
      month: yearMonth?.month ?? new Date().getMonth(),
    });
  }
};

/** Reordena os compromissos de um dia: grava o `order` re-normalizado de cada
 * item num único lote atômico (semântica de reordenação manual da Agenda). */
export const reorderDayCommitments = async (
  userId: string,
  ordered: Array<{ id: string; order: number }>,
  yearMonth?: { year: number; month: number }
): Promise<void> => {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (yearMonth) {
    const current = loadMonthCache(userId, yearMonth.year, yearMonth.month);
    if (current) {
      const orderMap = new Map(ordered.map((o) => [o.id, o.order]));
      const updated = current.map((c) => {
        if (c.id && orderMap.has(c.id)) {
          return { ...c, order: orderMap.get(c.id) };
        }
        return c;
      });
      saveMonthCache(userId, yearMonth.year, yearMonth.month, updated);
    }
  }

  if (isOffline) {
    enqueueAgendaOp(userId, {
      type: 'reorder',
      payload: ordered,
      year: yearMonth?.year ?? new Date().getFullYear(),
      month: yearMonth?.month ?? new Date().getMonth(),
    });
    return;
  }

  try {
    const batch = writeBatch(firestore);
    for (const item of ordered) {
      if (item.id.startsWith('temp_')) continue;
      batch.update(doc(firestore, `users/${userId}/agenda`, item.id), {
        order: item.order,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch {
    enqueueAgendaOp(userId, {
      type: 'reorder',
      payload: ordered,
      year: yearMonth?.year ?? new Date().getFullYear(),
      month: yearMonth?.month ?? new Date().getMonth(),
    });
  }
};

export const syncBillsToAgenda = async (
  userId: string,
  bills: RecurringBill[],
  year: number,
  month: number
): Promise<number> => {
  let existing: AgendaCommitment[] = [];
  try {
    existing = await fetchMonthCommitments(userId, year, month);
  } catch (err) {
    console.warn('[Agenda] Fallback para cache na sincronização de contas:', err);
    existing = loadMonthCache(userId, year, month) || [];
  }
  const existingTitles = new Set(
    existing.map((c) => (c.title || '').toLowerCase().trim()).filter(Boolean)
  );

  let addedCount = 0;
  for (const bill of bills) {
    if (!bill || bill.isActive === false) continue;

    const billName = (bill.name || 'Conta').trim();
    const title = `Pagar ${billName}`;
    if (existingTitles.has(title.toLowerCase().trim())) continue;

    const lastDay = new Date(year, month + 1, 0).getDate();
    const rawDueDay = Number(bill.dueDay);
    const day = Math.min(Math.max(1, Number.isFinite(rawDueDay) ? rawDueDay : 1), lastDay);
    const date = new Date(year, month, day, 9, 0, 0, 0);
    const alarmAt = new Date(date);

    const billAmount = Number(bill.amount);
    const formattedAmount = (Number.isFinite(billAmount) ? billAmount : 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    await addCommitment(userId, {
      date,
      title,
      time: '09:00',
      completed: false,
      alarmAt,
      reminderMode: 'notification',
      notes: `Conta do Controla no valor de ${formattedAmount}.`,
      source: 'controla_bill',
      linkedBillId: bill.id,
      amount: Number.isFinite(billAmount) ? billAmount : 0,
      category: bill.category,
    });

    existingTitles.add(title.toLowerCase().trim());
    addedCount++;
  }

  return addedCount;
};

/**
 * Identifica se um compromisso é proveniente da sincronização de contas do Controla.
 * Suporta tanto registros novos com tag explícita quanto registros legados.
 */
export const isSyncedBill = (commitment: AgendaCommitment): boolean => {
  if (!commitment) return false;
  if (commitment.source === 'controla_bill') return true;
  if (Boolean(commitment.linkedBillId)) return true;
  const notes = (commitment.notes || '').toLowerCase();
  if (notes.includes('conta do controla')) return true;
  const title = (commitment.title || '').toLowerCase().trim();
  if (title.startsWith('pagar ')) return true;
  return false;
};

/**
 * Extrai com segurança o valor monetário da conta sincronizada
 */
export const extractBillAmount = (commitment: AgendaCommitment): number => {
  if (!commitment) return 0;
  if (typeof commitment.amount === 'number' && Number.isFinite(commitment.amount)) {
    return commitment.amount;
  }
  const notes = commitment.notes || '';
  const match = notes.match(/R\$\s*([\d.]+,\d{2})/);
  if (match && match[1]) {
    const raw = match[1].replace(/\./g, '').replace(',', '.');
    const val = Number(raw);
    if (Number.isFinite(val)) return val;
  }
  return 0;
};

/**
 * Pesquisa compromissos por palavras-chave combinando memória local, cache em disco e Firestore.
 * Prioriza resposta instantânea e complementa com histórico na nuvem.
 */
export const searchCommitments = async (
  userId: string,
  searchTerm: string,
  memoryMonths?: Record<string, AgendaCommitment[]>
): Promise<AgendaCommitment[]> => {
  if (!userId || !searchTerm.trim()) return [];

  const normalizedQuery = searchTerm
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (!normalizedQuery) return [];

  const resultMap = new Map<string, AgendaCommitment>();

  // 1. Pesquisa nos meses em memória passados pelo componente
  if (memoryMonths) {
    Object.values(memoryMonths).forEach((list) => {
      if (Array.isArray(list)) {
        list.forEach((c) => {
          const t = (c.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const n = (c.notes || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const l = (c.location || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (t.includes(normalizedQuery) || n.includes(normalizedQuery) || l.includes(normalizedQuery)) {
            const key = c.id || `${c.title}_${c.date?.seconds}`;
            resultMap.set(key, c);
          }
        });
      }
    });
  }

  // 2. Pesquisa em todas as partições do cache local do usuário em disco (zero latência)
  const cachedMatches = searchCachedCommitments(userId, searchTerm);
  cachedMatches.forEach((c) => {
    const key = c.id || `${c.title}_${c.date?.seconds}`;
    if (!resultMap.has(key)) {
      resultMap.set(key, c);
    }
  });

  // 3. Se estiver online e searchTerm tiver >= 2 caracteres, busca janela ampla de compromissos no Firestore
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (!isOffline && normalizedQuery.length >= 2) {
    try {
      const q = query(
        getCollection(userId),
        orderBy('date', 'desc'),
        limit(250)
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as AgendaCommitment;
        const c: AgendaCommitment = { id: docSnap.id, ...data };
        const t = (c.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const n = (c.notes || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const l = (c.location || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (t.includes(normalizedQuery) || n.includes(normalizedQuery) || l.includes(normalizedQuery)) {
          resultMap.set(docSnap.id, c);
        }
      });
    } catch {
      // Fallback gracioso: mantém o que já foi recuperado da memória e do cache local
    }
  }

  // 4. Ordena cronologicamente por data
  return Array.from(resultMap.values()).sort((a, b) => {
    const da = a.date instanceof Date ? a.date.getTime() : a.date?.toDate?.()?.getTime() || 0;
    const db = b.date instanceof Date ? b.date.getTime() : b.date?.toDate?.()?.getTime() || 0;
    return da - db;
  });
};
