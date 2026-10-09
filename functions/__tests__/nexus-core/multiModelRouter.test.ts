import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MultiModelRouter } from '../../nexus-core/MultiModelRouter';

function jsonResponse(content: string, tokens = 10) {
  return {
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { total_tokens: tokens },
    }),
  };
}

describe('MultiModelRouter - fail-fast controlado', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa Groq primeiro e devolve resposta com metadados', async () => {
    const fetchMock = vi.fn(async () => jsonResponse('olá'));
    vi.stubGlobal('fetch', fetchMock);

    const router = MultiModelRouter.getInstance();
    router.updateApiKeys({ groq: 'g-key', openrouter: 'o-key' });
    const res = await router.routeRequest([{ role: 'user', content: 'oi' }]);

    expect(res.success).toBe(true);
    expect(res.provider).toBe('groq');
    expect(res.content).toBe('olá');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('groq.com');
  });

  it('máximo 2 tentativas: fallback OpenRouter após falha do Groq', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('groq.com')) throw new Error('groq down');
      return jsonResponse('via openrouter');
    });
    vi.stubGlobal('fetch', fetchMock);

    const router = MultiModelRouter.getInstance();
    router.updateApiKeys({ groq: 'g-key', openrouter: 'o-key' });
    const res = await router.routeRequest([{ role: 'user', content: 'fallback-' + Date.now() }]);

    expect(res.success).toBe(true);
    expect(res.provider).toBe('openrouter');
  });

  it('contingência sinalizada quando todos falham', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rede'); }));
    const router = MultiModelRouter.getInstance();
    router.updateApiKeys({ groq: 'g-key', openrouter: 'o-key' });
    const res = await router.routeRequest(
      [{ role: 'user', content: 'único-' + Date.now() }],
      undefined,
      { fallbackContext: { userName: 'Lia' } },
    );

    expect(res.success).toBe(true);
    expect(res.isContingency).toBe(true);
    expect(res.content).toContain('Lia');
  });

  it('cache: mesma conversa não refaz HTTP dentro do TTL', async () => {
    const fetchMock = vi.fn(async () => jsonResponse('cacheável'));
    vi.stubGlobal('fetch', fetchMock);
    const router = MultiModelRouter.getInstance();
    router.updateApiKeys({ groq: 'g-key', openrouter: 'o-key' });
    const messages = [{ role: 'user', content: 'cache-' + Date.now() }];

    await router.routeRequest(messages);
    await router.routeRequest(messages);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cache: não compartilha diagnóstico entre usuários ou contextos distintos', async () => {
    const fetchMock = vi.fn(async () => jsonResponse('diagnóstico isolado'));
    vi.stubGlobal('fetch', fetchMock);
    const router = MultiModelRouter.getInstance();
    router.updateApiKeys({ groq: 'g-key', openrouter: 'o-key' });
    const messages = [{ role: 'user', content: 'como está minha situação? ' + Date.now() }];

    await router.routeRequest(messages, 'contexto financeiro da pessoa A', { cacheScope: 'user-a' });
    await router.routeRequest(messages, 'contexto financeiro da pessoa B', { cacheScope: 'user-b' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
