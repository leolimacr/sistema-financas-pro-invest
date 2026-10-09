import type { Budget, Transaction } from '../types';
import { buildCategoryKey, isCreditCardPaymentTransaction } from '../utils/budgetUtils';
import type { BudgetInsightData } from './nexusInsightEngine';

export type BudgetStatus = 'green' | 'yellow' | 'red';

export interface CategoryBudgetProgress {
  categoryName: string;
  categoryKey: string;
  limit: number;
  spent: number;
  percentage: number;
  status: BudgetStatus;
}

export interface UnbudgetedCategorySpending {
  categoryName: string;
  categoryKey: string;
  spent: number;
}

export interface BudgetProgress {
  totalBudget: number;
  totalSpent: number;
  totalPercentage: number;
  totalIncome: number;
  savingsGoal: number;
  categories: CategoryBudgetProgress[];
  unbudgetedSpent: number;
  unbudgetedCategories: UnbudgetedCategorySpending[];
  totalRealSpent: number;
}

export function getBudgetStatus(percentage: number, alertThreshold: number): BudgetStatus {
  // Corrige a escala: se alertThreshold for decimal (ex: 0.8), converte para 80%
  const threshold = alertThreshold > 1 ? alertThreshold : alertThreshold * 100;
  if (percentage > 95) return 'red';
  if (percentage >= threshold) return 'yellow';
  return 'green';
}

export function calcBudgetProgress(
  budget: Budget,
  transactions: Transaction[],
  incomeOverride?: number,
): BudgetProgress {
  const monthStr = budget.month;

  // Filtro estrito de despesas reais de caixa:
  // Ignora transações virtuais (projeções) e liquidações técnicas de faturas de cartão
  // (para evitar duplicidade contábil, já que as compras no cartão já são contabilizadas nas categorias)
  const expenseTxs = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    if (t.isVirtual) return false;
    if (isCreditCardPaymentTransaction(t)) return false;
    return t.date ? t.date.startsWith(monthStr) : false;
  });

  const spentByKey: Record<string, number> = {};
  const rawNameByKey: Record<string, string> = {};

  expenseTxs.forEach((t) => {
    const rawName = t.category?.trim() || 'Sem categoria';
    const key = buildCategoryKey(rawName);
    if (!key) return;
    spentByKey[key] = (spentByKey[key] || 0) + (t.amount || 0);
    if (!rawNameByKey[key]) {
      rawNameByKey[key] = rawName;
    }
  });

  const budgetedKeys = new Set(budget.categories.map((c) => c.categoryKey));

  const categories: CategoryBudgetProgress[] = budget.categories.map((cat) => {
    const spent = spentByKey[cat.categoryKey] || 0;
    const percentage = cat.limit > 0 ? (spent / cat.limit) * 100 : 0;
    return {
      categoryName: cat.categoryName,
      categoryKey: cat.categoryKey,
      limit: cat.limit,
      spent,
      percentage,
      status: getBudgetStatus(percentage, cat.alertThreshold),
    };
  });

  const unbudgetedCategories: UnbudgetedCategorySpending[] = [];
  let unbudgetedSpent = 0;

  Object.entries(spentByKey).forEach(([key, spent]) => {
    if (!budgetedKeys.has(key) && spent > 0) {
      unbudgetedSpent += spent;
      unbudgetedCategories.push({
        categoryKey: key,
        categoryName: rawNameByKey[key] || key,
        spent,
      });
    }
  });

  unbudgetedCategories.sort((a, b) => b.spent - a.spent);

  const totalBudget = budget.categories.reduce((s, c) => s + c.limit, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  const totalRealSpent = totalSpent + unbudgetedSpent;

  return {
    totalBudget,
    totalSpent,
    totalPercentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    totalIncome: incomeOverride ?? budget.totalIncome,
    savingsGoal: budget.savingsGoal,
    categories,
    unbudgetedSpent,
    unbudgetedCategories,
    totalRealSpent,
  };
}

export function toBudgetInsightData(
  progress: BudgetProgress,
  refDate: Date = new Date()
): BudgetInsightData {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysElapsed = Math.min(refDate.getDate(), daysInMonth);

  return {
    totalBudget: progress.totalBudget,
    totalSpent: progress.totalSpent,
    totalPercentage: progress.totalPercentage,
    daysElapsed,
    daysInMonth,
    categories: progress.categories.map((c) => ({
      name: c.categoryName,
      limit: c.limit,
      spent: c.spent,
      percentage: c.percentage,
      status: c.status,
    })),
  };
}
