"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetQuote = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'https://financasproinvest.com',
    'https://www.financasproinvest.com',
    'https://financasproinvest.com.br',
    'https://www.financasproinvest.com.br',
];
exports.getAssetQuote = (0, https_1.onRequest)(async (request, response) => {
    const origin = request.headers.origin;
    let finalOrigin = origin;
    if (origin && origin.includes('.vercel.app')) {
        finalOrigin = origin;
    }
    else if (origin && ALLOWED_ORIGINS.includes(origin)) {
        finalOrigin = origin;
    }
    else {
        finalOrigin = ALLOWED_ORIGINS[0];
    }
    response.setHeader('Access-Control-Allow-Origin', finalOrigin);
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (request.method === 'OPTIONS') {
        response.status(204).send('');
        return;
    }
    const symbol = request.query.symbol;
    if (!symbol) {
        response.status(400).json({ error: 'Symbol is required' });
        return;
    }
    try {
        const cryptoFormats = [
            `${symbol}-BRL`,
            `${symbol}-USD`,
            symbol
        ];
        for (const fmt of cryptoFormats) {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${fmt}?interval=1d&range=1d`;
            const yahooRes = await fetch(url);
            if (yahooRes.ok) {
                const data = await yahooRes.json();
                const result = data.chart?.result?.[0]?.meta;
                if (result) {
                    const price = result.regularMarketPrice;
                    const prevClose = result.chartPreviousClose;
                    const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
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
        const data = await yahooRes.json();
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
    }
    catch (error) {
        logger.error('Error fetching asset quote:', error);
        response.status(500).json({ error: 'Internal server error' });
    }
});
//# sourceMappingURL=getAssetQuote.js.map