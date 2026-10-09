import React, { useMemo } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import type { NexusAdvisoryContext } from '../../../services/nexusInsightEngine';
import { computeLaunchImpact, maskCurrency } from '../../../utils/calculations';

interface Props {
  draft: {
    amount: number;
    category: string;
    type: 'income' | 'expense';
    paymentMethod?: 'money' | 'credit' | 'voucher';
  };
  context?: NexusAdvisoryContext;
}

const NexusInlineAdvisor: React.FC<Props> = ({ draft, context }) => {
  const insight = useMemo(() => {
    if (!context?.snapshot || draft.amount <= 0) return null;

    // Registro formal (Etapa 5, sem reabrir a Etapa 2): `computeLaunchImpact`
    // retorna null para crédito (sem impacto imediato no caixa) e seu contrato
    // não cobre `voucher` — semanticamente distinto (saldo pré-pago de
    // benefício, não dinheiro nem limite de crédito). Voucher recebe um
    // informativo próprio em vez de passar pelo motor. Revisão futura
    // (Etapa 2.1) pode modelar voucher explicitamente no motor.
    if (draft.paymentMethod === 'voucher') {
      return {
        type: 'info',
        icon: <AlertCircle className="text-violet-500" size={16} />,
        title: 'Movimento no voucher',
        body: 'Este valor consome o saldo do benefício — o caixa imediato não muda e não entra na fatura do cartão.',
        color: 'bg-violet-50 border-violet-100 text-violet-700',
      };
    }

    const impact = computeLaunchImpact(
      context.snapshot,
      draft.amount,
      draft.type,
      draft.paymentMethod === 'credit' ? 'credit' : 'money'
    );

    if (impact) {
      const sign = impact.delta >= 0 ? '+' : '−';
      const absDelta = Math.abs(impact.delta);
      const absPercent = Math.abs(impact.percent).toFixed(1);
      const isNegative = impact.delta < 0;

      return {
        type: isNegative ? 'warning' : 'info',
        icon: <AlertCircle className={isNegative ? 'text-rose-500' : 'text-sky-500'} size={16} />,
        title: 'Impacto na estrutura',
        body: `${sign}${maskCurrency(absDelta)} na ${impact.targetLabel} (${sign}${absPercent}%).`,
        color: isNegative
          ? 'bg-rose-50 border-rose-100 text-rose-700'
          : 'bg-sky-50 border-sky-100 text-sky-700',
      };
    }

    if (draft.type === 'expense' && draft.paymentMethod === 'credit') {
      return {
        type: 'info',
        icon: <AlertCircle className="text-amber-500" size={16} />,
        title: 'Movimento no cartão',
        body: 'Este valor entra na fatura — o caixa imediato não muda, mas a folga do mês será afetada no fechamento.',
        color: 'bg-amber-50 border-amber-100 text-amber-700',
      };
    }

    return null;
  }, [draft.amount, draft.type, draft.paymentMethod, context]);

  if (!insight) return null;

  return (
    <div className={`mt-4 p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${insight.color}`}>
      <div className="mt-0.5 shrink-0">
        {insight.icon}
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
          <Sparkles size={10} className="fill-current" />
          Nexus: {insight.title}
        </p>
        <p className="text-xs font-medium leading-relaxed">
          {insight.body}
        </p>
      </div>
    </div>
  );
};

export default React.memo(NexusInlineAdvisor);
