import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCachedQuotes,
  saveCachedQuotes,
  isCacheFresh,
  QUOTE_CACHE_KEY,
  fetchAwesomeRates,
  fetchBrapiBatch,
  fetchYahooQuote,
  fetchPortfolioQuotes,
} from '../marketQuoteEngine';

describe('marketQuoteEngine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('1. Salva e recupera cotações do cache local corretamente', () => {
    expect(getCachedQuotes()).toBeNull();
    expect(isCacheFresh()).toBe(false);

    saveCachedQuotes({
      PETR4: {
        ticker: 'PETR4',
        price: 38.5,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        quoteStatus: 'UP_TO_DATE',
        source: 'BRAPI',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });

    const cached = getCachedQuotes();
    expect(cached).not.toBeNull();
    expect(cached?.PETR4.price).toBe(38.5);
    expect(isCacheFresh()).toBe(true);
  });

  it('2. fetchAwesomeRates busca câmbio e cripto com sucesso', async () => {
    const mockData = {
      USDBRL: { bid: '5.55', pctChange: '0.25' },
      EURBRL: { bid: '6.10', pctChange: '-0.10' },
      BTCBRL: { bid: '350000', pctChange: '1.5' },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const rates = await fetchAwesomeRates();
    expect(rates.USD.price).toBe(5.55);
    expect(rates.EUR.price).toBe(6.1);
    expect(rates.BTC.price).toBe(350000);
  });

  it('3. fetchBrapiBatch faz parsing correto da resposta de múltiplos ativos', async () => {
    const mockBrapi = {
      results: [
        { symbol: 'PETR4', regularMarketPrice: 38.2, regularMarketChangePercent: 0.8 },
        { symbol: 'VALE3', regularMarketPrice: 62.0, regularMarketChangePercent: -0.4 },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockBrapi,
    });

    const quotes = await fetchBrapiBatch(['PETR4', 'VALE3']);
    expect(quotes.PETR4.price).toBe(38.2);
    expect(quotes.VALE3.price).toBe(62.0);
  });

  it('4. fetchPortfolioQuotes utiliza fallback para Yahoo quando Brapi falha', async () => {
    // 1ª chamada: AwesomeAPI (sucesso)
    // 2ª chamada: Brapi (retorna vazio para simular falha)
    // 3ª chamada: Yahoo Finance (sucesso no fallback)
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ USDBRL: { bid: '5.60', pctChange: '0' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chart: {
            result: [{ meta: { regularMarketPrice: 39.1, previousClose: 38.5 } }],
          },
        }),
      });

    const quotes = await fetchPortfolioQuotes(
      [{ ticker: 'PETR4', market: 'B3', currency: 'BRL' }],
      true
    );

    expect(quotes.PETR4).toBeDefined();
    expect(quotes.PETR4.price).toBe(39.1);
    expect(quotes.PETR4.source).toBe('YAHOO_FINANCE');
    expect(quotes.PETR4.quoteStatus).toBe('UP_TO_DATE');
  });

  it('5. fetchPortfolioQuotes sinaliza status STALE quando rede falha mas há cache', async () => {
    // Popula cache
    saveCachedQuotes({
      KNCR11: {
        ticker: 'KNCR11',
        price: 104.0,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        quoteStatus: 'UP_TO_DATE',
        source: 'BRAPI',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });

    // Simula falha total de rede
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const quotes = await fetchPortfolioQuotes(
      [{ ticker: 'KNCR11', market: 'B3', currency: 'BRL' }],
      true
    );

    expect(quotes.KNCR11).toBeDefined();
    expect(quotes.KNCR11.price).toBe(104.0);
    expect(quotes.KNCR11.quoteStatus).toBe('STALE');
  });

  it('6. fetchYahooQuote extrai cotação corretamente a partir de resposta com envelope (AllOrigins Get)', async () => {
    const rawYahooJson = JSON.stringify({
      chart: {
        result: [{ meta: { regularMarketPrice: 15.14, chartPreviousClose: 14.9 } }],
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ contents: rawYahooJson }),
    });

    const quote = await fetchYahooQuote('BRBI11', true);
    expect(quote).not.toBeNull();
    expect(quote?.price).toBe(15.14);
    expect(quote?.changePercent).toBeCloseTo(1.61, 1);
  });

  it('7. fetchYahooQuote faz fallback transparente se o primeiro proxy falhar com erro HTTP', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          contents: JSON.stringify({
            chart: {
              result: [{ meta: { regularMarketPrice: 22.5 } }],
            },
          }),
        }),
      });

    const quote = await fetchYahooQuote('PETR4', true);
    expect(quote).not.toBeNull();
    expect(quote?.price).toBe(22.5);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
