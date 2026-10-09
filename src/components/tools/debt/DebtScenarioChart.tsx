import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface DebtChartDataPoint {
  month: number;
  monthLabel: string;
  saldoNormal: number;
  saldoAcelerado: number;
}

export interface DebtScenarioChartProps {
  chartData: DebtChartDataPoint[];
}

const fmtCompactMoney = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
};

const fmtMoneyExact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const DebtScenarioChart: React.FC<DebtScenarioChartProps> = ({ chartData }) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Curva de Decaimento do Saldo Devedor
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Veja a velocidade da quitação normal vs. com amortização extraordinária.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Contratual
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Acelerado (+Extra)
          </span>
        </div>
      </div>

      <div className="h-[300px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradOpt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="opacity-50 dark:opacity-20" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtCompactMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: any, name: any) => [
                fmtMoneyExact(Number(value)),
                name === 'saldoAcelerado' ? 'Saldo Acelerado (+Extra)' : 'Saldo Contratual Normal',
              ]}
              labelFormatter={(label) => `Período: ${label}`}
              contentStyle={{ borderRadius: '1rem', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
            />
            <Area type="monotone" dataKey="saldoNormal" stroke="#94a3b8" strokeWidth={2} fill="url(#gradNormal)" />
            <Area type="monotone" dataKey="saldoAcelerado" stroke="#10b981" strokeWidth={2.5} fill="url(#gradOpt)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 leading-relaxed">
        * Projeção teórica com base nas regras matemáticas oficiais dos sistemas de amortização vigentes no Brasil. Custos de seguros habitacionais (MIP/DFI) e taxas de administração bancária não inclusos.
      </p>
    </div>
  );
};
