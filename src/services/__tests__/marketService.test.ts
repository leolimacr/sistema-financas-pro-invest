import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMarketQuotes } from '../marketService';
import type { MarketQuote } from '../../types';

describe('marketService (Resiliência & Fallback de Cache)', () => {
  const CACHE_KEY = 'finpro_market_cache';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('retorna dados do cache se dentro da validade (30s) e forceRefresh=false', async () => {
    const mockQuotes: MarketQuote[] = [
      {
        symbol: 'USD',
        name: 'Dólar',
        price: 5.42,
        changePercent: 0.15,
        category: 'currency',
        timestamp: Date.now(),
        simulated: false,
      },
    ];

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data: { quotes: mockQuotes, isRateLimited: false },
      })
    );

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await fetchMarketQuotes(false);

    expect(res.quotes).toHaveLength(1);
    expect(res.quotes[0].symbol).toBe('USD');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('preserva cotações de moedas/criptos do cache se AwesomeAPI falhar na atualização', async () => {
    const cachedQuotes: MarketQuote[] = [
      {
        symbol: 'USD',
        name: 'Dólar',
        price: 5.4,
        changePercent: 0.1,
        category: 'currency',
        timestamp: Date.now() - 40_000,
        simulated: false,
      },
      {
        symbol: 'BTC/BRL',
        name: 'Bitcoin',
        price: 360000,
        changePercent: -1.2,
        category: 'crypto',
        timestamp: Date.now() - 40_000,
        simulated: false,
      },
    ];

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now() - 40_000, // expirado > 30s
        data: { quotes: cachedQuotes, isRateLimited: false },
      })
    );

    // Mock fetch: AwesomeAPI falha (status 500), backend mock retorna vazio
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('awesomeapi')) {
        return { ok: false, status: 500 } as Response;
      }
      return {
        ok: true,
        json: async () => ({ indices: [], stocks: [] }),
      } as Response;
    });

    const res = await fetchMarketQuotes(true);

    // Deve ter preservado USD e BTC do cache anterior
    const symbols = res.quotes.map((q) => q.symbol);
    expect(symbols).toContain('USD');
    expect(symbols).toContain('BTC/BRL');
  });

  it('retorna o snapshot anterior do cache se todas as APIs falharem', async () => {
    const cachedQuotes: MarketQuote[] = [
      {
        symbol: 'USD',
        name: 'Dólar',
        price: 5.4,
        changePercent: 0.1,
        category: 'currency',
        timestamp: Date.now() - 60_000,
        simulated: false,
      },
    ];

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now() - 60_000,
        data: { quotes: cachedQuotes, isRateLimited: false },
      })
    );

    // Rede 100% offline
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

    const res = await fetchMarketQuotes(true);

    expect(res.quotes).toBeDefined();
    expect(res.quotes.length).toBeGreaterThan(0);
    expect(res.quotes[0].symbol).toBe('USD');
  });
});
