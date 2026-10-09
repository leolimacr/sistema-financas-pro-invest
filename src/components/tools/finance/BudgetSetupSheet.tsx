import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Check, ChevronDown, ChevronUp, PiggyBank, TrendingUp,
  AlertCircle, Copy, Trash2, Search
} from 'lucide-react';
import type { Category, Transaction, CategoryBudget, Budget } from '../../../types';
import {
  buildCategoryKey,
  getCurrentBudgetId,
  formatBudgetMonthName,
  isCreditCardInvoiceCategory,
  isCreditCardPaymentTransaction,
} from '../../../utils/budgetUtils';
import { useBudget } from '../../../hooks/useBudget';

interface BudgetSetupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  categories: Category[];
  transactions: Transaction[];
  monthlyIncome: number;
  currentBudget?: Budget | null;
  targetMonthKey?: string;
  previousBudget?: Budget | null;
  fixedObligationsTotal?: number;
  creditInvoicesTotal?: number;
  onSaved: () => void;
  onDelete?: () => void;
}

const formatCurrencyDisplay = (numValue: number | string): string => {
  if (numValue === '' || numValue === undefined || numValue === null) return '';
  const num = typeof numValue === 'string' ? parseFloat(numValue) : numValue;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const parseCurrencyDigits = (inputStr: string): number => {
  const digits = inputStr.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
};

const BudgetSetupSheet: React.FC<BudgetSetupSheetProps> = ({
  isOpen,
  onClose,
  userId,
  categories,
  transactions,
  monthlyIncome,
  currentBudget,
  targetMonthKey,
  previousBudget,
  fixedObligationsTotal = 0,
  creditInvoicesTotal = 0,
  onSaved,
  onDelete,
}) => {
  const budgetId = targetMonthKey || getCurrentBudgetId();
  const { setBudget, isSettingBudget, deleteBudget, isDeletingBudget } = useBudget(userId, budgetId);

  const [totalIncome, setTotalIncome] = useState<number>(monthlyIncome || 0);
  const [savingsGoal, setSavingsGoal] = useState<number>(0);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});
  const [categoryEnabled, setCategoryEnabled] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Deriva chaves de meses recentes para histórico
  const last3 = useMemo(() => {
    const keys: string[] = [];
    const [yearStr, monthStr] = budgetId.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    for (let i = 0; i < 3; i++) {
      const d = new Date(year, month - 1 - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys;
  }, [budgetId]);

  // Lista de nomes de categorias de despesa disponíveis (expurga faturas de cartão para evitar dupla contagem)
  const expenseCategoryNames = useMemo(() => {
    const fromDb = categories
      .filter((c) => c.type === 'expense' && !isCreditCardInvoiceCategory(c.name))
      .map((c) => c.name);
    const fromTx = transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          !t.isVirtual &&
          !isCreditCardPaymentTransaction(t) &&
          t.category &&
          !isCreditCardInvoiceCategory(t.category)
      )
      .map((t) => t.category as string);
    return Array.from(new Set([...fromDb, ...fromTx])).sort();
  }, [categories, transactions]);

  // Gasto do mês ativo por categoria (desconsidera liquidação técnica de cartão)
  const categorySpendingCurrent = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          !t.isVirtual &&
          !isCreditCardPaymentTransaction(t) &&
          !isCreditCardInvoiceCategory(t.category) &&
          t.date?.startsWith(budgetId)
      )
      .forEach((t) => {
        const cat = t.category || 'Sem categoria';
        map[cat] = (map[cat] || 0) + (t.amount || 0);
      });
    return map;
  }, [transactions, budgetId]);

  // Gasto recente (últimos 3 meses) por categoria
  const categorySpendingRecent = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          !t.isVirtual &&
          !isCreditCardPaymentTransaction(t) &&
          !isCreditCardInvoiceCategory(t.category) &&
          last3.some((m) => t.date?.startsWith(m))
      )
      .forEach((t) => {
        const cat = t.category || 'Sem categoria';
        map[cat] = (map[cat] || 0) + (t.amount || 0);
      });
    return map;
  }, [transactions, last3]);

  // Hidratação segura ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;

    setShowDeleteConfirm(false);
    setSearchQuery('');

    if (currentBudget) {
      // Modo Edição: preserva 100% dos limites previamente configurados
      setTotalIncome(currentBudget.totalIncome || monthlyIncome || 0);
      setSavingsGoal(currentBudget.savingsGoal || 0);

      const enabled: Record<string, boolean> = {};
      const limits: Record<string, number> = {};

      currentBudget.categories.forEach((cat) => {
        if (!isCreditCardInvoiceCategory(cat.categoryName)) {
          enabled[cat.categoryName] = true;
          limits[cat.categoryName] = cat.limit;
        }
      });

      setCategoryEnabled(enabled);
      setCategoryLimits(limits);
    } else {
      // Modo Novo Orçamento: sugestões inteligentes baseadas em histórico
      setTotalIncome(monthlyIncome || 0);
      setSavingsGoal(0);

      const enabled: Record<string, boolean> = {};
      const limits: Record<string, number> = {};

      expenseCategoryNames.forEach((name) => {
        const recentTotal = categorySpendingRecent[name] || 0;
        const currentSpent = categorySpendingCurrent[name] || 0;

        if (recentTotal > 0 || currentSpent > 0) {
          enabled[name] = true;
          if (recentTotal > 0) {
            const avg = recentTotal / Math.min(3, last3.length);
            limits[name] = Math.max(50, Math.ceil(avg / 50) * 50);
          } else {
            limits[name] = Math.max(50, Math.ceil(currentSpent / 50) * 50);
          }
        }
      });

      setCategoryEnabled(enabled);
      setCategoryLimits(limits);
    }
  }, [isOpen, currentBudget, monthlyIncome, expenseCategoryNames, categorySpendingRecent, categorySpendingCurrent, last3]);

  // Ação de clonar limites do mês anterior (expurga faturas de cartão)
  const handleClonePreviousBudget = () => {
    if (!previousBudget) return;
    setTotalIncome(previousBudget.totalIncome || monthlyIncome || 0);
    setSavingsGoal(previousBudget.savingsGoal || 0);

    const enabled: Record<string, boolean> = {};
    const limits: Record<string, number> = {};

    previousBudget.categories.forEach((cat) => {
      if (!isCreditCardInvoiceCategory(cat.categoryName)) {
        enabled[cat.categoryName] = true;
        limits[cat.categoryName] = cat.limit;
      }
    });

    setCategoryEnabled(enabled);
    setCategoryLimits(limits);
  };

  // Toggle e ajuste de categoria
  const toggleCategory = (name: string) => {
    const nextEnabled = !categoryEnabled[name];
    setCategoryEnabled((prev) => ({ ...prev, [name]: nextEnabled }));

    if (nextEnabled && (!categoryLimits[name] || categoryLimits[name] === 0)) {
      const recentTotal = categorySpendingRecent[name] || 0;
      const currentSpent = categorySpendingCurrent[name] || 0;
      const suggested = recentTotal > 0
        ? Math.max(50, Math.ceil((recentTotal / Math.min(3, last3.length)) / 50) * 50)
        : currentSpent > 0
          ? Math.max(50, Math.ceil(currentSpent / 50) * 50)
          : 100;
      setCategoryLimits((prev) => ({ ...prev, [name]: suggested }));
    }
  };

  const handleLimitChange = (name: string, valueStr: string) => {
    const parsed = parseCurrencyDigits(valueStr);
    setCategoryLimits((prev) => ({ ...prev, [name]: parsed }));
  };

  // Cálculo da Folga Livre Soberana
  const obligationsTotal = fixedObligationsTotal + creditInvoicesTotal;
  const safeMarginAvailable = Math.max(0, totalIncome - obligationsTotal - savingsGoal);

  const totalBudgetSelected = useMemo(() => {
    return Object.entries(categoryLimits)
      .filter(([name]) => categoryEnabled[name] && !isCreditCardInvoiceCategory(name))
      .reduce((sum, [, limit]) => sum + (Number(limit) || 0), 0);
  }, [categoryLimits, categoryEnabled]);

  const marginDelta = safeMarginAvailable - totalBudgetSelected;

  // Filtragem e ordenação de categorias
  const filteredCategories = useMemo(() => {
    let list = expenseCategoryNames;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((name) => name.toLowerCase().includes(q));
    }
    // Ordena: primeiro as selecionadas/com gastos, depois as demais
    return [...list].sort((a, b) => {
      const aSelected = !!categoryEnabled[a];
      const bSelected = !!categoryEnabled[b];
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      const aSpent = categorySpendingCurrent[a] || categorySpendingRecent[a] || 0;
      const bSpent = categorySpendingCurrent[b] || categorySpendingRecent[b] || 0;
      return bSpent - aSpent;
    });
  }, [expenseCategoryNames, searchQuery, categoryEnabled, categorySpendingCurrent, categorySpendingRecent]);

  const displayedCategories = showAll || filteredCategories.length <= 8
    ? filteredCategories
    : filteredCategories.slice(0, 8);

  const hiddenCount = filteredCategories.length - displayedCategories.length;

  // Salvamento
  const handleSave = async () => {
    const budgetCategories: CategoryBudget[] = Object.entries(categoryEnabled)
      .filter(([name, enabled]) => enabled && !isCreditCardInvoiceCategory(name))
      .map(([name]) => ({
        categoryName: name,
        categoryKey: buildCategoryKey(name),
        limit: Math.max(0, Number(categoryLimits[name]) || 0),
        alertThreshold: 0.8,
        rollover: false,
      }));

    await setBudget({
      userId,
      month: budgetId,
      totalIncome,
      totalBudget: totalBudgetSelected,
      categories: budgetCategories,
      savingsGoal,
    });

    onSaved();
    onClose();
  };

  // Exclusão
  const handleDelete = async () => {
    await deleteBudget();
    if (onDelete) onDelete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-4 my-6 sm:my-10 bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 rounded-4xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 pb-3 bg-surface-primary dark:bg-slate-900 rounded-t-4xl border-b border-surface-elevated/50 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-secondary/10 rounded-2xl text-brand-secondary">
              <PiggyBank size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-ultra-wide">
                {currentBudget ? 'Editar Orçamento' : 'Orçamento do Mês'}
              </h2>
              <p className="text-xxs text-text-muted dark:text-slate-400 font-bold capitalize tracking-widest">
                {formatBudgetMonthName(budgetId)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentBudget && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-2xl bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                title="Excluir orçamento deste mês"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-all active:scale-90"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal de confirmação de exclusão */}
        {showDeleteConfirm && (
          <div className="p-4 mx-5 mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-3xl animate-in fade-in">
            <p className="text-xs font-black text-red-800 dark:text-red-300 uppercase tracking-widest mb-1">
              Excluir orçamento de {formatBudgetMonthName(budgetId)}?
            </p>
            <p className="text-xxs text-red-700 dark:text-red-400 mb-3">
              Os limites deste mês serão removidos. Seus lançamentos e saldo real não serão afetados.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeletingBudget}
                className="px-4 py-2 rounded-2xl bg-red-600 text-white font-black text-xxs uppercase tracking-wider hover:bg-red-700 transition-all active:scale-95"
              >
                {isDeletingBudget ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-2xl bg-surface-secondary dark:bg-slate-800 text-text-secondary dark:text-slate-300 font-bold text-xxs uppercase hover:bg-surface-elevated dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="p-5 space-y-6">

          {/* Atalho para clonar mês anterior */}
          {!currentBudget && previousBudget && previousBudget.categories.length > 0 && (
            <div className="p-3.5 bg-brand-primary/5 dark:bg-emerald-950/30 border border-brand-primary/20 dark:border-emerald-800 rounded-3xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Copy size={16} className="text-brand-primary shrink-0" />
                <p className="text-xxs text-text-secondary dark:text-slate-300 font-medium truncate">
                  Deseja reaproveitar os limites definidos em <strong className="capitalize">{formatBudgetMonthName(previousBudget.month)}</strong>?
                </p>
              </div>
              <button
                type="button"
                onClick={handleClonePreviousBudget}
                className="px-3 py-1.5 rounded-xl bg-brand-primary text-text-onBrand font-black text-[10px] uppercase tracking-wider hover:bg-brand-primary/90 transition-all shrink-0 active:scale-95"
              >
                Clonar
              </button>
            </div>
          )}

          {/* Renda prevista & Meta de poupança com máscara em R$ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Renda prevista
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={totalIncome ? formatCurrencyDisplay(totalIncome) : ''}
                onChange={(e) => setTotalIncome(parseCurrencyDigits(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-sm font-bold text-text-primary dark:text-white outline-none focus:border-brand-primary/50 transition-colors"
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className="block text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Meta de poupança
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={savingsGoal ? formatCurrencyDisplay(savingsGoal) : ''}
                onChange={(e) => setSavingsGoal(parseCurrencyDigits(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-sm font-bold text-text-primary dark:text-white outline-none focus:border-brand-primary/50 transition-colors"
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          {/* Banner Soberano: Equação de Folga Segura */}
          <div className="p-4 bg-surface-secondary dark:bg-slate-800/60 rounded-3xl border border-surface-elevated dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between text-xxs font-bold text-text-muted dark:text-slate-400">
              <span>Renda: {formatCurrencyDisplay(totalIncome)}</span>
              {obligationsTotal > 0 && (
                <span>Contas/Faturas: -{formatCurrencyDisplay(obligationsTotal)}</span>
              )}
              {savingsGoal > 0 && (
                <span>Poupança: -{formatCurrencyDisplay(savingsGoal)}</span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-surface-elevated/70 dark:border-slate-700">
              <span className="text-xxs font-black text-text-primary dark:text-white uppercase tracking-wider">
                Folga Segura para Categorias:
              </span>
              <span className="text-xs font-black text-text-primary dark:text-white">
                {formatCurrencyDisplay(safeMarginAvailable)}
              </span>
            </div>

            {/* Alerta de equilíbrio */}
            <div className={`p-2.5 rounded-2xl flex items-center gap-2 text-xxs font-bold ${
              marginDelta >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}>
              <AlertCircle size={14} className="shrink-0" />
              <span>
                {marginDelta >= 0
                  ? `Soma dos tetos: ${formatCurrencyDisplay(totalBudgetSelected)} (Margem livre: ${formatCurrencyDisplay(marginDelta)})`
                  : `Atenção: os limites somam ${formatCurrencyDisplay(totalBudgetSelected)} e superam a folga segura em ${formatCurrencyDisplay(Math.abs(marginDelta))}.`}
              </span>
            </div>
          </div>

          {/* Nota Educativa Soberana: Cartão de Crédito e Fatura */}
          <div className="px-3.5 py-3 bg-brand-primary/5 dark:bg-emerald-950/20 border border-brand-primary/15 dark:border-emerald-800/40 rounded-2xl flex items-start gap-2.5">
            <span className="text-sm select-none shrink-0 mt-0.5" role="img" aria-label="Aviso de Fatura">💡</span>
            <div className="text-[11px] leading-relaxed text-text-secondary dark:text-slate-300 space-y-0.5">
              <span className="font-bold text-text-primary dark:text-white block">
                Por que a fatura do cartão não aparece na lista de categorias?
              </span>
              <span>
                Suas compras no cartão são controladas diretamente nas categorias de consumo (Alimentação, Lazer, etc.). O valor da fatura a pagar no mês já está abatido da sua <strong className="text-text-primary dark:text-white font-bold">Folga Segura</strong> acima, blindando você contra despesas duplicadas.
              </span>
            </div>
          </div>

          {/* Lista de Categorias */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-widest">
                Limites por categoria
              </label>
              <span className="text-[10px] font-bold text-text-muted dark:text-slate-400">
                {Object.values(categoryEnabled).filter(Boolean).length} selecionada(s)
              </span>
            </div>

            {/* Barra de busca rápida */}
            {expenseCategoryNames.length > 6 && (
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted dark:text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar categoria..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-xs font-bold text-text-primary dark:text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {displayedCategories.map((name) => {
                const enabled = !!categoryEnabled[name];
                const limit = categoryLimits[name] || 0;
                const spent = categorySpendingCurrent[name] || 0;

                return (
                  <div
                    key={buildCategoryKey(name)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      enabled
                        ? 'bg-brand-primary/5 dark:bg-emerald-950/30 border-brand-primary/20 dark:border-emerald-800'
                        : 'bg-surface-secondary dark:bg-slate-800/40 border-surface-elevated dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(name)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        enabled
                          ? 'bg-brand-primary border-brand-primary text-white'
                          : 'border-text-muted dark:border-slate-600 bg-transparent'
                      }`}
                    >
                      {enabled && <Check size={12} strokeWidth={3} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-primary dark:text-white truncate">{name}</p>
                      {spent > 0 && (
                        <p className="text-[10px] font-medium text-text-muted dark:text-slate-400">
                          Gasto no mês: {formatCurrencyDisplay(spent)}
                        </p>
                      )}
                    </div>

                    {enabled && (
                      <div className="w-28 flex-shrink-0">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={limit ? formatCurrencyDisplay(limit) : ''}
                          onChange={(e) => handleLimitChange(name, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-700 text-xs font-bold text-text-primary dark:text-white outline-none focus:border-brand-primary/50 transition-colors text-right"
                          placeholder="R$ 0,00"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {displayedCategories.length === 0 && (
                <p className="text-xxs text-text-muted dark:text-slate-400 text-center py-4 italic">
                  Nenhuma categoria encontrada.
                </p>
              )}
            </div>

            {hiddenCount > 0 && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 rounded-2xl bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-widest hover:text-text-primary dark:hover:text-white transition-all"
              >
                <ChevronDown size={14} />
                Mostrar +{hiddenCount} categorias
              </button>
            )}

            {showAll && filteredCategories.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="flex items-center justify-center gap-2 w-full mt-3 py-2 rounded-2xl bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-widest hover:text-text-primary dark:hover:text-white transition-all"
              >
                <ChevronUp size={14} />
                Mostrar menos
              </button>
            )}
          </div>
        </div>

        {/* Footer com Total e CTA */}
        <div className="sticky bottom-0 p-5 pt-3 bg-surface-primary dark:bg-slate-900 rounded-b-4xl border-t border-surface-elevated/50 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-widest">
              Total do orçamento
            </span>
            <span className="text-sm font-black text-text-primary dark:text-white">
              {formatCurrencyDisplay(totalBudgetSelected)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSettingBudget || Object.values(categoryEnabled).filter(Boolean).length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-3xl font-black text-xxs uppercase tracking-ultra-wide bg-brand-primary text-text-onBrand hover:bg-brand-primary/90 disabled:opacity-40 transition-all active:scale-95 shadow-brand-glow"
          >
            {isSettingBudget ? (
              <>
                <TrendingUp size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check size={16} />
                {currentBudget ? 'Atualizar Orçamento' : 'Criar Orçamento'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetSetupSheet;
