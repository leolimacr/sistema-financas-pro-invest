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
exports.askAiAdvisor = exports.NEXUS_QUOTA_INTERIM = void 0;
exports.getUserPlan = getUserPlan;
exports.nexusQuotaDay = nexusQuotaDay;
exports.nexusQuotaForPlan = nexusQuotaForPlan;
exports.checkNexusQuota = checkNexusQuota;
exports.checkTavilyQuota = checkTavilyQuota;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const identity_1 = require("./nexus-core/identity");
const discretion_engine_1 = require("./nexus-core/discretion-engine");
const data_integrator_1 = require("./nexus-core/data-integrator");
const MultiModelRouter_1 = require("./nexus-core/MultiModelRouter");
const prompt_builder_1 = require("./nexus-core/prompt-builder");
const action_registry_1 = require("./nexus-core/action-registry");
const financial_facts_1 = require("./nexus-core/financial-facts");
const secrets_1 = require("./secrets");
function buildAnalysisBasis(userData, historyDescription, serverData) {
    const sources = [];
    if (userData.recentTransactions.length > 0)
        sources.push('lançamentos recentes');
    if (userData.goals.length > 0)
        sources.push('metas financeiras');
    if (serverData.debts.length > 0)
        sources.push('dívidas cadastradas');
    if (serverData.assets.length > 0 || serverData.passives.length > 0)
        sources.push('patrimônio cadastrado');
    if (serverData.bills.length > 0 || serverData.cards.length > 0)
        sources.push('contas e cartões');
    const limitations = [];
    if (userData.dataStatus === 'error')
        limitations.push('Não foi possível carregar parte dos dados financeiros nesta resposta.');
    if (userData.recentTransactions.length === 0)
        limitations.push('Não há lançamentos recentes disponíveis para análise de fluxo.');
    if (sources.length === 0)
        limitations.push('O diagnóstico está limitado porque ainda não há dados financeiros cadastrados.');
    return {
        generatedAt: new Date().toISOString(),
        dataStatus: userData.dataStatus,
        sources,
        period: historyDescription,
        limitations,
    };
}
async function getUserPlan(userId) {
    try {
        const db = (0, firestore_1.getFirestore)();
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            const sub = data?.subscription;
            const active = !sub?.status || sub.status === 'active' || sub.status === 'trialing';
            if (typeof sub?.plan === 'string' && sub.plan && (active || sub.plan === 'free')) {
                return sub.plan;
            }
            if (typeof sub?.planId === 'string' && active) {
                const legacy = sub.planId.toLowerCase();
                if (['free', 'pro', 'premium', 'premium_anual'].includes(legacy))
                    return legacy;
            }
            if (typeof sub?.plan === 'string' && sub.plan && !active) {
                logger.info(`[Subscription] Plano ${sub.plan} com status inativo (${sub.status}); usando padrão`);
                return undefined;
            }
        }
        logger.info(`[Subscription] Usuário sem plano definido (usando padrão)`);
        return undefined;
    }
    catch (error) {
        logger.error(`[Subscription] Erro ao buscar plano: ${error.message}`);
        return undefined;
    }
}
exports.NEXUS_QUOTA_INTERIM = {
    free: 5,
    pro: 100,
    premium: 500,
    premium_anual: 1000,
};
const NEXUS_QUOTA_DEFAULT = 5;
function nexusQuotaDay(now = new Date()) {
    return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
function nexusQuotaForPlan(plan) {
    if (plan && plan in exports.NEXUS_QUOTA_INTERIM)
        return exports.NEXUS_QUOTA_INTERIM[plan];
    return NEXUS_QUOTA_DEFAULT;
}
async function checkNexusQuota(db, uid, plan, dayStr) {
    const quota = nexusQuotaForPlan(plan);
    const day = dayStr ?? nexusQuotaDay();
    const ref = db.collection(`users/${uid}/nexusQuota`).doc(day);
    const snap = await ref.get();
    const used = typeof snap.data()?.count === 'number' ? snap.data().count : 0;
    if (used >= quota)
        return { allowed: false, used, quota };
    await ref.set({ count: used + 1, updatedAt: new Date().toISOString() }, { merge: true });
    return { allowed: true, used: used + 1, quota };
}
async function getUserDebts(userId) {
    try {
        const db = (0, firestore_1.getFirestore)();
        const snapshot = await db.collection('users').doc(userId).collection('dividas').get();
        if (snapshot.empty)
            return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    catch (error) {
        logger.error(`[Debts] Erro ao buscar dívidas: ${error.message}`);
        return [];
    }
}
async function getUserAssets(userId) {
    try {
        const db = (0, firestore_1.getFirestore)();
        const snapshot = await db.collection('users').doc(userId).collection('ativos').get();
        if (snapshot.empty)
            return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    catch (error) {
        logger.error(`[Assets] Erro ao buscar ativos: ${error.message}`);
        return [];
    }
}
async function getUserPassives(userId) {
    try {
        const db = (0, firestore_1.getFirestore)();
        const snapshot = await db.collection('users').doc(userId).collection('passivos').get();
        if (snapshot.empty)
            return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    catch (error) {
        logger.error(`[Passives] Erro ao buscar passivos: ${error.message}`);
        return [];
    }
}
async function getUserBills(userId) {
    try {
        const db = (0, firestore_1.getFirestore)();
        const snapshot = await db.collection('users').doc(userId).collection('contas_fixas').get();
        if (snapshot.empty)
            return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    catch (error) {
        logger.error(`[Bills] Erro ao buscar contas fixas: ${error.message}`);
        return [];
    }
}
async function getUserCards(userId) {
    try {
        const db = (0, firestore_1.getFirestore)();
        const snapshot = await db.collection('users').doc(userId).collection('cartoes').get();
        if (snapshot.empty)
            return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    catch (error) {
        logger.error(`[Cards] Erro ao buscar cartões: ${error.message}`);
        return [];
    }
}
async function getUserInvoices(userId) {
    try {
        const db = (0, firestore_1.getFirestore)();
        const snapshot = await db.collection('users').doc(userId).collection('faturas').limit(20).get();
        if (snapshot.empty)
            return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    catch (error) {
        logger.error(`[Invoices] Erro ao buscar faturas: ${error.message}`);
        return [];
    }
}
function describeHistoryWindow(plan) {
    switch (plan) {
        case 'free': return 'Você está no plano Free, então posso analisar apenas os últimos 3 dias do seu histórico';
        case 'pro': return 'Você está no plano Pro, então posso analisar os últimos 30 dias do seu histórico';
        case 'premium': return 'Você está no plano Premium, então posso analisar os últimos 90 dias do seu histórico';
        case 'premium_anual': return 'Você está no plano Premium Anual, então posso analisar todo o seu histórico de lançamentos (ilimitado)';
        default: return 'analiso um recorte recente do seu histórico, definido pelo seu plano';
    }
}
const TAVILY_MONTHLY_LIMIT = 1000;
function tavilyPeriodKey(now = new Date()) {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}
async function checkTavilyQuota(db, now = new Date()) {
    const ref = db.collection('system').doc(`apiUsage_tavily_${tavilyPeriodKey(now)}`);
    const snap = await ref.get();
    const used = typeof snap.data()?.count === 'number' ? snap.data().count : 0;
    if (used >= TAVILY_MONTHLY_LIMIT) {
        logger.warn(`[Tavily] Cota mensal esgotada (${used}/${TAVILY_MONTHLY_LIMIT})`);
        return false;
    }
    await ref.set({ count: firestore_1.FieldValue.increment(1), updatedAt: new Date().toISOString() }, { merge: true });
    return true;
}
async function searchWebTavily(query, apiKey) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, query, search_depth: 'basic', include_answer: true, max_results: 3 }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            logger.error(`[Tavily] HTTP ${response.status}`);
            return null;
        }
        const data = await response.json();
        if (data.answer) {
            logger.info('[Tavily] ✅ Resposta obtida');
            return data.answer;
        }
        if (data.results && data.results.length > 0) {
            const summary = data.results.slice(0, 3).map((r) => r.content || r.snippet || '').filter((s) => s.length > 0).join('\n\n');
            if (summary.length > 0) {
                logger.info('[Tavily] ✅ Resultados concatenados');
                return summary;
            }
        }
        return null;
    }
    catch (error) {
        logger.error('[Tavily] Erro:', error.message);
        return null;
    }
}
async function searchWebCascade(query, tavilyKey) {
    logger.info(`[WebSearch] Busca Tavily para: "${query}"`);
    try {
        if (await checkTavilyQuota((0, firestore_1.getFirestore)())) {
            const tavilyResult = await searchWebTavily(query, tavilyKey);
            if (tavilyResult)
                return tavilyResult;
        }
    }
    catch (error) {
        logger.error('[WebSearch] Falha na cota/busca Tavily:', error?.message);
    }
    logger.warn('[WebSearch] Sem resultado de busca disponível');
    return "Não consegui obter informações atualizadas no momento. Tente novamente em alguns instantes.";
}
async function fetchSafe(url, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response.ok ? await response.json() : null;
    }
    catch (e) {
        logger.warn(`fetchSafe timeout/falha para ${url}`);
        return null;
    }
}
async function fetchCryptoPrices(cryptos) {
    const results = {};
    if (!cryptos.length)
        return results;
    try {
        const mapping = {
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
            'BNB': 'binancecoin', 'ADA': 'cardano', 'XRP': 'ripple',
            'DOGE': 'dogecoin', 'DOT': 'polkadot', 'AVAX': 'avalanche-2'
        };
        const coinIds = cryptos.map(c => mapping[c.toUpperCase()] || c.toLowerCase()).join(',');
        const data = await fetchSafe(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=brl`, 5000);
        if (data) {
            const nowBR = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            Object.entries(data).forEach(([id, info]) => {
                const symbol = cryptos.find(c => id.includes(c.toLowerCase()))?.toUpperCase() || id.toUpperCase();
                results[symbol] = { price: info.brl, lastUpdated: nowBR };
            });
            logger.info(`CoinGecko BRL: ${Object.keys(results).join(', ')}`);
        }
    }
    catch (error) {
        logger.error("Erro fetchCryptoPrices", error);
    }
    return results;
}
async function fetchCryptoPricesDual(cryptos) {
    const results = {};
    if (!cryptos.length)
        return results;
    try {
        const mapping = {
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
            'BNB': 'binancecoin', 'ADA': 'cardano', 'XRP': 'ripple',
            'DOGE': 'dogecoin', 'DOT': 'polkadot', 'AVAX': 'avalanche-2'
        };
        const coinIds = cryptos.map(c => mapping[c.toUpperCase()] || c.toLowerCase()).join(',');
        const data = await fetchSafe(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd,brl`, 5000);
        if (data) {
            const nowBR = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            Object.entries(data).forEach(([id, info]) => {
                const symbol = cryptos.find(c => id.includes(c.toLowerCase()))?.toUpperCase() || id.toUpperCase();
                results[symbol] = { priceUSD: info.usd, priceBRL: info.brl, lastUpdated: nowBR };
            });
            logger.info(`CoinGecko USD+BRL: ${Object.keys(results).join(', ')}`);
        }
    }
    catch (error) {
        logger.error("Erro fetchCryptoPricesDual", error);
    }
    return results;
}
async function fetchAllMarketData(tickers, cryptos, token, prompt, history) {
    const results = [];
    let hasAnyData = false;
    const needsUSDExplicit = /dólar|dolar|usd|dollar|us\$/i.test(prompt);
    let needsUSDContext = false;
    if (history.length > 0) {
        const lastTwoMsgs = history.slice(-2);
        needsUSDContext = lastTwoMsgs.some((h) => /dólar|dolar|usd|dollar|US\$/i.test(h.text || ''));
    }
    const needsUSD = needsUSDExplicit || needsUSDContext;
    if (cryptos.length > 0) {
        if (needsUSD) {
            const cpDual = await fetchCryptoPricesDual(cryptos);
            if (Object.keys(cpDual).length > 0) {
                Object.entries(cpDual).forEach(([symbol, data]) => {
                    results.push(`${symbol}: US$ ${data.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / R$ ${data.priceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (cotação de ${data.lastUpdated})`);
                });
                hasAnyData = true;
            }
        }
        else {
            const cp = await fetchCryptoPrices(cryptos);
            if (Object.keys(cp).length > 0) {
                Object.entries(cp).forEach(([symbol, data]) => {
                    results.push(`${symbol}: R$ ${data.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (cotação de ${data.lastUpdated})`);
                });
                hasAnyData = true;
            }
        }
    }
    if (tickers.length > 0) {
        const stocks = Array.from(new Set(['^BVSP', ...tickers.filter(t => t.length >= 4)]));
        try {
            const stockRes = await Promise.allSettled(stocks.map(async (ticker) => {
                try {
                    const url = `https://brapi.dev/api/quote/${ticker.toUpperCase()}?token=${token}`;
                    const d = await fetchSafe(url, 6000);
                    if (d?.results?.[0]?.regularMarketPrice) {
                        const time = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
                        const date = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
                        return `${ticker}: R$ ${d.results[0].regularMarketPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (cotação de ${date} às ${time})`;
                    }
                    return null;
                }
                catch (err) {
                    return null;
                }
            }));
            stockRes.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                    hasAnyData = true;
                }
            });
        }
        catch (error) {
            logger.error("Erro busca ações", error);
        }
    }
    return hasAnyData ? results.join('\n') : "";
}
function extractTickersFallback(prompt) {
    const result = { b3: [], crypto: [] };
    const upperPrompt = prompt.toUpperCase();
    const lowerPrompt = prompt.toLowerCase();
    const b3Regex = /\b([A-Z]{4}\d{1,2})\b/g;
    let match;
    while ((match = b3Regex.exec(upperPrompt)) !== null)
        result.b3.push(match[1]);
    const companyMap = {
        'itaú': { type: 'b3', ticker: 'ITUB4' }, 'itau': { type: 'b3', ticker: 'ITUB4' },
        'itub': { type: 'b3', ticker: 'ITUB4' }, 'itub4': { type: 'b3', ticker: 'ITUB4' },
        'petrobras': { type: 'b3', ticker: 'PETR4' }, 'vale': { type: 'b3', ticker: 'VALE3' },
        'banco do brasil': { type: 'b3', ticker: 'BBAS3' }, 'bb': { type: 'b3', ticker: 'BBAS3' },
        'ivvb11': { type: 'b3', ticker: 'IVVB11' }, 'wege': { type: 'b3', ticker: 'WEGE3' },
        'wege3': { type: 'b3', ticker: 'WEGE3' }, 'bitcoin': { type: 'crypto', ticker: 'BTC' },
        'btc': { type: 'crypto', ticker: 'BTC' }, 'ethereum': { type: 'crypto', ticker: 'ETH' },
        'eth': { type: 'crypto', ticker: 'ETH' }, 'solana': { type: 'crypto', ticker: 'SOL' },
        'sol': { type: 'crypto', ticker: 'SOL' }
    };
    Object.keys(companyMap).forEach(key => {
        if (lowerPrompt.includes(key)) {
            const item = companyMap[key];
            if (item.type === 'b3')
                result.b3.push(item.ticker);
            if (item.type === 'crypto')
                result.crypto.push(item.ticker);
        }
    });
    result.b3 = [...new Set(result.b3)];
    result.crypto = [...new Set(result.crypto)];
    return result;
}
exports.askAiAdvisor = (0, https_1.onCall)({
    memory: "1GiB",
    timeoutSeconds: 120,
    region: "us-central1",
    secrets: [
        secrets_1.GEMINI_API_KEY,
        secrets_1.OPENROUTER_API_KEY,
        secrets_1.GROQ_API_KEY,
        secrets_1.BRAPI_TOKEN,
        secrets_1.TAVILY_API_KEY,
    ],
}, async (request) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const brapiToken = process.env.BRAPI_TOKEN;
    const router = MultiModelRouter_1.MultiModelRouter.getInstance();
    router.updateApiKeys({ gemini: geminiApiKey, groq: groqApiKey, openrouter: openrouterApiKey });
    try {
        if (!request.auth)
            throw new https_1.HttpsError("unauthenticated", "Login necessário.");
        const { prompt, userName, history = [], isFirstInteraction, context: frontendContext = {} } = request.data;
        const { assets = [], passives = [], goals = [], transactions = [] } = frontendContext;
        const safeUserName = (userName || "Investidor").split(' ')[0];
        const userId = request.auth.uid;
        let isFirst;
        if (typeof isFirstInteraction === 'boolean') {
            isFirst = isFirstInteraction;
            logger.info(`[FirstMsg] Flag explícito do Flutter: ${isFirst}`);
        }
        else {
            const validHistory = Array.isArray(history) ? history.filter((h) => h && h.text && h.text.trim() && h.role !== 'system') : [];
            isFirst = validHistory.length === 0;
            logger.info(`[FirstMsg] Auto-detectado: ${isFirst} (validHistLen=${validHistory.length})`);
        }
        logger.info(`[History] Total: ${history.length}`);
        logger.info(`[${safeUserName}] isFirst=${isFirst}: "${prompt.substring(0, 80)}..."`);
        if (isFirst) {
            const cleanPrompt = prompt.trim().toLowerCase().replace(/[.,!?;:\(\)\[\]]/g, '').replace(/\s+/g, ' ');
            const simpleGreetings = ['oi', 'olá', 'ola', 'oie', 'opa', 'eai', 'e ai', 'e aí', 'bom dia', 'boa tarde', 'boa noite', 'ei', 'hey', 'hi', 'hello', 'alô', 'alo', 'fala', 'fala aí', 'fala ai', 'beleza'];
            if (simpleGreetings.includes(cleanPrompt)) {
                const greeting = identity_1.NexusIdentity.getInitialGreeting(safeUserName);
                logger.info("✅ Saudação simples detectada");
                return { success: true, answer: greeting, context: { intent: 'greeting', model: 'system' } };
            }
        }
        let userData;
        let historyDescription = 'analiso um recorte recente do seu histórico, definido pelo seu plano';
        let serverDebts = [];
        let serverAssets = [];
        let serverPassives = [];
        let serverBills = [];
        let serverCards = [];
        let serverInvoices = [];
        let userPlan;
        try {
            userPlan = await getUserPlan(userId);
            [serverDebts, serverAssets, serverPassives, serverBills, serverCards, serverInvoices] = await Promise.all([
                getUserDebts(userId),
                getUserAssets(userId),
                getUserPassives(userId),
                getUserBills(userId),
                getUserCards(userId),
                getUserInvoices(userId)
            ]);
            historyDescription = describeHistoryWindow(userPlan);
            logger.info(`[DEBUG] Plano retornado: "${userPlan}" (tipo: ${typeof userPlan})`);
            userData = await data_integrator_1.DataIntegrator.gatherUserData(userId, userPlan);
        }
        catch (dataError) {
            logger.error("Falha dados usuário:", dataError);
            userData = { goals: [], recentTransactions: [], simulations: [], summary: '', hasData: false, dataStatus: 'error' };
        }
        const resolvedAssets = (assets && assets.length > 0) ? assets : serverAssets;
        const resolvedPassives = (passives && passives.length > 0) ? passives : serverPassives;
        logger.info(`[DEBUG] Metas em userData: ${userData?.goals?.length || 0}; hasData: ${userData?.hasData}`);
        const assetsSummary = data_integrator_1.DataIntegrator.formatAssetsSummary(resolvedAssets);
        const passivesSummary = data_integrator_1.DataIntegrator.formatPassivesSummary(resolvedPassives);
        const debtsSummary = (0, data_integrator_1.truncatePromptSegment)(data_integrator_1.DataIntegrator.formatDebtsSummary(serverDebts));
        const billsSummary = (0, data_integrator_1.truncatePromptSegment)(data_integrator_1.DataIntegrator.formatBillsSummary(serverBills));
        const cardsSummary = (0, data_integrator_1.truncatePromptSegment)(data_integrator_1.DataIntegrator.formatCardsSummary(serverCards, serverInvoices));
        const patrimonioVisaoGerencialStr = data_integrator_1.DataIntegrator.formatPatrimonioVisaoGerencial(resolvedAssets, resolvedPassives);
        const assetsSource = (assets && assets.length > 0) ? 'frontend' : 'server';
        const passivesSource = (passives && passives.length > 0) ? 'frontend' : 'server';
        logger.info(`[DEBUG] Resolvidos via ${assetsSource}/${passivesSource}: ${resolvedAssets.length} ativos, ${resolvedPassives.length} passivos, ${serverBills.length} contas, ${serverCards.length} cartões`);
        const validHistory = Array.isArray(history) ? history.filter((h) => h && h.text && h.text.trim()) : [];
        let marketData = "";
        const extracted = extractTickersFallback(prompt);
        if (extracted.b3.length > 0 || extracted.crypto.length > 0) {
            marketData = await fetchAllMarketData(extracted.b3, extracted.crypto, brapiToken, prompt, validHistory);
        }
        if (validHistory.length > 0 && marketData && /quando|horário|horario|data|dia|atualização|atualizacao|cotação|cotacao|qual.*hora|que.*hora|qual.*dia|que.*dia/i.test(prompt) && marketData.includes('cotação de')) {
            logger.info("✅ Follow-up timestamp");
            return { success: true, answer: `Os dados que forneci já incluem data e horário:\n\n${marketData}`, context: { intent: 'timestamp_clarification', model: 'system' } };
        }
        const userCorrectionPatterns = [/não é|nao é/i, /está errado|esta errado/i, /na verdade|na realidade/i, /sinto te dizer/i, /você está enganado|voce esta enganado/i, /isso não está certo|isso nao esta certo/i, /correto é|o certo é/i, /é na verdade|e na verdade/i];
        const isUserCorrection = userCorrectionPatterns.some(p => p.test(prompt));
        if (isUserCorrection && validHistory.length > 0)
            logger.info("🔄 Usuário corrigindo informação - forçando busca web");
        const analyzedContext = discretion_engine_1.DiscretionEngine.analyzeContext(prompt, validHistory, {
            hasGoals: userData.goals.length > 0,
            hasRecentTransactions: userData.recentTransactions.length > 0,
            hasSimulations: userData.simulations.length > 0
        });
        const context = {
            ...analyzedContext,
            responseMode: /\[PROTOCOL:\s*STRATEGIC_BRIEFING\]/i.test(prompt)
                ? 'strategic_briefing'
                : 'concise',
        };
        let transactionsForPrompt = "Nenhuma transação registrada.";
        if (userData.recentTransactions && userData.recentTransactions.length > 0) {
            transactionsForPrompt = (0, data_integrator_1.truncatePromptSegment)(data_integrator_1.DataIntegrator.formatTransactionsForPrompt(userData.recentTransactions, {
                ...context,
                requestedFocus: context.intent === 'cashflow_query' ? 'cashflow' : context.intent === 'patrimony_query' ? 'patrimony' : 'general'
            }));
        }
        let goalsForPrompt = "Nenhuma meta definida.";
        if (goals && goals.length > 0) {
            const mappedGoals = goals.map((g) => {
                const nome = g.nome || g.name || 'Meta sem nome';
                const valorBruto = g.valor ?? g.targetAmount ?? 0;
                const valorNumerico = typeof valorBruto === 'number' ? valorBruto : parseFloat(valorBruto || '0');
                const frequencia = g.frequencia || g.frequency || 'N/A';
                return `• ${nome}: R$ ${valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${frequencia})`;
            }).join('\n');
            goalsForPrompt = (0, data_integrator_1.truncatePromptSegment)(`**METAS DO USUÁRIO (${goals.length}):**\n${mappedGoals}`);
        }
        else if (userData.goals && userData.goals.length > 0) {
            goalsForPrompt = (0, data_integrator_1.truncatePromptSegment)(data_integrator_1.DataIntegrator.formatGoalsForPrompt(userData.goals, context));
        }
        let avoidRepetition = "";
        if (validHistory.length >= 2) {
            const lastTwoUserMessages = validHistory.filter((h) => h.role === 'user').slice(-2);
            if (lastTwoUserMessages.length === 2) {
                const areSimilar = lastTwoUserMessages[0].text.toLowerCase().trim() === lastTwoUserMessages[1].text.toLowerCase().trim();
                if (areSimilar) {
                    logger.warn("🔄 Pergunta repetida detectada");
                    avoidRepetition = "\n\n**IMPORTANTE:** O usuário fez a mesma pergunta novamente. NÃO repita a resposta anterior idêntica. Se já respondeu, reconheça isso brevemente e ofereça expandir algum ponto específico.";
                }
            }
        }
        const deterministicFacts = financial_facts_1.FinancialFactsEngine.computeFacts({
            transactions: (transactions && transactions.length > 0) ? transactions : userData.recentTransactions,
            goals: (goals && goals.length > 0) ? goals : userData.goals,
            debts: serverDebts,
            assets: resolvedAssets,
            passives: resolvedPassives,
            bills: serverBills,
            cards: serverCards,
            invoices: serverInvoices,
            financialProfile: userData.financialProfile,
        });
        const financialFactsSection = financial_facts_1.FinancialFactsEngine.formatForPrompt(deterministicFacts);
        const enhancedSystemPrompt = prompt_builder_1.PromptBuilder.buildSystemPrompt({
            userName: safeUserName,
            context,
            marketData,
            userData,
            assetsSummary,
            passivesSummary,
            patrimonioVisaoGerencialStr,
            debtsSummary,
            billsSummary,
            cardsSummary,
            isFirst,
            historyDescription,
            avoidRepetition,
            isUserCorrection,
            transactionsForPrompt,
            goalsForPrompt,
            financialFactsSection,
        });
        const messages = [
            ...validHistory.slice(-6).map((h) => ({
                role: h.role === 'ai' || h.role === 'assistant' ? 'assistant' : 'user',
                content: h.text
            })),
            { role: "user", content: prompt }
        ];
        logger.info('[Router] Primeira chamada para análise...');
        const quota = await checkNexusQuota((0, firestore_1.getFirestore)(), userId, userPlan);
        if (!quota.allowed) {
            logger.warn(`[Quota] Cota diária esgotada (${quota.used}/${quota.quota})`);
            throw new https_1.HttpsError('resource-exhausted', 'Limite diário de mensagens do Nexus atingido para o seu plano. Tente novamente amanhã.');
        }
        const firstResponse = await router.routeRequest(messages, enhancedSystemPrompt, {
            temperature: 0.6,
            maxTokens: 1200,
            cacheScope: userId,
            fallbackContext: { primaryIntent: context.intent, userName: safeUserName }
        });
        let finalAnswer = firstResponse.content || "Desculpe, estou com instabilidade momentânea.";
        const webSearchMatch = finalAnswer.match(/\[BUSCAR_WEB:\s*(.+?)\]/i);
        if (webSearchMatch) {
            const searchQuery = webSearchMatch[1].trim();
            logger.info(`[WebSearch] 🔍 Nexus solicitou busca: "${searchQuery}"`);
            const tavilyApiKey = process.env.TAVILY_API_KEY;
            const searchResult = await searchWebCascade(searchQuery, tavilyApiKey);
            logger.info('[Router] Segunda chamada com resultado da busca...');
            const messagesWithSearch = [
                ...messages,
                { role: "assistant", content: `[Realizei uma busca e encontrei: ${searchResult}]` },
                { role: "user", content: `Com base nos resultados da busca, responda a pergunta original: "${prompt}"` }
            ];
            const secondResponse = await router.routeRequest(messagesWithSearch, enhancedSystemPrompt, {
                temperature: 0.6,
                maxTokens: 1200,
                cacheScope: userId,
                fallbackContext: { primaryIntent: context.intent, userName: safeUserName }
            });
            finalAnswer = secondResponse.content || finalAnswer;
            logger.info(`[Router] ✅ Resposta final com busca de: ${secondResponse.provider}`);
        }
        else {
            logger.info(`[Router] ✅ Resposta direta de: ${firstResponse.provider} (${firstResponse.model})`);
        }
        finalAnswer = finalAnswer
            .replace(/\[BUSCAR_WEB:.*?\]/gi, '')
            .replace(/\[Realizei uma busca.*?\]/gi, '')
            .replace(/<function.*?>.*?<\/function>/g, '')
            .replace(/\[.*?"function".*?\]/g, '')
            .trim();
        const analysisBasis = buildAnalysisBasis(userData, historyDescription, {
            debts: serverDebts,
            assets: resolvedAssets,
            passives: resolvedPassives,
            bills: serverBills,
            cards: serverCards,
        });
        const { cleanText, actions, decision } = action_registry_1.ActionManager.parseDecision(finalAnswer, analysisBasis);
        return {
            success: true,
            answer: cleanText,
            context: {
                model: firstResponse.provider,
                intent: context.intent,
                hasTransactions: userData.recentTransactions.length > 0,
                hasGoals: userData.goals.length > 0,
                actions: actions.length > 0 ? actions : undefined,
                analysisBasis,
                decisionObject: decision,
                deterministicFacts,
            }
        };
    }
    catch (error) {
        logger.error("Erro Nexus:", error);
        return { success: false, answer: "Desculpe, ocorreu um erro temporário. Por favor, tente novamente.", error: error.message };
    }
});
//# sourceMappingURL=askAiAdvisor.js.map