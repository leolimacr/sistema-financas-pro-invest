import { describe, it, expect } from 'vitest';
import { buildMarginTrajectory } from '../trajectoryEngine';

describe('trajectoryEngine - contrato do override', () => {
  it('usa flow.realBalance - protection nos meses passados e currentMargin no mês corrente', () => {
    const now = new Date();
    const mk = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-10`;
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const prev = new Date(y, m - 2, 10);
    const py = prev.getFullYear();
    const pm = prev.getMonth() + 1;

    const transactions = [
      { date: mk(py, pm), type: 'income', amount: 1000 },
      { date: mk(y, m), type: 'income', amount: 5000 },
    ];

    const withoutOverride = buildMarginTrajectory(transactions, { monthlyIncome: 0, emergencyReserveCurrent: 0, emergencyReserveTarget: 0, marcoZero: 0 } as any, 2, undefined);
    const withOverride = buildMarginTrajectory(transactions, { monthlyIncome: 0, emergencyReserveCurrent: 0, emergencyReserveTarget: 0, marcoZero: 0 } as any, 2, 9999);

    // mês passado não muda com override
    expect(withoutOverride[0].margin).toBe(withOverride[0].margin);
    // mês corrente sobrescrito
    expect(withOverride[1].margin).toBe(9999);
    expect(withoutOverride[1].margin).not.toBe(9999);
  });

  it('sem currentMargin, todos os pontos usam base mensal', () => {
    const now = new Date();
    const mk = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-10`;
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const transactions = [
      { date: mk(y, m), type: 'expense', amount: 300 },
    ];
    const points = buildMarginTrajectory(transactions, { monthlyIncome: 0, emergencyReserveCurrent: 5, emergencyReserveTarget: 0, marcoZero: 5 } as any, 1, undefined);
    // flow.realBalance = -300, protection = 10 => margin -310
    expect(points[0].margin).toBe(-310);
  });
});
