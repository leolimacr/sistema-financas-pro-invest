import { describe, it, expect } from 'vitest';
import { searchTickerCatalog, TICKER_CATALOG, COMMON_BROKERS } from '../tickerCatalog';

describe('tickerCatalog', () => {
  it('1. Possui catálogo com dezenas de ativos e corretoras comuns', () => {
    expect(TICKER_CATALOG.length).toBeGreaterThan(80);
    expect(COMMON_BROKERS).toContain('XP Investimentos');
    expect(COMMON_BROKERS).toContain('BTG Pactual');
    expect(COMMON_BROKERS).toContain('Banco Inter');
  });

  it('2. Retorna lista vazia para busca em branco', () => {
    expect(searchTickerCatalog('')).toEqual([]);
    expect(searchTickerCatalog('   ')).toEqual([]);
  });

  it('3. Encontra ativo por correspondência exata de Ticker', () => {
    const results = searchTickerCatalog('PETR4');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].ticker).toBe('PETR4');
    expect(results[0].name).toContain('Petrobras');
    expect(results[0].market).toBe('B3');
    expect(results[0].currency).toBe('BRL');
  });

  it('4. Encontra ativos por prefixo de Ticker', () => {
    const results = searchTickerCatalog('KN');
    expect(results.length).toBeGreaterThan(1);
    const tickers = results.map((r) => r.ticker);
    expect(tickers).toContain('KNCR11');
  });

  it('5. Encontra ativo por parte do nome (Razão Social)', () => {
    const results = searchTickerCatalog('Itaú');
    expect(results.length).toBeGreaterThan(0);
    const tickers = results.map((r) => r.ticker);
    expect(tickers.some((t) => t.startsWith('ITUB') || t.startsWith('ITSA'))).toBe(true);
  });

  it('6. Respeita o limite máximo de resultados', () => {
    const results = searchTickerCatalog('11', 4);
    expect(results.length).toBeLessThanOrEqual(4);
  });

  it('7. Encontra ativos do mercado internacional e criptoativos', () => {
    const btc = searchTickerCatalog('BTC');
    expect(btc.some((r) => r.ticker === 'BTC' && r.market === 'CRYPTO')).toBe(true);

    const voo = searchTickerCatalog('VOO');
    expect(voo.some((r) => r.ticker === 'VOO' && r.currency === 'USD')).toBe(true);
  });
});
