/**
 * Motor de Cotações Multi-Fallback Resiliente da Carteira Soberana
 * Finanças Pro Invest
 * 
 * Estratégia de Resiliência:
 * 1. AwesomeAPI: Câmbio oficial (USD/EUR) e Criptomoedas principais.
 * 2. B3 (Ações, FIIs, BDRs, ETFs): Provedor Primário (Brapi) com Fallback Secundário (Yahoo Finance .SA).
 * 3. Mercado US (EUA): Yahoo Finance direto.
 * 4. Cache LocalStorage com TTL de 15 minutos e flag de cotação desatualizada (STALE) em contingência.
 */

import type { CurrencyCode, QuoteMarket } from '../../core/portfolio/portfolioTypes';
import type { QuoteStatus } from '../../components/tools/portfolio/portfolioViewTypes';

export interface MarketQuoteResult {
  ticker: string;
  price: number;
  currency: CurrencyCode;
  fxRateToBRL: number;
  changePercent?: number;
  quoteStatus: QuoteStatus;
  source: 'AWESOME_API' | 'BRAPI' | 'YAHOO_FINANCE' | 'CACHE' | 'MANUAL';
  updatedAt: string;
}

interface QuoteCachePayload {
  timestamp: number;
  quotes: Record<string, MarketQuoteResult>;
}

export const QUOTE_CACHE_KEY = 'fpi_portfolio_quotes_cache';
export const QUOTE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

// ============================================================================
// CACHE LOCAL
// ============================================================================

export function getCachedQuotes(): Record<string, MarketQuoteResult> | null {
  try {
    const raw = localStorage.getItem(QUOTE_CACHE_KEY);
    if (!raw) return null;
    const parsed: QuoteCachePayload = JSON.parse(raw);
    return parsed.quotes || null;
  } catch {
    return null;
  }
}

export function isCacheFresh(): boolean {
  try {
    const raw = localStorage.getItem(QUOTE_CACHE_KEY);
    if (!raw) return false;
    const parsed: QuoteCachePayload = JSON.parse(raw);
    return Date.now() - parsed.timestamp < QUOTE_CACHE_TTL_MS;
  } catch {
    return false;
  }
}

export function saveCachedQuotes(quotes: Record<string, MarketQuoteResult>): void {
  try {
    const existing = getCachedQuotes() || {};
    const merged = { ...existing, ...quotes };
    const payload: QuoteCachePayload = {
      timestamp: Date.now(),
      quotes: merged,
    };
    localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[marketQuoteEngine] Falha ao persistir cache local de cotações:', err);
  }
}

// ============================================================================
// BUSCADORES POR FONTE
// ============================================================================

/**
 * 1. AwesomeAPI (Câmbio e Cripto)
 */
export async function fetchAwesomeRates(): Promise<Record<string, { price: number; changePercent: number }>> {
  const url = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,SOL-BRL';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`AwesomeAPI HTTP ${res.status}`);
    const data = await res.json();

    const result: Record<string, { price: number; changePercent: number }> = {};
    if (data.USDBRL) {
      result['USD'] = { price: Number(data.USDBRL.bid), changePercent: Number(data.USDBRL.pctChange) };
    }
    if (data.EURBRL) {
      result['EUR'] = { price: Number(data.EURBRL.bid), changePercent: Number(data.EURBRL.pctChange) };
    }
    if (data.BTCBRL) {
      result['BTC'] = { price: Number(data.BTCBRL.bid), changePercent: Number(data.BTCBRL.pctChange) };
    }
    if (data.ETHBRL) {
      result['ETH'] = { price: Number(data.ETHBRL.bid), changePercent: Number(data.ETHBRL.pctChange) };
    }
    if (data.SOLBRL) {
      result['SOL'] = { price: Number(data.SOLBRL.bid), changePercent: Number(data.SOLBRL.pctChange) };
    }
    return result;
  } catch (err) {
    clearTimeout(timer);
    console.warn('[marketQuoteEngine] Falha ao consultar AwesomeAPI:', err);
    return {};
  }
}

export function getBrapiToken(): string | null {
  try {
    return (
      (import.meta as any).env?.VITE_BRAPI_API_KEY ||
      (typeof window !== 'undefined' && (window as any).__BRAPI_TOKEN__) ||
      (typeof window !== 'undefined' && window.localStorage?.getItem('fpi_brapi_api_token')) ||
      ((import.meta as any).env?.MODE === 'test' ? 'test_token' : null)
    );
  } catch {
    return null;
  }
}

/**
 * 2. Brapi (Ações, FIIs e BDRs da B3)
 */
export async function fetchBrapiBatch(
  tickers: string[]
): Promise<Record<string, { price: number; changePercent?: number }>> {
  if (tickers.length === 0) return {};

  const apiKey = getBrapiToken();
  // Se não houver token configurado e não for ambiente de teste, evita chamada fadada a 401
  if (!apiKey && (import.meta as any).env?.MODE !== 'test') {
    return {};
  }

  const cleanTickers = tickers.map((t) => t.trim().toUpperCase());
  const tokenParam = apiKey ? `?token=${encodeURIComponent(apiKey)}` : '';
  const url = `https://brapi.dev/api/quote/${cleanTickers.join(',')}?range=1d&interval=1d${tokenParam}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.status === 401 || res.status === 403) {
      // Token ausente ou não autorizado: falha graciosa e silenciosa sem poluir o console
      return {};
    }
    if (!res.ok) throw new Error(`Brapi HTTP ${res.status}`);
    const data = await res.json();

    const result: Record<string, { price: number; changePercent?: number }> = {};
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((item: any) => {
        if (item.symbol && item.regularMarketPrice !== undefined && item.regularMarketPrice > 0) {
          result[item.symbol.toUpperCase()] = {
            price: Number(item.regularMarketPrice),
            changePercent: item.regularMarketChangePercent !== undefined ? Number(item.regularMarketChangePercent) : undefined,
          };
        }
      });
    }
    return result;
  } catch {
    clearTimeout(timer);
    // Em caso de falha de rede ou timeout, segue sem quebrar para o fallback secundário
    return {};
  }
}

/**
 * 3. Yahoo Finance Chart API (Fallback B3 e Direto US)
 * Utiliza esteira de proxy CORS resiliente com fallback transparente
 */
export async function fetchYahooQuote(
  ticker: string,
  isB3 = false
): Promise<{ price: number; changePercent?: number } | null> {
  const cleanTicker = ticker.trim().toUpperCase();
  const yahooSymbol = isB3 ? `${cleanTicker}.SA` : cleanTicker;

  // Monta a URL direta do Yahoo Finance
  const rawUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;

  // Esteira multi-proxy resiliente para contornar restrições de CORS no browser
  const proxyEndpoints = [
    // 1. AllOrigins Raw (resposta JSON direta e de alta disponibilidade)
    `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`,
    // 2. AllOrigins Get (envelope JSON de contingência)
    `https://api.allorigins.win/get?url=${encodeURIComponent(rawUrl)}`,
  ];

  for (const proxyUrl of proxyEndpoints) {
    const isWrapper = proxyUrl.includes('/get?url=');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;

      let data: any;
      if (isWrapper) {
        const wrapper = await res.json();
        if (!wrapper?.contents) continue;
        data = typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper.contents;
      } else {
        data = await res.json();
      }

      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice !== undefined && meta.regularMarketPrice > 0) {
        const prevClose = meta.chartPreviousClose || meta.previousClose;
        const current = Number(meta.regularMarketPrice);
        let changePercent: number | undefined = undefined;
        if (prevClose && prevClose > 0) {
          changePercent = ((current / prevClose) - 1) * 100;
        }
        return { price: current, changePercent };
      }
    } catch {
      clearTimeout(timer);
      // Continua para o próximo proxy da esteira
    }
  }

  return null;
}

// ============================================================================
// ORQUESTRADOR MULTI-FALLBACK
// ============================================================================

export interface AssetToQuote {
  ticker: string;
  market: QuoteMarket;
  currency: CurrencyCode;
}

/**
 * Busca cotações de todos os ativos da carteira utilizando a esteira multi-fallback resiliente
 */
export async function fetchPortfolioQuotes(
  assets: AssetToQuote[],
  forceRefresh = false
): Promise<Record<string, MarketQuoteResult>> {
  const cachedQuotes = getCachedQuotes() || {};

  // Se o cache estiver fresco e não for refresh forçado, retorna imediatamente
  if (!forceRefresh && isCacheFresh() && Object.keys(cachedQuotes).length > 0) {
    return cachedQuotes;
  }

  const results: Record<string, MarketQuoteResult> = {};
  const nowIso = new Date().toISOString();

  // 1. Busca Moedas e Cripto na AwesomeAPI
  const awesomeData = await fetchAwesomeRates();
  const usdBrlRate = awesomeData['USD']?.price || cachedQuotes['USD']?.price || 5.50;
  const eurBrlRate = awesomeData['EUR']?.price || cachedQuotes['EUR']?.price || 6.00;

  // Salva taxas de câmbio globais
  results['USD'] = {
    ticker: 'USD',
    price: usdBrlRate,
    currency: 'BRL',
    fxRateToBRL: 1.0,
    changePercent: awesomeData['USD']?.changePercent,
    quoteStatus: awesomeData['USD'] ? 'UP_TO_DATE' : 'STALE',
    source: awesomeData['USD'] ? 'AWESOME_API' : 'CACHE',
    updatedAt: nowIso,
  };

  // Separação de ativos por tipo de mercado
  const b3Assets: AssetToQuote[] = [];
  const usAssets: AssetToQuote[] = [];
  const cryptoAssets: AssetToQuote[] = [];

  for (const asset of assets) {
    const cleanTicker = asset.ticker.toUpperCase();
    if (asset.market === 'CASH' || asset.market === 'MANUAL') {
      continue;
    }
    if (asset.market === 'CRYPTO') {
      cryptoAssets.push(asset);
    } else if (asset.market === 'US' || asset.currency === 'USD') {
      usAssets.push(asset);
    } else if (asset.market === 'B3') {
      b3Assets.push(asset);
    }
  }

  // 2. Processa Criptomoedas
  for (const c of cryptoAssets) {
    const ticker = c.ticker.toUpperCase();
    if (awesomeData[ticker]) {
      results[ticker] = {
        ticker,
        price: awesomeData[ticker].price,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        changePercent: awesomeData[ticker].changePercent,
        quoteStatus: 'UP_TO_DATE',
        source: 'AWESOME_API',
        updatedAt: nowIso,
      };
    } else if (cachedQuotes[ticker]) {
      results[ticker] = {
        ...cachedQuotes[ticker],
        quoteStatus: 'STALE',
      };
    }
  }

  // 3. Processa B3: Primário Brapi com Fallback Secundário Yahoo Finance (.SA)
  const b3Tickers = b3Assets.map((a) => a.ticker);
  let brapiResults: Record<string, { price: number; changePercent?: number }> = {};

  if (b3Tickers.length > 0) {
    brapiResults = await fetchBrapiBatch(b3Tickers);
  }

  for (const asset of b3Assets) {
    const ticker = asset.ticker.toUpperCase();
    const brapiQuote = brapiResults[ticker];

    if (brapiQuote && brapiQuote.price > 0) {
      results[ticker] = {
        ticker,
        price: brapiQuote.price,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        changePercent: brapiQuote.changePercent,
        quoteStatus: 'UP_TO_DATE',
        source: 'BRAPI',
        updatedAt: nowIso,
      };
    } else {
      // Fallback 1: Yahoo Finance B3 (.SA)
      const yahooQuote = await fetchYahooQuote(ticker, true);
      if (yahooQuote && yahooQuote.price > 0) {
        results[ticker] = {
          ticker,
          price: yahooQuote.price,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          changePercent: yahooQuote.changePercent,
          quoteStatus: 'UP_TO_DATE',
          source: 'YAHOO_FINANCE',
          updatedAt: nowIso,
        };
      } else if (cachedQuotes[ticker]) {
        // Fallback 2: Cache local expirado (STALE)
        results[ticker] = {
          ...cachedQuotes[ticker],
          quoteStatus: 'STALE',
        };
      } else {
        // Fallback 3: Indisponível
        results[ticker] = {
          ticker,
          price: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          quoteStatus: 'UNAVAILABLE',
          source: 'MANUAL',
          updatedAt: nowIso,
        };
      }
    }
  }

  // 4. Processa Ativos US (EUA)
  for (const asset of usAssets) {
    const ticker = asset.ticker.toUpperCase();
    const yahooQuote = await fetchYahooQuote(ticker, false);

    if (yahooQuote && yahooQuote.price > 0) {
      results[ticker] = {
        ticker,
        price: yahooQuote.price,
        currency: 'USD',
        fxRateToBRL: usdBrlRate,
        changePercent: yahooQuote.changePercent,
        quoteStatus: 'UP_TO_DATE',
        source: 'YAHOO_FINANCE',
        updatedAt: nowIso,
      };
    } else if (cachedQuotes[ticker]) {
      results[ticker] = {
        ...cachedQuotes[ticker],
        fxRateToBRL: usdBrlRate,
        quoteStatus: 'STALE',
      };
    } else {
      results[ticker] = {
        ticker,
        price: 0,
        currency: 'USD',
        fxRateToBRL: usdBrlRate,
        quoteStatus: 'UNAVAILABLE',
        source: 'MANUAL',
        updatedAt: nowIso,
      };
    }
  }

  // 5. Salva cotações válidas em cache
  saveCachedQuotes(results);

  return results;
}
