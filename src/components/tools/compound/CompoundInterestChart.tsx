import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { CompoundChartPoint } from './compoundTypes';

export interface CompoundInterestChartProps {
  chartData: CompoundChartPoint[];
}

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompactMoney = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
};

export const CompoundInterestChart: React.FC<CompoundInterestChartProps> = ({ chartData }) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
      <h3 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
        <TrendingUp className="text-emerald-500" size={18} />
        Curva Exponencial: Investimento vs Rendimento
      </h3>

      <div className="h-80 w-full">
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorJuros" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="opacity-50 dark:opacity-20" />
            <XAxis 
              dataKey="label" 
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis 
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(v) => fmtCompactMoney(v)}
            />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
              formatter={(value: any) => [`R$ ${formatCurrency(value)}`, '']}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="Valor Investido" 
              stackId="1"
              stroke="#3b82f6" 
              fill="url(#colorInvestido)"
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="Juros Acumulados" 
              stackId="1"
              stroke="#10b981" 
              fill="url(#colorJuros)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
        * Gráfico empilhado: A base azul é o dinheiro do seu bolso; a faixa verde superior representa o lucro gerado pelos juros compostos.
      </p>
    </div>
  );
};
