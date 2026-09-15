import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchMonthCommitments,
  addCommitment,
  updateCommitment,
  deleteCommitment,
  toggleCommitment,
} from '../agendaService';
import { saveMonthCache, loadMonthCache } from '../../agenda/agendaCache';
import { getPendingAgendaOps } from '../../agenda/agendaSyncQueue';
import * as firestoreModule from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  Timestamp: {
    fromDate: vi.fn((d: Date) => ({
      toDate: () => d,
      seconds: Math.floor(d.getTime() / 1000),
      nanoseconds: (d.getTime() % 1000) * 1e6,
    })),
    now: vi.fn(() => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
    })),
  },
  serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
}));

vi.mock('../../firebase', () => ({
  firestore: {},
}));

describe('agendaService - Modo Offline e FinOps', () => {
  const userId = 'user-offline-test';
  const year = 2026;
  const month = 8; // Setembro
  let originalOnLine: boolean;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true,
    });
  });

  it('quando offline: fetchMonthCommitments lê exclusivamente do cache local sem chamar getDocs (FinOps)', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    // Preenche cache com 1 compromisso
    saveMonthCache(userId, year, month, [
      {
        id: 'c_cached_1',
        title: 'Reunião Salva em Cache',
        date: new Date('2026-09-18T15:00:00.000Z') as any,
        completed: false,
      },
    ]);

    const result = await fetchMonthCommitments(userId, year, month);

    expect(firestoreModule.getDocs).not.toHaveBeenCalled();
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Reunião Salva em Cache');
  });

  it('quando offline: addCommitment gera tempId, grava no cache local e enfileira na fila de sync', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const newId = await addCommitment(userId, {
      date: new Date('2026-09-22T09:00:00.000Z'),
      title: 'Novo Compromisso Sem Internet',
      completed: false,
    });

    expect(newId.startsWith('temp_')).toBe(true);
    expect(firestoreModule.addDoc).not.toHaveBeenCalled();

    // Deve estar no cache local
    const cached = loadMonthCache(userId, year, month);
    expect(cached?.length).toBe(1);
    expect(cached?.[0].id).toBe(newId);
    expect(cached?.[0].title).toBe('Novo Compromisso Sem Internet');

    // Deve estar na fila de sincronização
    const queue = getPendingAgendaOps(userId);
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('add');
  });

  it('quando offline: updateCommitment, toggleCommitment e deleteCommitment atualizam cache e enfileiram operações', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    // Inicializa cache com compromisso
    saveMonthCache(userId, year, month, [
      {
        id: 'c_edit_1',
        title: 'Original',
        date: new Date('2026-09-22T09:00:00.000Z') as any,
        completed: false,
      },
    ]);

    // Update
    await updateCommitment(userId, 'c_edit_1', { title: 'Modificado Offline' }, { year, month });
    let cached = loadMonthCache(userId, year, month);
    expect(cached?.[0].title).toBe('Modificado Offline');

    // Toggle
    await toggleCommitment(userId, 'c_edit_1', true, { year, month });
    cached = loadMonthCache(userId, year, month);
    expect(cached?.[0].completed).toBe(true);

    // Delete
    await deleteCommitment(userId, 'c_edit_1', { year, month });
    cached = loadMonthCache(userId, year, month);
    expect(cached?.length).toBe(0);

    // Deve ter 3 operações na fila
    const queue = getPendingAgendaOps(userId);
    expect(queue.length).toBe(3);
    expect(queue.map((q) => q.type)).toEqual(['edit', 'toggle', 'delete']);
    expect(firestoreModule.updateDoc).not.toHaveBeenCalled();
    expect(firestoreModule.deleteDoc).not.toHaveBeenCalled();
  });
});
