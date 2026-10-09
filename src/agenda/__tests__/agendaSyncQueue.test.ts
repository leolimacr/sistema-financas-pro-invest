import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enqueueAgendaOp,
  getPendingAgendaOps,
  clearAgendaSyncQueue,
  processAgendaSyncQueue,
} from '../agendaSyncQueue';
import * as firestoreModule from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    writeBatch: vi.fn(() => ({
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
    Timestamp: {
      fromDate: vi.fn((d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
      now: vi.fn(() => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 })),
    },
    serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
  };
});

vi.mock('../../firebase', () => ({
  firestore: {},
}));

describe('agendaSyncQueue', () => {
  const userId = 'user-queue-123';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve enfileirar operações com persistência em localStorage', () => {
    enqueueAgendaOp(userId, {
      type: 'add',
      tempId: 'temp_111',
      input: {
        dateStr: '2026-09-15T12:00:00.000Z',
        title: 'Comprar remédio',
        completed: false,
      },
      year: 2026,
      month: 8,
    });

    const queue = getPendingAgendaOps(userId);
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('add');
    if (queue[0].type === 'add') {
      expect(queue[0].tempId).toBe('temp_111');
      expect(queue[0].input.title).toBe('Comprar remédio');
    }
  });

  it('deve processar operação add com sucesso e notificar onIdReplaced', async () => {
    vi.mocked(firestoreModule.addDoc).mockResolvedValueOnce({ id: 'firestore_real_id_999' } as any);

    enqueueAgendaOp(userId, {
      type: 'add',
      tempId: 'temp_add_1',
      input: {
        dateStr: '2026-09-20T10:00:00.000Z',
        title: 'Novo Compromisso Offline',
        completed: false,
      },
      year: 2026,
      month: 8,
    });

    const onIdReplaced = vi.fn();
    const result = await processAgendaSyncQueue(userId, { onIdReplaced });

    expect(result.processed).toBe(1);
    expect(result.errors).toBe(0);
    expect(firestoreModule.addDoc).toHaveBeenCalledTimes(1);
    expect(onIdReplaced).toHaveBeenCalledWith('temp_add_1', 'firestore_real_id_999', 2026, 8);

    // A fila deve estar vazia após o processamento bem-sucedido
    expect(getPendingAgendaOps(userId).length).toBe(0);
  });

  it('deve processar operações edit, delete e toggle', async () => {
    vi.mocked(firestoreModule.updateDoc).mockResolvedValue(undefined as any);
    vi.mocked(firestoreModule.deleteDoc).mockResolvedValue(undefined as any);

    enqueueAgendaOp(userId, {
      type: 'edit',
      id: 'comm_real_1',
      updates: { title: 'Título Atualizado' },
      year: 2026,
      month: 8,
    });

    enqueueAgendaOp(userId, {
      type: 'toggle',
      id: 'comm_real_2',
      completed: true,
      year: 2026,
      month: 8,
    });

    enqueueAgendaOp(userId, {
      type: 'delete',
      id: 'comm_real_3',
      year: 2026,
      month: 8,
    });

    const result = await processAgendaSyncQueue(userId);

    expect(result.processed).toBe(3);
    expect(result.errors).toBe(0);
    expect(firestoreModule.updateDoc).toHaveBeenCalledTimes(2);
    expect(firestoreModule.deleteDoc).toHaveBeenCalledTimes(1);
    expect(getPendingAgendaOps(userId).length).toBe(0);
  });

  it('deve reter item na fila se o Firestore lançar erro durante a sincronização', async () => {
    vi.mocked(firestoreModule.updateDoc).mockRejectedValueOnce(new Error('Network offline or permission error'));

    enqueueAgendaOp(userId, {
      type: 'edit',
      id: 'comm_err_1',
      updates: { title: 'Tentativa Falha' },
      year: 2026,
      month: 8,
    });

    const result = await processAgendaSyncQueue(userId);

    expect(result.processed).toBe(0);
    expect(result.errors).toBe(1);
    // Deve continuar na fila para a próxima tentativa
    expect(getPendingAgendaOps(userId).length).toBe(1);
  });
});
