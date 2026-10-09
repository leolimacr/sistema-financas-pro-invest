import React from 'react';
import { Zap, X } from 'lucide-react';
import type { NexusInsight } from '../../../../services/nexusInsightEngine';
import { getLocalDateString } from '../../../../utils/dateHelpers';

interface NexusInsightToastProps {
  isOpen: boolean;
  insight: NexusInsight | null;
  onClose: () => void;
  onOpenForm: (initialData?: any) => void;
}

const NexusInsightToast: React.FC<NexusInsightToastProps> = ({
  isOpen,
  insight,
  onClose,
  onOpenForm,
}) => {
  if (!isOpen || !insight) return null;

  const handleCtaClick = () => {
    if (insight.action?.type === 'pay_invoice' && insight.action.payload) {
      onOpenForm({
        type: 'expense',
        category: 'Pagamento de Fatura',
        amount: insight.action.payload.amount,
        description: `Fatura ${insight.action.payload.cardName}`,
        date: getLocalDateString()
      });
      onClose();
    }
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-brand-primary text-text-onBrand p-4 rounded-3xl shadow-brand-glow flex items-start gap-3 border border-brand-primary/20 backdrop-blur-md bg-opacity-95">
        <div className="bg-surface-primary/20 p-2 rounded-2xl shrink-0">
          <Zap size={18} className="text-text-onBrand" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-ultra-wide mb-1 opacity-90">
            {insight.message.title}
          </p>
          <p className="text-sm font-medium leading-relaxed">
            {insight.message.body}
          </p>
          {insight.message.ctaLabel && (
            <button 
              onClick={handleCtaClick}
              className="mt-2 px-4 py-1.5 bg-surface-primary text-action-primaryDark rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-secondary transition-all active:scale-95 shadow-sm"
            >
              {insight.message.ctaLabel}
            </button>
          )}
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-surface-primary/10 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default NexusInsightToast;
