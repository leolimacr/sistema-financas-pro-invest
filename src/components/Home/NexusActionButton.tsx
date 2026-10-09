import React, { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import type { NexusInsight, NexusPlanTier } from '../../services/nexusInsightEngine';
import { useNexusActions } from '../../hooks/useNexusActions';
import { useEntitlement } from '../../hooks/useEntitlement';
import { trackActionStarted } from '../../services/nexusAnalyticsService';
import { traceNavigation } from '../../services/insightResponseObserver';
import PaywallModal from '../PaywallModal';

interface NexusActionButtonProps {
  insight: NexusInsight;
  userId: string;
  onActionExecuted?: () => void;
  onNavigate?: (route: string) => void;
  variant?: 'primary' | 'secondary';
}

const NexusActionButton: React.FC<NexusActionButtonProps> = ({
  insight,
  userId,
  onActionExecuted,
  onNavigate,
  variant = 'primary',
}) => {
  const { action } = insight;
  const { executeAction, isExecuting } = useNexusActions();
  // E7-10: tier de fonte única (entitlement canônico), sem prop drilling.
  const { effectiveTier } = useEntitlement();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reservedAmount, setReservedAmount] = useState<number | null>(null);

  if (!action) return null;

  const handleAction = async () => {
    // Verificação de plano contra o entitlement canônico (E7-10).
    if (action.requiresPlan) {
      const planHierarchy: Record<NexusPlanTier, number> = { free: 0, pro: 1, premium: 2 };
      if (planHierarchy[effectiveTier] < planHierarchy[action.requiresPlan]) {
        setShowPaywall(true);
        return;
      }
    }

    // Ações de orientação abrem a superfície correta; somente ações de
    // mutação comprovada podem concluir diretamente neste botão.
    const isDirectMutation = ['reserve', 'convert_rotativo', 'pay_invoice'].includes(action.type);
    if (!isDirectMutation && onNavigate && insight.deepLink) {
      trackActionStarted(insight.id, insight.priority, action.type, 'nexus-action-button');
      traceNavigation(insight.id, userId);
      onNavigate(insight.deepLink);
      return;
    }

    const result = await executeAction(userId, insight.id, action);
    if (result.success) {
      traceNavigation(insight.id, userId);
      setIsSuccess(true);
      if (result.amount) {
        setReservedAmount(result.amount);
      }
      onActionExecuted?.();
      // Reseta o estado de sucesso após 4 segundos (mais tempo para ler a msg longa)
      setTimeout(() => {
        setIsSuccess(false);
        setReservedAmount(null);
      }, 4000);
    }
  };

  const successMessage = reservedAmount 
    ? `Reserva criada! R$ ${reservedAmount.toFixed(2).replace('.', ',')} guardados.`
    : 'Operação concluída';

  return (
    <>
      <button
        onClick={handleAction}
        disabled={isExecuting || isSuccess}
        className={`mt-2 w-full sm:w-auto px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
          isSuccess
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
            : variant === 'secondary'
              ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-none'
              : 'bg-sky-600 hover:bg-sky-700 text-white border-transparent shadow-sm active:scale-95'
        } disabled:opacity-80`}
      >
        {isExecuting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isSuccess ? (
          <Check size={14} />
        ) : null}
        {isSuccess ? successMessage : action.label}
      </button>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={`Nexus Action: ${action.label}`}
      />
    </>
  );
};

export default NexusActionButton;
