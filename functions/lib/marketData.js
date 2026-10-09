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
exports.getMarketData = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'https://financasproinvest.com',
    'https://www.financasproinvest.com',
    'https://financasproinvest.com.br',
    'https://www.financasproinvest.com.br',
];
exports.getMarketData = (0, https_1.onRequest)(async (request, response) => {
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
    try {
        const indexTickers = ["%5EBVSP", "%5EGSPC"];
        const indexPromises = indexTickers.map(async (ticker) => {
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
                const res = await fetch(url);
                const json = await res.json();
                if (!json.chart || !json.chart.result || json.chart.result.length === 0)
                    return null;
                const meta = json.chart.result[0].meta;
                const changePercent = ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100;
                let name = ticker === "%5EBVSP" ? "IBOV" : "S&P 500";
                return {
                    symbol: name,
                    price: meta.regularMarketPrice,
                    change: changePercent,
                    up: changePercent >= 0
                };
            }
            catch (e) {
                return null;
            }
        });
        const indexResults = await Promise.all(indexPromises);
        const indices = indexResults.filter(i => i !== null);
        const stockTickers = ["VALE3.SA", "PETR4.SA", "ITUB4.SA", "BBDC4.SA", "ABEV3.SA", "BBAS3.SA", "ELET3.SA", "WEGE3.SA", "BPAC11.SA", "SUZB3.SA"];
        const stockPromises = stockTickers.map(async (ticker) => {
            try {
                const stockUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
                const response = await fetch(stockUrl);
                const data = await response.json();
                if (!data.chart || !data.chart.result || data.chart.result.length === 0)
                    return null;
                const meta = data.chart.result[0].meta;
                const changePercent = ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100;
                return {
                    symbol: ticker.replace('.SA', ''),
                    price: meta.regularMarketPrice,
                    change: changePercent,
                    up: changePercent >= 0
                };
            }
            catch (error) {
                return null;
            }
        });
        const stockResults = await Promise.all(stockPromises);
        const stocks = stockResults.filter((stock) => stock !== null);
        let currencies = [];
        try {
            const awesomeRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL');
            const awesomeJson = await awesomeRes.json();
            currencies = [
                awesomeJson.USDBRL && { symbol: 'USD/BRL', price: parseFloat(awesomeJson.USDBRL.bid), change: parseFloat(awesomeJson.USDBRL.pctChange), up: parseFloat(awesomeJson.USDBRL.pctChange) >= 0, type: 'currency' },
                awesomeJson.EURBRL && { symbol: 'EUR/BRL', price: parseFloat(awesomeJson.EURBRL.bid), change: parseFloat(awesomeJson.EURBRL.pctChange), up: parseFloat(awesomeJson.EURBRL.pctChange) >= 0, type: 'currency' },
                awesomeJson.GBPBRL && { symbol: 'GBP/BRL', price: parseFloat(awesomeJson.GBPBRL.bid), change: parseFloat(awesomeJson.GBPBRL.pctChange), up: parseFloat(awesomeJson.GBPBRL.pctChange) >= 0, type: 'currency' },
            ].filter(Boolean);
        }
        catch (e) {
            logger.warn('Erro ao buscar câmbio', e);
        }
        let cryptos = [];
        try {
            const cryptoRes = await fetch('https://economia.awesomeapi.com.br/last/BTC-BRL,ETH-BRL,SOL-BRL,BNB-BRL');
            const cryptoJson = await cryptoRes.json();
            cryptos = [
                cryptoJson.BTCBRL && { symbol: 'BTC', price: parseFloat(cryptoJson.BTCBRL.bid), change: parseFloat(cryptoJson.BTCBRL.pctChange), up: parseFloat(cryptoJson.BTCBRL.pctChange) >= 0, type: 'crypto' },
                cryptoJson.ETHBRL && { symbol: 'ETH', price: parseFloat(cryptoJson.ETHBRL.bid), change: parseFloat(cryptoJson.ETHBRL.pctChange), up: parseFloat(cryptoJson.ETHBRL.pctChange) >= 0, type: 'crypto' },
                cryptoJson.SOLBRL && { symbol: 'SOL', price: parseFloat(cryptoJson.SOLBRL.bid), change: parseFloat(cryptoJson.SOLBRL.pctChange), up: parseFloat(cryptoJson.SOLBRL.pctChange) >= 0, type: 'crypto' },
                cryptoJson.BNBBRL && { symbol: 'BNB', price: parseFloat(cryptoJson.BNBBRL.bid), change: parseFloat(cryptoJson.BNBBRL.pctChange), up: parseFloat(cryptoJson.BNBBRL.pctChange) >= 0, type: 'crypto' },
            ].filter(Boolean);
        }
        catch (e) {
            logger.warn('Erro ao buscar cripto', e);
        }
        const formattedData = {
            indices: indices.length > 0 ? indices : [],
            stocks: stocks.length > 0 ? stocks : [],
            currencies,
            cryptos
        };
        response.json(formattedData);
        ;
        logger.info("Dados enviados com sucesso (Raw Numbers).");
    }
    catch (error) {
        logger.error("Erro CRÍTICO", error);
        response.json({
            indices: [],
            stocks: [],
            currencies: [],
            cryptos: []
        });
    }
});
//# sourceMappingURL=marketData.js.map