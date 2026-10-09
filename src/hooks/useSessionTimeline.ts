import { useEffect, useRef, useState } from 'react';
import type { SovereignSnapshotResult } from './useSovereignSnapshot';

const STORAGE_KEY = 'fpi-session-timeline-v1';

interface StoredSession {
  sovereignFreeBalance: number;
  totalDebtBalance: number;
  leewayDays: number;
  timestamp: number;
  cardInvoiceRemaining?: number;
  colchaoShortfall?: number;
  reserveShortfall?: number;
  monthBalance?: number;
}

export interface SessionChange {
  field: 'sovereignFreeBalance' | 'totalDebtBalance' | 'leewayDays';
  label: string;
  before: number;
  after: number;
  delta: number;
}

export interface CtaAction {
  label: string;
  route: string;
  context?: Record<string, unknown>;
}

export interface SessionSummary {
  primaryChange: SessionChange;
  message: string;
  cta: CtaAction | null;
}

function readStored(): StoredSession | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(data: StoredSession): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    /* quota exceeded — silent */
  }
}

const MIN_CHANGE_SOVEREIGN = 50;
const MIN_CHANGE_DEBT = 50;
const MIN_CHANGE_LEEWAY = 1;
const MIN_CHANGE_CARD = 50;
const MIN_CHANGE_COLCHAO = 50;
const MIN_CHANGE_MONTH = 50;

function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pickPrimary(changes: SessionChange[]): SessionChange | null {
  if (changes.length === 0) return null;
  return changes.reduce((best, c) =>
    Math.abs(c.delta) > Math.abs(best.delta) ? c : best
  );
}

function delta(a: number | undefined, b: number | undefined): number {
  return (b ?? 0) - (a ?? 0);
}

interface CausalSuggestion {
  text: string;
  cta: CtaAction;
}

function detectCausalSuggestion(
  stored: StoredSession,
  current: StoredSession
): CausalSuggestion | null {
  const sd = delta(stored.sovereignFreeBalance, current.sovereignFreeBalance);
  const dd = delta(stored.totalDebtBalance, current.totalDebtBalance);
  const cd = delta(stored.cardInvoiceRemaining, current.cardInvoiceRemaining);
  const csd = delta(stored.colchaoShortfall, current.colchaoShortfall);
  const rsd = delta(stored.reserveShortfall, current.reserveShortfall);
  const md = delta(stored.monthBalance, current.monthBalance);
  const ld = delta(stored.leewayDays, current.leewayDays);

  const debtUp = Math.abs(dd) >= MIN_CHANGE_DEBT && dd > 0;
  const debtDown = Math.abs(dd) >= MIN_CHANGE_DEBT && dd < 0;
  const sovUp = Math.abs(sd) >= MIN_CHANGE_SOVEREIGN && sd > 0;
  const sovDown = Math.abs(sd) >= MIN_CHANGE_SOVEREIGN && sd < 0;

  const colchaoGapShrunk = stored.colchaoShortfall !== undefined &&
    Math.abs(csd) >= MIN_CHANGE_COLCHAO && csd < 0;
  const colchaoGapGrown = stored.colchaoShortfall !== undefined &&
    Math.abs(csd) >= MIN_CHANGE_COLCHAO && csd > 0;
  const cardDown = stored.cardInvoiceRemaining !== undefined &&
    Math.abs(cd) >= MIN_CHANGE_CARD && cd < 0;
  const monthUp = stored.monthBalance !== undefined &&
    Math.abs(md) >= MIN_CHANGE_MONTH && md > 0;

  if (debtDown && sovUp) return { text: 'acompanhando a redução da dívida', cta: { label: 'Revisar dívidas', route: 'minhas-dividas', context: { focusSection: 'dividas' } } };
  if (debtDown && ld >= MIN_CHANGE_LEEWAY) return { text: 'liberando mais fôlego financeiro', cta: { label: 'Revisar dívidas', route: 'minhas-dividas', context: { focusSection: 'dividas' } } };
  if (debtUp && sovDown) return { text: 'em meio a aumento de compromissos', cta: { label: 'Entender pressão', route: 'manager' } };
  if (debtUp && ld <= -MIN_CHANGE_LEEWAY) return { text: 'com aperto na estrutura', cta: { label: 'Revisar estrutura', route: 'central', context: { focusSection: 'estrutura' } } };
  if (colchaoGapShrunk && sovDown === false) return { text: 'com reforço da proteção', cta: { label: 'Ver proteção', route: 'central', context: { focusSection: 'protecao' } } };
  if ((colchaoGapGrown || (Math.abs(rsd) >= MIN_CHANGE_COLCHAO && rsd > 0)) && sovDown) return { text: 'com consumo da reserva', cta: { label: 'Ver proteção', route: 'central', context: { focusSection: 'protecao' } } };
  if (cardDown && sovDown === false) return { text: 'após redução de fatura', cta: { label: 'Revisar cartão', route: 'manager', context: { openCards: true } } };
  if (monthUp && sovUp && debtDown === false) return { text: 'com melhora no fluxo do mês', cta: { label: 'Ver impacto no mês', route: 'manager' } };

  return null;
}

function buildFallbackCta(primary: SessionChange): CtaAction | null {
  if (primary.field === 'totalDebtBalance') {
    return { label: 'Revisar dívidas', route: 'minhas-dividas' };
  }
  return { label: 'Ver central', route: 'central' };
}

function buildMessage(
  primary: SessionChange,
  causalText: string | null
): string {
  const prefix = 'Desde sua última visita,';

  let changeDesc: string;
  if (primary.field === 'leewayDays') {
    changeDesc = `seus dias de liberdade passaram de ${primary.before} para ${primary.after}`;
  } else if (primary.field === 'totalDebtBalance') {
    const absVal = formatCurrency(Math.abs(primary.delta));
    changeDesc = `sua dívida total ${primary.delta < 0 ? 'caiu' : 'subiu'} ${absVal}`;
  } else {
    const absVal = formatCurrency(Math.abs(primary.delta));
    changeDesc = `sua folga soberana ${primary.delta >= 0 ? 'subiu' : 'caiu'} ${absVal}`;
  }

  if (causalText) {
    return `${prefix} ${changeDesc}, ${causalText}.`;
  }

  return `${prefix} ${changeDesc}.`;
}

function buildSummary(stored: StoredSession, current: StoredSession): SessionSummary | null {
  const changes: SessionChange[] = [];

  const sfDelta = current.sovereignFreeBalance - stored.sovereignFreeBalance;
  if (Math.abs(sfDelta) >= MIN_CHANGE_SOVEREIGN) {
    changes.push({
      field: 'sovereignFreeBalance',
      label: 'folga soberana',
      before: stored.sovereignFreeBalance,
      after: current.sovereignFreeBalance,
      delta: sfDelta,
    });
  }

  const tdDelta = current.totalDebtBalance - stored.totalDebtBalance;
  if (Math.abs(tdDelta) >= MIN_CHANGE_DEBT) {
    changes.push({
      field: 'totalDebtBalance',
      label: 'dívida total',
      before: stored.totalDebtBalance,
      after: current.totalDebtBalance,
      delta: tdDelta,
    });
  }

  const ldDelta = current.leewayDays - stored.leewayDays;
  if (Math.abs(ldDelta) >= MIN_CHANGE_LEEWAY) {
    changes.push({
      field: 'leewayDays',
      label: 'dias de liberdade',
      before: stored.leewayDays,
      after: current.leewayDays,
      delta: ldDelta,
    });
  }

  if (changes.length === 0) return null;

  const primary = pickPrimary(changes)!;
  const causal = detectCausalSuggestion(stored, current);
  const message = buildMessage(primary, causal?.text ?? null);
  const cta = causal?.cta ?? buildFallbackCta(primary);
  if (cta && causal?.text) {
    cta.context = { ...cta.context, reason: causal.text };
  }

  return { primaryChange: primary, message, cta };
}

function currentSnapshot(sovereign: SovereignSnapshotResult): StoredSession {
  return {
    sovereignFreeBalance: sovereign.sovereignFreeBalance ?? 0,
    totalDebtBalance: sovereign.totalDebtBalance ?? 0,
    leewayDays: sovereign.leewayDays ?? 0,
    timestamp: Date.now(),
    cardInvoiceRemaining: sovereign.cardInvoiceRemaining ?? 0,
    colchaoShortfall: sovereign.colchaoShortfall ?? 0,
    reserveShortfall: sovereign.reserveShortfall ?? 0,
    monthBalance: sovereign.monthBalance ?? 0,
  };
}

export function useSessionTimeline(
  sovereign: SovereignSnapshotResult,
): SessionSummary | null {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const sovereignRef = useRef(sovereign);
  const initialized = useRef(false);

  sovereignRef.current = sovereign;

  useEffect(() => {
    if (initialized.current) return;

    const hasData = sovereign.accumulatedBalance !== 0 ||
      sovereign.accumulatedIncome !== 0 ||
      sovereign.accumulatedExpenses !== 0 ||
      sovereign.monthBalance !== 0;
    if (!hasData) return;

    const stored = readStored();

    if (!stored) {
      writeStored(currentSnapshot(sovereign));
      initialized.current = true;
      return;
    }

    const current = currentSnapshot(sovereign);
    const result = buildSummary(stored, current);

    writeStored(current);
    initialized.current = true;

    if (result) {
      setSummary(result);
    }
  }, [sovereign]);

  useEffect(() => {
    const save = () => {
      writeStored(currentSnapshot(sovereignRef.current));
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };

    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      save();
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return summary;
}
