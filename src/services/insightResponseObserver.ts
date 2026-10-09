import type { UserContext, NexusInsight } from './nexusInsightEngine';

export type InsightDomain =
  | 'protecao'
  | 'cartao'
  | 'orcamento'
  | 'dividas'
  | 'investimentos'
  | 'metas'
  | 'caixa';

export interface InsightTrace {
  insightId: string;
  domain: InsightDomain;
  shownAt: number;
  deepLink: string;
  metricKey: string;
  metricValue: number;
  navigated: boolean;
}

export interface FollowUpResult {
  text: string;
  domain: InsightDomain;
}

export interface DomainBehaviorEntry {
  domain: InsightDomain;
  shownCount: number;
  navigatedCount: number;
  improvedCount: number;
  lastShownAt: number;
  lastResponseAt: number;
}

const STORAGE_KEY = 'fpi-insight-traces-v1';
const BEHAVIOR_KEY = 'fpi-domain-behavior-v1';
const MAX_TRACES = 15;
const FOLLOW_UP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

let activeUserId: string | null = null;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function setActiveBehaviorUserId(userId: string | null): void {
  activeUserId = userId;
  if (userId) {
    syncBehaviorWithRemote(userId).catch(() => {});
  }
}

export function mergeDomainBehaviors(
  local: Record<string, DomainBehaviorEntry>,
  remote: Record<string, DomainBehaviorEntry>
): Record<string, DomainBehaviorEntry> {
  const merged: Record<string, DomainBehaviorEntry> = { ...local };
  for (const [key, remoteEntry] of Object.entries(remote)) {
    const localEntry = merged[key];
    if (!localEntry) {
      merged[key] = { ...remoteEntry };
    } else {
      merged[key] = {
        domain: localEntry.domain,
        shownCount: Math.max(localEntry.shownCount, remoteEntry.shownCount),
        navigatedCount: Math.max(localEntry.navigatedCount, remoteEntry.navigatedCount),
        improvedCount: Math.max(localEntry.improvedCount, remoteEntry.improvedCount),
        lastShownAt: Math.max(localEntry.lastShownAt, remoteEntry.lastShownAt),
        lastResponseAt: Math.max(localEntry.lastResponseAt, remoteEntry.lastResponseAt),
      };
    }
  }
  return merged;
}

export function mergeTraces(
  local: InsightTrace[],
  remote: InsightTrace[],
  maxTraces = MAX_TRACES
): InsightTrace[] {
  const traceMap = new Map<string, InsightTrace>();
  for (const t of local) {
    traceMap.set(t.insightId, t);
  }
  for (const r of remote) {
    const existing = traceMap.get(r.insightId);
    if (existing) {
      traceMap.set(r.insightId, {
        ...existing,
        navigated: existing.navigated || r.navigated,
        shownAt: Math.max(existing.shownAt, r.shownAt),
      });
    } else {
      traceMap.set(r.insightId, r);
    }
  }
  return Array.from(traceMap.values())
    .sort((a, b) => b.shownAt - a.shownAt)
    .slice(0, maxTraces);
}

export async function syncBehaviorWithRemote(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const { doc, getDoc, setDoc } = await import('firebase/firestore');
    const { firestore } = await import('../firebase');
    if (!firestore) return;

    const ref = doc(firestore, 'users', userId, 'nexus_behavior', 'state');
    const snap = await getDoc(ref);
    const localTraces = readTraces();
    const localBehavior = readDomainBehavior();

    if (snap.exists()) {
      const data = snap.data() as {
        traces?: InsightTrace[];
        behavior?: Record<string, DomainBehaviorEntry>;
      };
      const remoteTraces = data?.traces || [];
      const remoteBehavior = data?.behavior || {};

      const mergedTraces = mergeTraces(localTraces, remoteTraces, MAX_TRACES);
      const mergedBehavior = mergeDomainBehaviors(localBehavior, remoteBehavior);

      writeTraces(mergedTraces);
      writeDomainBehavior(mergedBehavior);

      await setDoc(
        ref,
        {
          traces: mergedTraces,
          behavior: mergedBehavior,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } else if (localTraces.length > 0 || Object.keys(localBehavior).length > 0) {
      await setDoc(
        ref,
        {
          traces: localTraces,
          behavior: localBehavior,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }
  } catch {
    // Falha silenciosa para garantir operação contínua offline
  }
}

function scheduleRemoteSync(userId?: string): void {
  const targetUid = userId || activeUserId;
  if (!targetUid) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { firestore } = await import('../firebase');
      if (!firestore) return;
      const ref = doc(firestore, 'users', targetUid, 'nexus_behavior', 'state');
      await setDoc(
        ref,
        {
          traces: readTraces(),
          behavior: readDomainBehavior(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch {
      // Silencia
    }
  }, 1000);
}

function readTraces(): InsightTrace[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeTraces(traces: InsightTrace[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(traces));
    }
  } catch {
    /* localStorage full — silencia */
  }
}

function readDomainBehavior(): Record<string, DomainBehaviorEntry> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(BEHAVIOR_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeDomainBehavior(behaviors: Record<string, DomainBehaviorEntry>): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(behaviors));
    }
  } catch {
    /* silencia */
  }
}

function ensureEntry(behavior: Record<string, DomainBehaviorEntry>, domain: InsightDomain): DomainBehaviorEntry {
  if (!behavior[domain]) {
    behavior[domain] = { domain, shownCount: 0, navigatedCount: 0, improvedCount: 0, lastShownAt: 0, lastResponseAt: 0 };
  }
  return behavior[domain];
}

export function getDomain(insight: NexusInsight): InsightDomain | null {
  const id = insight.id;
  if (
    id === 'home-sovereign-deficit' ||
    id === 'home-margin-thin' ||
    id === 'central-cushion-warning' ||
    id.startsWith('nexus-event-reserve-') ||
    id.includes('cushion') ||
    id.includes('colchao') ||
    id.includes('protecao')
  ) {
    return 'protecao';
  }
  if (
    id === 'fatima_reserva' ||
    id === 'home-bill-pressure' ||
    id.startsWith('nexus-event-card-') ||
    id.includes('fatura') ||
    id.includes('cartao')
  ) {
    return 'cartao';
  }
  if (id.startsWith('budget-') || id.includes('burn-rate') || id.includes('orcamento')) {
    return 'orcamento';
  }
  if (id.startsWith('nexus-event-debt-') || id.includes('debt') || id.includes('divida') || id.includes('rotativo')) {
    return 'dividas';
  }
  if (
    id.startsWith('nexus-event-invest-') ||
    id.includes('portfolio') ||
    id.includes('asset') ||
    id.includes('invest') ||
    id.includes('ativo')
  ) {
    return 'investimentos';
  }
  if (id.startsWith('nexus-event-goal-') || id.includes('goal') || id.includes('meta')) {
    return 'metas';
  }
  if (
    id.startsWith('nexus-event-cash-') ||
    id.includes('free-balance') ||
    id.includes('caixa') ||
    id.includes('fluxo')
  ) {
    return 'caixa';
  }
  return null;
}

function extractMetric(domain: InsightDomain, ctx: UserContext): { key: string; value: number } {
  if (domain === 'protecao') {
    const buffer = (ctx.marcoZero ?? 0) + (ctx.reserveCurrent ?? 0);
    return { key: 'bufferProtecao', value: buffer };
  }
  if (domain === 'cartao') {
    const inv = ctx.upcomingCreditCardBill?.estimatedValue ?? 0;
    return { key: 'faturaRestante', value: inv };
  }
  if (domain === 'orcamento') {
    const pct = ctx.budgetProgress?.totalPercentage ?? 0;
    return { key: 'orcamentoPct', value: pct };
  }
  if (domain === 'dividas') {
    const debtsTotal = ctx.debts?.reduce((acc, d) => acc + (d.remainingAmount ?? d.totalAmount ?? 0), 0) ?? (ctx.hasDebts ? 1 : 0);
    return { key: 'dividasTotal', value: debtsTotal };
  }
  if (domain === 'investimentos') {
    const invested = ctx.totalAssetsValue ?? ctx.assets?.reduce((acc, a) => acc + (a.totalValue ?? 0), 0) ?? 0;
    return { key: 'patrimonioInvestido', value: invested };
  }
  if (domain === 'metas') {
    const goalsProgress = ctx.reserveGoalMet ? 100 : 0;
    return { key: 'progressoMetas', value: goalsProgress };
  }
  if (domain === 'caixa') {
    const free = ctx.sovereignFreeBalance ?? ctx.monthBalance ?? 0;
    return { key: 'saldoLivreCaixa', value: free };
  }
  return { key: 'desconhecido', value: 0 };
}

function formatMetric(domain: InsightDomain, value: number): string {
  if (domain === 'orcamento' || domain === 'metas') return `${Math.round(value)}%`;
  if (
    domain === 'protecao' ||
    domain === 'cartao' ||
    domain === 'dividas' ||
    domain === 'investimentos' ||
    domain === 'caixa'
  ) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  return String(value);
}

function buildFollowUp(trace: InsightTrace, ctx: UserContext): string {
  const domain = trace.domain;
  const current = extractMetric(domain, ctx);
  const delta = current.value - trace.metricValue;
  const isHigherBetter =
    domain === 'protecao' ||
    domain === 'investimentos' ||
    domain === 'metas' ||
    domain === 'caixa';
  const improved = isHigherBetter ? delta > 0 : delta < 0;

  const domainLabels: Record<InsightDomain, string> = {
    protecao: 'sugeri revisar sua proteção financeira',
    cartao: 'alertei sobre sua fatura de cartão',
    orcamento: 'apontei que seu orçamento estava sob pressão',
    dividas: 'orientei sobre a estratégia de quitação de dívidas',
    investimentos: 'recomendei calibrar sua carteira de investimentos',
    metas: 'apontei o avanço das suas metas financeiras',
    caixa: 'alertei sobre a folga do seu fluxo de caixa',
  };

  const navText = trace.navigated
    ? 'Você acessou a área indicada'
    : 'Você não acessou a área indicada';

  let outcomeText: string;
  if (domain === 'protecao') {
    outcomeText = improved
      ? 'e o valor da proteção aumentou'
      : 'e o valor da proteção continua no mesmo patamar';
  } else if (domain === 'cartao') {
    outcomeText = improved
      ? 'e o valor da fatura reduziu'
      : `e o valor da fatura segue em ${formatMetric(domain, current.value)}`;
  } else if (domain === 'orcamento') {
    outcomeText = improved
      ? 'e o ritmo de consumo reduziu'
      : `e o consumo segue em ${formatMetric(domain, current.value)}`;
  } else if (domain === 'dividas') {
    outcomeText = improved
      ? 'e o saldo devedor diminuiu'
      : `e o saldo devedor segue em ${formatMetric(domain, current.value)}`;
  } else if (domain === 'investimentos') {
    outcomeText = improved
      ? 'e seu patrimônio investido avançou'
      : `e o patrimônio segue em ${formatMetric(domain, current.value)}`;
  } else if (domain === 'metas') {
    outcomeText = improved
      ? 'e seu progresso de metas avançou'
      : 'e as metas seguem aguardando novos aportes';
  } else {
    outcomeText = improved
      ? 'e a margem de caixa livre melhorou'
      : `e a folga de caixa segue em ${formatMetric(domain, current.value)}`;
  }

  return `${domainLabels[domain]}. ${navText} ${outcomeText}.`;
}

export function traceInsightShown(insight: NexusInsight, ctx: UserContext, userId?: string): void {
  const domain = getDomain(insight);
  if (!domain) return;

  const traces = readTraces();
  const metric = extractMetric(domain, ctx);

  traces.unshift({
    insightId: insight.id,
    domain,
    shownAt: Date.now(),
    deepLink: insight.deepLink,
    metricKey: metric.key,
    metricValue: metric.value,
    navigated: false,
  });

  writeTraces(traces.slice(0, MAX_TRACES));

  const behavior = readDomainBehavior();
  const entry = ensureEntry(behavior, domain);
  entry.shownCount++;
  entry.lastShownAt = Date.now();
  writeDomainBehavior(behavior);

  scheduleRemoteSync(userId);
}

export function traceNavigation(insightId: string, userId?: string): void {
  const traces = readTraces();
  const idx = traces.findIndex((t) => t.insightId === insightId && !t.navigated);
  if (idx === -1) return;
  traces[idx] = { ...traces[idx], navigated: true };
  writeTraces(traces);

  const behavior = readDomainBehavior();
  const entry = ensureEntry(behavior, traces[idx].domain);
  entry.navigatedCount++;
  entry.lastResponseAt = Date.now();
  writeDomainBehavior(behavior);

  scheduleRemoteSync(userId);
}

export function collectFollowUp(ctx: UserContext, userId?: string): FollowUpResult | null {
  const traces = readTraces();
  const recent = traces.find((t) => Date.now() - t.shownAt <= FOLLOW_UP_WINDOW_MS);
  if (!recent) return null;

  const domain = recent.domain;
  const current = extractMetric(domain, ctx);

  const relevantChanged = current.value !== recent.metricValue;
  if (!relevantChanged && !recent.navigated) return null;

  const isHigherBetter =
    domain === 'protecao' ||
    domain === 'investimentos' ||
    domain === 'metas' ||
    domain === 'caixa';
  const improved = isHigherBetter
    ? current.value > recent.metricValue
    : current.value < recent.metricValue;

  const text = buildFollowUp(recent, ctx);

  const remaining = traces.filter((t) => t.insightId !== recent.insightId);
  writeTraces(remaining);

  const behavior = readDomainBehavior();
  const entry = ensureEntry(behavior, domain);
  if (improved) entry.improvedCount++;
  entry.lastResponseAt = Date.now();
  writeDomainBehavior(behavior);

  scheduleRemoteSync(userId);

  return { text, domain };
}

function getDomainResponse(domain: InsightDomain): {
  responseRatio: number;
  shownCount: number;
  navigatedCount: number;
  improvedCount: number;
} {
  const behavior = readDomainBehavior();
  const entry = behavior[domain];
  if (!entry) return { responseRatio: 0, shownCount: 0, navigatedCount: 0, improvedCount: 0 };
  const responses = entry.navigatedCount + entry.improvedCount;
  return {
    responseRatio: entry.shownCount > 0 ? responses / entry.shownCount : 0,
    shownCount: entry.shownCount,
    navigatedCount: entry.navigatedCount,
    improvedCount: entry.improvedCount,
  };
}

export function getEffectivePriorityDelta(domain: InsightDomain): number {
  const stats = getDomainResponse(domain);
  if (stats.shownCount >= 2 && stats.responseRatio >= 0.5) return -1;
  if (stats.shownCount >= 3 && stats.responseRatio === 0) return 1;
  return 0;
}

export function getDomainSuppressionMultiplier(domain: InsightDomain): number {
  const stats = getDomainResponse(domain);
  if (stats.shownCount >= 2 && stats.responseRatio >= 0.5) return 0.5;
  if (stats.shownCount >= 3 && stats.responseRatio === 0) return 2;
  return 1;
}

export function getToneMarker(domain: InsightDomain): string {
  const stats = getDomainResponse(domain);
  if (stats.shownCount >= 3 && stats.navigatedCount === 0 && stats.improvedCount === 0) return 'Observação: ';
  return '';
}
