import React, { useEffect, useMemo, useState } from 'react';
import type { StageInfo } from '../../services/sovereignMap';

interface HasTitle {
  message: { title: string; body?: string };
}

interface RitualMetrics {
  freeBalance: number;
  shortfall: number;
  launchCount: number;
  date: number;
}

interface CommandRitualProps {
  stage: StageInfo;
  event: HasTitle | null;
  onNavigate: (route: string, state?: Record<string, unknown>) => void;
  freeBalance: number;
  shortfall: number;
  launchCount: number;
  urgentCount?: number;
  projectedBalance?: number;
}

const STAGE_LABEL: Record<string, string> = {
  'indefinido': 'Indefinido',
  'pressao': 'Atenção no Fluxo',
  'colchao-incompleto': 'Colchão Incompleto',
  'estavel': 'Estável',
  'solido': 'Sólido',
  'expansao': 'Expansão',
};

const COMMAND_ACTIONS: Record<string, { label: string; route: string } | null> = {
  'indefinido': { label: 'Lançar movimentação', route: 'transaction-form' },
  'pressao': { label: 'Revisar fluxo', route: 'manager' },
  'colchao-incompleto': { label: 'Ajustar proteção', route: 'central' },
  'estavel': { label: 'Revisar orçamento', route: 'manager' },
  'solido': { label: 'Alocar capital', route: 'investimentos' },
  'expansao': { label: 'Estruturar alocação', route: 'investimentos' },
};

const RITUAL_KEY = 'fpi-comando-prev-stage';
const METRICS_KEY = 'fpi-comando-prev-metrics';

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

const CommandRitual: React.FC<CommandRitualProps> = ({ stage, event, onNavigate, freeBalance, shortfall, launchCount, urgentCount = 0, projectedBalance = 0 }) => {
  // Frozen baseline captured synchronously on first render — never changes mid-session
  const [metricsBaseline] = useState<RitualMetrics | null>(() => {
    try {
      const raw = localStorage.getItem(METRICS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.date === 'number') return parsed as RitualMetrics;
      }
    } catch { /* ignore */ }
    return null;
  });

  // Frozen previous stage ID captured synchronously on first render
  const [prevStageId] = useState<string | null>(() => {
    try { return localStorage.getItem(RITUAL_KEY); }
    catch { return null; }
  });

  // Save current snapshot as baseline for the NEXT session — runs once on mount only
  useEffect(() => {
    try {
      localStorage.setItem(RITUAL_KEY, stage.id);
      const data: RitualMetrics = { freeBalance, shortfall, launchCount, date: Date.now() };
      localStorage.setItem(METRICS_KEY, JSON.stringify(data));
    } catch { /* quota */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deltaText = prevStageId && prevStageId !== stage.id
    ? `${STAGE_LABEL[prevStageId] || prevStageId} → ${STAGE_LABEL[stage.id]}`
    : null;

  const attentionLine = useMemo(() => {
    if (event?.message?.title) return event.message.title;
    if (stage.blockers.length > 0) return stage.blockers[0];
    if (stage.id === 'indefinido') return 'Aguardando base mínima de 5 lançamentos para calibrar o Mapa de Soberania.';
    return null;
  }, [event, stage.blockers, stage.id]);

  const action = COMMAND_ACTIONS[stage.id];

  // Justificativa curta do comando, só com dados já disponíveis (sem regra nova).
  const commandReason = useMemo(() => {
    if (urgentCount > 0) {
      return `Há ${urgentCount} ${urgentCount === 1 ? 'conta vencendo' : 'contas vencendo'} hoje ou amanhã.`;
    }
    if (shortfall > 0) {
      return `Faltam ${fmtCurrency(shortfall)} para completar sua proteção.`;
    }
    if (projectedBalance < 0) {
      return `Seu fluxo previsto está em déficit de ${fmtCurrency(Math.abs(projectedBalance))}.`;
    }
    return null;
  }, [urgentCount, shortfall, projectedBalance]);

  const continuityLine = useMemo(() => {
    if (!metricsBaseline) return null;

    const prev = metricsBaseline;
    const msSince = Date.now() - prev.date;
    const daysSince = Math.floor(msSince / (1000 * 60 * 60 * 24));

    if (daysSince === 0 && prev.launchCount === launchCount) return 'Sessão retomada hoje';

    const deltas: string[] = [];
    const freeDelta = freeBalance - prev.freeBalance;
    if (Math.abs(freeDelta) >= 50) {
      deltas.push(`${freeDelta > 0 ? '+' : ''}${fmtCurrency(freeDelta)} na folga`);
    }
    const shortfallDelta = prev.shortfall - shortfall;
    if (shortfallDelta >= 50) {
      deltas.push(`proteção avançou ${fmtCurrency(shortfallDelta)}`);
    }
    const launchDelta = launchCount - prev.launchCount;
    if (launchDelta >= 1) {
      deltas.push(`${launchDelta} ${launchDelta === 1 ? 'novo lançamento' : 'novos lançamentos'}`);
    }

    const prefix = daysSince === 0 ? 'Hoje' : `Desde ${daysSince}d`;
    if (deltas.length > 0) return `${prefix}: ${deltas.join(' · ')}`;
    if (daysSince > 0) return `${prefix}: sem alterações relevantes`;
    return null;
  }, [metricsBaseline, freeBalance, shortfall, launchCount]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-border-strong dark:border-slate-800 border-l-4 border-l-emerald-600 rounded-panel p-5 md:p-6 shadow-panel">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-3">
        SEU COMANDO
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-14 shrink-0">Posição</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{stage.name}</span>
          {deltaText && (
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{deltaText}</span>
          )}
        </div>

        {continuityLine && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 w-14 shrink-0">Histórico</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{continuityLine}</span>
          </div>
        )}

        {attentionLine && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 w-14 shrink-0">Atenção</span>
            <span className="text-sm text-slate-700 dark:text-slate-300">{attentionLine}</span>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-14 shrink-0">Comando</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{stage.nextStep}</span>
        </div>

        {commandReason && (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug pt-1">{commandReason}</p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={() => {
            if (action.route === 'central') {
              onNavigate('central', { focusSection: 'base-protecao' });
            } else {
              onNavigate(action.route);
            }
          }}
          className="mt-4 w-full text-sm font-bold py-3 md:py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-colors min-h-[44px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default CommandRitual;
