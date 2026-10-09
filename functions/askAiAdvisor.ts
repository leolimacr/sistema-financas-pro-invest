import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { NexusIdentity } from "./nexus-core/identity";
import { DiscretionEngine } from "./nexus-core/discretion-engine";
import type { UserDataResult } from "./nexus-core/data-integrator";
import { DataIntegrator, truncatePromptSegment } from "./nexus-core/data-integrator";
import { MultiModelRouter } from "./nexus-core/MultiModelRouter";
import { PromptBuilder } from "./nexus-core/prompt-builder";
import { ActionManager } from "./nexus-core/action-registry";
import { FinancialFactsEngine } from "./nexus-core/financial-facts";
import {
  GEMINI_API_KEY as GEMINI_API_KEY_SECRET,
  OPENROUTER_API_KEY as OPENROUTER_API_KEY_SECRET,
  GROQ_API_KEY as GROQ_API_KEY_SECRET,
  BRAPI_TOKEN as BRAPI_TOKEN_SECRET,
  TAVILY_API_KEY as TAVILY_API_KEY_SECRET,
} from './secrets';

interface CryptoPriceData { price: number; lastUpdated: string; }
interface CryptoPriceDataDual { priceUSD: number; priceBRL: number; lastUpdated: string; }

interface NexusAnalysisBasis {
  generatedAt: string;
  dataStatus: UserDataResult['dataStatus'];
  sources: string[];
  period: string;
  limitations: string[];
}

function buildAnalysisBasis(
  userData: UserDataResult,
  historyDescription: string,
  serverData: { debts: unknown[]; assets: unknown[]; passives: unknown[]; bills: unknown[]; cards: unknown[] },
): NexusAnalysisBasis {
  const sources: string[] = [];
  if (userData.recentTransactions.length > 0) sources.push('lançamentos recentes');
  if (userData.goals.length > 0) sources.push('metas financeiras');
  if (serverData.debts.length > 0) sources.push('dívidas cadastradas');
  if (serverData.assets.length > 0 || serverData.passives.length > 0) sources.push('patrimônio cadastrado');
  if (serverData.bills.length > 0 || serverData.cards.length > 0) sources.push('contas e cartões');

  const limitations: string[] = [];
  if (userData.dataStatus === 'error') limitations.push('Não foi possível carregar parte dos dados financeiros nesta resposta.');
  if (userData.recentTransactions.length === 0) limitations.push('Não há lançamentos recentes disponíveis para análise de fluxo.');
  if (sources.length === 0) limitations.push('O diagnóstico está limitado porque ainda não há dados financeiros cadastrados.');

  return {
    generatedAt: new Date().toISOString(),
    dataStatus: userData.dataStatus,
    sources,
    period: historyDescription,
    limitations,
  };
}

export async function getUserPlan(userId: string): Promise<string | undefined> {
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      const sub = data?.subscription as { plan?: string; planId?: string; status?: string } | undefined;
      // N10: legado lê `plan`, mas cnova verdade inclui `planId` + `status`.
      // Plano pago só vale com assinatura ativa (ou sem status = legado sem billing).
      const active = !sub?.status || sub.status === 'active' || sub.status === 'trialing';
      if (typeof sub?.plan === 'string' && sub.plan && (active || sub.plan === 'free')) {
        return sub.plan;
      }
      if (typeof sub?.planId === 'string' && active) {
        const legacy = sub.planId.toLowerCase();
        if (['free', 'pro', 'premium', 'premium_anual'].includes(legacy)) return legacy;
      }
      // Fallback: campo `plan` presente mas com status inativo explícito → trata como ausente.
      if (typeof sub?.plan === 'string' && sub.plan && !active) {
        logger.info(`[Subscription] Plano ${sub.plan} com status inativo (${sub.status}); usando padrão`);
        return undefined;
      }
    }
    logger.info(`[Subscription] Usuário sem plano definido (usando padrão)`);
    return undefined;
  } catch (error: any) {
    logger.error(`[Subscription] Erro ao buscar plano: ${error.message}`);
    return undefined;
  }
}

/**
 * Cota diária do Nexus por plano, imposta no servidor (N3). O limite do app
 * (Preferences local) é burlável por dispositivo; sem isto, qualquer cliente
 * autenticado chama o LLM sem teto. Valores INTERINOS (política definitiva na
 * Etapa 7); o free espelha o teto do app (5/dia), pagos são generosos.
 */
export const NEXUS_QUOTA_INTERIM: Record<string, number> = {
  free: 5,
  pro: 100,
  premium: 500,
  premium_anual: 1000,
};
const NEXUS_QUOTA_DEFAULT = 5;

export function nexusQuotaDay(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function nexusQuotaForPlan(plan?: string): number {
  if (plan && plan in NEXUS_QUOTA_INTERIM) return NEXUS_QUOTA_INTERIM[plan];
  return NEXUS_QUOTA_DEFAULT;
}

export async function checkNexusQuota(
  db: { collection: (path: string) => { doc: (id: string) => { get(): Promise<{ data(): Record<string, unknown> | undefined }>; set(data: Record<string, unknown>, opts?: unknown): Promise<unknown> } } },
  uid: string,
  plan?: string,
  dayStr?: string,
): Promise<{ allowed: boolean; used: number; quota: number }> {
  const quota = nexusQuotaForPlan(plan);
  const day = dayStr ?? nexusQuotaDay();
  const ref = db.collection(`users/${uid}/nexusQuota`).doc(day);
  const snap = await ref.get();
  const used = typeof snap.data()?.count === 'number' ? (snap.data() as { count: number }).count : 0;
  if (used >= quota) return { allowed: false, used, quota };
  await ref.set({ count: used + 1, updatedAt: new Date().toISOString() }, { merge: true });
  return { allowed: true, used: used + 1, quota };
}

async function getUserDebts(userId: string): Promise<any[]> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('users').doc(userId).collection('dividas').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    logger.error(`[Debts] Erro ao buscar dívidas: ${error.message}`);
    return [];
  }
}

async function getUserAssets(userId: string): Promise<any[]> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('users').doc(userId).collection('ativos').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    logger.error(`[Assets] Erro ao buscar ativos: ${error.message}`);
    return [];
  }
}

async function getUserPassives(userId: string): Promise<any[]> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('users').doc(userId).collection('passivos').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    logger.error(`[Passives] Erro ao buscar passivos: ${error.message}`);
    return [];
  }
}

async function getUserBills(userId: string): Promise<any[]> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('users').doc(userId).collection('contas_fixas').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    logger.error(`[Bills] Erro ao buscar contas fixas: ${error.message}`);
    return [];
  }
}

async function getUserCards(userId: string): Promise<any[]> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('users').doc(userId).collection('cartoes').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    logger.error(`[Cards] Erro ao buscar cartões: ${error.message}`);
    return [];
  }
}

async function getUserInvoices(userId: string): Promise<any[]> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('users').doc(userId).collection('faturas').limit(20).get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    logger.error(`[Invoices] Erro ao buscar faturas: ${error.message}`);
    return [];
  }
}

function describeHistoryWindow(plan?: string): string {
  switch (plan) {
    case 'free': return 'Você está no plano Free, então posso analisar apenas os últimos 3 dias do seu histórico';
    case 'pro': return 'Você está no plano Pro, então posso analisar os últimos 30 dias do seu histórico';
    case 'premium': return 'Você está no plano Premium, então posso analisar os últimos 90 dias do seu histórico';
    case 'premium_anual': return 'Você está no plano Premium Anual, então posso analisar todo o seu histórico de lançamentos (ilimitado)';
    default: return 'analiso um recorte recente do seu histórico, definido pelo seu plano';
  }
}

const TAVILY_MONTHLY_LIMIT = 1000;

function tavilyPeriodKey(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Cota mensal do Tavily persistida em Firestore (N4). O contador anterior era
 * uma variável em memória por instância — zerava a cada cold start/scale-out
 * e o "teto" nunca era imposto. Leitura + incremento por busca web (não por
 * mensagem); pequena corrida entre chamadas simultâneas é tolerada.
 */
export async function checkTavilyQuota(
  db: { collection: (path: string) => { doc: (id: string) => { get(): Promise<{ data(): Record<string, unknown> | undefined }>; set(data: Record<string, unknown>, opts?: unknown): Promise<unknown> } } },
  now: Date = new Date(),
): Promise<boolean> {
  const ref = db.collection('system').doc(`apiUsage_tavily_${tavilyPeriodKey(now)}`);
  const snap = await ref.get();
  const used = typeof snap.data()?.count === 'number' ? (snap.data() as { count: number }).count : 0;
  if (used >= TAVILY_MONTHLY_LIMIT) {
    logger.warn(`[Tavily] Cota mensal esgotada (${used}/${TAVILY_MONTHLY_LIMIT})`);
    return false;
  }
  await ref.set({ count: FieldValue.increment(1), updatedAt: new Date().toISOString() }, { merge: true });
  return true;
}

async function searchWebTavily(query: string, apiKey: string): Promise<string | null> {
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
    if (!response.ok) { logger.error(`[Tavily] HTTP ${response.status}`); return null; }
    const data: any = await response.json();
    if (data.answer) { logger.info('[Tavily] ✅ Resposta obtida'); return data.answer; }
    if (data.results && data.results.length > 0) {
      const summary = data.results.slice(0, 3).map((r: any) => r.content || r.snippet || '').filter((s: string) => s.length > 0).join('\n\n');
      if (summary.length > 0) { logger.info('[Tavily] ✅ Resultados concatenados'); return summary; }
    }
    return null;
  } catch (error: any) {
    logger.error('[Tavily] Erro:', error.message);
    return null;
  }
}

async function searchWebCascade(query: string, tavilyKey: string): Promise<string> {
  logger.info(`[WebSearch] Busca Tavily para: "${query}"`);
  try {
    if (await checkTavilyQuota(getFirestore())) {
      const tavilyResult = await searchWebTavily(query, tavilyKey);
      if (tavilyResult) return tavilyResult;
    }
  } catch (error: any) {
    logger.error('[WebSearch] Falha na cota/busca Tavily:', error?.message);
  }
  logger.warn('[WebSearch] Sem resultado de busca disponível');
  return "Não consegui obter informações atualizadas no momento. Tente novamente em alguns instantes.";
}

async function fetchSafe(url: string, timeout = 8000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response.ok ? await response.json() : null;
  } catch (e) {
    logger.warn(`fetchSafe timeout/falha para ${url}`);
    return null;
  }
}

async function fetchCryptoPrices(cryptos: string[]): Promise<Record<string, CryptoPriceData>> {
  const results: Record<string, CryptoPriceData> = {};
  if (!cryptos.length) return results;
  try {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
      'BNB': 'binancecoin', 'ADA': 'cardano', 'XRP': 'ripple',
      'DOGE': 'dogecoin', 'DOT': 'polkadot', 'AVAX': 'avalanche-2'
    };
    const coinIds = cryptos.map(c => mapping[c.toUpperCase()] || c.toLowerCase()).join(',');
    const data = await fetchSafe(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=brl`, 5000);
    if (data) {
      const nowBR = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      Object.entries(data).forEach(([id, info]: [string, any]) => {
        const symbol = cryptos.find(c => id.includes(c.toLowerCase()))?.toUpperCase() || id.toUpperCase();
        results[symbol] = { price: info.brl, lastUpdated: nowBR };
      });
      logger.info(`CoinGecko BRL: ${Object.keys(results).join(', ')}`);
    }
  } catch (error) { logger.error("Erro fetchCryptoPrices", error); }
  return results;
}

async function fetchCryptoPricesDual(cryptos: string[]): Promise<Record<string, CryptoPriceDataDual>> {
  const results: Record<string, CryptoPriceDataDual> = {};
  if (!cryptos.length) return results;
  try {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
      'BNB': 'binancecoin', 'ADA': 'cardano', 'XRP': 'ripple',
      'DOGE': 'dogecoin', 'DOT': 'polkadot', 'AVAX': 'avalanche-2'
    };
    const coinIds = cryptos.map(c => mapping[c.toUpperCase()] || c.toLowerCase()).join(',');
    const data = await fetchSafe(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd,brl`, 5000);
    if (data) {
      const nowBR = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      Object.entries(data).forEach(([id, info]: [string, any]) => {
        const symbol = cryptos.find(c => id.includes(c.toLowerCase()))?.toUpperCase() || id.toUpperCase();
        results[symbol] = { priceUSD: info.usd, priceBRL: info.brl, lastUpdated: nowBR };
      });
      logger.info(`CoinGecko USD+BRL: ${Object.keys(results).join(', ')}`);
    }
  } catch (error) { logger.error("Erro fetchCryptoPricesDual", error); }
  return results;
}

async function fetchAllMarketData(tickers: string[], cryptos: string[], token: string, prompt: string, history: any[]): Promise<string> {
  const results: string[] = [];
  let hasAnyData = false;
  const needsUSDExplicit = /dólar|dolar|usd|dollar|us\$/i.test(prompt);
  let needsUSDContext = false;
  if (history.length > 0) {
    const lastTwoMsgs = history.slice(-2);
    needsUSDContext = lastTwoMsgs.some((h: any) => /dólar|dolar|usd|dollar|US\$/i.test(h.text || ''));
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
    } else {
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
      const stockRes = await Promise.allSettled(
        stocks.map(async ticker => {
          try {
            const url = `https://brapi.dev/api/quote/${ticker.toUpperCase()}?token=${token}`;
            const d: any = await fetchSafe(url, 6000);
            if (d?.results?.[0]?.regularMarketPrice) {
              const time = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
              const date = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
              return `${ticker}: R$ ${d.results[0].regularMarketPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (cotação de ${date} às ${time})`;
            }
            return null;
          } catch (err) { return null; }
        })
      );
      stockRes.forEach(result => {
        if (result.status === 'fulfilled' && result.value) { results.push(result.value); hasAnyData = true; }
      });
    } catch (error) { logger.error("Erro busca ações", error); }
  }
  return hasAnyData ? results.join('\n') : "";
}

function extractTickersFallback(prompt: string): { b3: string[], crypto: string[] } {
  const result = { b3: [] as string[], crypto: [] as string[] };
  const upperPrompt = prompt.toUpperCase();
  const lowerPrompt = prompt.toLowerCase();
  const b3Regex = /\b([A-Z]{4}\d{1,2})\b/g;
  let match;
  while ((match = b3Regex.exec(upperPrompt)) !== null) result.b3.push(match[1]);
  const companyMap: Record<string, { type: 'b3' | 'crypto', ticker: string }> = {
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
      if (item.type === 'b3') result.b3.push(item.ticker);
      if (item.type === 'crypto') result.crypto.push(item.ticker);
    }
  });
  result.b3 = [...new Set(result.b3)];
  result.crypto = [...new Set(result.crypto)];
  return result;
}

export const askAiAdvisor = onCall(
  {
    memory: "1GiB",
    timeoutSeconds: 120,
    region: "us-central1",
    secrets: [
      GEMINI_API_KEY_SECRET,
      OPENROUTER_API_KEY_SECRET,
      GROQ_API_KEY_SECRET,
      BRAPI_TOKEN_SECRET,
      TAVILY_API_KEY_SECRET,
    ],
  },
  async (request) => {
    const geminiApiKey = process.env.GEMINI_API_KEY as string;
    const groqApiKey = process.env.GROQ_API_KEY as string;
    const openrouterApiKey = process.env.OPENROUTER_API_KEY as string;
    const brapiToken = process.env.BRAPI_TOKEN as string;
    const router = MultiModelRouter.getInstance();
    router.updateApiKeys({ gemini: geminiApiKey, groq: groqApiKey, openrouter: openrouterApiKey });
    try {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login necessário.");
      const { prompt, userName, history = [], isFirstInteraction, context: frontendContext = {} } = request.data;
      const { assets = [], passives = [], goals = [], transactions = [] } = frontendContext;
      const safeUserName = (userName || "Investidor").split(' ')[0];
      const userId = request.auth.uid;

      let isFirst: boolean;
      if (typeof isFirstInteraction === 'boolean') {
        isFirst = isFirstInteraction;
        logger.info(`[FirstMsg] Flag explícito do Flutter: ${isFirst}`);
      } else {
        const validHistory = Array.isArray(history) ? history.filter((h: any) => h && h.text && h.text.trim() && h.role !== 'system') : [];
        isFirst = validHistory.length === 0;
        logger.info(`[FirstMsg] Auto-detectado: ${isFirst} (validHistLen=${validHistory.length})`);
      }

      logger.info(`[History] Total: ${history.length}`);
      logger.info(`[${safeUserName}] isFirst=${isFirst}: "${prompt.substring(0, 80)}..."`);

      if (isFirst) {
        const cleanPrompt = prompt.trim().toLowerCase().replace(/[.,!?;:\(\)\[\]]/g, '').replace(/\s+/g, ' ');
        const simpleGreetings = ['oi', 'olá', 'ola', 'oie', 'opa', 'eai', 'e ai', 'e aí', 'bom dia', 'boa tarde', 'boa noite', 'ei', 'hey', 'hi', 'hello', 'alô', 'alo', 'fala', 'fala aí', 'fala ai', 'beleza'];
        if (simpleGreetings.includes(cleanPrompt)) {
          const greeting = NexusIdentity.getInitialGreeting(safeUserName);
          logger.info("✅ Saudação simples detectada");
          return { success: true, answer: greeting, context: { intent: 'greeting', model: 'system' } };
        }
      }

      let userData: UserDataResult;
      let historyDescription = 'analiso um recorte recente do seu histórico, definido pelo seu plano';
      let serverDebts: any[] = [];
      let serverAssets: any[] = [];
      let serverPassives: any[] = [];
      let serverBills: any[] = [];
      let serverCards: any[] = [];
      let serverInvoices: any[] = [];
      let userPlan: string | undefined;
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
        userData = await DataIntegrator.gatherUserData(userId, userPlan);
      } catch (dataError: any) {
        logger.error("Falha dados usuário:", dataError);
        userData = { goals: [], recentTransactions: [], simulations: [], summary: '', hasData: false, dataStatus: 'error' };
      }

      // Fallback server-side: se frontend não enviou assets/passives, usa dados do Firestore
      const resolvedAssets = (assets && assets.length > 0) ? assets : serverAssets;
      const resolvedPassives = (passives && passives.length > 0) ? passives : serverPassives;
      logger.info(`[DEBUG] Metas em userData: ${userData?.goals?.length || 0}; hasData: ${userData?.hasData}`);

      const assetsSummary = DataIntegrator.formatAssetsSummary(resolvedAssets);
      const passivesSummary = DataIntegrator.formatPassivesSummary(resolvedPassives);
      const debtsSummary = truncatePromptSegment(DataIntegrator.formatDebtsSummary(serverDebts));
      const billsSummary = truncatePromptSegment(DataIntegrator.formatBillsSummary(serverBills));
      const cardsSummary = truncatePromptSegment(DataIntegrator.formatCardsSummary(serverCards, serverInvoices));
      const patrimonioVisaoGerencialStr = DataIntegrator.formatPatrimonioVisaoGerencial(resolvedAssets, resolvedPassives);

      const assetsSource = (assets && assets.length > 0) ? 'frontend' : 'server';
      const passivesSource = (passives && passives.length > 0) ? 'frontend' : 'server';
      logger.info(`[DEBUG] Resolvidos via ${assetsSource}/${passivesSource}: ${resolvedAssets.length} ativos, ${resolvedPassives.length} passivos, ${serverBills.length} contas, ${serverCards.length} cartões`);

      const validHistory = Array.isArray(history) ? history.filter((h: any) => h && h.text && h.text.trim()) : [];

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
      if (isUserCorrection && validHistory.length > 0) logger.info("🔄 Usuário corrigindo informação - forçando busca web");

      const analyzedContext = DiscretionEngine.analyzeContext(prompt, validHistory, {
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
        transactionsForPrompt = truncatePromptSegment(DataIntegrator.formatTransactionsForPrompt(userData.recentTransactions, {
          ...context,
          requestedFocus: context.intent === 'cashflow_query' ? 'cashflow' : context.intent === 'patrimony_query' ? 'patrimony' : 'general'
        }));
      }

      let goalsForPrompt = "Nenhuma meta definida.";
      if (goals && goals.length > 0) {
        const mappedGoals = goals.map((g: any) => {
          const nome = g.nome || g.name || 'Meta sem nome';
          const valorBruto = g.valor ?? g.targetAmount ?? 0;
          const valorNumerico = typeof valorBruto === 'number' ? valorBruto : parseFloat(valorBruto || '0');
          const frequencia = g.frequencia || g.frequency || 'N/A';
          return `• ${nome}: R$ ${valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${frequencia})`;
        }).join('\n');
        goalsForPrompt = truncatePromptSegment(`**METAS DO USUÁRIO (${goals.length}):**\n${mappedGoals}`);
      } else if (userData.goals && userData.goals.length > 0) {
        goalsForPrompt = truncatePromptSegment(DataIntegrator.formatGoalsForPrompt(userData.goals, context));
      }

      let avoidRepetition = "";
      if (validHistory.length >= 2) {
        const lastTwoUserMessages = validHistory.filter((h: any) => h.role === 'user').slice(-2);
        if (lastTwoUserMessages.length === 2) {
          const areSimilar = lastTwoUserMessages[0].text.toLowerCase().trim() === lastTwoUserMessages[1].text.toLowerCase().trim();
          if (areSimilar) {
            logger.warn("🔄 Pergunta repetida detectada");
            avoidRepetition = "\n\n**IMPORTANTE:** O usuário fez a mesma pergunta novamente. NÃO repita a resposta anterior idêntica. Se já respondeu, reconheça isso brevemente e ofereça expandir algum ponto específico.";
          }
        }
      }

      // CÁLCULO DETERMINÍSTICO DE FATOS CONTÁBEIS (MOTOR SOBERANO)
      const deterministicFacts = FinancialFactsEngine.computeFacts({
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
      const financialFactsSection = FinancialFactsEngine.formatForPrompt(deterministicFacts);

      // CONSTRUÇÃO DO PROMPT VIA PROMPTBUILDER
      const enhancedSystemPrompt = PromptBuilder.buildSystemPrompt({
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
        ...validHistory.slice(-6).map((h: any) => ({
          role: h.role === 'ai' || h.role === 'assistant' ? 'assistant' : 'user',
          content: h.text
        })),
        { role: "user", content: prompt }
      ];

      logger.info('[Router] Primeira chamada para análise...');

      // N3: imposição técnica da cota (greetings/bloqueios CVM acima não consomem).
      const quota = await checkNexusQuota(getFirestore(), userId, userPlan);
      if (!quota.allowed) {
        logger.warn(`[Quota] Cota diária esgotada (${quota.used}/${quota.quota})`);
        throw new HttpsError('resource-exhausted', 'Limite diário de mensagens do Nexus atingido para o seu plano. Tente novamente amanhã.');
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
        const tavilyApiKey = process.env.TAVILY_API_KEY as string;
        const searchResult = await searchWebCascade(searchQuery, tavilyApiKey);
        logger.info('[Router] Segunda chamada com resultado da busca...');
        const messagesWithSearch = [
          ...messages,
          { role: "assistant" as const, content: `[Realizei uma busca e encontrei: ${searchResult}]` },
          { role: "user" as const, content: `Com base nos resultados da busca, responda a pergunta original: "${prompt}"` }
        ];

        // Para a segunda chamada, também usamos o PromptBuilder (ele já lida com isUserCorrection internamente)
        const secondResponse = await router.routeRequest(messagesWithSearch, enhancedSystemPrompt, {
          temperature: 0.6,
          maxTokens: 1200,
          cacheScope: userId,
          fallbackContext: { primaryIntent: context.intent, userName: safeUserName }
        });
        finalAnswer = secondResponse.content || finalAnswer;
        logger.info(`[Router] ✅ Resposta final com busca de: ${secondResponse.provider}`);
      } else {
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

      const { cleanText, actions, decision } = ActionManager.parseDecision(finalAnswer, analysisBasis);

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

    } catch (error: any) {
      logger.error("Erro Nexus:", error);
      return { success: false, answer: "Desculpe, ocorreu um erro temporário. Por favor, tente novamente.", error: error.message };
    }
  }
);
