import { describe, expect, it, vi } from 'vitest';
import { getFirestore } from 'firebase-admin/firestore';
import {
  buildFirestoreDependencies,
  buildMessages,
  buildSystemPrompt,
  deleteScanCutoffMs,
  inferStartTimeFromTitle,
  orchestrateAgendaInterpret,
  requireAuth,
  type AgendaAffectedItem,
  type AgendaReader,
  type InterpretDependencies,
  type StoredAgendaCommitment,
} from '../nexusAgendaInterpret';
import { sanitizeForFirestore } from '../nexusAgendaCommit';
import { isoToYmd, saoPauloDayRangeMillis } from '../nexus-core/agenda-time';
import type { AgendaSessionContext } from '../nexus-core/agenda-session';

const NOW = new Date('2026-08-12T15:00:00.000Z');

function hasUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(hasUndefined);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasUndefined);
  return false;
}

/** Fake mínimo de Firestore que captura exatamente o documento entregue a `collection(...).doc(...).set(...)`. */
function createFakeFirestore() {
  const sets: Array<{ path: string; id: string; document: Record<string, unknown> }> = [];
  const db = {
    collection: (path: string) => ({
      doc: (id: string) => ({
        set: async (document: Record<string, unknown>) => {
          sets.push({ path, id, document });
        },
      }),
    }),
  };
  return { db, sets };
}

function envelope(overrides: Record<string, unknown> = {}): string {
  const overrideEntities = overrides.entities as Record<string, unknown> | undefined;
  const { entities: _ignoredEntities, ...topLevelOverrides } = overrides;
  return JSON.stringify({
    intent: 'create',
    action: 'create_commitment',
    entities: {
      title: 'Reunião com o coordenador',
      date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' },
      startTime: '17:00',
      endTime: '18:00',
      location: null,
      participants: null,
      ...(overrideEntities ?? {}),
    },
    missing: [],
    ambiguous: [],
    assumptions: [],
    ...topLevelOverrides,
  });
}

function deleteEnvelope(overrides: Record<string, unknown> = {}): string {
  const overrideEntities = overrides.entities as Record<string, unknown> | undefined;
  const { entities: _ignoredEntities, ...topLevelOverrides } = overrides;
  return JSON.stringify({
    intent: 'delete',
    action: 'delete_commitment',
    entities: {
      title: 'Reunião com o coordenador de campo',
      ...(overrideEntities ?? {}),
    },
    missing: [],
    ambiguous: [],
    assumptions: [],
    ...topLevelOverrides,
  });
}

function setup(raw: string | string[], agendaItems: StoredAgendaCommitment[] = [], searchItems: StoredAgendaCommitment[] = []) {
  const writes: Array<{ uid: string; token: string; document: Record<string, unknown> }> = [];
  const sessionWrites: AgendaSessionContext[] = [];
  const sessionRead = vi.fn<(uid: string, sessionId: string) => Promise<AgendaSessionContext | null>>(async () => null);
  const routeRequest = vi.fn().mockImplementation(async () => ({
    content: Array.isArray(raw) ? raw.shift() ?? '' : raw,
    success: true,
  }));
  const agenda: AgendaReader = {
    onDay: vi.fn(async () => agendaItems),
    onPeriod: vi.fn(async () => agendaItems),
    upcoming: vi.fn(async () => agendaItems),
    searchByTitle: vi.fn(async () => searchItems),
  };
  const dependencies: InterpretDependencies = {
    router: { routeRequest },
    agenda,
    pending: {
      write: vi.fn(async (uid, token, document) => {
        writes.push({ uid, token, document });
      }),
    },
    session: {
      read: sessionRead,
      write: vi.fn(async (context: AgendaSessionContext) => {
        sessionWrites.push(context);
      }),
    },
    now: NOW,
  };
  return { dependencies, routeRequest, agenda, writes, sessionWrites, sessionRead };
}

describe('nexusAgendaInterpret', () => {
  it('rejeita usuário não autenticado', () => {
    expect(() => requireAuth({ auth: null })).toThrow('Login necessário');
    expect(() => requireAuth({ auth: {} })).toThrow('Login necessário');
  });

  it('cria proposta de compromisso único sem alterar compromisso real', async () => {
    const test = setup(envelope());
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque a reunião' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.status).toBe('awaiting_confirmation');
      expect(result.recap.occurrenceCount).toBe(1);
      expect(result.recap.firstDate).toBe('2026-08-18');
      expect(result.confirmationToken).toBeTruthy();
      expect(test.writes).toHaveLength(1);
      expect(test.writes[0].uid).toBe('user-1');
      expect(test.writes[0].document.status).toBe('awaiting_confirmation');
      expect(test.writes[0].document.confirmationToken).toBe(result.confirmationToken);
      expect(test.writes[0].document).not.toHaveProperty('commitmentId');
    }
    expect(test.agenda.onDay).toHaveBeenCalledWith('user-1', '2026-08-18');
  });

  it('não envia undefined ao Firestore quando faltam endTime e recurrence', async () => {
    const raw = envelope({
      entities: {
        endTime: undefined,
        recurrence: undefined,
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'agende a reunião sem horário final' }, test.dependencies);

    expect(result.success).toBe(true);
    expect(test.writes).toHaveLength(1);

    const pending = test.writes[0].document;
    expect((pending.recap as Record<string, unknown>).endTime).toBeUndefined();
    expect((pending.recap as Record<string, unknown>).recurrence).toBeUndefined();

    const sanitized = sanitizeForFirestore(pending) as Record<string, unknown>;
    expect(hasUndefined(sanitized)).toBe(false);
    const sanitizedRecap = sanitized.recap as Record<string, unknown>;
    expect(sanitizedRecap.endTime).toBeNull();
    expect(sanitizedRecap.recurrence).toBeNull();
  });

  it('sanitiza no boundary real de pending.write antes do set no Firestore', async () => {
    const { db, sets } = createFakeFirestore();
    const deps = buildFirestoreDependencies(db as unknown as ReturnType<typeof getFirestore>);

    const pendingDoc: Record<string, unknown> = {
      uid: 'user-1',
      nonce: 'token-1',
      confirmationToken: 'token-1',
      status: 'awaiting_confirmation',
      createdAtMs: NOW.getTime(),
      expiresAtMs: NOW.getTime() + 600000,
      intent: 'create',
      action: 'create_commitment',
      prompt: 'Agende uma reunião para mim para amanhã, 18h, com o meu coordenador de campo.',
      envelope: {
        intent: 'create',
        action: 'create_commitment',
        entities: {
          title: 'Reunião com o coordenador de campo',
          date: { expression: 'amanhã', resolved: '2026-08-13', confidence: 'high' },
          startTime: '18:00',
          endTime: undefined,
          recurrence: undefined,
          location: undefined,
          participants: undefined,
          notes: undefined,
        },
      },
      recap: {
        intent: 'create',
        action: 'create_commitment',
        title: 'Reunião com o coordenador de campo',
        startTime: '18:00',
        endTime: undefined,
        recurrence: undefined,
        firstDate: '2026-08-13',
        lastDate: '2026-08-13',
        occurrenceCount: 1,
        summary: 'Criar compromisso amanhã às 18:00.',
      },
      warnings: [],
    };

    await deps.pending.write('user-1', 'token-1', pendingDoc);

    expect(sets).toHaveLength(1);
    expect(sets[0].path).toBe('users/user-1/agenda/_nexus/pending');
    expect(sets[0].id).toBe('token-1');

    const persisted = sets[0].document;
    expect(hasUndefined(persisted)).toBe(false);

    const createdAt = persisted.createdAt as { toMillis(): number };
    const expiresAt = persisted.expiresAt as { toMillis(): number };
    expect(createdAt.toMillis()).toBe(NOW.getTime());
    expect(expiresAt.toMillis()).toBe(NOW.getTime() + 600000);

    const recap = persisted.recap as Record<string, unknown>;
    expect(recap.startTime).toBe('18:00');
    expect(recap.endTime).toBeNull();
    expect(recap.recurrence).toBeNull();
    const entities = (persisted.envelope as Record<string, unknown>).entities as Record<string, unknown>;
    expect(entities.endTime).toBeNull();
    expect(entities.recurrence).toBeNull();
    expect(entities.location).toBeNull();
    expect(entities.participants).toBeNull();
    expect(entities.notes).toBeNull();

    expect(persisted.uid).toBe('user-1');
    expect(persisted.status).toBe('awaiting_confirmation');
    expect(recap.title).toBe('Reunião com o coordenador de campo');
  });

  it('interpreta o comando do incidente "amanhã, 18h" e grava pending sanitizado na persistência real', async () => {
    const raw = envelope({
      entities: {
        title: 'Reunião com o coordenador de campo',
        date: { expression: 'amanhã', resolved: '2026-08-13', confidence: 'high' },
        startTime: '18:00',
        endTime: undefined,
        recurrence: undefined,
      },
    });

    const { db, sets } = createFakeFirestore();
    const deps = buildFirestoreDependencies(db as unknown as ReturnType<typeof getFirestore>);
    const routeRequest = vi.fn().mockResolvedValue({ content: raw, success: true });
    const agenda: AgendaReader = {
      onDay: vi.fn(async () => []),
      onPeriod: vi.fn(async () => []),
      upcoming: vi.fn(async () => []),
      searchByTitle: vi.fn(async () => []),
    };
    const dependencies: InterpretDependencies = {
      router: { routeRequest },
      agenda,
      pending: deps.pending,
      session: deps.session,
      now: NOW,
    };

    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'Agende uma reunião para mim para amanhã, 18h, com o meu coordenador de campo.' },
      dependencies,
    );

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.firstDate).toBe('2026-08-13');
      expect(result.recap.startTime).toBe('18:00');
      expect(result.confirmationToken).toBeTruthy();
    }

    expect(sets).toHaveLength(1);
    const persisted = sets[0].document;
    expect(hasUndefined(persisted)).toBe(false);
    const recap = persisted.recap as Record<string, unknown>;
    expect(recap.endTime).toBeNull();
    expect(recap.recurrence).toBeNull();
  });

  it('cria proposta de edição com antes/depois, alvo gravado e sem tocar em compromisso real', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
      entities: {
        startTime: '19:00',
        endTime: '20:00',
      },
    });
    const range = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const searchItems: StoredAgendaCommitment[] = [{
      id: 'c1',
      title: 'Reunião com o coordenador',
      time: '17:00',
      endTime: '18:00',
      dateMs: range.startMs,
    }];
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'edite a reunião para as 19h' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.status).toBe('awaiting_confirmation');
      expect(result.recap.intent).toBe('edit');
      expect(result.recap.occurrenceCount).toBe(1);
      expect(result.recap.before).toMatchObject({ title: 'Reunião com o coordenador', date: '2026-08-18', startTime: '17:00', endTime: '18:00' });
      expect(result.recap.after).toMatchObject({ title: 'Reunião com o coordenador', date: '2026-08-18', startTime: '19:00' });
      expect(result.recap.summary).toContain('editar');
    }
    expect(test.writes).toHaveLength(1);
    expect(test.writes[0].document).toMatchObject({
      intent: 'edit',
      target: { id: 'c1' },
    });
    expect((test.writes[0].document.before as Record<string, unknown>).title).toBe('Reunião com o coordenador');
    expect(test.agenda.searchByTitle).toHaveBeenCalledWith('user-1', 'Reunião com o coordenador', { maxResults: 500 });
    expect(test.agenda.onDay).toHaveBeenCalledWith('user-1', '2026-08-18');
  });

  it('esclarece quando a edição não encontra o compromisso pelo título', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
      entities: { startTime: '19:00', endTime: '20:00' },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'edite a reunião para as 19h' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.clarification.ambiguous.join(' ')).toContain('Não encontrei nenhum compromisso');
    }
    expect(test.writes).toHaveLength(0);
  });

  it('esclarece quando a edição encontra vários candidatos com o mesmo nome', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
      entities: { startTime: '19:00', endTime: '20:00' },
    });
    const range = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const searchItems: StoredAgendaCommitment[] = [
      { id: 'c1', title: 'Reunião com o coordenador', time: '10:00', dateMs: range.startMs },
      { id: 'c2', title: 'Reunião com o coordenador', time: '14:00', dateMs: range.startMs },
    ];
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'edite a reunião para as 19h' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.clarification.ambiguous.join(' ')).toContain('mais de um compromisso');
    }
    expect(test.writes).toHaveLength(0);
  });

  it('informa que edição de série recorrente ainda não está disponível', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
      entities: { startTime: '19:00', endTime: '20:00' },
    });
    const range = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const searchItems: StoredAgendaCommitment[] = [{
      id: 'c1',
      title: 'Reunião com o coordenador',
      time: '17:00',
      endTime: '18:00',
      dateMs: range.startMs,
      seriesId: 'srv_abc',
    }];
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'edite a reunião para as 19h' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.clarification.ambiguous.join(' ')).toContain('série recorrente');
    }
    expect(test.writes).toHaveLength(0);
  });

  it('esclarece quando a edição não muda nenhum campo', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
    });
    const range = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const searchItems: StoredAgendaCommitment[] = [{
      id: 'c1',
      title: 'Reunião com o coordenador',
      time: '17:00',
      endTime: '18:00',
      dateMs: range.startMs,
    }];
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'edite a reunião' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.clarification.ambiguous.join(' ')).toContain('Não identifiquei o que alterar');
    }
    expect(test.writes).toHaveLength(0);
  });

  it('estreita a edição por data atual quando há múltiplos candidatos com o mesmo nome', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
      entities: {
        date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' },
        startTime: '19:00',
        endTime: '20:00',
      },
    });
    const range18 = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const range25 = saoPauloDayRangeMillis(isoToYmd('2026-08-25'));
    const searchItems: StoredAgendaCommitment[] = [
      { id: 'c1', title: 'Reunião com o coordenador', time: '17:00', endTime: '18:00', dateMs: range18.startMs },
      { id: 'c2', title: 'Reunião com o coordenador', time: '17:00', endTime: '18:00', dateMs: range25.startMs },
    ];
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'edite a reunião de terça para as 19h' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(test.writes[0].document.target).toMatchObject({ id: 'c1' });
      expect(result.recap.after).toMatchObject({ date: '2026-08-18', startTime: '19:00' });
    }
    expect(test.writes).toHaveLength(1);
  });

  it('mantém data e horário atuais quando a edição altera só o título', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
      entities: { title: 'Reunião nova com o coordenador' },
    });
    const range = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const searchItems: StoredAgendaCommitment[] = [{
      id: 'c1',
      title: 'Reunião com o coordenador',
      time: '17:00',
      endTime: '18:00',
      dateMs: range.startMs,
    }];
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'renomeie a reunião' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.after).toMatchObject({ title: 'Reunião nova com o coordenador', date: '2026-08-18', startTime: '17:00', endTime: '18:00' });
    }
    expect(test.writes).toHaveLength(1);
  });

  it('gera avisos de conflito excluindo o próprio compromisso na edição', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
      entities: { startTime: '19:00', endTime: '20:00' },
    });
    const range = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const searchItems: StoredAgendaCommitment[] = [{
      id: 'c1',
      title: 'Reunião com o coordenador',
      time: '17:00',
      endTime: '18:00',
      dateMs: range.startMs,
    }];
    const agendaItems: StoredAgendaCommitment[] = [
      { id: 'c1', title: 'Reunião com o coordenador', time: '17:00', endTime: '18:00', dateMs: range.startMs },
      { id: 'other', title: 'Outra reunião', time: '19:00', endTime: '20:00', dateMs: range.startMs },
    ];
    const test = setup(raw, agendaItems, searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'edite a reunião para as 19h' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.warnings).toEqual([
        expect.objectContaining({ type: 'conflict', date: '2026-08-18', message: expect.stringContaining('Outra reunião') }),
      ]);
      expect(result.warnings.some((warning) => warning.message.includes('Reunião com o coordenador'))).toBe(false);
    }
    expect(test.writes).toHaveLength(1);
  });

  it('grava pending de edição com target, before, after, recap e expiração', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
      entities: { startTime: '19:00', endTime: '20:00' },
    });
    const range = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const searchItems: StoredAgendaCommitment[] = [{
      id: 'c1',
      title: 'Reunião com o coordenador',
      time: '17:00',
      endTime: '18:00',
      dateMs: range.startMs,
    }];
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'edite a reunião para as 19h' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      const pending = test.writes[0].document;
      expect(pending).toMatchObject({
        uid: 'user-1',
        nonce: result.confirmationToken,
        confirmationToken: result.confirmationToken,
        status: 'awaiting_confirmation',
        createdAtMs: NOW.getTime(),
        expiresAtMs: NOW.getTime() + 10 * 60 * 1000,
        intent: 'edit',
        action: 'edit_commitment',
        target: { id: 'c1' },
      });
      expect((pending.recap as Record<string, unknown>).after).toMatchObject({ startTime: '19:00' });
      expect((pending.before as Record<string, unknown>).startTime).toBe('17:00');
      expect((pending.after as Record<string, unknown>).startTime).toBe('19:00');
    }
  });

  it('edita também local, participantes e observações quando informados', async () => {
    const raw = envelope({
      intent: 'edit',
      action: 'edit_commitment',
      entities: {
        location: 'Sala 7',
        participants: ['Ana', 'Beto'],
        notes: 'Levar gráficos',
      },
    });
    const range = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const searchItems: StoredAgendaCommitment[] = [{
      id: 'c1',
      title: 'Reunião com o coordenador',
      time: '17:00',
      endTime: '18:00',
      dateMs: range.startMs,
      location: 'Sala 3',
      participants: ['Ana'],
      notes: 'Levar relatório',
    }];
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'edite a reunião mudando local, participantes e observações' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.after).toMatchObject({ location: 'Sala 7', participants: ['Ana', 'Beto'], notes: 'Levar gráficos' });
    }
    expect(test.writes).toHaveLength(1);
  });

  it('cria proposta recorrente com 15 ocorrências', async () => {
    const raw = envelope({
      entities: {
        recurrence: {
          freq: 'weekly',
          byDay: 2,
          until: {
            expression: 'última terça-feira de novembro de 2026',
            resolved: '2026-11-24',
            confidence: 'high',
          },
        },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'todas as terças até novembro' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.occurrenceCount).toBe(15);
      expect(result.recap.firstDate).toBe('2026-08-18');
      expect(result.recap.lastDate).toBe('2026-11-24');
      expect(result.recap.recurrence?.until).toBe('2026-11-24');
    }
    expect(test.writes).toHaveLength(1);
  });

  it('substitui a data sugerida pelo LLM pela resolução do backend', async () => {
    const test = setup(envelope({
      entities: {
        date: { expression: 'próxima terça-feira', resolved: '2030-01-01', confidence: 'high' },
      },
    }));
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'próxima terça' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') expect(result.recap.firstDate).toBe('2026-08-18');
  });

  it('retorna esclarecimento quando faltam campos obrigatórios', async () => {
    const raw = envelope({ entities: { title: undefined } });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque algo' }, test.dependencies);

    expect(result).toMatchObject({ success: true, outcome: 'clarification', status: 'awaiting_clarification' });
    expect(test.writes).toHaveLength(0);
  });

  it('retorna esclarecimento para data de baixa confiança', async () => {
    const raw = envelope({
      entities: { date: { expression: 'talvez no meio do mês', resolved: '2026-08-15', confidence: 'low' } },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'no meio do mês' }, test.dependencies);

    expect(result).toMatchObject({ success: true, outcome: 'clarification' });
    expect(test.writes).toHaveLength(0);
  });

  it('retorna esclarecimento para data ambígua não resolvível', async () => {
    const raw = envelope({
      entities: { date: { expression: 'quando der', resolved: '2026-08-18', confidence: 'high' } },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'quando der' }, test.dependencies);

    expect(result).toMatchObject({ success: true, outcome: 'clarification' });
    expect(test.writes).toHaveLength(0);
  });

  it('faz no máximo uma nova tentativa e converte JSON inválido em esclarecimento amigável', async () => {
    const test = setup(['não é json', '{ também não é json']);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque reunião' }, test.dependencies);

    expect(result).toMatchObject({
      success: true,
      outcome: 'clarification',
      status: 'awaiting_clarification',
      clarification: {
        missing: [],
        ambiguous: ['Não consegui organizar essa solicitação. Você pode me dizer, por exemplo, o nome do compromisso, a data e o horário?'],
      },
    });
    if (result.success && result.outcome === 'clarification') {
      expect(result.question).toBe('Não consegui organizar essa solicitação. Você pode me dizer, por exemplo, o nome do compromisso, a data e o horário?');
      expect(result.question).not.toContain('Informe title.');
    }
    expect(test.routeRequest).toHaveBeenCalledTimes(2);
    expect(test.writes).toHaveLength(0);
  });

  it('converte em esclarecimento amigável quando a nova tentativa de reparo também falha', async () => {
    const test = setup([]);
    test.routeRequest
      .mockImplementationOnce(async () => ({ content: 'não é json', success: true }))
      .mockImplementationOnce(async () => { throw new Error('rota indisponível'); });
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque reunião' }, test.dependencies);

    expect(result).toMatchObject({
      success: true,
      outcome: 'clarification',
      status: 'awaiting_clarification',
      clarification: {
        missing: [],
        ambiguous: ['Não consegui organizar essa solicitação. Você pode me dizer, por exemplo, o nome do compromisso, a data e o horário?'],
      },
    });
    expect(test.routeRequest).toHaveBeenCalledTimes(2);
    expect(test.writes).toHaveLength(0);
  });

  it('retorna erro amigável quando a chamada ao roteador falha', async () => {
    const test = setup(envelope());
    test.routeRequest.mockRejectedValueOnce(new Error('timeout'));
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque reunião' }, test.dependencies);
    expect(result).toEqual({ success: false, error: expect.stringContaining('indisponível') });
    expect(test.writes).toHaveLength(0);
  });

  it('detecta conflito de horário sem bloquear a criação da proposta', async () => {
    const test = setup(envelope(), [{ id: 'old-1', title: 'Outra reunião', time: '17:00', endTime: '18:00', dateMs: 0 }]);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque reunião' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'conflict', date: '2026-08-18' }),
      ]));
    }
    expect(test.writes).toHaveLength(1);
  });

  it('detecta compromisso duplicado', async () => {
    const test = setup(envelope(), [{ id: 'old-1', title: 'Reunião com o coordenador', time: '17:00', endTime: '18:00', dateMs: 0 }]);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque reunião' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'duplicate', date: '2026-08-18' }),
      ]));
    }
  });

  it('vincula token, uid, status e expiração de dez minutos ao pending', async () => {
    const test = setup(envelope());
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque reunião' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      const pending = test.writes[0];
      expect(pending.token).toBe(result.confirmationToken);
      expect(pending.document).toMatchObject({
        uid: 'user-1',
        nonce: result.confirmationToken,
        confirmationToken: result.confirmationToken,
        status: 'awaiting_confirmation',
        createdAtMs: NOW.getTime(),
        expiresAtMs: NOW.getTime() + 10 * 60 * 1000,
      });
    }
  });

  it('não oferece nenhuma dependência de escrita em compromissos reais', async () => {
    const test = setup(envelope());
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque reunião' }, test.dependencies);

    expect(result.success).toBe(true);
    expect(test.writes).toHaveLength(1);
    expect(test.writes[0].document).not.toHaveProperty('updatedCommitment');
    expect(test.writes[0].document).not.toHaveProperty('deletedCommitment');
  });

  it('interpreta "toda terça até o fim de setembro" e gera as 7 ocorrências sem commit', async () => {
    const raw = envelope({
      entities: {
        title: 'Reunião com o coordenador de campo',
        date: { expression: 'toda terça-feira', resolved: '2026-08-18', confidence: 'high' },
        startTime: '18:00',
        endTime: '19:00',
        recurrence: {
          freq: 'weekly',
          byDay: 2,
          until: { expression: 'até o fim de setembro', resolved: '2026-09-30', confidence: 'high' },
        },
        participants: ['coordenador de campo'],
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'Agende uma reunião com o coordenador de campo para toda terça feira 18h até o fim de setembro.' },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.status).toBe('awaiting_confirmation');
      expect(result.recap.title).toBe('Reunião com o coordenador de campo');
      expect(result.recap.startTime).toBe('18:00');
      expect(result.recap.occurrenceCount).toBe(7);
      expect(result.recap.firstDate).toBe('2026-08-18');
      expect(result.recap.lastDate).toBe('2026-09-29');
      expect(result.recap.recurrence).toMatchObject({ freq: 'weekly', byDay: 2, until: '2026-09-29' });
      expect(result.recap.summary).toContain('7 compromissos');
    }
    expect(test.writes).toHaveLength(1);
    expect(test.writes[0].document.status).toBe('awaiting_confirmation');
  });

  it('interpreta a frase exata "Catequese 19h" com recorrência semanal até 15/12/2026 e gera proposta', async () => {
    const raw = envelope({
      entities: {
        title: 'Catequese 19h',
        date: { expression: 'todas as próximas segundas feiras', resolved: '2026-08-17', confidence: 'high' },
        startTime: '19:00',
        endTime: undefined,
        recurrence: {
          freq: 'weekly',
          byDay: [1],
          until: { expression: 'até o dia 15/12/2026', resolved: '2026-12-15', confidence: 'high' },
        },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: "Preciso que você agende para mim um compromisso com o titulo 'Catequese 19h' para todas as próximas segundas feiras até o dia 15/12/2026." },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.status).toBe('awaiting_confirmation');
      expect(result.recap.title).toBe('Catequese 19h');
      expect(result.recap.startTime).toBe('19:00');
      expect(result.recap.firstDate).toBe('2026-08-17');
      expect(result.recap.lastDate).toBe('2026-12-14');
      expect(result.recap.occurrenceCount).toBe(18);
      expect(result.recap.recurrence).toMatchObject({ freq: 'weekly', byDay: 1, until: '2026-12-14' });
      expect(result.recap.summary).toContain('18 compromissos');
      expect(result.confirmationToken).toBeTruthy();
    }
    expect(test.writes).toHaveLength(1);
    expect(test.writes[0].document.status).toBe('awaiting_confirmation');
    const storedEnvelope = test.writes[0].document.envelope as { entities: { recurrence?: { byDay?: number } } };
    expect(storedEnvelope.entities.recurrence?.byDay).toBe(1);
  });

  it('infere startTime do título quando o modelo não o extrai ("Catequese 19h")', async () => {
    const raw = envelope({
      entities: {
        title: 'Catequese 19h',
        date: { expression: 'todas as próximas segundas feiras', resolved: '2026-08-17', confidence: 'high' },
        startTime: undefined,
        endTime: undefined,
        recurrence: {
          freq: 'weekly',
          byDay: 1,
          until: { expression: 'até o dia 15/12/2026', resolved: '2026-12-15', confidence: 'high' },
        },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: "Preciso que você agende para mim um compromisso com o titulo 'Catequese 19h' para todas as próximas segundas feiras até o dia 15/12/2026." },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.startTime).toBe('19:00');
      expect(result.recap.title).toBe('Catequese 19h');
      expect(result.recap.occurrenceCount).toBe(18);
      expect(result.recap.lastDate).toBe('2026-12-14');
    }
    expect(test.writes).toHaveLength(1);
    expect(test.writes[0].document.status).toBe('awaiting_confirmation');
  });

  it('inferStartTimeFromTitle extrai horários do título sem falsos positivos', () => {
    expect(inferStartTimeFromTitle('Catequese 19h')).toBe('19:00');
    expect(inferStartTimeFromTitle('Reunião 17h30')).toBe('17:30');
    expect(inferStartTimeFromTitle('Ensaio da banda 20h')).toBe('20:00');
    expect(inferStartTimeFromTitle('Turma 1A 19h')).toBe('19:00');
    expect(inferStartTimeFromTitle('Reunião às 19:00')).toBe('19:00');
    expect(inferStartTimeFromTitle('Aniversário 15')).toBeNull();
    expect(inferStartTimeFromTitle('Catequese')).toBeNull();
    expect(inferStartTimeFromTitle('24h de corrida')).toBeNull();
  });

  it('aceita o payload real com "endTime": null sem retry e gera proposta', async () => {
    const raw = envelope({
      entities: {
        startTime: '19:00',
        endTime: null,
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque a reunião para as 19h' }, test.dependencies);

    expect(test.routeRequest).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.status).toBe('awaiting_confirmation');
      expect(result.recap.startTime).toBe('19:00');
      expect(result.recap.endTime).toBeUndefined();
      expect(result.recap.occurrenceCount).toBe(1);
    }
    expect(test.writes).toHaveLength(1);
    expect(test.writes[0].document.status).toBe('awaiting_confirmation');
  });

  it('aceita o payload real com "startTime": null e "endTime": null', async () => {
    const raw = envelope({
      entities: {
        startTime: null,
        endTime: null,
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque a reunião sem horário' }, test.dependencies);

    expect(test.routeRequest).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.startTime).toBeUndefined();
      expect(result.recap.endTime).toBeUndefined();
      expect(result.recap.occurrenceCount).toBe(1);
    }
  });

  it('"startTime": null + título "Catequese 19h" dispara a inferência de horário', async () => {
    const raw = envelope({
      entities: {
        title: 'Catequese 19h',
        date: { expression: 'todas as próximas segundas feiras', resolved: '2026-08-17', confidence: 'high' },
        startTime: null,
        endTime: null,
        recurrence: {
          freq: 'weekly',
          byDay: 1,
          until: { expression: 'até o dia 15/12/2026', resolved: '2026-12-15', confidence: 'high' },
        },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: "Preciso que você agende para mim um compromisso com o titulo 'Catequese 19h' para todas as próximas segundas feiras até o dia 15/12/2026." },
      test.dependencies,
    );

    expect(test.routeRequest).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.startTime).toBe('19:00');
      expect(result.recap.occurrenceCount).toBe(18);
      expect(result.recap.lastDate).toBe('2026-12-14');
    }
    expect(test.writes).toHaveLength(1);
    expect(test.writes[0].document.status).toBe('awaiting_confirmation');
  });

  it('recalcula a data final do mês pelo backend mesmo se o LLM errar resolved', async () => {
    const raw = envelope({
      entities: {
        recurrence: {
          freq: 'weekly',
          byDay: 2,
          until: { expression: 'até o fim de setembro', resolved: '2030-01-01', confidence: 'high' },
        },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'todas as terças até o fim de setembro' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.occurrenceCount).toBe(7);
      expect(result.recap.lastDate).toBe('2026-09-29');
    }
  });

  it('extrai JSON cercado por markdown', async () => {
    const raw = `\`\`\`json\n${envelope()}\n\`\`\``;
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque a reunião' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') expect(result.recap.firstDate).toBe('2026-08-18');
    expect(test.routeRequest).toHaveBeenCalledTimes(1);
  });

  it('passa os erros de schema ao modelo na nova tentativa', async () => {
    const test = setup(['não é json', envelope()]);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque reunião' }, test.dependencies);

    expect(result.success).toBe(true);
    expect(test.routeRequest).toHaveBeenCalledTimes(2);
    const retryMessages = test.routeRequest.mock.calls[1][0] as Array<{ role: string; content: string }>;
    expect(retryMessages[retryMessages.length - 1].content).toContain('Envelope não é um JSON válido.');
  });

  it('retorna indisponível quando o roteador entra em modo contingência', async () => {
    const test = setup(envelope());
    test.routeRequest.mockImplementation(async () => ({ content: 'Investidor, tente novamente.', success: true, isContingency: true }));
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque reunião' }, test.dependencies);

    expect(result).toEqual({ success: false, error: expect.stringContaining('indisponível') });
    expect(test.writes).toHaveLength(0);
  });

  it('cria proposta de exclusão em massa por título sem exigir data', async () => {
    const searchItems: StoredAgendaCommitment[] = [
      { id: 'a1', title: 'Reunião com o coordenador de campo', time: '18:00', dateMs: 0 },
      { id: 'a2', title: 'Reunião com o coordenador de campo', time: '09:00', dateMs: 0 },
    ];
    const test = setup(deleteEnvelope(), [], searchItems);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'Preciso excluir todos os compromissos com o nome "Reunião com o coordenador de campo"' },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.status).toBe('awaiting_confirmation');
      expect(result.recap.intent).toBe('delete');
      expect(result.recap.matchCount).toBe(2);
      expect(result.recap.affectedItems).toHaveLength(2);
      expect(result.recap.affectedItems?.[0]).toMatchObject({ id: 'a1', title: 'Reunião com o coordenador de campo', time: '18:00', endTime: null });
      expect(result.recap.summary).toContain('Encontrei 2 compromissos');
      expect(result.recap.summary).toContain('excluí-los permanentemente');
    }
    expect(test.agenda.searchByTitle).toHaveBeenCalledWith('user-1', 'Reunião com o coordenador de campo', { maxResults: 5000, sinceMs: expect.any(Number) });
    expect(test.agenda.onDay).not.toHaveBeenCalled();
    expect(test.writes).toHaveLength(1);
    expect(test.writes[0].document.status).toBe('awaiting_confirmation');
    expect((test.writes[0].document.targets as AgendaAffectedItem[] | undefined)).toHaveLength(2);
    expect((test.writes[0].document.targets as AgendaAffectedItem[] | undefined)?.[0].id).toBe('a1');
  });

  it('retorna esclarecimento quando a exclusão por título não encontra itens', async () => {
    const test = setup(deleteEnvelope());
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'excluir compromissos inexistentes' }, test.dependencies);

    expect(result).toMatchObject({ success: true, outcome: 'clarification', status: 'awaiting_clarification' });
    expect(test.writes).toHaveLength(0);
  });

  it('restringe a exclusão ao dia quando título e data estão presentes', async () => {
    const range = saoPauloDayRangeMillis(isoToYmd('2026-08-18'));
    const searchItems: StoredAgendaCommitment[] = [
      { id: 'a1', title: 'Reunião', time: '10:00', dateMs: range.startMs + 60 * 60000 },
      { id: 'a2', title: 'Reunião', time: '10:00', dateMs: range.startMs + 3 * 86400000 },
    ];
    const raw = deleteEnvelope({
      entities: { title: 'Reunião', date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' } },
    });
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'excluir a reunião de terça' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.matchCount).toBe(1);
      expect(result.recap.affectedItems?.[0].id).toBe('a1');
    }
  });

  it('prioriza entities.filter de título para a exclusão em massa', async () => {
    const searchItems: StoredAgendaCommitment[] = [{ id: 'f1', title: 'Check-in semanal', time: null, dateMs: 0 }];
    const raw = deleteEnvelope({ entities: { filter: { field: 'title', value: 'Check-in semanal' } } });
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'apagar todos os check-ins semanais' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.title).toBe('Check-in semanal');
      expect(result.recap.matchCount).toBe(1);
    }
    expect(test.agenda.searchByTitle).toHaveBeenCalledWith('user-1', 'Check-in semanal', { maxResults: 5000, sinceMs: expect.any(Number) });
  });

  it('exclui por data usando onDay quando não há título', async () => {
    const raw = deleteEnvelope({
      entities: { title: undefined, date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' } },
    });
    const test = setup(raw, [{ id: 'd1', title: 'Qualquer', time: '12:00', dateMs: 0 }]);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'excluir tudo da terça' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') expect(result.recap.matchCount).toBe(1);
    expect(test.agenda.onDay).toHaveBeenCalledWith('user-1', '2026-08-18');
    expect(test.agenda.searchByTitle).not.toHaveBeenCalled();
  });

  it('restringe a exclusão por título ao mês citado (intervalo de período, não último dia)', async () => {
    const nov = (day: number) => saoPauloDayRangeMillis(isoToYmd(`2026-11-${day}`)).startMs;
    const searchItems: StoredAgendaCommitment[] = [
      { id: 'n1', title: 'Reunião 16h', time: '16:00', dateMs: nov(3) },
      { id: 'n2', title: 'Reunião 16h', time: '16:00', dateMs: nov(10) },
      { id: 'n3', title: 'Reunião 16h', time: '16:00', dateMs: nov(17) },
      { id: 'n4', title: 'Reunião 16h', time: '16:00', dateMs: nov(24) },
      { id: 'out', title: 'Reunião 16h', time: '16:00', dateMs: saoPauloDayRangeMillis(isoToYmd('2026-10-20')).startMs },
    ];
    // "novembro" vem como expressão bruta em entities.date; o backend interpreta
    // como o mês INTEIRO (não colapsa para 30/11).
    const raw = deleteEnvelope({
      entities: {
        title: undefined,
        filter: { field: 'title', value: 'Reunião 16h' },
        date: { expression: 'novembro', resolved: '2026-11-30', confidence: 'high' },
      },
    });
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'exclua todos os compromissos "Reunião 16h" em novembro' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.matchCount).toBe(4);
      const ids = result.recap.affectedItems?.map((item) => item.id);
      expect(ids).toContain('n1');
      expect(ids).toContain('n4');
      expect(ids).not.toContain('out');
    }
    expect(test.agenda.searchByTitle).toHaveBeenCalledWith('user-1', 'Reunião 16h', { maxResults: 5000, sinceMs: expect.any(Number) });
    expect(test.agenda.onDay).not.toHaveBeenCalled();
  });

  it('registra scannedCount no recap do delete (observabilidade do scan)', async () => {
    const searchItems: StoredAgendaCommitment[] = [
      { id: 's1', title: 'Dentista', time: '10:00', dateMs: 0 },
      { id: 's2', title: 'Dentista', time: '11:00', dateMs: 0 },
      { id: 's3', title: 'Dentista', time: '12:00', dateMs: 0 },
    ];
    const raw = deleteEnvelope({ entities: { filter: { field: 'title', value: 'Dentista' } } });
    const test = setup(raw, [], searchItems);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'exclua os dentistas' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.matchCount).toBe(3);
      expect(result.recap.scannedCount).toBe(3);
      expect(test.writes[0].document.recap).toMatchObject({ scannedCount: 3 });
    }
  });

  it('deleteScanCutoffMs corta 12 meses para trás (janela do scan)', () => {
    const nowMs = new Date('2026-09-06T12:00:00Z').getTime();
    const cutoff = new Date(deleteScanCutoffMs(nowMs));
    expect(cutoff.getUTCFullYear()).toBe(2025);
    expect(cutoff.getUTCMonth()).toBe(8); // setembro − 12 meses
    expect(deleteScanCutoffMs(nowMs)).toBeLessThan(nowMs);
  });

  it('usa onPeriod para exclusão por mês sem título (só data)', async () => {
    const raw = deleteEnvelope({
      entities: {
        title: undefined,
        date: { expression: 'mês que vem', resolved: '2026-09-30', confidence: 'high' },
      },
    });
    const novStart = saoPauloDayRangeMillis(isoToYmd('2026-09-01')).startMs;
    const test = setup(raw, [{ id: 'm1', title: 'Check-in', time: '09:00', dateMs: novStart + 3 * 86400000 }]);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'excluir os compromissos do mês que vem' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') expect(result.recap.matchCount).toBe(1);
    expect(test.agenda.onPeriod).toHaveBeenCalledTimes(1);
    expect(test.agenda.onPeriod).toHaveBeenCalledWith('user-1', expect.any(Number), expect.any(Number));
    expect(test.agenda.onDay).not.toHaveBeenCalled();
  });

  it('ranqueia títulos por relevância (exata > prefixo > contém > interseção de tokens)', async () => {
    const { rankByTitle } = await import('../nexusAgendaInterpret');
    expect(rankByTitle('Reunião 16h', 'Reunião 16h')).toBe(0);
    expect(rankByTitle('Reunião 16h', 'Reunião 16h semanal')).toBe(1);
    expect(rankByTitle('Reunião 16h', 'Mensal Reunião 16h')).toBe(2);
    expect(rankByTitle('Reunião 16h', 'Reunião de 16h da equipe')).toBe(3);
    expect(rankByTitle('Reunião 16h', 'Almoço de confraternização')).toBe(-1);
  });

  it('entra em refinamento ativo quando a recorrência não tem data limite', async () => {
    const raw = envelope({
      entities: {
        date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' },
        recurrence: { freq: 'weekly', byDay: 2 },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'reunião toda terça' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.status).toBe('awaiting_clarification');
      expect(result.clarification.refinement?.question).toContain('Entendi que você quer uma recorrência');
      expect(result.clarification.refinement?.suggestions).toEqual(['Até o final do ano', 'Sem prazo máximo']);
      expect(result.clarification.questions[0]).toBe(result.clarification.refinement?.question);
    }
    expect(test.writes).toHaveLength(0);
  });

  it('não refina quando a recorrência já tem data limite (until)', async () => {
    const raw = envelope({
      entities: {
        date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' },
        recurrence: {
          freq: 'weekly',
          byDay: 2,
          until: { expression: 'até o fim de setembro', resolved: '2026-09-30', confidence: 'high' },
        },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'reunião toda terça até setembro' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.occurrenceCount).toBe(7);
      expect(result.recap.lastDate).toBe('2026-09-29');
    }
  });

  it('aplica limitDate "nos próximos 5 dias" como teto da série e materializa o until no envelope', async () => {
    const raw = envelope({
      entities: {
        date: { expression: 'hoje', resolved: '2026-08-12', confidence: 'high' },
        startTime: '09:00',
        recurrence: { freq: 'daily' },
        limitDate: { expression: 'nos próximos 5 dias', resolved: '2099-01-01', confidence: 'high' },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'check-in diário nos próximos 5 dias' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.occurrenceCount).toBe(6);
      expect(result.recap.firstDate).toBe('2026-08-12');
      expect(result.recap.lastDate).toBe('2026-08-17');
      expect(result.recap.recurrence?.until).toBe('2026-08-17');
    }
    expect(test.writes).toHaveLength(1);
    const stored = test.writes[0].document.envelope as { entities: { recurrence?: { until?: { resolved: string } } } };
    expect(stored.entities.recurrence?.until?.resolved).toBe('2026-08-17');
  });

  it('preenche até o limite da agenda com maxSlots e avisa sobre o truncamento', async () => {
    const raw = envelope({
      entities: {
        date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' },
        startTime: '18:00',
        endTime: '19:00',
        recurrence: { freq: 'weekly', byDay: 2 },
        maxSlots: true,
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'reunião toda terça no limite da agenda' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.occurrenceCount).toBe(366);
      expect(result.recap.recurrence?.freq).toBe('weekly');
      expect(result.warnings).toEqual([
        expect.objectContaining({ type: 'truncated', message: expect.stringContaining('limite de 366 compromissos') }),
      ]);
      expect(result.recap.summary).toContain('até o limite máximo da agenda');
    }
    expect(test.writes).toHaveLength(1);
    const stored = test.writes[0].document.envelope as { entities: { recurrence?: { until?: { resolved: string } } } };
    expect(stored.entities.recurrence?.until?.resolved).toBe(result.success && result.outcome === 'proposal' ? result.recap.lastDate : '');
  });

  it('esclarece quando a data inicial cai depois do limite da janela', async () => {
    const raw = envelope({
      entities: {
        date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' },
        recurrence: { freq: 'weekly', byDay: 2 },
        limitDate: { expression: 'nos próximos 5 dias', resolved: '2099-01-01', confidence: 'high' },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'reunião toda terça nos próximos 5 dias' }, test.dependencies);

    expect(result).toMatchObject({ success: true, outcome: 'clarification' });
    expect(test.writes).toHaveLength(0);
  });

  it('entra em esclarecimento quando o limite de dias não pode ser resolvido', async () => {
    const raw = envelope({
      entities: {
        date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' },
        recurrence: { freq: 'weekly', byDay: 2 },
        limitDate: { expression: 'quando couber', resolved: '2026-08-18', confidence: 'low' },
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'reunião toda terça quando couber' }, test.dependencies);

    expect(result).toMatchObject({ success: true, outcome: 'clarification' });
    if (result.success && result.outcome === 'clarification') {
      expect(result.clarification.ambiguous.join(' ')).toContain('limite de dias');
    }
  });

  it('redireciona bate-papo fora de escopo com a frase de atribuições delegadas', async () => {
    const redirect = 'Você está fugindo das minhas atribuições delegadas. Precisamos manter o foco na gestão da sua agenda. Por favor, feche e reabra a interface do Nexus na Agenda para iniciarmos uma nova tarefa.';
    const raw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: [],
      ambiguous: [redirect],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'qual é o seu signo?' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.clarification.ambiguous[0]).toBe(redirect);
      expect(result.clarification.questions[0]).toContain('atribuições delegadas');
    }
    expect(test.writes).toHaveLength(0);
  });

  it('encaminha o histórico do diálogo ao roteador para refinar a resposta seguinte', async () => {
    const raw = envelope({
      entities: {
        date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' },
        recurrence: {
          freq: 'weekly',
          byDay: 2,
          until: { expression: 'até o fim de setembro', resolved: '2099-01-01', confidence: 'high' },
        },
      },
    });
    const test = setup(raw);
    const history = [
      { role: 'user', text: 'reunião toda terça' },
      { role: 'assistant', text: 'Entendi que você quer uma recorrência. Você quer até uma data limite ou até o limite da agenda?' },
    ];
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'até o fim de setembro', history }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') expect(result.recap.recurrence?.until).toBe('2026-09-29');
    const sentMessages = test.routeRequest.mock.calls[0][0] as Array<{ role: string; content: string }>;
    expect(sentMessages).toContainEqual({ role: 'user', content: 'reunião toda terça' });
    expect(sentMessages).toContainEqual({ role: 'user', content: 'até o fim de setembro' });
    expect(sentMessages).toContainEqual({ role: 'assistant', content: 'Entendi que você quer uma recorrência. Você quer até uma data limite ou até o limite da agenda?' });
  });

  it('faz pergunta natural para campo ausente (intent clarify)', async () => {
    const raw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['startTime'],
      ambiguous: ['Você quer inserir o horário neste compromisso?'],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'Agende uma reunião em todos os domingos do mês de setembro.' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.clarification.missing).toEqual(['startTime']);
      expect(result.question).toBe('Você quer inserir o horário neste compromisso?');
      expect(result.clarification.questions).toEqual([
        'Você quer inserir o horário neste compromisso?',
      ]);
      expect(result.clarification.ambiguous).toEqual([]);
    }
    expect(test.writes).toHaveLength(0);
  });

  it('gera pergunta natural combinada quando faltam título, data e horário', async () => {
    const raw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['title', 'date', 'startTime'],
      ambiguous: [],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque algo' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.clarification.questions[0]).toBe('Qual será o título do compromisso? Para qual período devo agendá-lo e em que horário?');
    }
  });

  it('gera pergunta natural individual para cada campo ausente', async () => {
    const cases: Array<[string, string]> = [
      ['title', 'Qual nome você deseja dar a esse compromisso?'],
      ['date', 'Para qual dia ou período devo agendar esse compromisso?'],
      ['startTime', 'Você quer inserir o horário neste compromisso?'],
      ['endTime', 'Qual é o horário de término?'],
      ['location', 'Onde será o compromisso?'],
    ];
    for (const [field, expected] of cases) {
      const raw = JSON.stringify({
        intent: 'clarify',
        action: 'query_clarification',
        entities: {},
        missing: [field],
        ambiguous: [],
        assumptions: [],
      });
      const test = setup(raw);
      const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque algo' }, test.dependencies);
      expect(result.success).toBe(true);
      if (result.success && result.outcome === 'clarification') {
        expect(result.clarification.questions).toContain(expected);
      }
    }
  });

  it('pergunta combinada de título e horário em uma única frase', async () => {
    const raw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['title', 'startTime'],
      ambiguous: [],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque algo' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.clarification.questions).toContain('Qual será o título do compromisso e em qual horário você deseja marcá-lo?');
    }
  });

  it('nunca expõe nomes técnicos de campos nas perguntas ao usuário', async () => {
    const raw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['title', 'date', 'startTime', 'endTime', 'location'],
      ambiguous: [],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque algo' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      const text = result.clarification.questions.join(' ');
      expect(text).not.toContain('title');
      expect(text).not.toContain('startTime');
      expect(text).not.toContain('endTime');
      expect(text).not.toContain('byDay');
      expect(text).not.toContain('limitDate');
      expect(text).not.toContain('recurrence');
      expect(text).not.toContain('filter');
    }
  });

  it('compreende "pode deixar sem horário" e cria a proposta sem horário', async () => {
    const firstRaw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['startTime'],
      ambiguous: ['Você quer inserir o horário neste compromisso?'],
      assumptions: [],
    });
    const secondRaw = envelope({
      entities: {
        title: 'Reunião com o coordenador',
        date: { expression: 'todos os domingos do mês de setembro', resolved: '2026-09-06', confidence: 'high' },
        startTime: undefined,
        endTime: undefined,
      },
    });
    const test = setup([firstRaw, secondRaw]);

    const first = await orchestrateAgendaInterpret('user-1', { prompt: 'Agende uma reunião em todos os domingos do mês de setembro.' }, test.dependencies);
    expect(first.success).toBe(true);
    if (!(first.success && first.outcome === 'clarification')) throw new Error('turno 1 deveria esclarecer o horário');

    const history = [
      { role: 'user', text: 'Agende uma reunião em todos os domingos do mês de setembro.' },
      { role: 'assistant', text: 'Você quer inserir o horário neste compromisso?' },
    ];
    const second = await orchestrateAgendaInterpret('user-1', { prompt: 'Pode deixar sem horário.', history }, test.dependencies);

    expect(second.success).toBe(true);
    if (second.success && second.outcome === 'proposal') {
      expect(second.recap.title).toBe('Reunião com o coordenador');
      expect(second.recap.firstDate).toBe('2026-09-06');
      expect(second.recap.startTime).toBeUndefined();
      expect(second.recap.occurrenceCount).toBe(1);
      expect(second.confirmationToken).toBeTruthy();
    }
    expect(test.writes).toHaveLength(1);
  });

  it('preserva o "20h" do título e extrai o horário em separado', async () => {
    const raw = envelope({
      entities: {
        title: 'Reunião com a banda 20h',
        date: { expression: 'amanhã', resolved: '2026-08-13', confidence: 'high' },
        startTime: '20:00',
        endTime: undefined,
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'O nome do compromisso é "Reunião com a banda 20h" e o horário é 20h.' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'proposal') {
      expect(result.recap.title).toBe('Reunião com a banda 20h');
      expect(result.recap.startTime).toBe('20:00');
      expect(result.recap.firstDate).toBe('2026-08-13');
    }
  });

  it('retorna pergunta natural combinada (título + horário opcional) quando só falta o título', async () => {
    const raw = JSON.stringify({
      intent: 'create',
      action: 'create_commitment',
      entities: {
        date: { expression: 'todas as terças-feiras de outubro', resolved: '2026-10-06', confidence: 'high' },
        recurrence: { freq: 'weekly', byDay: 2, until: { expression: 'fim de outubro', resolved: '2026-10-31', confidence: 'high' } },
        location: null,
        participants: null,
      },
      missing: [],
      ambiguous: [],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'Agende uma reunião para todas as terças-feiras de outubro.' },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (!(result.success && result.outcome === 'clarification')) throw new Error('deveria esclarecer o título');
    expect(result.question).toBe('Qual será o título do compromisso? Se quiser, você também pode informar o horário.');
    expect(result.clarification.missing).toEqual(['title']);
    expect(result.clarification.questions).toEqual([
      'Qual será o título do compromisso? Se quiser, você também pode informar o horário.',
    ]);
    expect(result.clarification.ambiguous).toEqual([]);
    expect(result.question).not.toContain('Informe title.');
  });

  it('retorna apenas a pergunta de título quando o horário já foi informado', async () => {
    const raw = JSON.stringify({
      intent: 'create',
      action: 'create_commitment',
      entities: {
        date: { expression: 'todas as terças-feiras de outubro', resolved: '2026-10-06', confidence: 'high' },
        recurrence: { freq: 'weekly', byDay: 2, until: { expression: 'fim de outubro', resolved: '2026-10-31', confidence: 'high' } },
        startTime: '20:00',
        location: null,
        participants: null,
      },
      missing: [],
      ambiguous: [],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'Agende para as terças de outubro às 20h.' },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (!(result.success && result.outcome === 'clarification')) throw new Error('deveria esclarecer o título');
    expect(result.question).toBe('Qual será o título do compromisso?');
    expect(result.question).not.toContain('horário');
  });

  it('filtra textos técnicos vindos do modelo (ex.: "Informe title.") nas respostas de esclarecimento', async () => {
    const raw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['title'],
      ambiguous: [
        'Informe title.',
        'Você está fugindo das minhas atribuições delegadas à Agenda Nexus. Informe o nome do compromisso, por favor.',
      ],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'marque algo' }, test.dependencies);

    expect(result.success).toBe(true);
    if (!(result.success && result.outcome === 'clarification')) throw new Error('deveria esclarecer');
    expect(result.clarification.ambiguous).not.toContain('Informe title.');
    expect(result.clarification.ambiguous).toEqual([
      'Você está fugindo das minhas atribuições delegadas à Agenda Nexus. Informe o nome do compromisso, por favor.',
    ]);
    expect(result.question).toBe('Qual nome você deseja dar a esse compromisso?');
    expect([result.question, ...result.clarification.ambiguous].join(' ')).not.toMatch(/\b(title|startTime|endTime|byDay|limitDate)\b/i);
    expect(result.question).not.toContain('Informe title.');
  });

  it('trata "Agende uma reunião para mim para amanhã." como esclarecimento de horário (não como erro)', async () => {
    const raw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: [],
      ambiguous: ['Não consegui estruturar esse comando de agenda. Tente descrevê-lo com uma data e horário mais claros.'],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'Agende uma reunião para mim para amanhã.' },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (!(result.success && result.outcome === 'clarification')) throw new Error('deveria esclarecer');
    expect(result.question).toBe('Você quer inserir o horário neste compromisso?');
    expect(result.question).not.toBe('Não consegui estruturar esse comando de agenda. Tente descrevê-lo com uma data e horário mais claros.');
    expect(result.question).not.toContain('Informe title.');
    expect([result.question, ...result.clarification.questions, ...result.clarification.ambiguous].join(' ')).not.toMatch(/\b(title|startTime|missing)\b/i);
    expect(test.writes).toHaveLength(0);
  });

  it('mantém a pergunta natural de horário mesmo quando o LLM devolve JSON inválido duas vezes', async () => {
    const test = setup(['não é json', '{ também não é json']);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'Agende uma reunião para mim para amanhã.' },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (!(result.success && result.outcome === 'clarification')) throw new Error('deveria esclarecer');
    expect(result.question).toBe('Você quer inserir o horário neste compromisso?');
    expect(result.question).not.toBe('Não consegui organizar essa solicitação. Você pode me dizer, por exemplo, o nome do compromisso, a data e o horário?');
    expect(test.writes).toHaveLength(0);
  });

  it('preserva o redirecionamento fora de escopo mesmo com evidência de criação', async () => {
    const redirect = 'Você está fugindo das minhas atribuições delegadas. Precisamos manter o foco na gestão da sua agenda. Por favor, feche e reabra a interface do Nexus na Agenda para iniciarmos uma nova tarefa.';
    const raw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: [],
      ambiguous: [redirect],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'Agende uma reunião para mim para amanhã.' },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (!(result.success && result.outcome === 'clarification')) throw new Error('deveria esclarecer');
    expect(result.question).toBe(redirect);
    expect(test.writes).toHaveLength(0);
  });

  it('aceita envelope de clarification sem title nem date e gera pergunta natural de horário', async () => {
    const raw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['startTime'],
      ambiguous: ['Você quer inserir o horário neste compromisso?'],
      assumptions: [],
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'Agende uma reunião para mim para amanhã.' },
      test.dependencies,
    );

    expect(result.success).toBe(true);
    if (!(result.success && result.outcome === 'clarification')) throw new Error('deveria esclarecer');
    expect(result.question).toBe('Você quer inserir o horário neste compromisso?');
    expect(result.clarification.missing).toEqual(['startTime']);
  });

  it('mantém a mensagem de reformulação para pedidos realmente incompreensíveis', async () => {
    const test = setup(['não é json', '{ também não é json']);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'qwerty 123 zzz' }, test.dependencies);

    expect(result.success).toBe(true);
    if (!(result.success && result.outcome === 'clarification')) throw new Error('deveria esclarecer');
    expect(result.question).toBe('Não consegui organizar essa solicitação. Você pode me dizer, por exemplo, o nome do compromisso, a data e o horário?');
  });

  it('fluxo de dois turnos: "Agende uma reunião para mim para amanhã." → "Às 20h." → proposta com horário', async () => {
    const firstRaw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['startTime'],
      ambiguous: ['Você quer inserir o horário neste compromisso?'],
      assumptions: [],
    });
    const secondRaw = envelope({
      entities: {
        title: 'Reunião 20h',
        date: { expression: 'amanhã', resolved: '2026-08-13', confidence: 'high' },
        startTime: '20:00',
        endTime: undefined,
      },
    });
    const test = setup([firstRaw, secondRaw]);
    const promptTurn1 = 'Agende uma reunião para mim para amanhã.';

    const first = await orchestrateAgendaInterpret('user-1', { prompt: promptTurn1 }, test.dependencies);
    expect(first.success).toBe(true);
    if (!(first.success && first.outcome === 'clarification')) throw new Error('turno 1 deveria esclarecer o horário');
    if (!first.question) throw new Error('turno 1 deveria ter pergunta');
    expect(first.question).toBe('Você quer inserir o horário neste compromisso?');
    expect(first.question).not.toBe('Não consegui estruturar esse comando de agenda. Tente descrevê-lo com uma data e horário mais claros.');
    expect(test.writes).toHaveLength(0);

    const history = [
      { role: 'user', text: promptTurn1 },
      { role: 'assistant', text: first.question },
    ];
    const second = await orchestrateAgendaInterpret('user-1', { prompt: 'Às 20h.', history }, test.dependencies);

    expect(second.success).toBe(true);
    if (second.success && second.outcome === 'proposal') {
      expect(second.recap.title).toBe('Reunião 20h');
      expect(second.recap.firstDate).toBe('2026-08-13');
      expect(second.recap.startTime).toBe('20:00');
      expect(second.confirmationToken).toBeTruthy();
    } else {
      throw new Error('turno 2 deveria produzir proposta');
    }
    expect(test.writes).toHaveLength(1);
  });

  it('fluxo de dois turnos: "Agende uma reunião para mim para amanhã." → "Pode deixar sem horário." → proposta sem horário', async () => {
    const firstRaw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['startTime'],
      ambiguous: ['Você quer inserir o horário neste compromisso?'],
      assumptions: [],
    });
    const secondRaw = envelope({
      entities: {
        title: 'reunião',
        date: { expression: 'amanhã', resolved: '2026-08-13', confidence: 'high' },
        startTime: undefined,
        endTime: undefined,
      },
    });
    const test = setup([firstRaw, secondRaw]);
    const promptTurn1 = 'Agende uma reunião para mim para amanhã.';

    const first = await orchestrateAgendaInterpret('user-1', { prompt: promptTurn1 }, test.dependencies);
    expect(first.success).toBe(true);
    if (!(first.success && first.outcome === 'clarification')) throw new Error('turno 1 deveria esclarecer o horário');
    if (!first.question) throw new Error('turno 1 deveria ter pergunta');
    expect(first.question).toBe('Você quer inserir o horário neste compromisso?');
    expect(test.writes).toHaveLength(0);

    const history = [
      { role: 'user', text: promptTurn1 },
      { role: 'assistant', text: first.question },
    ];
    const second = await orchestrateAgendaInterpret('user-1', { prompt: 'Pode deixar sem horário.', history }, test.dependencies);

    expect(second.success).toBe(true);
    if (second.success && second.outcome === 'proposal') {
      expect(second.recap.title).toBe('reunião');
      expect(second.recap.firstDate).toBe('2026-08-13');
      expect(second.recap.startTime).toBeUndefined();
      expect(second.confirmationToken).toBeTruthy();
    } else {
      throw new Error('turno 2 deveria produzir proposta sem horário');
    }
    expect(test.writes).toHaveLength(1);
  });

  it('fluxo de dois turnos: pergunta combinada → resposta completa com contexto preservado', async () => {
    const firstRaw = JSON.stringify({
      intent: 'create',
      action: 'create_commitment',
      entities: {
        date: { expression: 'todas as terças-feiras de outubro', resolved: '2026-10-06', confidence: 'high' },
        recurrence: { freq: 'weekly', byDay: 2, until: { expression: 'fim de outubro', resolved: '2026-10-31', confidence: 'high' } },
        location: null,
        participants: null,
      },
      missing: [],
      ambiguous: [],
      assumptions: [],
    });
    const secondRaw = envelope({
      entities: {
        title: 'Reunião com a banda 20h',
        date: { expression: 'todas as terças-feiras de outubro', resolved: '2026-10-06', confidence: 'high' },
        recurrence: { freq: 'weekly', byDay: 2, until: { expression: 'fim de outubro', resolved: '2026-10-31', confidence: 'high' } },
        startTime: '20:00',
        endTime: undefined,
      },
    });
    const test = setup([firstRaw, secondRaw]);
    const promptTurn1 = 'Agende uma reunião para todas as terças-feiras de outubro.';

    const first = await orchestrateAgendaInterpret('user-1', { prompt: promptTurn1 }, test.dependencies);
    expect(first.success).toBe(true);
    if (!(first.success && first.outcome === 'clarification')) throw new Error('turno 1 deveria esclarecer o título');
    expect(first.question).toBe('Qual será o título do compromisso? Se quiser, você também pode informar o horário.');
    expect(first.question).not.toContain('Informe title.');
    expect(first.clarification.ambiguous).toEqual([]);

    const history = [
      { role: 'user', text: promptTurn1 },
      { role: 'assistant', text: 'Qual será o título do compromisso? Se quiser, você também pode informar o horário.' },
    ];
    const second = await orchestrateAgendaInterpret(
      'user-1',
      { prompt: 'O nome do compromisso é "Reunião com a banda 20h" e o horário é 20h.', history },
      test.dependencies,
    );

    expect(second.success).toBe(true);
    if (second.success && second.outcome === 'proposal') {
      expect(second.recap.title).toBe('Reunião com a banda 20h');
      expect(second.recap.startTime).toBe('20:00');
      expect(second.recap.firstDate).toBe('2026-10-06');
      expect(second.recap.lastDate).toBe('2026-10-27');
      expect(second.recap.occurrenceCount).toBe(4);
      expect(second.recap.recurrence).toEqual({ freq: 'weekly', byDay: 2, until: '2026-10-27' });
      expect(second.confirmationToken).toBeTruthy();
    } else {
      throw new Error('turno 2 deveria produzir proposta');
    }
    expect(test.writes).toHaveLength(1);
    expect(second.recap?.summary).not.toContain('Informe title.');
  });

  it('completa um fluxo de dois turnos: pergunta → resposta → proposta', async () => {
    const firstRaw = JSON.stringify({
      intent: 'clarify',
      action: 'query_clarification',
      entities: {},
      missing: ['startTime'],
      ambiguous: ['Você quer inserir o horário neste compromisso?'],
      assumptions: [],
    });
    const secondRaw = envelope({
      entities: {
        title: 'Reunião com o coordenador',
        date: { expression: 'todos os domingos do mês de setembro', resolved: '2026-09-06', confidence: 'high' },
        startTime: '16:00',
        endTime: '17:00',
        location: null,
        participants: null,
        recurrence: { freq: 'weekly', byDay: 7, until: { expression: 'até o fim de setembro', resolved: '2026-09-30', confidence: 'high' } },
      },
    });
    const test = setup([firstRaw, secondRaw]);
    const promptTurn1 = 'Agende uma reunião em todos os domingos do mês de setembro.';

    const first = await orchestrateAgendaInterpret('user-1', { prompt: promptTurn1 }, test.dependencies);
    expect(first.success).toBe(true);
    if (!(first.success && first.outcome === 'clarification')) throw new Error('turno 1 deveria esclarecer');
    const question = first.clarification.questions[0];
    expect(question).toBeTruthy();

    const history = [
      { role: 'user', text: promptTurn1 },
      { role: 'assistant', text: 'Você quer inserir o horário neste compromisso?' },
    ];
    const second = await orchestrateAgendaInterpret('user-1', { prompt: 'Às 16h.', history }, test.dependencies);

    expect(second.success).toBe(true);
    if (second.success && second.outcome === 'proposal') {
      expect(second.recap.occurrenceCount).toBe(4);
      expect(second.recap.firstDate).toBe('2026-09-06');
      expect(second.recap.lastDate).toBe('2026-09-27');
      expect(second.recap.startTime).toBe('16:00');
      expect(second.confirmationToken).toBeTruthy();
    }
    expect(test.writes).toHaveLength(1);

    const sentTurn2 = test.routeRequest.mock.calls[1][0] as Array<{ role: string; content: string }>;
    expect(sentTurn2).toContainEqual({ role: 'user', content: promptTurn1 });
    expect(sentTurn2).toContainEqual({ role: 'assistant', content: 'Você quer inserir o horário neste compromisso?' });
    expect(sentTurn2[sentTurn2.length - 1]).toEqual({ role: 'user', content: 'Às 16h.' });
  });
});

describe('buildMessages', () => {
  it('retorna apenas o prompt quando não há histórico', () => {
    expect(buildMessages('marque reunião', [])).toEqual([{ role: 'user', content: 'marque reunião' }]);
  });

  it('normaliza papéis: assistant/ai viram assistant e os demais user', () => {
    const messages = buildMessages('prompt', [
      { role: 'ai', text: 'resposta' },
      { role: 'user', text: 'pergunta' },
    ]) as Array<{ role: string; content: string }>;
    expect(messages).toEqual([
      { role: 'assistant', content: 'resposta' },
      { role: 'user', content: 'pergunta' },
      { role: 'user', content: 'prompt' },
    ]);
  });

  it('corta o histórico acima do teto de mensagens, preservando a troca mais recente', () => {
    const history = Array.from({ length: 60 }, (_, index) => ({ role: 'user' as const, text: `msg-${index}` }));
    const messages = buildMessages('prompt', history) as Array<{ role: string; content: string }>;
    expect(messages).toHaveLength(51);
    expect(messages[0]).toEqual({ role: 'user', content: 'msg-10' });
    expect(messages[49]).toEqual({ role: 'user', content: 'msg-59' });
    expect(messages[50]).toEqual({ role: 'user', content: 'prompt' });
  });

  it('respeita o orçamento de tokens mantendo ao menos a última troca', () => {
    const history = Array.from({ length: 5 }, () => ({ role: 'user' as const, text: 'x'.repeat(2500) }));
    const messages = buildMessages('prompt', history) as Array<{ role: string; content: string }>;
    expect(messages).toHaveLength(5);
    expect(messages[0]).toEqual({ role: 'user', content: 'x'.repeat(2500) });
    expect(messages[3]).toEqual({ role: 'user', content: 'x'.repeat(2500) });
    expect(messages[4]).toEqual({ role: 'user', content: 'prompt' });
  });
});

describe('buildSystemPrompt', () => {
  const normalized = buildSystemPrompt(NOW).toLowerCase();

  it('ensina a sempre incluir o horário no título e extraí-lo em separado', () => {
    expect(normalized).toContain('reunião 18h');
    expect(normalized).toContain('ensaio da banda 20h');
    expect(normalized).toContain('reunião com a banda 20h');
    expect(normalized).toContain('entities.starttime');
    expect(normalized).toContain('sempre inclua no título o horário citado pelo usuário');
  });

  it('ensina a criar compromissos sem horário quando o usuário prefere', () => {
    expect(normalized).toContain('sem horário');
    expect(normalized).toContain('pode deixar sem horário');
    expect(normalized).toContain('não coloque "starttime" em missing');
  });

  it('ensina a usar o contexto da conversa sem repetir perguntas', () => {
    expect(normalized).toContain('não pergunte novamente o que já foi informado');
  });

  it('ensina a montar o envelope completo quando a resposta traz só o dado que faltava', () => {
    expect(normalized).toContain('"às 16h"');
    expect(normalized).toContain('monte o envelope completo com os campos já estabelecidos');
  });
});

describe('continuidade de sessão (sessionId)', () => {
  const sessionId = 'sess-1';

  it('preserva o contexto entre turnos, ecoa o já definido e pergunta a continuidade da recorrência', async () => {
    const firstRaw = JSON.stringify({
      intent: 'create',
      action: 'create_commitment',
      entities: {
        title: undefined,
        date: { expression: 'todas as terças-feiras de outubro', resolved: '2026-10-06', confidence: 'high' },
        recurrence: { freq: 'weekly', byDay: 2, until: { expression: 'fim de outubro', resolved: '2026-10-31', confidence: 'high' } },
        startTime: '20:00',
        endTime: undefined,
      },
      missing: ['title'],
      ambiguous: [],
      assumptions: [],
    });
    const secondRaw = JSON.stringify({
      intent: 'create',
      action: 'create_commitment',
      entities: {
        title: 'Chamada com o time',
        date: { expression: 'todas as terças-feiras de outubro', resolved: '2026-10-06', confidence: 'high' },
        startTime: '20:00',
        endTime: undefined,
      },
      missing: [],
      ambiguous: [],
      assumptions: [],
    });
    const test = setup([firstRaw, secondRaw]);

    const first = await orchestrateAgendaInterpret('user-1', { prompt: 'Agende uma reunião para todas as terças-feiras de outubro.', sessionId }, test.dependencies);
    expect(first.success).toBe(true);
    if (!(first.success && first.outcome === 'clarification')) throw new Error('turno 1 deveria esclarecer o título');
    // Eco do contexto já estabelecido no texto da pergunta.
    expect(first.question).toContain('Já definido:');
    expect(first.question).toContain('06/10/2026');
    expect(first.question).toContain('todas as terças-feiras até 31/10/2026');
    expect(first.question).toContain('Qual será o título do compromisso?');
    expect(first.clarification.missing).toEqual(['title']);
    // Sessão persistida com o estado do turno (recorrência materializada).
    expect(test.sessionWrites).toHaveLength(1);
    expect(test.sessionWrites[0].sessionId).toBe(sessionId);
    expect(test.sessionWrites[0].recurrence).toBeDefined();

    // Turno 2: o usuário só responde o título (não repete a recorrência).
    test.sessionRead.mockResolvedValue(test.sessionWrites[0]);
    const second = await orchestrateAgendaInterpret('user-1', { prompt: 'O nome é "Chamada com o time".', sessionId }, test.dependencies);
    expect(second.success).toBe(true);
    if (!(second.success && second.outcome === 'clarification')) throw new Error('turno 2 deveria confirmar a recorrência');
    expect(second.clarification.refinement?.suggestions).toEqual(['Manter recorrência', 'Apenas uma ocorrência']);
    expect(second.clarification.refinement?.question).toContain('terças-feiras');
    // Nenhum pending é gravado antes da confirmação de continuidade.
    expect(test.writes).toHaveLength(0);
    // Prompt do sistema do turno 2 recebe o bloco de contexto da sessão.
    const systemPromptTurn2 = test.routeRequest.mock.calls[1][1] as string | undefined;
    expect(systemPromptTurn2).toContain('CONTEXTO JÁ ESTABELECIDO NESTA CONVERSA');
    expect(systemPromptTurn2).toContain('"recurrence"');
    expect(test.sessionRead).toHaveBeenCalledWith('user-1', sessionId);
  });

  it('não injeta eco sem sessionId (fluxo sem continuidade permanece estável)', async () => {
    const raw = envelope({
      entities: {
        title: undefined,
        date: { expression: 'todas as terças-feiras de outubro', resolved: '2026-10-06', confidence: 'high' },
        recurrence: { freq: 'weekly', byDay: 2, until: { expression: 'fim de outubro', resolved: '2026-10-31', confidence: 'high' } },
        startTime: '20:00',
        endTime: undefined,
      },
    });
    const test = setup(raw);
    const result = await orchestrateAgendaInterpret('user-1', { prompt: 'Agende uma reunião para todas as terças-feiras de outubro.' }, test.dependencies);

    expect(result.success).toBe(true);
    if (result.success && result.outcome === 'clarification') {
      expect(result.question).not.toContain('Já definido:');
      expect(result.question).toBe('Qual será o título do compromisso?');
    }
    expect(test.sessionRead).not.toHaveBeenCalled();
    expect(test.sessionWrites).toHaveLength(0);
  });
});
