import { describe, expect, it, vi } from 'vitest';
import {
  auditErrorLog,
  batchWriteErrorLog,
  executeAgendaCommit,
  getAllInBatches,
  MAX_COMMIT_BATCH_WRITES,
  MAX_COMMIT_OCCURRENCES,
  MAX_READ_BATCH_SIZE,
  requireCommitAuth,
  sanitizeForFirestore,
  type CommitDependencies,
  type CommitResult,
} from '../nexusAgendaCommit';
import { isoToYmd, saoPauloDayRangeMillis } from '../nexus-core/agenda-time';

const NOW = new Date('2026-08-12T15:00:00.000Z').getTime();

function hasUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(hasUndefined);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasUndefined);
  return false;
}

function pendingEnvelope(overrides: Record<string, unknown> = {}) {
  const overrideEntities = overrides.entities as Record<string, unknown> | undefined;
  const { entities: _ignoredEntities, ...topLevelOverrides } = overrides;
  return {
    intent: 'create',
    action: 'create_commitment',
    entities: {
      title: 'Reunião com o coordenador',
      date: { expression: 'próxima terça-feira', resolved: '2026-08-18', confidence: 'high' },
      startTime: '17:00',
      endTime: '18:00',
      location: 'Sala 3',
      participants: ['Ana'],
      notes: 'Levar relatório',
      ...(overrideEntities ?? {}),
    },
    missing: [],
    ambiguous: [],
    assumptions: [],
    ...topLevelOverrides,
  };
}

function pendingDocument(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'user-1',
    nonce: 'token-1',
    confirmationToken: 'token-1',
    status: 'awaiting_confirmation',
    createdAtMs: NOW - 1000,
    expiresAtMs: NOW + 600000,
    envelope: pendingEnvelope(),
    ...overrides,
  };
}

function deletePendingEnvelope() {
  return {
    intent: 'delete',
    action: 'delete_commitment',
    entities: { title: 'Reunião com o coordenador de campo' },
    missing: [],
    ambiguous: [],
    assumptions: [],
  };
}

function editSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Reunião com o coordenador',
    date: '2026-08-18',
    startTime: '17:00',
    endTime: '18:00',
    location: 'Sala 3',
    participants: ['Ana'],
    notes: 'Levar relatório',
    ...overrides,
  };
}

function editPending(overrides: Record<string, unknown> = {}) {
  return {
    envelope: pendingEnvelope({ intent: 'edit', action: 'edit_commitment' }),
    target: { id: 'c1' },
    before: editSnapshot(),
    after: editSnapshot({ startTime: '19:00', endTime: '20:00' }),
    ...overrides,
  };
}

/** Documento Firestore realista correspondente ao before da proposta de edição. */
function editCurrentDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    uid: 'user-1',
    title: 'Reunião com o coordenador',
    date: { toMillis: () => saoPauloDayRangeMillis(isoToYmd('2026-08-18')).startMs },
    time: '17:00',
    endTime: '18:00',
    location: 'Sala 3',
    participants: ['Ana'],
    notes: 'Levar relatório',
    createdAt: { toMillis: () => NOW - 5000 },
    createdBy: 'user-1',
    ...overrides,
  };
}

function setup(options: {
  pending?: Record<string, unknown>;
  existingIds?: string[];
  failBatchAt?: number;
  claim?: CommitDependencies['claimPending'];
  /** Retorno de readCommitment (edição). */
  readCommitment?: Record<string, unknown> | null;
  /** Dispara erro de updateCommitment (edição). */
  failUpdate?: boolean;
} = {}) {
  const batches: Array<Array<{ id: string; data: Record<string, unknown> }>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const finalized: Array<Record<string, unknown>> = [];
  const deleted: string[] = [];
  const updated: Array<{ id: string; data: Record<string, unknown> }> = [];
  let batchCount = 0;
  let claimStatus: string = 'awaiting_confirmation';

  const maybeFail = () => {
    batchCount += 1;
    if (options.failBatchAt === batchCount) throw new Error(`batch-${batchCount}-failed`);
  };

  const defaultClaim = async (_uid: string, _token: string, _now: number, _executionId: string) => {
    if (claimStatus === 'committed') {
      return {
        kind: 'idempotent' as const,
        result: (pendingDocument() as unknown as { result: CommitResult }).result,
      };
    }
    if (claimStatus !== 'awaiting_confirmation') return { kind: 'rejected' as const, reason: 'Token já consumido.' };
    claimStatus = 'processing';
    return { kind: 'claimed' as const, pending: pendingDocument({ ...options.pending, status: 'processing' }) };
  };
  const dependencies: CommitDependencies = {
    claimPending: options.claim ?? vi.fn(defaultClaim),
    existingIds: vi.fn(async () => options.existingIds ?? []),
    writeBatch: vi.fn(async (_uid, documents) => {
      maybeFail();
      batches.push(documents);
    }),
    deleteBatch: vi.fn(async (_uid, ids) => {
      maybeFail();
      deleted.push(...ids);
    }),
    readCommitment: vi.fn(async () => options.readCommitment ?? null),
    updateCommitment: vi.fn(async (_uid, id, data) => {
      if (options.failUpdate) throw new Error('update failed');
      updated.push({ id, data });
    }),
    finalizePending: vi.fn(async (_uid, _token, patch) => {
      finalized.push(patch);
      if (patch.status === 'committed') claimStatus = 'committed';
    }),
    writeAudit: vi.fn(async (_uid, _actionId, audit) => {
      audits.push(audit as unknown as Record<string, unknown>);
    }),
  };
  return { dependencies, batches, audits, finalized, deleted, updated };
}

describe('nexusAgendaCommit', () => {
  it('sanitiza undefined em objetos aninhados e arrays para null', () => {
    const result = sanitizeForFirestore({
      a: undefined,
      b: { c: undefined, d: 1 },
      e: [undefined, { f: undefined }],
      g: 'ok',
      h: null,
    }) as Record<string, unknown>;

    expect(result.a).toBeNull();
    expect((result.b as Record<string, unknown>).c).toBeNull();
    expect((result.b as Record<string, unknown>).d).toBe(1);
    expect(result.e).toEqual([null, { f: null }]);
    expect(result.g).toBe('ok');
    expect(result.h).toBeNull();
  });

  it('converte Date inválido para null e preserva Date válido', () => {
    const invalid = sanitizeForFirestore(new Date('não-é-uma-data')) as unknown;
    const valid = sanitizeForFirestore(new Date('2026-08-12T15:00:00.000Z')) as unknown;

    expect(invalid).toBeNull();
    expect(valid).toBeInstanceOf(Date);
  });

  it('rejeita usuário não autenticado', () => {
    expect(() => requireCommitAuth({ auth: null })).toThrow('Login necessário');
    expect(() => requireCommitAuth({ auth: {} })).toThrow('Login necessário');
  });

  it('rejeita confirmed false antes de ler ou gravar a proposta', async () => {
    const test = setup();
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: false }, test.dependencies, NOW))
      .rejects.toThrow('confirmação explícita');
    expect(test.dependencies.claimPending).not.toHaveBeenCalled();
  });

  it('rejeita token inexistente', async () => {
    const test = setup({ claim: vi.fn(async () => ({ kind: 'rejected' as const, reason: 'Proposta inexistente.' })) });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'missing', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('inexistente');
  });

  it('rejeita token pertencente a outro usuário', async () => {
    const test = setup({ claim: vi.fn(async () => ({ kind: 'rejected' as const, reason: 'A proposta não pertence ao usuário autenticado.' })) });
    await expect(executeAgendaCommit('user-2', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('não pertence');
  });

  it('rejeita token expirado', async () => {
    const test = setup({ claim: vi.fn(async () => ({ kind: 'rejected' as const, reason: 'A proposta de agenda expirou.' })) });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('expirou');
  });

  it('cria compromisso único com completed false e preserva metadados', async () => {
    const test = setup();
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    expect(result.occurrenceCount).toBe(1);
    expect(test.batches).toHaveLength(1);
    expect(test.batches[0]).toHaveLength(1);
    expect(test.batches[0][0].data).toMatchObject({
      title: 'Reunião com o coordenador',
      time: '17:00',
      endTime: '18:00',
      completed: false,
      location: 'Sala 3',
      participants: ['Ana'],
      notes: 'Levar relatório',
    });
    expect(test.audits[0]).toMatchObject({ status: 'committed', before: null, idsCreated: expect.any(Array) });
  });

  it('cria compromisso sem endTime e sem campos opcionais sem enviar undefined', async () => {
    const test = setup({
      pending: {
        envelope: pendingEnvelope({
          entities: {
            endTime: undefined,
            location: undefined,
            participants: undefined,
            notes: undefined,
          },
        }),
      },
    });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    expect(test.batches).toHaveLength(1);
    const data = test.batches[0][0].data;
    expect(data.endTime).toBeNull();
    expect(hasUndefined(sanitizeForFirestore(data))).toBe(false);
  });

  it('payloads de log de falha de lote não expõem o documento inteiro', () => {
    const payload = batchWriteErrorLog('user-12345678901234', [
      { id: 'c1' },
      { id: 'c2' },
    ], new Error('lote falhou'));

    expect(payload.uid).toBe('user-123…1234');
    expect(payload.documentIds).toEqual(['c1', 'c2']);
    expect(payload.documentCount).toBe(2);
    expect(payload.errorMessage).toBe('lote falhou');
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('title');
    expect(serialized).not.toContain('participants');
    expect(serialized).not.toContain('location');
  });

  it('payload de log de falha de auditoria não expõe a auditoria', () => {
    const payload = auditErrorLog('user-12345678901234', 'act-1', new Error('audit falhou'));

    expect(payload.uid).toBe('user-123…1234');
    expect(payload.actionId).toBe('act-1');
    expect(payload.errorMessage).toBe('audit falhou');
    expect(JSON.stringify(payload)).not.toContain('before');
    expect(JSON.stringify(payload)).not.toContain('after');
    expect(JSON.stringify(payload)).not.toContain('title');
  });

  it('cria série recorrente e preserva seriesId e recurrence', async () => {
    const test = setup({
      pending: {
        envelope: pendingEnvelope({
          entities: {
            recurrence: {
              freq: 'weekly',
              byDay: 2,
              until: { expression: 'última terça-feira de novembro de 2026', resolved: '2026-11-24', confidence: 'high' },
            },
          },
        }),
      },
    });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    expect(result.occurrenceCount).toBe(15);
    expect(result.seriesId).toMatch(/^srv_/);
    expect(test.batches[0][0].data.seriesId).toBe(result.seriesId);
    expect(test.batches[0][0].data.recurrence).toMatchObject({ freq: 'weekly', byDay: 2 });
  });

  it('divide 401 a 800 ocorrências em dois batches de no máximo 400', async () => {
    const test = setup({
      pending: {
        envelope: pendingEnvelope({
          entities: {
            recurrence: {
              freq: 'daily',
              until: { expression: '2028-03-14', resolved: '2028-03-14', confidence: 'high' },
            },
          },
        }),
      },
    });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.occurrenceCount).toBeGreaterThan(400);
    expect(result.occurrenceCount).toBeLessThanOrEqual(MAX_COMMIT_OCCURRENCES);
    expect(test.batches).toHaveLength(2);
    expect(test.batches[0]).toHaveLength(MAX_COMMIT_BATCH_WRITES);
    expect(test.batches[1].length).toBe(result.occurrenceCount - MAX_COMMIT_BATCH_WRITES);
  });

  it('rejeita uma série acima do limite de 800 ocorrências', async () => {
    const test = setup({
      pending: {
        envelope: pendingEnvelope({
          entities: {
            recurrence: {
              freq: 'daily',
              until: { expression: '2030-12-31', resolved: '2030-12-31', confidence: 'high' },
            },
          },
        }),
      },
    });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('limite');
    expect(test.batches).toHaveLength(0);
    expect(test.audits[0]).toMatchObject({ status: 'failed' });
  });

  it('usa IDs determinísticos e retorna o mesmo resultado em retry idempotente', async () => {
    const first = setup();
    const firstResult = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, first.dependencies, NOW);
    const second = setup({
      claim: vi.fn(async () => ({ kind: 'idempotent' as const, result: firstResult })),
    });
    const secondResult = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, second.dependencies, NOW + 1000);

    expect(secondResult.idsCreated).toEqual(firstResult.idsCreated);
    expect(second.batches).toHaveLength(0);
    expect(second.audits).toHaveLength(0);
  });

  it('impede duas confirmações concorrentes quando a segunda claim é rejeitada', async () => {
    let claimed = false;
    const claimPending = vi.fn(async () => {
      if (claimed) return { kind: 'rejected' as const, reason: 'Token já consumido.' };
      claimed = true;
      return { kind: 'claimed' as const, pending: pendingDocument({ status: 'processing' }) };
    });
    const first = setup({ claim: claimPending });
    const second = setup({ claim: claimPending });
    const firstPromise = executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, first.dependencies, NOW);
    const secondPromise = executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, second.dependencies, NOW);
    const outcomes = await Promise.allSettled([firstPromise, secondPromise]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
  });

  it('registra partial e não retorna sucesso falso quando o segundo batch falha', async () => {
    const test = setup({
      failBatchAt: 2,
      pending: {
        envelope: pendingEnvelope({
          entities: {
            recurrence: {
              freq: 'daily',
              until: { expression: '2028-03-14', resolved: '2028-03-14', confidence: 'high' },
            },
          },
        }),
      },
    });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result).toMatchObject({ success: false, status: 'partial', intent: 'create' });
    if (!result.success) {
      expect(result.idsCreated).toEqual(test.batches[0].map((d) => d.id));
      expect(typeof result.error).toBe('string');
    }
    expect(test.batches).toHaveLength(1);
    expect(test.audits[0]).toMatchObject({ status: 'partial', idsCreated: expect.arrayContaining([test.batches[0][0].id]) });
    expect(test.finalized[0]).toMatchObject({ status: 'partial' });
  });

  it('não executa edit nem delete sem alvo gravado', async () => {
    const edit = setup({ pending: { envelope: pendingEnvelope({ intent: 'edit', action: 'edit_commitment' }) } });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, edit.dependencies, NOW))
      .rejects.toThrow('não possui alvo gravado');
    expect(edit.batches).toHaveLength(0);
    expect(edit.dependencies.deleteBatch).not.toHaveBeenCalled();
    expect(edit.dependencies.updateCommitment).not.toHaveBeenCalled();
    expect(edit.audits[0]).toMatchObject({ status: 'failed' });

    const del = setup({ pending: { envelope: deletePendingEnvelope() } });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, del.dependencies, NOW))
      .rejects.toThrow('não possui alvos gravados');
    expect(del.dependencies.deleteBatch).not.toHaveBeenCalled();
    expect(del.audits[0]).toMatchObject({ status: 'failed' });
  });

  it('exclui em lote os alvos gravados na proposta de delete', async () => {
    const targets = [
      { id: 'a1', title: 'Reunião com o coordenador de campo', time: '18:00', dateMs: 0 },
      { id: 'a2', title: 'Reunião com o coordenador de campo', time: '09:00', dateMs: 0 },
    ];
    const test = setup({ pending: { envelope: deletePendingEnvelope(), targets }, existingIds: ['a1', 'a2'] });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    expect(result.intent).toBe('delete');
    expect(result.idsDeleted).toEqual(['a1', 'a2']);
    expect(result.occurrenceCount).toBe(2);
    expect(test.dependencies.writeBatch).not.toHaveBeenCalled();
    expect(test.deleted).toEqual(['a1', 'a2']);
    expect(test.audits[0]).toMatchObject({
      status: 'committed',
      intent: 'delete',
      idsDeleted: ['a1', 'a2'],
      before: [{ id: 'a1' }, { id: 'a2' }],
      after: null,
    });
    expect(test.finalized[0]).toMatchObject({ status: 'committed' });
  });

  it('exclui apenas os alvos que ainda existem (ignora ausentes)', async () => {
    const targets = [
      { id: 'a1', title: 'Reunião', time: null, dateMs: 0 },
      { id: 'gone', title: 'Reunião', time: null, dateMs: 0 },
    ];
    const test = setup({ pending: { envelope: deletePendingEnvelope(), targets }, existingIds: ['a1'] });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    expect(result.idsDeleted).toEqual(['a1']);
    expect(result.occurrenceCount).toBe(1);
    expect(test.deleted).toEqual(['a1']);
  });

  it('falha quando nenhum alvo da exclusão ainda existe', async () => {
    const test = setup({
      pending: { envelope: deletePendingEnvelope(), targets: [{ id: 'gone', title: 'Reunião', dateMs: 0 }] },
      existingIds: [],
    });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('Nenhum dos compromissos alvo ainda existe');
    expect(test.dependencies.deleteBatch).not.toHaveBeenCalled();
    expect(test.audits[0]).toMatchObject({ status: 'failed' });
  });

  it('registra partial quando um batch de exclusão falha', async () => {
    const ids = Array.from({ length: 401 }, (_, i) => `id-${i}`);
    const targets = ids.map((id) => ({ id, title: 'Reunião', dateMs: 0 }));
    const test = setup({ pending: { envelope: deletePendingEnvelope(), targets }, existingIds: ids, failBatchAt: 2 });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result).toMatchObject({ success: false, status: 'partial', intent: 'delete' });
    if (!result.success) {
      expect(result.idsDeleted).toHaveLength(400);
    }
    expect(test.deleted).toHaveLength(400);
    expect(test.audits[0]).toMatchObject({ status: 'partial', idsDeleted: expect.arrayContaining(test.deleted) });
    expect(test.finalized[0]).toMatchObject({ status: 'partial' });
  });

  it('retorna o mesmo resultado em retry idempotente de delete', async () => {
    const targets = [{ id: 'a1', title: 'Reunião', dateMs: 0 }];
    const first = setup({ pending: { envelope: deletePendingEnvelope(), targets }, existingIds: ['a1'] });
    const firstResult = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, first.dependencies, NOW);
    const second = setup({ claim: vi.fn(async () => ({ kind: 'idempotent' as const, result: firstResult })) });
    const secondResult = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, second.dependencies, NOW + 1000);

    expect(secondResult.idsDeleted).toEqual(firstResult.idsDeleted);
    expect(second.dependencies.deleteBatch).not.toHaveBeenCalled();
    expect(second.audits).toHaveLength(0);
  });

  it('grava alarmAt em cada ocorrência quando alarm é true', async () => {
    const test = setup();
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true, alarm: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    const expectedAlarmMs = saoPauloDayRangeMillis(isoToYmd('2026-08-18')).startMs + 17 * 60 * 60000;
    expect(test.batches).toHaveLength(1);
    for (const document of test.batches[0]) {
      expect(document.data.alarmAt).toBeDefined();
      expect((document.data.alarmAt as { toMillis(): number }).toMillis()).toBe(expectedAlarmMs);
    }
  });

  it('não grava alarmAt quando o usuário escolhe apenas anotar', async () => {
    const test = setup();
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    expect(test.batches[0][0].data).not.toHaveProperty('alarmAt');
    expect(test.batches[0][0].data).not.toHaveProperty('reminderMode');
  });

  it('rejeita alarm quando não é booleano', async () => {
    const test = setup();
    await expect(
      executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true, alarm: 'yes' as unknown as boolean }, test.dependencies, NOW),
    ).rejects.toThrow('alarm deve ser booleano');
    expect(test.dependencies.claimPending).not.toHaveBeenCalled();
  });

  it('grava reminderMode e alarmAt para "notificação + alarme"', async () => {
    const test = setup();
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true, reminderMode: 'notification_alarm' }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    const expectedAlarmMs = saoPauloDayRangeMillis(isoToYmd('2026-08-18')).startMs + 17 * 60 * 60000;
    expect(test.batches).toHaveLength(1);
    for (const document of test.batches[0]) {
      expect(document.data.reminderMode).toBe('notification_alarm');
      expect(document.data.alarmAt).toBeDefined();
      expect((document.data.alarmAt as { toMillis(): number }).toMillis()).toBe(expectedAlarmMs);
    }
  });

  it('grava reminderMode notification para "apenas notificação"', async () => {
    const test = setup();
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true, reminderMode: 'notification' }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    for (const document of test.batches[0]) {
      expect(document.data.reminderMode).toBe('notification');
      expect(document.data.alarmAt).toBeDefined();
    }
  });

  it('mantém compatibilidade: alarm true vira notification', async () => {
    const test = setup();
    await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true, alarm: true }, test.dependencies, NOW);

    for (const document of test.batches[0]) {
      expect(document.data.reminderMode).toBe('notification');
      expect(document.data.alarmAt).toBeDefined();
    }
  });

  it('rejeita reminderMode fora do enum', async () => {
    const test = setup();
    await expect(
      executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true, reminderMode: 'sirene' as 'notification' }, test.dependencies, NOW),
    ).rejects.toThrow('reminderMode deve ser "notification" ou "notification_alarm"');
    expect(test.dependencies.claimPending).not.toHaveBeenCalled();
  });

  it('alarme não altera o horário do compromisso no commit', async () => {
    const test = setup();
    await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true, reminderMode: 'notification_alarm' }, test.dependencies, NOW);

    for (const document of test.batches[0]) {
      expect(document.data.time).toBe('17:00');
      expect(document.data.endTime).toBe('18:00');
    }
  });

  it('executa edição e atualiza o compromisso com o estado depois', async () => {
    const test = setup({
      pending: editPending(),
      readCommitment: editCurrentDoc(),
    });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    expect(result.intent).toBe('edit');
    expect(result.idsEdited).toEqual(['c1']);
    expect(result.occurrenceCount).toBe(1);
    expect(test.dependencies.writeBatch).not.toHaveBeenCalled();
    expect(test.dependencies.deleteBatch).not.toHaveBeenCalled();
    expect(test.updated).toHaveLength(1);
    expect(test.updated[0].id).toBe('c1');
    expect(test.updated[0].data).toMatchObject({
      title: 'Reunião com o coordenador',
      time: '19:00',
      endTime: '20:00',
      location: 'Sala 3',
      participants: ['Ana'],
      notes: 'Levar relatório',
    });
    expect(test.audits[0]).toMatchObject({
      status: 'committed',
      intent: 'edit',
      idsEdited: ['c1'],
      before: expect.objectContaining({ id: 'c1' }),
      after: expect.objectContaining({ id: 'c1', time: '19:00' }),
    });
    expect(test.finalized[0]).toMatchObject({ status: 'committed' });
  });

  it('preserva campos protegidos e marca autoria da edição', async () => {
    const test = setup({
      pending: editPending(),
      readCommitment: editCurrentDoc({ seriesId: undefined, createdBy: 'user-1', completed: false, alarmAt: undefined }),
    });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    const data = test.updated[0].data;
    expect(data.createdBy).toBe('user-1');
    expect(data.createdAt).toBeDefined();
    expect(data.updatedBy).toBe('nexus');
    expect(data.updatedByActionId).toContain('act_');
    expect(data.updatedAt).toBeDefined();
  });

  it('falha quando o alvo da edição não existe mais', async () => {
    const test = setup({ pending: editPending(), readCommitment: null });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('O compromisso alvo da edição não existe mais');
    expect(test.dependencies.updateCommitment).not.toHaveBeenCalled();
    expect(test.audits[0]).toMatchObject({ status: 'failed', intent: 'edit', idsEdited: [] });
    expect(test.finalized[0]).toMatchObject({ status: 'failed' });
  });

  it('falha quando o alvo da edição pertence a uma série recorrente', async () => {
    const test = setup({
      pending: editPending(),
      readCommitment: editCurrentDoc({ seriesId: 'srv_abc', recurrence: { freq: 'weekly' } }),
    });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('série recorrente');
    expect(test.dependencies.updateCommitment).not.toHaveBeenCalled();
    expect(test.audits[0]).toMatchObject({ status: 'failed' });
  });

  it('falha em conflito de versão quando o compromisso mudou desde a proposta', async () => {
    const test = setup({
      pending: editPending(),
      readCommitment: editCurrentDoc({ time: '16:00' }),
    });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('alterado por outra sessão desde a proposta');
    expect(test.dependencies.updateCommitment).not.toHaveBeenCalled();
    expect(test.audits[0]).toMatchObject({ status: 'failed' });
  });

  it('falha quando a proposta de edição não possui estado antes/depois gravado', async () => {
    const test = setup({
      pending: editPending({ before: undefined, after: undefined }),
    });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('não possui estado antes/depois gravado');
    expect(test.dependencies.readCommitment).not.toHaveBeenCalled();
    expect(test.dependencies.updateCommitment).not.toHaveBeenCalled();
    expect(test.audits[0]).toMatchObject({ status: 'failed' });
  });

  it('falha quando a proposta de edição não possui alvo gravado', async () => {
    const test = setup({ pending: editPending({ target: undefined }) });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('não possui alvo gravado');
    expect(test.dependencies.readCommitment).not.toHaveBeenCalled();
    expect(test.dependencies.updateCommitment).not.toHaveBeenCalled();
    expect(test.audits[0]).toMatchObject({ status: 'failed' });
  });

  it('registra failed quando updateCommitment falha', async () => {
    const test = setup({
      pending: editPending(),
      readCommitment: editCurrentDoc(),
      failUpdate: true,
    });
    await expect(executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW))
      .rejects.toThrow('update failed');
    expect(test.audits[0]).toMatchObject({ status: 'failed', idsEdited: [] });
    expect(test.finalized[0]).toMatchObject({ status: 'failed' });
  });

  it('retorna o mesmo resultado em retry idempotente de edição', async () => {
    const first = setup({ pending: editPending(), readCommitment: editCurrentDoc() });
    const firstResult = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, first.dependencies, NOW);
    const second = setup({ claim: vi.fn(async () => ({ kind: 'idempotent' as const, result: firstResult })) });
    const secondResult = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, second.dependencies, NOW + 1000);

    expect(secondResult.idsEdited).toEqual(firstResult.idsEdited);
    expect(second.dependencies.updateCommitment).not.toHaveBeenCalled();
    expect(second.audits).toHaveLength(0);
  });

  it('não grava alarmAt na edição', async () => {
    const test = setup({
      pending: editPending(),
      readCommitment: editCurrentDoc(),
    });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true, alarm: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    expect(test.updated[0].data).not.toHaveProperty('alarmAt');
  });

  it('mantém fields removidos quando o depois os apaga explicitamente', async () => {
    const test = setup({
      pending: editPending({
        before: editSnapshot({ location: 'Sala 3' }),
        after: editSnapshot({ startTime: '19:00', endTime: '20:00', location: null, participants: null, notes: null }),
      }),
      readCommitment: editCurrentDoc({ location: 'Sala 3', participants: ['Ana'], notes: 'Levar relatório' }),
    });
    const result = await executeAgendaCommit('user-1', { confirmationToken: 'token-1', confirmed: true }, test.dependencies, NOW);

    expect(result.success).toBe(true);
    expect(test.updated[0].data).toMatchObject({ location: null, participants: null, notes: null });
  });
});

describe('getAllInBatches - leitura em lote (B2)', () => {
  const docRefs = (_uid: string, id: string) => ({ ref: id });
  const snap = (id: string, exists: boolean) => ({
    exists,
    id,
    data: () => ({}),
  });

  it('agrega snapshots preservando a ordem dos ids', async () => {
    const getAll = vi.fn(async (...refs: Array<{ ref: string }>) =>
      refs.map((r) => snap(r.ref, true)),
    );
    const out = await getAllInBatches({ getAll }, docRefs, 'u1', ['a', 'b', 'c']);

    expect(getAll).toHaveBeenCalledTimes(1);
    expect(out.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('divide em chunks de MAX_READ_BATCH_SIZE (800 ids → 2 chamadas)', async () => {
    const getAll = vi.fn(async (...refs: Array<{ ref: string }>) =>
      refs.map((r) => snap(r.ref, true)),
    );
    const ids = Array.from({ length: MAX_READ_BATCH_SIZE * 2 }, (_, i) => `id-${i}`);
    const out = await getAllInBatches({ getAll }, docRefs, 'u1', ids);

    expect(getAll).toHaveBeenCalledTimes(2);
    expect(getAll.mock.calls[0]).toHaveLength(MAX_READ_BATCH_SIZE);
    expect(getAll.mock.calls[1]).toHaveLength(MAX_READ_BATCH_SIZE);
    expect(out).toHaveLength(ids.length);
  });

  it('lista vazia não chama o Firestore', async () => {
    const getAll = vi.fn();
    const out = await getAllInBatches({ getAll }, docRefs, 'u1', []);

    expect(getAll).not.toHaveBeenCalled();
    expect(out).toEqual([]);
  });
});
