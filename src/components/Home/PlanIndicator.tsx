import React from 'react';
import { useEntitlement } from '../../hooks/useEntitlement';

interface PlanIndicatorProps {
  launchCount: number;
}

const PlanIndicator: React.FC<PlanIndicatorProps> = ({ launchCount }) => {
  const { isPro } = useEntitlement();

  if (isPro) {
    return null;
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.15em] mb-2">
        Sua rotina neste mês
      </p>
      <p className="text-2xl font-black text-slate-900 tracking-tight">
        {launchCount}
        <span className="text-sm font-bold text-slate-400 ml-2">
          lançamento{launchCount !== 1 ? 's' : ''}
        </span>
      </p>
      <p className="text-[10px] text-slate-500 font-medium mt-3 leading-relaxed">
        Cada movimento ajuda a dar mais clareza ao seu mês. No Free, sua rotina não tem limite.
      </p>
    </div>
  );
};

export default PlanIndicator;
