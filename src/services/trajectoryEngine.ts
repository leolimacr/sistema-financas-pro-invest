import type { FinancialProfile } from '../types';
import { aggregateMonthFlow, getProtectionBuffer } from '../utils/calculations';

export interface TrajectoryPoint {
  label: string;
  monthKey: string;
  margin: number;
  cashFlow: number;
}

export interface TrajectorySummary {
  slope: number;
  direction: 'up' | 'down' | 'flat';
  label: string;
  points: TrajectoryPoint[];
}

type TxLike = {
  type: string;
  amount: number;
  paymentMethod?: string;
  date: string;
  isVirtual?: boolean;
};

/** Série mensal da folga do mês (caixa do mês − estrutura protegida).
 * Contrato: meses passados usam `flow.realBalance − protection` (base mensal);
 * o mês corrente é sobrescrito por `currentMargin` quando fornecido, permitindo
 * exibir a folga soberana acumulada (`sovereign.sovereignFreeBalance`) no último ponto.
 * A quebra de base é intencional e fixada por teste. */
export function buildMarginTrajectory(
  transactions: TxLike[],
  financialProfile?: FinancialProfile,
  months = 6,
  currentMargin?: number
): TrajectoryPoint[] {
  const now = new Date();
  const protection = getProtectionBuffer(financialProfile);
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const points: TrajectoryPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const flow = aggregateMonthFlow(transactions, year, month);

    const isCurrent = monthKey === currentKey;
    const margin = isCurrent && currentMargin !== undefined
      ? currentMargin
      : flow.realBalance - protection;

    points.push({
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      monthKey,
      margin,
      cashFlow: flow.realBalance,
    });
  }

  return points;
}

export function summarizeTrajectory(points: TrajectoryPoint[]): TrajectorySummary {
  if (points.length === 0) {
    return { slope: 0, direction: 'flat', label: 'Sem dados para trajetória', points };
  }

  const first = points[0].margin;
  const last = points[points.length - 1].margin;
  const slope = last - first;
  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(n));

  let direction: TrajectorySummary['direction'] = 'flat';
  let label = 'Folga estável no período';

  if (slope > 50) {
    direction = 'up';
    label = `Inclinação positiva: +${fmt(slope)} no período`;
  } else if (slope < -50) {
    direction = 'down';
    label = `Folga em queda: −${fmt(slope)} no período`;
  }

  return { slope, direction, label, points };
}

export function buildMarginTrajectorySummary(
  transactions: TxLike[],
  financialProfile?: FinancialProfile,
  months = 6,
  currentMargin?: number
): TrajectorySummary {
  const points = buildMarginTrajectory(transactions, financialProfile, months, currentMargin);
  return summarizeTrajectory(points);
}
