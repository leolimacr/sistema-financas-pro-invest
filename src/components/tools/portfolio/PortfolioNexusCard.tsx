import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Info, CheckCircle2, ChevronRight, X, ArrowUpRight } from 'lucide-react';
import type { PortfolioAdvisorInsight, NexusInsightSeverity } from '../../../core/portfolio/nexusPortfolioAdvisor';

interface PortfolioNexusCardProps {
  insights: PortfolioAdvisorInsight[];
  onOpenSimulator?: () => void;
  onOpenTaxReport?: () => void;
  onOpenCalibration?: () => void;
  onNavigateToReserve?: () => void;
  onNavigateToCentral?: () => void;
  onOpenPositionDetails?: (assetId: string) => void;
}

export const PortfolioNexusCard: React.FC<PortfolioNexusCardProps> = ({
  insights,
  onOpenSimulator,
  onOpenTaxReport,
  onOpenCalibration,
  onNavigateToReserve,
  onNavigateToCentral,
  onOpenPositionDetails,
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeInsights = insights.filter((i) => !dismissedIds.has(i.id));

  if (activeInsights.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const getSeverityStyles = (severity: NexusInsightSeverity) => {
    switch (severity) {
      case 'warning':
        return {
          cardBg: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60',
          iconColor: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
          Icon: AlertTriangle,
        };
      case 'action':
        return {
          cardBg: 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60',
          iconColor: 'text-purple-600 dark:text-purple-400',
          badgeBg: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
          Icon: Sparkles,
        };
      case 'positive':
        return {
          cardBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200',
          Icon: CheckCircle2,
        };
      case 'info':
      default:
        return {
          cardBg: 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60',
          iconColor: 'text-blue-600 dark:text-blue-400',
          badgeBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
          Icon: Info,
        };
    }
  };

  return (
    <div
      data-testid="portfolio-nexus-card"
      className="space-y-3"
      role="region"
      aria-label="Recomendações Estratégicas do Nexus"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-slate-900 dark:bg-slate-800 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Nexus Copilot • Inteligência de Carteira
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400">
          {activeInsights.length} {activeInsights.length === 1 ? 'orientação ativa' : 'orientações ativas'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeInsights.map((insight) => {
          const { cardBg, iconColor, badgeBg, Icon } = getSeverityStyles(insight.severity);

          return (
            <div
              key={insight.id}
              data-testid={`nexus-insight-${insight.id}`}
              className={`p-4 rounded-2xl border-2 transition-all shadow-xs relative flex flex-col justify-between ${cardBg}`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                    <h5 className="font-bold text-xs md:text-sm text-slate-950 dark:text-white">
                      {insight.title}
                    </h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismiss(insight.id)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                    title="Dispensar aviso"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                  {insight.message}
                </p>
              </div>

              {insight.actionLabel && (
                <div className="mt-3 pt-2 pl-6 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (insight.category === 'REBALANCE' || insight.category === 'OPPORTUNITY_CASH') {
                        onOpenSimulator?.();
                      } else if (insight.category === 'TAX') {
                        onOpenTaxReport?.();
                      } else if (insight.category === 'CALIBRATION') {
                        onOpenCalibration?.();
                      } else if (insight.category === 'LIQUIDITY_SHIELD') {
                        if (insight.id === 'insight-liquidity-shield-reserve') {
                          onNavigateToReserve?.();
                        } else {
                          onNavigateToCentral?.();
                        }
                      } else if (insight.category === 'CONCENTRATION') {
                        const assetId =
                          (insight.actionPayload?.assetId as string) ||
                          insight.id.replace('insight-concentration-', '');
                        if (assetId) {
                          onOpenPositionDetails?.(assetId);
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-white hover:underline focus:outline-none"
                  >
                    <span>{insight.actionLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
