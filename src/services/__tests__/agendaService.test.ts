import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAddDoc = vi.hoisted(() => vi.fn(() => ({ id: 'new-id' })));
const mockGetDocs = vi.hoisted(() => vi.fn());
const mockUpdateDoc = vi.hoisted(() => vi.fn());
const mockDeleteDoc = vi.hoisted(() => vi.fn());
const mockDoc = vi.hoisted(() => vi.fn((...args: any[]) => ({ path: args.slice(1).join('/') })));
const mockCollection = vi.hoisted(() => vi.fn(() => ({})));
const mockQuery = vi.hoisted(() => vi.fn(() => ({})));
const mockWhere = vi.hoisted(() => vi.fn(() => 'where'));
const mockOrderBy = vi.hoisted(() => vi.fn(() => 'orderBy'));
const mockLimit = vi.hoisted(() => vi.fn(() => 'limit'));
const mockServerTimestamp = vi.hoisted(() => vi.fn(() => 'server-ts'));
const mockTimestampNow = vi.hoisted(() => vi.fn(() => 'ts-now'));
const mockTimestampFromDate = vi.hoisted(() => vi.fn((d: Date) => `ts-${d.toISOString()}`));
const mockBatchUpdate = vi.hoisted(() => vi.fn());
const mockBatchCommit = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockWriteBatch = vi.hoisted(() => vi.fn(() => ({ update: mockBatchUpdate, commit: mockBatchCommit })));

vi.mock('../../firebase', () => ({
  firestore: {},
}));

vi.mock('firebase/firestore', () => ({
  Timestamp: {
    now: mockTimestampNow,
    fromDate: mockTimestampFromDate,
  },
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
  collection: mockCollection,
  addDoc: mockAddDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  doc: mockDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  serverTimestamp: mockServerTimestamp,
  writeBatch: mockWriteBatch,
}));

import {
  addCommitment,
  updateCommitment,
  deleteCommitment,
  toggleCommitment,
  reorderDayCommitments,
  syncBillsToAgenda,
  isSyncedBill,
  extractBillAmount,
} from '../agendaService';
import type { AgendaRecurrence } from '../agendaService';

const USER_ID = 'user-1';

describe('agendaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addCommitment', () => {
    it('cria documento com data, título e completed=false', async () => {
      const date = new Date('2026-07-29T00:00:00');
      const result = await addCommitment(USER_ID, {
        date,
        title: 'Reunião',
        completed: false,
      });

      expect(result).toBe('new-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);

      const callArgs = mockAddDoc.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      const calledData = callArgs[1];
      expect(calledData.title).toBe('Reunião');
      expect(calledData.completed).toBe(false);
      expect(calledData.createdAt).toBe('ts-now');
      expect(calledData.updatedAt).toBe('ts-now');
    });

    it('inclui alarmAt quando informado', async () => {
      const date = new Date('2026-07-29T00:00:00');
      const alarm = new Date('2026-07-29T08:00:00');
      await addCommitment(USER_ID, {
        date,
        title: 'Alarme teste',
        completed: false,
        alarmAt: alarm,
      });

      const callArgs = mockAddDoc.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      const calledData = callArgs[1];
      expect(calledData.alarmAt).toBe(`ts-${alarm.toISOString()}`);
    });
  });

  describe('updateCommitment', () => {
    it('atualiza campo e adiciona serverTimestamp', async () => {
      await updateCommitment(USER_ID, 'c-1', { title: 'Editado' });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: `users/${USER_ID}/agenda/c-1` },
        { title: 'Editado', updatedAt: 'server-ts' }
      );
    });
  });

  describe('deleteCommitment', () => {
    it('remove o documento', async () => {
      await deleteCommitment(USER_ID, 'c-1');

      expect(mockDeleteDoc).toHaveBeenCalledWith(
        { path: `users/${USER_ID}/agenda/c-1` }
      );
    });
  });

  describe('toggleCommitment', () => {
    it('alterna completed e adiciona serverTimestamp', async () => {
      await toggleCommitment(USER_ID, 'c-1', true);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: `users/${USER_ID}/agenda/c-1` },
        { completed: true, updatedAt: 'server-ts' }
      );
    });
  });

  describe('addCommitment — novos campos da série (Fase 1)', () => {
    it('persiste seriesId, recurrence, detached e endTime quando informados', async () => {
      const date = new Date('2026-08-18T00:00:00');
      const until = mockTimestampFromDate(new Date('2026-11-24T00:00:00'));
      const result = await addCommitment(USER_ID, {
        date,
        title: 'Reunião com o coordenador',
        completed: false,
        endTime: '18:00',
        seriesId: 'srv-1',
        recurrence: {
          freq: 'weekly',
          byDay: 2,
          until,
        } as unknown as AgendaRecurrence,
        detached: false,
      });

      expect(result).toBe('new-id');
      const callArgs = mockAddDoc.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      const calledData = callArgs[1];
      expect(calledData.endTime).toBe('18:00');
      expect(calledData.seriesId).toBe('srv-1');
      expect(calledData.detached).toBe(false);
      expect(calledData.recurrence).toEqual({
        freq: 'weekly',
        byDay: 2,
        until,
      });
    });

    it('persiste location, participants, notes e detachedNote quando informados', async () => {
      const date = new Date('2026-08-18T00:00:00');
      await addCommitment(USER_ID, {
        date,
        title: 'Reunião',
        completed: false,
        location: 'Sala 3',
        participants: ['Carlos', 'Ana'],
        notes: 'Trazer relatório',
        detached: true,
        detachedNote: 'movido pelo Nexus a pedido do usuário',
      });

      const callArgs = mockAddDoc.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      const calledData = callArgs[1];
      expect(calledData.location).toBe('Sala 3');
      expect(calledData.participants).toEqual(['Carlos', 'Ana']);
      expect(calledData.notes).toBe('Trazer relatório');
      expect(calledData.detached).toBe(true);
      expect(calledData.detachedNote).toBe('movido pelo Nexus a pedido do usuário');
    });

    it('não grava os campos opcionais quando ausentes (retrocompatibilidade)', async () => {
      const date = new Date('2026-07-29T00:00:00');
      await addCommitment(USER_ID, {
        date,
        title: 'Somente título',
        completed: false,
      });

      const callArgs = mockAddDoc.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      const calledData = callArgs[1];
      expect(calledData).not.toHaveProperty('seriesId');
      expect(calledData).not.toHaveProperty('recurrence');
      expect(calledData).not.toHaveProperty('detached');
      expect(calledData).not.toHaveProperty('detachedNote');
      expect(calledData).not.toHaveProperty('location');
      expect(calledData).not.toHaveProperty('participants');
      expect(calledData).not.toHaveProperty('notes');
    });

    it('grava endTime como null quando não informado (mesmo comportamento de time)', async () => {
      const date = new Date('2026-07-29T00:00:00');
      await addCommitment(USER_ID, {
        date,
        title: 'Sem horário de fim',
        completed: false,
      });

      const callArgs = mockAddDoc.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      const calledData = callArgs[1];
      expect(calledData.endTime).toBeNull();
    });

    it('persiste order quando informado e grava null quando ausente', async () => {
      const date = new Date('2026-07-29T00:00:00');
      await addCommitment(USER_ID, {
        date,
        title: 'Com ordem',
        completed: false,
        order: 3,
      });

      const withOrder = mockAddDoc.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      expect(withOrder[1].order).toBe(3);

      await addCommitment(USER_ID, {
        date,
        title: 'Sem ordem',
        completed: false,
      });

      const withoutOrder = mockAddDoc.mock.calls[1] as unknown as [unknown, Record<string, unknown>];
      expect(withoutOrder[1].order).toBeNull();
    });
  });

  describe('reorderDayCommitments', () => {
    it('grava order de cada item num único batch atômico', async () => {
      await reorderDayCommitments(USER_ID, [
        { id: 'c-b', order: 0 },
        { id: 'c-a', order: 1 },
      ]);

      expect(mockWriteBatch).toHaveBeenCalledTimes(1);
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        { path: `users/${USER_ID}/agenda/c-b` },
        { order: 0, updatedAt: 'server-ts' }
      );
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        { path: `users/${USER_ID}/agenda/c-a` },
        { order: 1, updatedAt: 'server-ts' }
      );
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncBillsToAgenda', () => {
    beforeEach(() => {
      // Mock getDocs to return an empty list by default
      mockGetDocs.mockResolvedValue({
        docs: [],
      });
    });

    it('adiciona contas fixas que ainda não existem no mês', async () => {
      const bills = [
        { id: 'bill-1', name: 'Aluguel', amount: 1500, dueDay: 10, isActive: true, category: 'Moradia', type: 'fixed' as const, userId: USER_ID },
        { id: 'bill-2', name: 'Internet', amount: 120, dueDay: 15, isActive: true, category: 'Serviços', type: 'fixed' as const, userId: USER_ID },
      ];

      const res = await syncBillsToAgenda(USER_ID, bills, 2026, 8);
      expect(res).toBe(2);
      expect(mockAddDoc).toHaveBeenCalledTimes(2);

      const firstCall = mockAddDoc.mock.calls[0][1] as any;
      expect(firstCall.title).toBe('Pagar Aluguel');
      expect(firstCall.notes).toContain('1.500,00');
      expect(firstCall.completed).toBe(false);

      const secondCall = mockAddDoc.mock.calls[1][1] as any;
      expect(secondCall.title).toBe('Pagar Internet');
      expect(secondCall.completed).toBe(false);
    });

    it('ignora contas já existentes na agenda ou inativas', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'c-existing',
            data: () => ({
              title: 'Pagar Aluguel',
              date: { toDate: () => new Date(2026, 8, 10) },
            }),
          },
        ],
      });

      const bills = [
        { id: 'bill-1', name: 'Aluguel', amount: 1500, dueDay: 10, isActive: true, category: 'Moradia', type: 'fixed' as const, userId: USER_ID },
        { id: 'bill-2', name: 'Luz', amount: 200, dueDay: 20, isActive: true, category: 'Moradia', type: 'fixed' as const, userId: USER_ID },
        { id: 'bill-3', name: 'Inativo', amount: 50, dueDay: 5, isActive: false, category: 'Outros', type: 'fixed' as const, userId: USER_ID },
      ];

      const res = await syncBillsToAgenda(USER_ID, bills, 2026, 8);
      // Aluguel is existing (skipped), Inativo is inactive (skipped), Luz is added
      expect(res).toBe(1);
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      const added = mockAddDoc.mock.calls[0][1] as any;
      expect(added.title).toBe('Pagar Luz');
    });

    it('trata com segurança dueDay e amount inválidos ou ausentes sem quebrar', async () => {
      const bills = [
        { id: 'bill-bad', name: 'Conta Estranha', amount: NaN as any, dueDay: undefined as any, isActive: true, category: 'Geral', type: 'fixed' as const, userId: USER_ID },
      ];

      const res = await syncBillsToAgenda(USER_ID, bills, 2026, 8);
      expect(res).toBe(1);
      expect(mockAddDoc).toHaveBeenCalledTimes(1);

      const added = mockAddDoc.mock.calls[0][1] as any;
      expect(added.title).toBe('Pagar Conta Estranha');
      expect(added.notes).toContain('0,00');
    });

    it('recupera com fallback sem estourar exceção quando getDocs falhar', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('The query requires an index'));

      const bills = [
        { id: 'bill-1', name: 'Faculdade', amount: 800, dueDay: 5, isActive: true, category: 'Educação', type: 'fixed' as const, userId: USER_ID },
      ];

      const res = await syncBillsToAgenda(USER_ID, bills, 2026, 8);
      expect(res).toBe(1);
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('isSyncedBill & extractBillAmount', () => {
    it('identifica corretamente compromissos com source ou linkedBillId', () => {
      expect(isSyncedBill({ source: 'controla_bill', title: 'Conta', date: {} as any, completed: false })).toBe(true);
      expect(isSyncedBill({ linkedBillId: 'b-1', title: 'Conta', date: {} as any, completed: false })).toBe(true);
      expect(isSyncedBill({ notes: 'Conta do Controla no valor de R$ 100,00.', title: 'Qualquer', date: {} as any, completed: false })).toBe(true);
      expect(isSyncedBill({ title: 'Pagar Aluguel', date: {} as any, completed: false })).toBe(true);
      expect(isSyncedBill({ title: 'Dentista às 14h', date: {} as any, completed: false })).toBe(false);
      expect(isSyncedBill(null as any)).toBe(false);
    });

    it('extrai valores numéricos do campo amount ou do texto das notas', () => {
      expect(extractBillAmount({ amount: 1500, title: 'Aluguel', date: {} as any, completed: false })).toBe(1500);
      expect(extractBillAmount({ notes: 'Conta do Controla no valor de R$ 250,50.', title: 'Internet', date: {} as any, completed: false })).toBe(250.5);
      expect(extractBillAmount({ notes: 'Conta do Controla no valor de R$ 1.850,00.', title: 'Aluguel', date: {} as any, completed: false })).toBe(1850);
      expect(extractBillAmount({ notes: 'Sem valor aqui', title: 'Outro', date: {} as any, completed: false })).toBe(0);
      expect(extractBillAmount(null as any)).toBe(0);
    });
  });
});

