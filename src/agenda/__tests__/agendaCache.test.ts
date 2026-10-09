import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveMonthCache,
  loadMonthCache,
  upsertCachedCommitment,
  removeCachedCommitment,
  replaceCachedCommitmentId,
  clearAllAgendaCache,
  searchCachedCommitments,
} from '../agendaCache';
import type { AgendaCommitment } from '../../services/agendaService';

describe('agendaCache', () => {
  const userId = 'user-test-123';
  const year = 2026;
  const month = 8; // Setembro (0-indexed)

  beforeEach(() => {
    localStorage.clear();
  });

  it('deve salvar e carregar compromissos do mês mantendo integridade de data', () => {
    const mockCommitments: AgendaCommitment[] = [
      {
        id: 'c1',
        title: 'Reunião de Diretoria',
        date: new Date('2026-09-15T10:00:00.000Z') as any,
        completed: false,
        order: 1,
      },
      {
        id: 'c2',
        title: 'Pagar DAS',
        date: { toDate: () => new Date('2026-09-20T12:00:00.000Z'), seconds: 1789905600 } as any,
        completed: true,
        order: 2,
      },
    ];

    saveMonthCache(userId, year, month, mockCommitments);

    const loaded = loadMonthCache(userId, year, month);
    expect(loaded).not.toBeNull();
    expect(loaded?.length).toBe(2);
    expect(loaded?.[0].title).toBe('Reunião de Diretoria');
    expect(loaded?.[0].date.toDate().toISOString()).toBe('2026-09-15T10:00:00.000Z');
    expect(loaded?.[1].completed).toBe(true);
  });

  it('deve retornar null para mês sem cache', () => {
    const loaded = loadMonthCache(userId, 2025, 1);
    expect(loaded).toBeNull();
  });

  it('deve inserir ou atualizar compromisso via upsertCachedCommitment', () => {
    const c1: AgendaCommitment = {
      id: 'c1',
      title: 'Médico',
      date: new Date('2026-09-10T14:00:00.000Z') as any,
      completed: false,
    };
    saveMonthCache(userId, year, month, [c1]);

    // Atualiza c1
    upsertCachedCommitment(userId, year, month, { ...c1, completed: true });
    let cached = loadMonthCache(userId, year, month);
    expect(cached?.length).toBe(1);
    expect(cached?.[0].completed).toBe(true);

    // Insere novo c2
    const c2: AgendaCommitment = {
      id: 'c2',
      title: 'Dentista',
      date: new Date('2026-09-12T16:00:00.000Z') as any,
      completed: false,
    };
    upsertCachedCommitment(userId, year, month, c2);
    cached = loadMonthCache(userId, year, month);
    expect(cached?.length).toBe(2);
  });

  it('deve remover compromisso do cache via removeCachedCommitment', () => {
    const c1: AgendaCommitment = {
      id: 'c1',
      title: 'Compromisso a Deletar',
      date: new Date('2026-09-10T14:00:00.000Z') as any,
      completed: false,
    };
    saveMonthCache(userId, year, month, [c1]);

    removeCachedCommitment(userId, year, month, 'c1');
    const cached = loadMonthCache(userId, year, month);
    expect(cached?.length).toBe(0);
  });

  it('deve substituir id temporário pelo id definitivo do Firestore via replaceCachedCommitmentId', () => {
    const tempCommitment: AgendaCommitment = {
      id: 'temp_12345',
      title: 'Criado Offline',
      date: new Date('2026-09-10T14:00:00.000Z') as any,
      completed: false,
    };
    saveMonthCache(userId, year, month, [tempCommitment]);

    replaceCachedCommitmentId(userId, year, month, 'temp_12345', 'real_firestore_id_999');
    const cached = loadMonthCache(userId, year, month);
    expect(cached?.length).toBe(1);
    expect(cached?.[0].id).toBe('real_firestore_id_999');
    expect(cached?.[0].title).toBe('Criado Offline');
  });

  it('deve isolar o cache por usuário e suportar clearAllAgendaCache', () => {
    saveMonthCache('user-A', year, month, [{ id: 'a1', title: 'User A', date: new Date() as any, completed: false }]);
    saveMonthCache('user-B', year, month, [{ id: 'b1', title: 'User B', date: new Date() as any, completed: false }]);

    expect(loadMonthCache('user-A', year, month)?.[0].title).toBe('User A');
    expect(loadMonthCache('user-B', year, month)?.[0].title).toBe('User B');

    clearAllAgendaCache('user-A');
    expect(loadMonthCache('user-A', year, month)).toBeNull();
    expect(loadMonthCache('user-B', year, month)?.[0].title).toBe('User B');
  });

  it('deve pesquisar compromissos em múltiplos meses com normalização de maiúsculas e acentos', () => {
    saveMonthCache(userId, 2026, 8, [
      { id: 'c1', title: 'Catequese da Joana', date: new Date('2026-09-14T19:00:00.000Z') as any, completed: false },
      { id: 'c2', title: 'Médico Cardiologista', date: new Date('2026-09-20T10:00:00.000Z') as any, completed: false },
    ]);

    saveMonthCache(userId, 2026, 9, [
      { id: 'c3', title: 'Catequese 19h com o Padre', date: new Date('2026-10-05T19:00:00.000Z') as any, completed: false },
      { id: 'c4', title: 'Dentista revisão', date: new Date('2026-10-12T14:00:00.000Z') as any, completed: false },
    ]);

    // Busca case-insensitive e sem acento
    const res = searchCachedCommitments(userId, 'catequese');
    expect(res.length).toBe(2);
    expect(res[0].title).toBe('Catequese da Joana');
    expect(res[1].title).toBe('Catequese 19h com o Padre');

    // Busca por termo com acento procurando palavra sem acento ou vice-versa
    const resMed = searchCachedCommitments(userId, 'medico');
    expect(resMed.length).toBe(1);
    expect(resMed[0].title).toBe('Médico Cardiologista');

    // Busca vazia retorna array vazio
    expect(searchCachedCommitments(userId, '')).toEqual([]);
    expect(searchCachedCommitments(userId, '   ')).toEqual([]);
  });
});

