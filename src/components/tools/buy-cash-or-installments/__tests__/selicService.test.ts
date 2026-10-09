import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchCurrentSelicRate, FALLBACK_SELIC_RATE } from '../selicService';

describe('selicService (Resiliência & Fallback Silencioso)', () => {
  const SELIC_CACHE_KEY = 'fpi_cached_selic_rate';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('retorna a taxa da API do Bacen e grava no cache local quando a resposta é válida', async () => {
    const mockResponse = [
      { data: '01/03/2026', valor: '10,75' },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const rate = await fetchCurrentSelicRate();
    expect(rate).toBe(10.75);

    const cached = localStorage.getItem(SELIC_CACHE_KEY);
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached!);
    expect(parsed.rate).toBe(10.75);
  });

  it('retorna o valor em cache local quando a API do Bacen falha (status 500)', async () => {
    localStorage.setItem(
      SELIC_CACHE_KEY,
      JSON.stringify({ rate: 11.0, timestamp: Date.now() })
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const rate = await fetchCurrentSelicRate();
    expect(rate).toBe(11.0);
  });

  it('retorna o valor em cache local quando ocorre falha de rede (Network Error)', async () => {
    localStorage.setItem(
      SELIC_CACHE_KEY,
      JSON.stringify({ rate: 10.5, timestamp: Date.now() })
    );

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

    const rate = await fetchCurrentSelicRate();
    expect(rate).toBe(10.5);
  });

  it('retorna o fallback Copom padrão (10.75) sem lançar erro quando a API falha e não há cache', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

    const rate = await fetchCurrentSelicRate();
    expect(rate).toBe(FALLBACK_SELIC_RATE);
    expect(rate).toBe(10.75);
  });
});
