import { describe, it, expect } from 'vitest';
import { classifyStage, classifyFromSnapshot } from '../sovereignMap';
import type { SovereignSnapshot } from '../../utils/calculations';

const BASE_SNAPSHOT: SovereignSnapshot = {
  mode: 'rotina',
  heroLabel: 'Dinheiro do Mês',
  heroValue: 5000,
  monthBalance: 5000,
  accumulatedBalance: 20000,
  projectedBalance: 3000,
  protectionBuffer: 15000,
  colchaoShortfall: 2000,
  reserveShortfall: 1000,
  protectionShortfall: 3000,
  sovereignFreeBalance: 0,
  freedomDeficit: 0,
  leewayDays: 0,
  freedomVelocity: 5,
  income: 10000,
  expenses: 5000,
  accumulatedIncome: 100000,
  accumulatedExpenses: 80000,
  obligationsDeduction: 2000,
  virtualImpact: 1000,
};

describe('sovereignMap – classifyStage', () => {
  it('retorna "indefinido" quando launchCount < 5 e freeBalance >= 0', () => {
    const result = classifyStage({ launchCount: 3, sovereignFreeBalance: 500, protectionShortfall: 0, leewayDays: 10, freedomDeficit: 0 });
    expect(result.id).toBe('indefinido');
    expect(result.numericStage).toBe(0);
  });

  it('retorna "indefinido" mesmo com launchCount baixo e freeBalance zero', () => {
    const result = classifyStage({ launchCount: 0, sovereignFreeBalance: 0, protectionShortfall: 0, leewayDays: 0, freedomDeficit: 0 });
    expect(result.id).toBe('indefinido');
  });

  it('retorna "pressao" quando sovereignFreeBalance < 0 (ignora launchCount baixo)', () => {
    const result = classifyStage({ launchCount: 2, sovereignFreeBalance: -500, protectionShortfall: 2000, leewayDays: 0, freedomDeficit: 500 });
    expect(result.id).toBe('pressao');
    expect(result.numericStage).toBe(1);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it('retorna "pressao" com blockers corretos', () => {
    const result = classifyStage({ launchCount: 10, sovereignFreeBalance: -1200, protectionShortfall: 5000, leewayDays: 0, freedomDeficit: 1200 });
    expect(result.id).toBe('pressao');
    expect(result.blockers.some(b => b.includes('Déficit'))).toBe(true);
    expect(result.blockers.some(b => b.includes('Proteção incompleta'))).toBe(true);
  });

  it('retorna "colchao-incompleto" quando freeBalance >= 0 e protectionShortfall > 0', () => {
    const result = classifyStage({ launchCount: 10, sovereignFreeBalance: 2000, protectionShortfall: 3000, leewayDays: 12, freedomDeficit: 0 });
    expect(result.id).toBe('colchao-incompleto');
    expect(result.numericStage).toBe(2);
    expect(result.nextStep).toContain('Completar o Colchão Emergencial');
  });

  it('retorna "estavel" quando protectionShortfall <= 0, freeBalance > 0, leewayDays <= 90', () => {
    const result = classifyStage({ launchCount: 10, sovereignFreeBalance: 5000, protectionShortfall: 0, leewayDays: 60, freedomDeficit: 0 });
    expect(result.id).toBe('estavel');
    expect(result.numericStage).toBe(3);
  });

  it('retorna "estavel" com leewayDays zero (freeBalance positivo mas pequeno)', () => {
    const result = classifyStage({ launchCount: 10, sovereignFreeBalance: 100, protectionShortfall: 0, leewayDays: 0, freedomDeficit: 0 });
    expect(result.id).toBe('estavel');
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it('retorna "solido" quando protectionShortfall <= 0 e leewayDays > 90', () => {
    const result = classifyStage({ launchCount: 20, sovereignFreeBalance: 30000, protectionShortfall: 0, leewayDays: 120, freedomDeficit: 0 });
    expect(result.id).toBe('solido');
    expect(result.numericStage).toBe(4);
  });

  it('retorna "solido" com leewayDays = 91 (limite inferior)', () => {
    const result = classifyStage({ launchCount: 20, sovereignFreeBalance: 25000, protectionShortfall: 0, leewayDays: 91, freedomDeficit: 0 });
    expect(result.id).toBe('solido');
  });

  it('retorna "expansao" quando protectionShortfall <= 0 e leewayDays > 180', () => {
    const result = classifyStage({ launchCount: 50, sovereignFreeBalance: 200000, protectionShortfall: 0, leewayDays: 365, freedomDeficit: 0 });
    expect(result.id).toBe('expansao');
    expect(result.numericStage).toBe(5);
    expect(result.blockers).toHaveLength(0);
  });

  it('retorna "expansao" com leewayDays = 181 (limite inferior)', () => {
    const result = classifyStage({ launchCount: 50, sovereignFreeBalance: 150000, protectionShortfall: 0, leewayDays: 181, freedomDeficit: 0 });
    expect(result.id).toBe('expansao');
  });

  it('gera explanation contextualizada com valores do snapshot', () => {
    const result = classifyStage({ launchCount: 10, sovereignFreeBalance: -1500, protectionShortfall: 4000, leewayDays: 0, freedomDeficit: 1500 });
    expect(result.explanation).toContain('1500');
    expect(result.explanation).toContain('-1500.00');
  });

  it('nunca retorna blockers vazio em "pressao" ou "colchao-incompleto"', () => {
    const dep = classifyStage({ launchCount: 10, sovereignFreeBalance: -1, protectionShortfall: 0, leewayDays: 0, freedomDeficit: 1 });
    const col = classifyStage({ launchCount: 10, sovereignFreeBalance: 1, protectionShortfall: 1, leewayDays: 0, freedomDeficit: 0 });
    expect(dep.blockers.length).toBeGreaterThan(0);
    expect(col.blockers.length).toBeGreaterThan(0);
  });

  it('com launchCount < 5 e freeBalance negativo, força pressao (borda intencional)', () => {
    const result = classifyStage({ launchCount: 1, sovereignFreeBalance: -10, protectionShortfall: 500, leewayDays: 0, freedomDeficit: 10 });
    expect(result.id).toBe('pressao');
  });

  it('com expenses = 0, leewayDays = 0 impede solido/expansao (intencional)', () => {
    const solidLike = classifyStage({ launchCount: 20, sovereignFreeBalance: 100000, protectionShortfall: 0, leewayDays: 0, freedomDeficit: 0 });
    expect(solidLike.id).toBe('estavel');
    expect(solidLike.blockers.length).toBeGreaterThan(0);
  });
});

describe('sovereignMap – classifyFromSnapshot', () => {
  it('classifica corretamente a partir de um SovereignSnapshot', () => {
    const snap: SovereignSnapshot = { ...BASE_SNAPSHOT, sovereignFreeBalance: -2000, freedomDeficit: 2000 };
    const result = classifyFromSnapshot(snap, 10);
    expect(result.id).toBe('pressao');
  });

  it('classifica "solido" a partir de snapshot com proteção completa e boa folga', () => {
    const snap: SovereignSnapshot = {
      ...BASE_SNAPSHOT,
      sovereignFreeBalance: 50000,
      protectionShortfall: 0,
      leewayDays: 150,
    };
    const result = classifyFromSnapshot(snap, 30);
    expect(result.id).toBe('solido');
  });
});
