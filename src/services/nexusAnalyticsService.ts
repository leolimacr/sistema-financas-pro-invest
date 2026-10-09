import { trackEvent } from './analyticsService';

const SHOWN_DEDUP_KEY = 'nexus-analytics-shown-v1';
const MAX_SHOWN = 20;

function getShownIds(): string[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SHOWN_DEDUP_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markShown(id: string): void {
  try {
    const seen = getShownIds();
    const updated = [id, ...seen.filter((s) => s !== id)].slice(0, MAX_SHOWN);
    localStorage.setItem(SHOWN_DEDUP_KEY, JSON.stringify(updated));
  } catch { /* noop */ }
}

function isShown(id: string): boolean {
  return getShownIds().includes(id);
}

export function extractBaseId(id: string): string {
  const idx = id.lastIndexOf('-');
  if (idx <= 0) return id;
  return id.substring(0, idx);
}

export function trackInsightShown(
  insightId: string,
  priority: string,
  eventType: string,
  correlationId: string,
): void {
  const dedupId = `shown-${insightId}`;
  if (isShown(dedupId)) return;
  markShown(dedupId);

  trackEvent('nexus_insight_exibido', {
    eventType,
    correlationId,
    baseId: extractBaseId(insightId),
    priority,
    surface: 'store',
    timestamp: Date.now(),
  });
}

export function trackInsightAcknowledged(
  insightId: string,
  priority: string,
  surface: string,
): void {
  trackEvent('nexus_insight_reconhecido', {
    insightId,
    baseId: extractBaseId(insightId),
    priority,
    surface,
    timestamp: Date.now(),
  });
}

export function trackInsightDismissed(
  insightId: string,
  priority: string,
  surface: string,
): void {
  trackEvent('nexus_insight_descartado', {
    insightId,
    baseId: extractBaseId(insightId),
    priority,
    surface,
    timestamp: Date.now(),
  });
}

export function trackInsightClicked(
  insightId: string,
  priority: string,
  deepLink: string,
  surface: string,
): void {
  trackEvent('nexus_insight_clicado', {
    insightId,
    baseId: extractBaseId(insightId),
    priority,
    deepLink,
    surface,
    timestamp: Date.now(),
  });
}

// ── Action lifecycle ──

export function trackActionSuggested(
  insightId: string,
  priority: string,
  actionType: string,
  surface: string,
): void {
  trackEvent('nexus_acao_sugerida', {
    insightId,
    baseId: extractBaseId(insightId),
    priority,
    actionType,
    surface,
    timestamp: Date.now(),
  });
}

export function trackActionStarted(
  insightId: string,
  priority: string,
  actionType: string,
  surface: string,
): void {
  trackEvent('nexus_acao_iniciada', {
    insightId,
    baseId: extractBaseId(insightId),
    priority,
    actionType,
    surface,
    timestamp: Date.now(),
  });
}

export function trackActionCompleted(
  insightId: string,
  priority: string,
  actionType: string,
  surface: string = 'store',
): void {
  trackEvent('nexus_acao_concluida', {
    insightId,
    baseId: extractBaseId(insightId),
    priority,
    actionType,
    surface,
    timestamp: Date.now(),
  });
}

export function trackActionFailed(
  insightId: string,
  priority: string,
  actionType: string,
  error?: string,
  surface: string = 'store',
): void {
  trackEvent('nexus_acao_falhou', {
    insightId,
    baseId: extractBaseId(insightId),
    priority,
    actionType,
    error,
    surface,
    timestamp: Date.now(),
  });
}
