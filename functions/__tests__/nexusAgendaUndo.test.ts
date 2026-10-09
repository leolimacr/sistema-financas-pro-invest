import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  executeAgendaUndo,
  requireUndoAuth,
  type UndoDependencies,
} from '../nexusAgendaUndo';

const NOW = new Date('2026-08-12T15:00:00.000Z').getTime();

function setup(options: {
  audit?: Record<string, unknown>;
  owned?: Array<{ id: string; data: Record<string, unknown> }>;
  failDelete?: boolean;
  failDeleteAtBatch?: number;
  claim?: UndoDependencies['claimAudit'];
} = {}) {
  const deleted: Array<Array<{ id: string; data: Record<string, unknown> }>> = [];
  const finalized: Array<Record<string, unknown>> = [];
  let claimed = false;
  let batchIndex = 0;
  const defaultClaim: UndoDependencies['claimAudit'] = vi.fn(async () => {
    if (claimed) return { kind: 'rejected' as const, reason: 'A ação já foi desfeita.' };
    claimed = true;
    return {
      kind: 'claimed' as const,
      audit: {
        actionId: 'act-1',
        uid: 'user-1',
        token: 'token-1',
        status: 'undo_processing',
        createdAtMs: NOW - 1000,
        before: null,
        idsCreated: ['c-1'],
        ...options.audit,
      },
    };
  });
  const dependencies: UndoDependencies = {
    claimAudit: options.claim ?? defaultClaim,
    readOwnedDocuments: vi.fn(async () => options.owned ?? [{
      id: 'c-1',
      data: { createdBy: 'nexus', createdByActionId: 'act-1', createdByToken: 'token-1' },
    }]),
    deleteBatch: vi.fn(async (_uid, documents) => {
      batchIndex += 1;
      if (options.failDelete) throw new Error('delete failed');
      if (options.failDeleteAtBatch === batchIndex) throw new Error('delete failed');
      deleted.push(documents);
    }),
    finalizeAudit: vi.fn(async (_uid, _actionId, patch) => {
      finalized.push(patch);
    }),
  };
  return { dependencies, deleted, finalized };
}

describe('nexusAgendaUndo', () => {
  it('rejeita usuário não autenticado', () => {
    expect(() => requireUndoAuth({ auth: null })).toThrow('Login necessário');
    expect(() => requireUndoAuth({ auth: {} })).toThrow('Login necessário');
  });

  it('rejeita actionId inexistente', async () => {
    const test = setup({ claim: vi.fn(async () => ({ kind: 'rejected' as const, reason: 'Auditoria inexistente.' })) });
    await expect(executeAgendaUndo('user-1', { actionId: 'missing' }, test.dependencies, NOW)).rejects.toThrow('inexistente');
  });

  it('rejeita auditoria de outro usuário', async () => {
    const test = setup({ claim: vi.fn(async () => ({ kind: 'rejected' as const, reason: 'A auditoria não pertence ao usuário autenticado.' })) });
    await expect(executeAgendaUndo('user-2', { actionId: 'act-1' }, test.dependencies, NOW)).rejects.toThrow('não pertence');
  });

  it('rejeita auditoria expirada', async () => {
    const test = setup({ claim: vi.fn(async () => ({ kind: 'rejected' as const, reason: 'O prazo para desfazer expirou.' })) });
    await expect(executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW)).rejects.toThrow('expirou');
  });

  it('rejeita ação já desfeita', async () => {
    const test = setup({ claim: vi.fn(async () => ({ kind: 'rejected' as const, reason: 'A ação já foi desfeita.' })) });
    await expect(executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW)).rejects.toThrow('já foi desfeita');
  });

  it('desfaz criação única e atualiza auditoria', async () => {
    const test = setup();
    const result = await executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW);
    expect(result).toMatchObject({ success: true, actionId: 'act-1', status: 'undone', idsRemoved: ['c-1'] });
    expect(test.deleted).toHaveLength(1);
    expect(test.finalized[0]).toMatchObject({ status: 'undone', idsRemoved: ['c-1'], undoneAt: expect.anything() });
  });

  it('não oferece undo para edição (auditoria com before preenchido)', async () => {
    const test = setup({ audit: { intent: 'edit', before: { id: 'c-1', title: 'Reunião' }, idsCreated: [] } });
    await expect(executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW)).rejects.toThrow('restauração');
    expect(test.deleted).toHaveLength(0);
    expect(test.finalized).toHaveLength(0);
  });

  it('desfaz delete normalmente (auditoria com before nulo)', async () => {
    const test = setup({ audit: { intent: 'delete', before: null, idsCreated: [] } });
    const result = await executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW);
    expect(result).toMatchObject({ success: true, status: 'undone' });
  });

  it('desfaz série recorrente usando IDs da auditoria', async () => {
    const ids = Array.from({ length: 15 }, (_, index) => `c-${index}`);
    const test = setup({
      audit: { idsCreated: ids, seriesId: 'srv-1' },
      owned: ids.map((id) => ({ id, data: { createdBy: 'nexus', createdByActionId: 'act-1', createdByToken: 'token-1' } })),
    });
    const result = await executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW);
    expect(result.idsRemoved).toEqual(ids);
    expect(test.deleted[0].map((document) => document.id)).toEqual(ids);
  });

  it('não usa IDs enviados pelo frontend: somente IDs da auditoria chegam ao reader', async () => {
    const readOwnedDocuments = vi.fn(async () => []);
    const test = setup({
      audit: { idsCreated: ['audited-id'] },
      owned: [],
    });
    test.dependencies.readOwnedDocuments = readOwnedDocuments;
    await executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW);
    expect(readOwnedDocuments).toHaveBeenCalledWith('user-1', ['audited-id'], 'act-1', 'token-1');
  });

  it('remove somente documentos marcados como pertencentes à ação', async () => {
    const test = setup({ owned: [{ id: 'owned', data: { createdBy: 'nexus', createdByActionId: 'act-1', createdByToken: 'token-1' } }] });
    await executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW);
    expect(test.deleted[0].map((document) => document.id)).toEqual(['owned']);
  });

  it('registra falha durante undo sem informar sucesso', async () => {
    const test = setup({ failDelete: true });
    await expect(executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW)).rejects.toThrow('desfazer');
    expect(test.finalized[0]).toMatchObject({ status: 'failed', undoError: 'delete failed' });
  });

  it('retorna partial estruturado quando o segundo batch falha (B3)', async () => {
    const ids = Array.from({ length: 401 }, (_, index) => `c-${index}`);
    const test = setup({
      audit: { idsCreated: ids },
      owned: ids.map((id) => ({ id, data: { createdBy: 'nexus', createdByActionId: 'act-1', createdByToken: 'token-1' } })),
      failDeleteAtBatch: 2,
    });
    const result = await executeAgendaUndo('user-1', { actionId: 'act-1' }, test.dependencies, NOW);

    expect(result).toMatchObject({ success: false, status: 'partial', actionId: 'act-1' });
    if (!result.success) {
      expect(result.idsRemoved).toHaveLength(400);
      expect(typeof result.error).toBe('string');
    }
    expect(test.finalized[0]).toMatchObject({ status: 'partial' });
  });

  it('impede dois undos simultâneos após claim atômico', async () => {
    let claimed = false;
    const claimAudit: UndoDependencies['claimAudit'] = vi.fn(async () => {
      if (claimed) return { kind: 'rejected' as const, reason: 'A ação já foi desfeita.' };
      claimed = true;
      return { kind: 'claimed' as const, audit: { actionId: 'act-1', uid: 'user-1', token: 'token-1', status: 'undo_processing', createdAtMs: NOW, before: null, idsCreated: ['c-1'] } };
    });
    const first = setup({ claim: claimAudit });
    const second = setup({ claim: claimAudit });
    const outcomes = await Promise.allSettled([
      executeAgendaUndo('user-1', { actionId: 'act-1' }, first.dependencies, NOW),
      executeAgendaUndo('user-1', { actionId: 'act-1' }, second.dependencies, NOW),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
  });

  it('protege contra write direto em _nexus e mantém os três exports', () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    expect(rules).toContain('match /users/{userId}/agenda/_nexus/{document=**}');
    expect(rules).toContain('allow write: if false;');
    const index = readFileSync('functions/index.ts', 'utf8');
    expect(index).toContain("export { nexusAgendaInterpret } from './nexusAgendaInterpret';");
    expect(index).toContain("export { nexusAgendaCommit } from './nexusAgendaCommit';");
    expect(index).toContain("export { nexusAgendaUndo } from './nexusAgendaUndo';");
  });
});
