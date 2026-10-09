
import type { MarketQuote, HistoricalDataPoint } from '../types';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================
// AwesomeAPI (Moedas/Cripto) - Adicionado BTC-USD
const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,BTC-USD,ETH-BRL,BNB-BRL,SOL-BRL';

// Rota Serverless para Índices e Ações
const FIREBASE_FUNCTIONS_BASE_URL = import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL;
const INDICES_API_URL = `${FIREBASE_FUNCTIONS_BASE_URL}/getMarketData`;

// Cache Cliente
const CACHE_KEY = 'finpro_market_cache';
const CACHE_DURATION = 30 * 1000; // 30 segundos
const KNOWN_CRYPTOS = ['BTC', 'ETH', 'SOL', 'BNB', 'USDT', 'XRP', 'ADA', 'DOGE'] as const;

type CryptoQuoteCurrency = 'BRL' | 'USD' | 'USDT';

type NormalizedCryptoSymbol = {
  base: string;
  quote: CryptoQuoteCurrency;
  canonical: string;
  yahooSymbol: string;
};

const normalizeCryptoSymbol = (rawSymbol: string): NormalizedCryptoSymbol | null => {
  const raw = rawSymbol.toUpperCase().trim().replace(/\s+/g, '');

  const slashMatch = raw.match(/^([A-Z0-9]+)\/(BRL|USD|USDT)$/);
  if (slashMatch && KNOWN_CRYPTOS.includes(slashMatch[1] as any)) {
    const base = slashMatch[1];
    const quote = slashMatch[2] as CryptoQuoteCurrency;
    return {
      base,
      quote,
      canonical: `${base}/${quote}`,
      yahooSymbol: `${base}-${quote}`
    };
  }

  const dashMatch = raw.match(/^([A-Z0-9]+)-(BRL|USD|USDT)$/);
  if (dashMatch && KNOWN_CRYPTOS.includes(dashMatch[1] as any)) {
    const base = dashMatch[1];
    const quote = dashMatch[2] as CryptoQuoteCurrency;
    return {
      base,
      quote,
      canonical: `${base}/${quote}`,
      yahooSymbol: `${base}-${quote}`
    };
  }

  if (KNOWN_CRYPTOS.includes(raw as any)) {
    return {
      base: raw,
      quote: 'BRL',
      canonical: `${raw}/BRL`,
      yahooSymbol: `${raw}-BRL`
    };
  }

  return null;
};

export interface MarketResponse {
  quotes: MarketQuote[];
  isRateLimited: boolean;
}

interface CachedData {
  timestamp: number;
  data: MarketResponse;
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  type: string;
}

// Mock de Fallback para ações se a API falhar
const STOCK_FALLBACK = [
    { symbol: 'VALE3', name: 'Vale', price: 62.50, changePercent: 0.5, category: 'stock' as const },
    { symbol: 'PETR4', name: 'Petrobras', price: 38.20, changePercent: -1.2, category: 'stock' as const },
    { symbol: 'ITUB4', name: 'Itaú', price: 34.10, changePercent: 0.8, category: 'stock' as const },
    { symbol: 'BBDC4', name: 'Bradesco', price: 13.90, changePercent: -0.5, category: 'stock' as const },
    { symbol: 'ABEV3', name: 'Ambev', price: 12.40, changePercent: 0.1, category: 'stock' as const }
];

// ============================================================================
// SERVIÇO
// ============================================================================

const getOptimalRange = (symbol: string): string => {
  const isB3 = symbol.endsWith('.SA') || symbol === '^BVSP';
  return isB3 ? '1d' : '1mo';
};

// --- Busca de Histórico ---
export const fetchHistoricalData = async (
  symbol: string,
  range: '1d' | '5d' | '1mo' | '6mo' | '1y' | '5y' = '1mo'
): Promise<HistoricalDataPoint[]> => {
  console.log(`[MarketService] Buscando histórico para: ${symbol} (${range})`);

  const normalizedCrypto = normalizeCryptoSymbol(symbol);
  const isCrypto = !!normalizedCrypto;

  try {
    let interval = '1d';
    switch (range) {
      case '1d': interval = '15m'; break;
      case '5d': interval = '60m'; break;
      case '1mo': interval = '1d'; break;
      case '6mo': interval = '1d'; break;
      case '1y': interval = '1wk'; break;
      case '5y': interval = '1mo'; break;
    }

    let apiSymbol = symbol;
    const symbolMap: Record<string, string> = {
      'USD': 'BRL=X',
      'EUR': 'EURBRL=X',
      'IBOV': '^BVSP',
      'BVSP': '^BVSP'
    };

    if (symbolMap[symbol]) {
      apiSymbol = symbolMap[symbol];
    } else if (normalizedCrypto) {
      apiSymbol = normalizedCrypto.yahooSymbol;
    } else if (!symbol.includes('.') && !symbol.includes('-') && !symbol.startsWith('^')) {
      apiSymbol = `${symbol}.SA`;
    }

    const targetRange = getOptimalRange(apiSymbol);
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${apiSymbol}?range=${targetRange}&interval=${interval}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    console.log(`[MarketService] Tentando Yahoo: ${apiSymbol} (range: ${targetRange})`);
    const res = await fetch(proxyUrl);

    if (res.ok) {
      const data = await res.json();
      const history = parseYahooChartData(data);
      if (history.length > 0) return history;
    }
  } catch (error) {
    console.error('[MarketService] Erro no Yahoo:', error);
  }

  if (isCrypto) {
    return await fetchCryptoCompareHistory(symbol, range);
  }

  return [];
};

// --- Fallback CryptoCompare ---
const fetchCryptoCompareHistory = async (symbol: string, range: string): Promise<HistoricalDataPoint[]> => {
    try {
        const normalized = normalizeCryptoSymbol(symbol);
        if (!normalized) return [];

        const cleanSymbol = normalized.base;
        const targetCurrency = normalized.quote;

        console.log(`[MarketService] Tentando CryptoCompare para ${cleanSymbol}/${targetCurrency}`);        
        let limit = 30;
        let endpoint = 'histoday';
        let aggregate = 1;

        switch(range) {
            case '1d': endpoint = 'histominute'; limit = 144; aggregate = 10; break; // ~24h (10min interval)
            case '5d': endpoint = 'histohour'; limit = 120; break; // 5 dias * 24h
            case '1mo': endpoint = 'histoday'; limit = 30; break;
            case '6mo': endpoint = 'histoday'; limit = 180; break;
            case '1y': endpoint = 'histoday'; limit = 365; break;
            case '5y': endpoint = 'histoday'; limit = 1825; aggregate = 5; break; // Agrupado para não estourar limite
        }

        const url = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${cleanSymbol}&tsym=${targetCurrency}&limit=${limit}&aggregate=${aggregate}`;
        const res = await fetch(url);
        
        if (!res.ok) return [];
        const json = await res.json();

        if (json.Response === 'Success' && json.Data?.Data) {
            return json.Data.Data.map((d: any) => ({
                date: new Date(d.time * 1000).toISOString(),
                price: d.close
            }));
        }
    } catch (e) {
        console.error('[MarketService] Erro CryptoCompare:', e);
    }
    return [];
};

// Helper para parsear resposta do Yahoo
const parseYahooChartData = (data: any): HistoricalDataPoint[] => {
    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0]?.close || [];
    const history: HistoricalDataPoint[] = [];
    
    timestamps.forEach((ts: number, i: number) => {
        if (quotes[i] !== null && quotes[i] !== undefined) {
            history.push({
                date: new Date(ts * 1000).toISOString(),
                price: quotes[i]
            });
        }
    });
    return history;
};

// --- Busca de Sugestões (Autocomplete) ---
export const searchAssets = async (query: string): Promise<AssetSearchResult[]> => {
  console.log('searchAssets chamada com query:', query);	
  if (!query || query.length < 2) return [];

  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}&lang=pt-BR&region=BR&quotesCount=8&newsCount=0`)}`;
    
    const res = await fetch(proxyUrl);
    if (!res.ok) return [];
    
    const data = await res.json();
    
    return (data.quotes || [])
      .filter((q: any) => q.isYahooFinance && (
          q.quoteType === 'EQUITY' || 
          q.quoteType === 'ETF' || 
          q.quoteType === 'MUTUALFUND' ||
          q.quoteType === 'CRYPTOCURRENCY'
      ))
      .map((q: any) => ({
        symbol: q.symbol.replace('.SA', ''), 
        name: q.shortname || q.longname,
        type: mapQuoteType(q.quoteType)
      }));
  } catch (error) {
    console.warn("Erro no autocomplete:", error);
    return [];
  }
};
export const fetchAssetQuote = async (symbol: string): Promise<MarketQuote | null> => {
  try {
    const isProduction = window.location.hostname.includes('financasproinvest.com.br');
    const normalizedCrypto = normalizeCryptoSymbol(symbol);

    if (normalizedCrypto) {
      const requestSymbol = normalizedCrypto.yahooSymbol;

      if (isProduction) {
        const url = `${FIREBASE_FUNCTIONS_BASE_URL}/getAssetQuote?symbol=${encodeURIComponent(requestSymbol)}`;
        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        return {
          symbol: normalizedCrypto.canonical,
          name: data.name,
          price: data.price,
          changePercent: data.changePercent,
          category: 'crypto',
          timestamp: data.timestamp,
          simulated: false
        };
      }

      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${requestSymbol}?interval=1d&range=1d`)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) return null;

      const data = await res.json();
      const result = data.chart?.result?.[0]?.meta;
      if (!result) return null;

      const price = result.regularMarketPrice;
      const prevClose = result.chartPreviousClose;
      const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

      return {
        symbol: normalizedCrypto.canonical,
        name: result.shortName || normalizedCrypto.canonical,
        price,
        changePercent,
        category: 'crypto',
        timestamp: Date.now(),
        simulated: false
      };
    }

    if (isProduction) {
      const url = `${FIREBASE_FUNCTIONS_BASE_URL}/getAssetQuote?symbol=${encodeURIComponent(symbol)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        symbol: data.symbol,
        name: data.name,
        price: data.price,
        changePercent: data.changePercent,
        category: data.category,
        timestamp: data.timestamp,
        simulated: false
      };
    }

    let apiSymbol = symbol;
    if (!symbol.includes('.') && !symbol.startsWith('^')) {
      apiSymbol = `${symbol}.SA`;
    }

    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${apiSymbol}?interval=1d&range=1d`)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;

    const data = await res.json();
    const result = data.chart?.result?.[0]?.meta;
    if (!result) return null;

    const price = result.regularMarketPrice;
    const prevClose = result.chartPreviousClose;
    const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    let category: any = 'stock';
    if (result.instrumentType === 'CRYPTOCURRENCY') {
      category = 'crypto';
    }

    return {
      symbol: symbol.replace('.SA', ''),
      name: result.shortName || symbol,
      price,
      changePercent,
      category,
      timestamp: Date.now(),
      simulated: false
    };
  } catch (error) {
    console.error("Erro ao buscar cotação específica:", error);
    return null;
  }
};
// --- Carga Geral do Painel ---
export const fetchMarketQuotes = async (forceRefresh = false): Promise<MarketResponse> => {
  let previousCachedData: CachedData | null = null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      previousCachedData = JSON.parse(cached) as CachedData;
      if (!forceRefresh && (Date.now() - previousCachedData.timestamp < CACHE_DURATION)) {
        return previousCachedData.data;
      }
    }
  } catch {
    // Silencioso em caso de erro no parse do cache
  }

  const quotes: MarketQuote[] = [];
  let isRateLimited = false;
  let awesomeSuccess = false;

  // --- 2. BUSCA MOEDAS E CRIPTO (AwesomeAPI) ---
  try {
    const awesomeRes = await fetch(`${AWESOME_API_URL}?t=${Date.now()}`);
    if (awesomeRes.ok) {
      const json = await awesomeRes.json();
      
      if (json.USDBRL) quotes.push(mapAwesomeItem('USD', 'Dólar', json.USDBRL, 'currency'));
      if (json.EURBRL) quotes.push(mapAwesomeItem('EUR', 'Euro', json.EURBRL, 'currency'));
      if (json.BTCBRL) quotes.push(mapAwesomeItem('BTC/BRL', 'Bitcoin', json.BTCBRL, 'crypto'));
      if (json.BTCUSD) quotes.push(mapAwesomeItem('BTC/USD', 'Bitcoin (USD)', json.BTCUSD, 'crypto'));
      if (json.ETHBRL) quotes.push(mapAwesomeItem('ETH/BRL', 'Ethereum', json.ETHBRL, 'crypto'));
      if (json.BNBBRL) quotes.push(mapAwesomeItem('BNB/BRL', 'Binance Coin', json.BNBBRL, 'crypto'));
      if (json.SOLBRL) quotes.push(mapAwesomeItem('SOL/BRL', 'Solana', json.SOLBRL, 'crypto'));
      awesomeSuccess = true;
    }
  } catch (error) {
    console.warn('[MarketService] Falha ao consultar AwesomeAPI. Ativando resiliência:', error);
  }

  // Se AwesomeAPI falhou mas temos cotações anteriores válidas em cache, recuperamos moedas e criptos
  if (!awesomeSuccess && previousCachedData?.data?.quotes) {
    const cachedCurrenciesAndCryptos = previousCachedData.data.quotes.filter(
      (q) => q.category === 'currency' || q.category === 'crypto'
    );
    quotes.push(...cachedCurrenciesAndCryptos);
  }

  // --- 3. BUSCA ÍNDICES E AÇÕES ---
  let backendSuccess = false;
  
  try {
    const apiRes = await fetch(INDICES_API_URL);
    if (apiRes.ok) {
        const data = await apiRes.json();
        
        if (data.indices && Array.isArray(data.indices)) {
            data.indices.forEach((idx: any) => {
                quotes.push({
                    symbol: idx.symbol,
                    name: idx.name, 
                    price: idx.price,
                    changePercent: idx.change,
                    category: 'index',
                    timestamp: Date.now(),
                    simulated: data.simulated
                });
            });
        }

        if (data.stocks && Array.isArray(data.stocks)) {
            data.stocks.forEach((stock: any) => {
                quotes.push({
                    symbol: stock.symbol,
                    name: stock.name,
                    price: stock.price,
					changePercent: stock.change,
                    category: 'stock',
                    timestamp: Date.now(),
                    simulated: data.simulated
                });
            });
            backendSuccess = true;
        }
    }
  } catch (error) {
    console.warn('API Backend indisponível, tentando fallback...', error);
  }

  if (!backendSuccess) {
      if (!quotes.some(q => q.symbol === 'IBOV')) {
          try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/^BVSP?interval=1d&range=1d')}`;
            const res = await fetch(proxyUrl);
            if (res.ok) {
                const data = await res.json();
                const result = data.chart?.result?.[0]?.meta;
                if (result) {
                    quotes.push({
                        symbol: 'IBOV',
                        name: 'Ibovespa',
                        price: result.regularMarketPrice,
                        changePercent: ((result.regularMarketPrice - result.chartPreviousClose) / result.chartPreviousClose) * 100,
                        category: 'index',
                        timestamp: Date.now(),
                        simulated: false
                    });
                }
            }
          } catch (e) {}
      }

      // Se Yahoo também falhou, verificar se há índice em cache anterior
      if (!quotes.some(q => q.symbol === 'IBOV') && previousCachedData?.data?.quotes) {
        const cachedIbov = previousCachedData.data.quotes.find(q => q.symbol === 'IBOV');
        if (cachedIbov) quotes.push(cachedIbov);
      }

      if (!quotes.some(q => q.category === 'stock')) {
          STOCK_FALLBACK.forEach(s => {
              quotes.push({
                  ...s,
                  timestamp: Date.now(),
                  simulated: true
              });
          });
      }
  }

  // Se tudo falhar e quotes estiver vazio, retorna cache prévio intacto
  if (quotes.length === 0 && previousCachedData?.data?.quotes && previousCachedData.data.quotes.length > 0) {
    console.warn('[MarketService] Rede indisponível. Retornando cotações salvas em cache local.');
    return previousCachedData.data;
  }

  const result: MarketResponse = { quotes, isRateLimited };

  if (quotes.length > 0) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: result
      }));
    } catch {}
  }

  return result;
};

// --- Helpers ---

const mapAwesomeItem = (symbol: string, name: string, data: any, category: 'currency' | 'crypto'): MarketQuote => ({
  symbol,
  name,
  price: parseFloat(data.bid),
  changePercent: parseFloat(data.pctChange),
  category,
  timestamp: Date.now(),
  simulated: false
});

const mapQuoteType = (yahooType: string): string => {
    switch (yahooType) {
        case 'EQUITY': return 'Ação';
        case 'ETF': return 'ETF';
        case 'MUTUALFUND': return 'Fundo';
        case 'CRYPTOCURRENCY': return 'Cripto';
        case 'INDEX': return 'Índice';
        default: return 'Ativo';
    }
};
