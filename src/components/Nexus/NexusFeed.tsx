import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEventInsightStore } from '../../hooks/useEventInsightStore';
import { NexusFeedItem } from './NexusFeedItem';

interface NexusFeedProps {
  onNavigate: (route: string) => void;
  /** Compact/collapsible card mode for mobile or constrained spaces */
  compact?: boolean;
}

export const NexusFeed: React.FC<NexusFeedProps> = ({ onNavigate, compact }) => {
  const { feed, acknowledgeEventInsight, dismissEventInsight } = useEventInsightStore();
  const [expanded, setExpanded] = useState(false);

  if (feed.length === 0) return null;

  const surface = compact ? 'mobile-feed' : 'feed';
  const handleAcknowledge = (id: string) => acknowledgeEventInsight(id, surface);
  const handleDismiss = (id: string) => dismissEventInsight(id, surface);
  const unacknowledgedCount = feed.filter((e) => e.acknowledgedAt === null).length;

  // Compact / mobile: collapsible card with count badge
  if (compact) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight">
              Atividade Nexus
            </span>
            {unacknowledgedCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-full">
                {unacknowledgedCount}
              </span>
            )}
          </div>
          {expanded ? (
            <ChevronUp size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
          )}
        </button>
        {expanded && (
          <div className="px-4 pb-4 space-y-2">
            {feed.map((entry) => (
              <NexusFeedItem
                key={entry.insight.id}
                insight={entry.insight}
                isNew={entry.acknowledgedAt === null}
                onAcknowledge={handleAcknowledge}
                onDismiss={handleDismiss}
                onNavigate={onNavigate}
                surface={surface}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop: inline (current behavior)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
          Atividade Nexus
        </span>
        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
      </div>
      {feed.map((entry) => (
        <NexusFeedItem
          key={entry.insight.id}
          insight={entry.insight}
          isNew={entry.acknowledgedAt === null}
          onAcknowledge={handleAcknowledge}
          onDismiss={handleDismiss}
          onNavigate={onNavigate}
          surface={surface}
        />
      ))}
    </div>
  );
};
