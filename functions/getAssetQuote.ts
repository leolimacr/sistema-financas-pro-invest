import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://financasproinvest.com',
  'https://www.financasproinvest.com',
  'https://financasproinvest.com.br',
  'https://www.financasproinvest.com.br',
];

export const getAssetQuote = onRequest(async (request, response) => {
  const origin = request.headers.origin;
  
  // CORS
  let finalOrigin = origin;
  if (origin && origin.includes('.vercel.app')) {
    finalOrigin = origin;
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    finalOrigin = origin;
  } else {
    finalOrigin = ALLOWED_ORIGINS[0];
  }
  
  response.setHeader('Access-Control-Allow-Origin', finalOrigin);
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  const symbol = request.query.symbol as string;
  if (!symbol) {
    response.status(400).json({ error: 'Symbol is required' });
    return;
  }

  try {
    // ----- Lógica para criptomoedas (tenta formatos com -BRL, -USD e puro) -----
    const cryptoFormats = [
      `${symbol}-BRL`,
      `${symbol}-USD`,
      symbol // algumas vezes o símbolo puro funciona (ex: BTCUSD)
    ];

    for (const fmt of cryptoFormats) {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${fmt}?interval=1d&range=1d`;
      const yahooRes = await fetch(url);
      
      if (yahooRes.ok) {
        const data = await yahooRes.json() as any;
        const result = data.chart?.result?.[0]?.meta;
        if (result) {
          const price = result.regularMarketPrice;
          const prevClose = result.chartPreviousClose;
          const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
          
          // Responde e encerra a função
          response.json({
            symbol: symbol,
            name: result.shortName || symbol,
            price,
            changePercent,
            category: 'crypto',
            timestamp: Date.now(),
            simulated: false
          });
          return;
        }
      }
    }

    // ----- Se não achou como cripto, tenta como ação brasileira (adiciona .SA) -----
    let apiSymbol = symbol;
    if (!symbol.includes('.') && !symbol.startsWith('^')) {
      apiSymbol = `${symbol}.SA`;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${apiSymbol}?interval=1d&range=1d`;
    const yahooRes = await fetch(url);
    
    if (!yahooRes.ok) {
      response.status(404).json({ error: 'Asset not found' });
      return;
    }

    const data = await yahooRes.json() as any;
    const result = data.chart?.result?.[0]?.meta;
    if (!result) {
      response.status(404).json({ error: 'No data available' });
      return;
    }

    const price = result.regularMarketPrice;
    const prevClose = result.chartPreviousClose;
    const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    let category = 'stock';
    if (result.instrumentType === 'CRYPTOCURRENCY') {
      category = 'crypto';
    }

    response.json({
      symbol: symbol.replace('.SA', ''),
      name: result.shortName || symbol,
      price,
      changePercent,
      category,
      timestamp: Date.now(),
      simulated: false
    });

    logger.info(`Quote fetched for ${symbol}`);
  } catch (error) {
    logger.error('Error fetching asset quote:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});