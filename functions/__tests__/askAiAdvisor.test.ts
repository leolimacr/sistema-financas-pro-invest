import { describe, expect, it, vi } from 'vitest';
import {
  checkNexusQuota,
  checkTavilyQuota,
  getUserPlan,
  nexusQuotaDay,
  nexusQuotaForPlan,
} from '../askAiAdvisor';
import { ACTION_REGISTRY } from '../nexus-core/action-registry';
import {
  MAX_GOALS_LISTED,
  MAX_PROMPT_SEGMENT_CHARS,
  truncatePromptSegment,
  txCapsByPlan,
} from '../nexus-core/data-integrator';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
  Timestamp: { now: () => ({ toMillis: () => Date.now() }) },
}));

function userDb(subscription: unknown) {
  return {
    collection: (_path: string) => ({
      doc: (_id: string) => ({
        get: async () => ({ exists: true, data: () => ({ subscription }) }),
      }),
    }),
  };
}

async function withFirestoreMock(db: unknown, fn: () => Promise<void>) {
  const admin = await import('firebase-admin/firestore');
  vi.mocked(admin.getFirestore).mockReturnValue(db as never);
  try {
    await fn();
  } finally {
    vi.mocked(admin.getFirestore).mockReset();
  }
}

describe('askAiAdvisor - cota Nexus server-side (N3)', () => {
  it('permite abaixo da cota e registra o uso', async () => {
    const set = vi.fn(async () => undefined);
    const db = {
      collection: (_p: string) => ({
        doc: (_i: string) => ({
          get: async () => ({ data: () => ({ count: 2 }) }),
          set,
        }),
      }),
    };
    const res = await checkNexusQuota(db, 'u1', 'free', '2026-09-07');
    expect(res).toMatchObject({ allowed: true, used: 3, quota: 5 });
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('nega no teto da cota (free = 5/dia)', async () => {
    const set = vi.fn(async () => undefined);
    const db = {
      collection: (_p: string) => ({
        doc: (_i: string) => ({
          get: async () => ({ data: () => ({ count: 5 }) }),
          set,
        }),
      }),
    };
    const res = await checkNexusQuota(db, 'u1', 'free', '2026-09-07');
    expect(res).toMatchObject({ allowed: false, used: 5, quota: 5 });
    expect(set).not.toHaveBeenCalled();
  });

  it('cotas por plano (interinas, política na Etapa 7)', () => {
    expect(nexusQuotaForPlan('free')).toBe(5);
    expect(nexusQuotaForPlan('pro')).toBe(100);
    expect(nexusQuotaForPlan('premium')).toBe(500);
    expect(nexusQuotaForPlan('premium_anual')).toBe(1000);
    expect(nexusQuotaForPlan(undefined)).toBe(5);
    expect(nexusQuotaForPlan('desconhecido')).toBe(5);
  });

  it('dia da cota em America/Sao_Paulo (YYYY-MM-DD)', () => {
    expect(nexusQuotaDay(new Date('2026-09-07T02:00:00Z'))).toBe('2026-09-06');
    expect(nexusQuotaDay(new Date('2026-09-07T12:00:00Z'))).toBe('2026-09-07');
  });
});

describe('askAiAdvisor - cota Tavily persistida (N4)', () => {
  it('permite e incrementa abaixo do teto mensal', async () => {
    const set = vi.fn(async () => undefined);
    const db = {
      collection: (_p: string) => ({
        doc: (_i: string) => ({
          get: async () => ({ data: () => ({ count: 999 }) }),
          set,
        }),
      }),
    };
    const ok = await checkTavilyQuota(db as never, new Date('2026-09-07T12:00:00Z'));
    expect(ok).toBe(true);
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('nega no teto mensal sem escrever', async () => {
    const set = vi.fn(async () => undefined);
    const db = {
      collection: (_p: string) => ({
        doc: (_i: string) => ({
          get: async () => ({ data: () => ({ count: 1000 }) }),
          set,
        }),
      }),
    };
    expect(await checkTavilyQuota(db as never)).toBe(false);
    expect(set).not.toHaveBeenCalled();
  });
});

describe('askAiAdvisor - resolução de plano legado (N10)', () => {
  it('usa subscription.plan quando ativo', async () => {
    await withFirestoreMock(userDb({ plan: 'pro', status: 'active' }), async () => {
      expect(await getUserPlan('u1')).toBe('pro');
    });
  });

  it('usa planId quando plan ausente e assinatura ativa', async () => {
    await withFirestoreMock(userDb({ planId: 'premium', status: 'trialing' }), async () => {
      expect(await getUserPlan('u1')).toBe('premium');
    });
  });

  it('ignora plano com status inativo explícito', async () => {
    await withFirestoreMock(userDb({ plan: 'pro', status: 'canceled' }), async () => {
      expect(await getUserPlan('u1')).toBeUndefined();
    });
  });

  it('free vale mesmo sem status', async () => {
    await withFirestoreMock(userDb({ plan: 'free' }), async () => {
      expect(await getUserPlan('u1')).toBe('free');
    });
  });
});

describe('data-integrator - tetos de leitura e prompt (N6)', () => {
  it('caps por plano documentados', () => {
    expect(txCapsByPlan('free')).toEqual({ days: 3, max: 50 });
    expect(txCapsByPlan('pro')).toEqual({ days: 30, max: 150 });
    expect(txCapsByPlan('premium')).toEqual({ days: 90, max: 300 });
    expect(txCapsByPlan('premium_anual')).toEqual({ days: 9999, max: 500 });
    expect(txCapsByPlan(undefined)).toEqual({ days: 30, max: 150 });
  });

  it('truncatePromptSegment corta com marcador e preserva texto curto', () => {
    expect(truncatePromptSegment('curto')).toBe('curto');
    const long = 'x'.repeat(MAX_PROMPT_SEGMENT_CHARS + 10);
    const out = truncatePromptSegment(long);
    expect(out.startsWith('x'.repeat(MAX_PROMPT_SEGMENT_CHARS))).toBe(true);
    expect(out).toContain('truncado');
  });

  it('teto de metas listadas', () => {
    expect(MAX_GOALS_LISTED).toBe(20);
  });
});

describe('action-registry - rotas resolvíveis no app (N8)', () => {
  // Conjunto extraído de AppRoutes (`/app/*`); Etapa 6 é dona da navegação —
  // este teste só garante que o catálogo nunca aponte para rota inexistente.
  const REAL_ROUTES = new Set([
    '/app/central',
    '/app/controla',
    '/app/ia',
    '/app/explorar',
    '/app/agenda',
    '/app/mais',
    '/app/mais/pricing',
    '/app/investimentos',
    '/app/passivos',
    '/app/minhas-dividas',
    '/app/metas',
    '/app/ferramentas/fire',
    '/app/ferramentas/juros',
    '/app/ferramentas/inflacao',
    '/app/ferramentas/alugar',
    '/app/ferramentas/dividas',
    '/app/ferramentas/dividendos',
    '/app/ferramentas/compra-avista-parcelado',
  ]);

  it('toda rota do catálogo existe no roteador', () => {
    const entries = Object.values(ACTION_REGISTRY);
    expect(entries.length).toBeGreaterThan(0);
    for (const action of entries) {
      expect(REAL_ROUTES.has(action.route), `rota inexistente: ${action.route}`).toBe(true);
    }
  });

  it('NAV_DEBTS aponta para minhas-dívidas', () => {
    expect(ACTION_REGISTRY['NAV_DEBTS'].route).toBe('/app/minhas-dividas');
  });
});
