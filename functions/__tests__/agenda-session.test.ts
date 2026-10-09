import { describe, expect, it } from 'vitest';
import { getFirestore } from 'firebase-admin/firestore';
import {
  SESSION_TTL_MS,
  readSessionContext,
  writeSessionContext,
  type AgendaSessionContext,
} from '../nexus-core/agenda-session';

function baseContext(overrides: Partial<AgendaSessionContext> = {}): AgendaSessionContext {
  const createdAtMs = Date.now();
  return {
    sessionId: 'sess-1',
    uid: 'user-1',
    intent: 'create',
    missing: ['title'],
    createdAtMs,
    expiresAtMs: createdAtMs + SESSION_TTL_MS,
    ...overrides,
  };
}

function createFakeSessionStore(initial: AgendaSessionContext | Record<string, unknown> | null) {
  let data = initial;
  const deletedPaths: string[] = [];
  const sets: Array<{ path: string; document: Record<string, unknown> }> = [];
  const collections: string[] = [];
  const db = {
    collection: (path: string) => {
      collections.push(path);
      return {
        doc: (id: string) => ({
          get: async () => ({ exists: data !== null, data: () => data }),
          delete: async () => {
            deletedPaths.push(`${path}/${id}`);
            data = null;
          },
          set: async (document: Record<string, unknown>) => {
            sets.push({ path: `${path}/${id}`, document });
            data = document;
          },
        }),
      };
    },
  };
  return { db: db as unknown as ReturnType<typeof getFirestore>, deletedPaths, sets, collections };
}

describe('agenda-session — expiração ativa', () => {
  it('retorna o contexto válido dentro da validade (Date.now() <= expiresAtMs)', async () => {
    const { db } = createFakeSessionStore(baseContext());
    const context = await readSessionContext(db, 'user-1', 'sess-1');

    expect(context).not.toBeNull();
    expect(context?.sessionId).toBe('sess-1');
  });

  it('trata como nulo e apaga o documento quando expiresAtMs já passou, mesmo com o doc existente', async () => {
    const { db, deletedPaths } = createFakeSessionStore(
      baseContext({ expiresAtMs: Date.now() - 1000 }),
    );
    const context = await readSessionContext(db, 'user-1', 'sess-1');

    expect(context).toBeNull();
    expect(deletedPaths).toContain('users/user-1/agenda/_nexus/sessions/sess-1');
  });

  it('trata como nulo documento legado sem expiresAtMs mais antigo que o TTL (fallback createdAtMs)', async () => {
    const { db, deletedPaths } = createFakeSessionStore({
      ...baseContext(),
      expiresAtMs: undefined,
      createdAtMs: Date.now() - 2 * SESSION_TTL_MS,
    });
    const context = await readSessionContext(db, 'user-1', 'sess-1');

    expect(context).toBeNull();
    expect(deletedPaths).toHaveLength(1);
  });

  it('mantém documento legado dentro do TTL mesmo sem expiresAtMs', async () => {
    const { db } = createFakeSessionStore({
      ...baseContext(),
      expiresAtMs: undefined,
      createdAtMs: Date.now() - SESSION_TTL_MS / 2,
    });
    const context = await readSessionContext(db, 'user-1', 'sess-1');

    expect(context).not.toBeNull();
  });

  it('retorna nulo quando o documento não existe', async () => {
    const { db } = createFakeSessionStore(null);
    const context = await readSessionContext(db, 'user-1', 'sess-ausente');

    expect(context).toBeNull();
  });

  it('grava expiresAtMs no futuro em cada escrita', async () => {
    const { db, sets } = createFakeSessionStore(null);
    await writeSessionContext(db, baseContext());

    expect(sets).toHaveLength(1);
    const stored = sets[0].document as Record<string, unknown>;
    expect(Number(stored.expiresAtMs)).toBeGreaterThan(Date.now());
  });

  it('usa o caminho de coleção users/{uid}/agenda/_nexus/sessions (5 segmentos ímpares) em leitura e escrita', async () => {
    const { db, collections } = createFakeSessionStore(baseContext());
    await readSessionContext(db, 'user-1', 'sess-1');
    await writeSessionContext(db, baseContext());

    expect(collections.length).toBe(2);
    for (const path of collections) {
      expect(path).toBe('users/user-1/agenda/_nexus/sessions');
      const segments = path.split('/');
      expect(segments.length).toBe(5);
      expect(segments.length % 2).toBe(1);
    }
  });
});