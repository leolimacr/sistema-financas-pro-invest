import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { Transaction, FinancialProfile } from '../../../../types';
import { buildMarginTrajectorySummary } from '../../../../services/trajectoryEngine';
import { maskCurrency } from '../../../../utils/calculations';

interface MarginTrajectoryPanelProps {
  transactions: Transaction[];
  financialProfile?: FinancialProfile;
  currentMargin?: number;
  isPrivacyMode?: boolean;
  variant?: 'light' | 'dark';
  months?: number;
}

const MarginTrajectoryPanel: React.FC<MarginTrajectoryPanelProps> = ({
  transactions,
  financialProfile,
  currentMargin,
  isPrivacyMode = false,
  variant = 'light',
  months = 6,
}) => {
  const summary = useMemo(
    () =>
      buildMarginTrajectorySummary(
        transactions,
        financialProfile,
        months,
        currentMargin
      ),
    [transactions, financialProfile, months, currentMargin]
  );

  const isDark = variant === 'dark';
  const hasData = summary.points.some((p) => p.cashFlow !== 0);

  const DirectionIcon =
    summary.direction === 'up'
      ? TrendingUp
      : summary.direction === 'down'
        ? TrendingDown
        : Minus;

  const directionColor =
    summary.direction === 'up'
      ? 'text-emerald-600'
      : summary.direction === 'down'
        ? 'text-rose-600'
        : isDark
          ? 'text-slate-500'
          : 'text-text-muted';

  const strokeColor =
    summary.direction === 'down' ? '#be123c' : summary.direction === 'up' ? '#047857' : '#0284c7';

  if (!hasData) {
    return (
      <div
        className={`rounded-section border p-5 ${
          isDark
            ? 'bg-slate-900/60 border-slate-700/80'
            : 'bg-surface-subtle border-slate-200'
        }`}
      >
        <p className={`text-xxs font-black uppercase tracking-ultra-wide ${isDark ? 'text-slate-500' : 'text-text-muted'}`}>
          Trajetória da folga
        </p>
        <p className={`text-sm font-medium mt-2 ${isDark ? 'text-slate-500' : 'text-text-muted'}`}>
          Registre movimentações em mais meses para ver a inclinação da sua folga do mês.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-section border p-4 md:p-5 space-y-3 ${
        isDark
          ? 'bg-slate-900/60 border-slate-700/80'
          : 'bg-surface-subtle border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xxs font-black uppercase tracking-ultra-wide ${
              isDark ? 'text-slate-500' : 'text-text-muted'
            }`}
          >
            Trajetória da folga
          </p>
          <p className={`text-[10px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-text-muted'}`}>
            Últimos {months} meses · inclinação da curva
          </p>
        </div>
        <div className={`flex items-center gap-1.5 ${directionColor}`}>
          <DirectionIcon size={14} strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {summary.direction === 'up' ? 'Subindo' : summary.direction === 'down' ? 'Caindo' : 'Estável'}
          </span>
        </div>
      </div>

      {!isPrivacyMode && (
        <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-text-secondary'}`}>
          {summary.label}
        </p>
      )}

      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={summary.points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`marginGrad-${variant}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: isDark ? '#cbd5e1' : '#475569' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <ReferenceLine y={0} stroke={isDark ? '#475569' : '#94a3b8'} strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.18)',
                fontSize: '11px',
                background: isDark ? '#1e293b' : '#fff',
                color: isDark ? '#f1f5f9' : '#0f172a',
              }}
              formatter={(val: number) => [
                isPrivacyMode ? '••••' : maskCurrency(val),
                'Folga',
              ]}
              labelFormatter={(label) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="margin"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#marginGrad-${variant})`}
              dot={{ r: 3, fill: strokeColor, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MarginTrajectoryPanel;
