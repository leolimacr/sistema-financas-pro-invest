import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Edit3, PiggyBank, TrendingUp, AlertTriangle, Trash2, Plus } from 'lucide-react';
import type { Budget, Transaction } from '../../../types';
import { calcBudgetProgress, type BudgetProgress } from '../../../services/budgetMath';
import { formatBudgetMonthName } from '../../../utils/budgetUtils';

interface BudgetStatusCardProps {
  budget: Budget;
  transactions: Transaction[];
  onEdit: () => void;
  onDelete?: () => void;
}

const MAX_VISIBLE_CATEGORIES = 5;

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-300'}`} />;
}

const BudgetStatusCard: React.FC<BudgetStatusCardProps> = ({ budget, transactions, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const progress: BudgetProgress = useMemo(
    () => calcBudgetProgress(budget, transactions),
    [budget, transactions],
  );

  const exceededCategories = progress.categories.filter((c) => c.status === 'red');
  const visibleCategories = showAllCategories
    ? progress.categories
    : progress.categories.slice(0, MAX_VISIBLE_CATEGORIES);
  const hiddenCount = progress.categories.length - MAX_VISIBLE_CATEGORIES;

  const budgetBorder = progress.totalPercentage > 95
    ? 'border-l-4 border-l-status-danger/40'
    : exceededCategories.length > 0
      ? 'border-l-4 border-l-brand-accent/40'
      : '';

  return (
    <div className={`bg-surface-primary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-panel p-5 shadow-panel ${budgetBorder}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-3 bg-brand-secondary/10 dark:bg-brand-secondary/20 rounded-2xl text-brand-secondary flex-shrink-0">
            <PiggyBank size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-text-primary dark:text-white uppercase tracking-ultra-wide">
              Orçamento do Mês
            </p>
            <p className="text-xxs text-text-muted dark:text-slate-400 font-medium capitalize">
              {formatBudgetMonthName(budget.month)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onDelete && !showDeleteConfirm && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl text-text-muted dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              title="Excluir orçamento deste mês"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-xl text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-surface-elevated dark:hover:bg-slate-800 transition-all"
            title="Editar orçamento"
          >
            <Edit3 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={`p-2 rounded-xl transition-all ${
              expanded
                ? 'bg-surface-elevated dark:bg-slate-800 text-text-secondary dark:text-slate-300'
                : 'text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-surface-elevated dark:hover:bg-slate-800'
            }`}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Confirmação de exclusão discreta */}
      {showDeleteConfirm && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl animate-in fade-in flex items-center justify-between gap-3">
          <p className="text-xxs text-red-800 dark:text-red-300 font-bold truncate">
            Excluir o orçamento de {formatBudgetMonthName(budget.month)}?
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onDelete) onDelete();
                setShowDeleteConfirm(false);
              }}
              className="px-2.5 py-1 bg-red-600 text-white font-black text-[10px] uppercase rounded-lg hover:bg-red-700 transition-all active:scale-95"
            >
              Excluir
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1 bg-surface-secondary dark:bg-slate-800 text-text-secondary dark:text-slate-300 font-bold text-[10px] uppercase rounded-lg hover:bg-surface-elevated dark:hover:bg-slate-700 transition-all"
            >
              Não
            </button>
          </div>
        </div>
      )}

      {/* Barra de progresso do total orçado */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xxs font-bold text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">
            Total gasto (categorias orçadas)
          </span>
          <span className="text-xs font-black text-text-primary dark:text-white">
            R$ {progress.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-text-muted dark:text-slate-400 font-medium">
              {' / '}R$ {progress.totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </span>
        </div>
        <div className="w-full h-2.5 bg-surface-elevated dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress.totalPercentage > 95
                ? 'bg-red-500'
                : progress.totalPercentage >= 80
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, progress.totalPercentage)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xxs font-bold uppercase tracking-ultra-wide text-text-muted dark:text-slate-400">
            {progress.totalPercentage.toFixed(0)}% pactuado
          </span>
          {exceededCategories.length > 0 && (
            <span className="text-xxs font-bold text-red-600 dark:text-red-400 uppercase tracking-ultra-wide">
              {exceededCategories.length} categoria{exceededCategories.length > 1 ? 's' : ''} acima do limite
            </span>
          )}
        </div>
      </div>

      {/* Linha Naked Truth: Gastos Não Orçados */}
      {progress.unbudgetedSpent > 0 && (
        <div className="mt-3 p-3 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 dark:border-amber-900/40 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xxs text-text-secondary dark:text-slate-300 truncate">
              <strong className="text-amber-900 dark:text-amber-300 font-bold">
                + R$ {progress.unbudgetedSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong> em categorias fora do teto.
              <span className="text-text-muted dark:text-slate-400 ml-1 hidden sm:inline">
                (Total real: R$ {progress.totalRealSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider hover:bg-amber-700 transition-all shrink-0 active:scale-95 shadow-sm"
          >
            <Plus size={12} /> Orçar
          </button>
        </div>
      )}

      {/* Expanded: Detalhes por categoria */}
      {expanded && (
        <div className="border-t border-surface-elevated dark:border-slate-800 mt-4 pt-4 space-y-3">
          <p className="text-xxs font-black text-text-primary dark:text-white uppercase tracking-ultra-wide mb-2">
            Categorias Orçadas
          </p>
          {visibleCategories.map((cat) => (
            <div key={cat.categoryKey} className="space-y-1 border-b border-slate-100 dark:border-slate-800/60 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusDot status={cat.status} />
                  <span className="text-xs font-bold text-text-primary dark:text-white truncate">
                    {cat.categoryName}
                  </span>
                </div>
                <span className="text-xxs font-bold text-text-muted dark:text-slate-400 flex-shrink-0 ml-2">
                  R$ {cat.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="font-medium">
                    {' / '}R$ {cat.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
              <div className="w-full h-2 bg-surface-elevated dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    cat.status === 'red'
                      ? 'bg-red-500'
                      : cat.status === 'yellow'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, cat.percentage)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xxs font-bold uppercase tracking-ultra-wide text-text-muted dark:text-slate-400">
                  {cat.percentage.toFixed(0)}%
                </span>
                {cat.status === 'red' && (
                  <span className="text-xxs font-bold text-red-600 dark:text-red-400 uppercase tracking-ultra-wide">
                    Estouro
                  </span>
                )}
              </div>
            </div>
          ))}

          {progress.categories.length === 0 && (
            <p className="text-xxs text-text-muted dark:text-slate-400 italic">
              Nenhuma categoria configurada.
            </p>
          )}

          {progress.categories.length > MAX_VISIBLE_CATEGORIES && !showAllCategories && (
            <button
              type="button"
              onClick={() => setShowAllCategories(true)}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-2xl text-xxs font-black uppercase tracking-ultra-wide border border-dashed border-surface-elevated dark:border-slate-800 text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-surface-secondary dark:hover:bg-slate-800 transition-all mt-2"
            >
              Mostrar +{hiddenCount} categoria{hiddenCount > 1 ? 's' : ''}
            </button>
          )}

          {/* Subseção de categorias fora do orçamento */}
          {progress.unbudgetedCategories.length > 0 && (
            <div className="border-t border-dashed border-surface-elevated dark:border-slate-800 mt-3 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xxs font-black text-amber-800 dark:text-amber-400 uppercase tracking-ultra-wide">
                  Gastos Fora do Orçamento
                </span>
                <span className="text-xxs font-bold text-amber-900 dark:text-amber-300">
                  R$ {progress.unbudgetedSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-1.5">
                {progress.unbudgetedCategories.map((unb) => (
                  <div key={unb.categoryKey} className="flex items-center justify-between text-xxs">
                    <span className="text-text-secondary dark:text-slate-300 truncate">{unb.categoryName}</span>
                    <span className="font-bold text-text-primary dark:text-white">
                      R$ {unb.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Savings goal */}
          {progress.savingsGoal > 0 && (
            <div className="mt-3 pt-3 border-t border-surface-elevated dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-brand-primary" />
                <span className="text-xxs font-black text-text-primary dark:text-white uppercase tracking-ultra-wide">
                  Meta de poupança
                </span>
              </div>
              <p className="text-xs font-black text-action-primaryDark dark:text-emerald-400 mt-1">
                R$ {progress.savingsGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Total income */}
          {progress.totalIncome > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-surface-elevated dark:border-slate-800 mt-3">
              <span className="text-xxs font-bold text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">
                Renda prevista
              </span>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                R$ {progress.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BudgetStatusCard;
