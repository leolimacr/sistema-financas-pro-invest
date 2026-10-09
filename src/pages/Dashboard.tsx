import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDashboardMonth } from '../hooks/useDashboardMonth';
import { formatMonthLabel } from '../services/dashboardService';

interface DashboardPageProps {
  /** Sobrescreve o uid do Auth (usado em testes/preview). */
  userId?: string;
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrency = (value: number): string => brl.format(value);

const CHART_COLORS = { income: '#10b981', expense: '#f43f5e' };

/**
 * Etapa 8 (E8-01) — Dashboard Principal.
 *
 * Visão geral do mês: saldo (receitas − despesas) em destaque, cartões de
 * receitas/despesas, gráfico receitas vs. despesas e seletor de período.
 * Fonte: `useDashboardMonth` (RTDB `transactions/${userId}`, mesma do
 * Controla). Somente leitura — nenhuma escrita, coleção ou índice novo.
 */
export const DashboardPage: React.FC<DashboardPageProps> = ({ userId: userIdProp }) => {
  const { user } = useAuth();
  const userId = userIdProp ?? user?.uid ?? undefined;
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const {
    monthKey,
    setMonthKey,
    goPrevMonth,
    goNextMonth,
    totalIncome,
    totalExpense,
    balance,
    count,
    isLoading,
    error,
  } = useDashboardMonth(userId);

  const chartData = [
    { name: 'Receitas', valor: totalIncome },
    { name: 'Despesas', valor: totalExpense },
  ];

  return (
    <div className="min-h-screen bg-surface-primary dark:bg-slate-950 px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white tracking-tight uppercase">
          Dashboard
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
          Visão geral do mês — receitas, despesas e saldo.
        </p>
      </header>

      {/* Seletor de período */}
      <div className="flex items-center justify-between gap-2 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-soft">
        <button
          type="button"
          onClick={goPrevMonth}
          aria-label="Mês anterior"
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm md:text-base font-black text-slate-950 dark:text-white capitalize" aria-live="polite">
            {formatMonthLabel(monthKey)}
          </span>
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            aria-label="Escolher mês de referência"
            className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
          />
        </div>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Próximo mês"
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all active:scale-95"
        >
          <ArrowRight size={18} />
        </button>
      </div>

      {!userId ? (
        <div role="alert" className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
            Entre na sua conta para ver o dashboard do mês.
          </p>
        </div>
      ) : isLoading ? (
        <div aria-busy="true" aria-label="Carregando dashboard" className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 animate-pulse">
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded mb-3" />
            <div className="h-10 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 animate-pulse">
              <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded mb-3" />
              <div className="h-8 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 animate-pulse">
              <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded mb-3" />
              <div className="h-8 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">
            Não foi possível carregar as transações do mês.
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      ) : count === 0 ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-soft">
            <Wallet size={28} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Nenhuma transação em {formatMonthLabel(monthKey)}.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Lance uma receita ou despesa no Controla para ver o resumo aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4" aria-live="polite">
          {/* Saldo em destaque */}
          <div
            className={`rounded-3xl p-8 text-white shadow-soft ${
              balance >= 0
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : 'bg-gradient-to-br from-rose-500 to-red-600'
            }`}
          >
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-2">
              Saldo do mês
            </span>
            <span className="block text-3xl md:text-4xl font-black tracking-tight">
              {formatCurrency(balance)}
            </span>
            <span className="block text-xs font-medium text-white/80 mt-2">
              {count} {count === 1 ? 'lançamento' : 'lançamentos'} em {formatMonthLabel(monthKey)}
            </span>
          </div>

          {/* Receitas / Despesas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={18} />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Receitas do mês
                </span>
              </div>
              <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatCurrency(totalIncome)}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <TrendingDown size={18} />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Despesas do mês
                </span>
              </div>
              <span className="block text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                {formatCurrency(totalExpense)}
              </span>
            </div>
          </div>

          {/* Gráfico receitas vs. despesas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-soft">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-4">
              Receitas vs. despesas
            </h2>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} stroke={isDark ? '#94a3b8' : '#64748b'} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke={isDark ? '#94a3b8' : '#64748b'}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      borderRadius: '1rem',
                    }}
                  />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.name === 'Receitas' ? CHART_COLORS.income : CHART_COLORS.expense}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
