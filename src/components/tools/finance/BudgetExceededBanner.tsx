import React, { useState, useMemo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { BudgetProgress, CategoryBudgetProgress } from '../../../services/budgetMath';

interface BudgetExceededBannerProps {
  progress: BudgetProgress | null;
  onEdit: () => void;
}

const BudgetExceededBanner: React.FC<BudgetExceededBannerProps> = ({ progress, onEdit }) => {
  const [dismissed, setDismissed] = useState(false);

  const exceededCategories: CategoryBudgetProgress[] = useMemo(
    () => progress?.categories.filter((c) => c.status === 'red') ?? [],
    [progress],
  );

  if (dismissed || exceededCategories.length === 0) return null;

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-3xl animate-in slide-in-from-top-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 bg-red-100 dark:bg-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
          <AlertTriangle size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xxs font-black text-red-800 dark:text-red-300 uppercase tracking-ultra-wide mb-1">
            Orçamento estourado
          </p>
          <p className="text-xxs text-red-700 dark:text-red-400 font-medium leading-relaxed">
            {exceededCategories.length === 1
              ? `A categoria "${exceededCategories[0].categoryName}" já gastou R$ ${exceededCategories[0].spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} do limite de R$ ${exceededCategories[0].limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
              : `${exceededCategories.length} categorias ultrapassaram o limite do orçamento este mês.`}
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="mt-2 text-xxs font-black text-red-700 dark:text-red-400 uppercase tracking-ultra-wide underline hover:text-red-800 dark:hover:text-red-300 transition-colors"
          >
            Ajustar orçamento
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default BudgetExceededBanner;
