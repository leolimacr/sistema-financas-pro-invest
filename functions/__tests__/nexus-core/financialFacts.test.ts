import { describe, expect, it } from 'vitest';
import { FinancialFactsEngine } from '../../nexus-core/financial-facts';

describe('FinancialFactsEngine - Motor Determinístico de Fatos Contábeis (Frente 4)', () => {
  it('computa fatos com parâmetros vazios sem falhas', () => {
    const facts = FinancialFactsEngine.computeFacts({});

    expect(facts.cashflow.totalIncome).toBe(0);
    expect(facts.cashflow.totalExpenses).toBe(0);
    expect(facts.cashflow.balance).toBe(0);
    expect(facts.debts.activeCount).toBe(0);
    expect(facts.debts.severity).toBe('sem_dividas');
    expect(facts.protection.status).toBe('nao_configurada');
    expect(facts.narrativeFacts.length).toBeGreaterThan(0);
  });

  it('computa fluxo de caixa e taxa de queima a partir de transações', () => {
    const transactions = [
      { id: '1', amount: 8000, type: 'income' },
      { id: '2', amount: 3000, type: 'expense' },
      { id: '3', amount: 1500, type: 'expense' },
    ];

    const facts = FinancialFactsEngine.computeFacts({ transactions });

    expect(facts.cashflow.totalIncome).toBe(8000);
    expect(facts.cashflow.totalExpenses).toBe(4500);
    expect(facts.cashflow.balance).toBe(3500);
    expect(facts.cashflow.burnRatePercent).toBe(56);
    expect(facts.cashflow.hasTransactions).toBe(true);

    const promptText = FinancialFactsEngine.formatForPrompt(facts);
    expect(promptText).toContain('8.000,00');
    expect(promptText).toContain('4.500,00');
    expect(promptText).toContain('3.500,00');
    expect(promptText).toContain('56%');
  });

  it('avalia endividamento com taxa abusiva e classifica gravidade crítica', () => {
    const debts = [
      { id: 'd1', nome: 'Rotativo Nubank', saldoDevedor: 4000, valorParcela: 600, taxaMensal: 14.2 },
      { id: 'd2', nome: 'Financiamento Auto', saldoDevedor: 20000, valorParcela: 900, taxaMensal: 1.8 },
    ];

    const financialProfile = {
      monthlyIncome: 6000,
      emergencyReserveTarget: 6,
      emergencyReserveCurrent: 12000,
    };

    const facts = FinancialFactsEngine.computeFacts({ debts, financialProfile });

    expect(facts.debts.totalBalance).toBe(24000);
    expect(facts.debts.monthlyInstallments).toBe(1500);
    expect(facts.debts.maxMonthlyRate).toBe(14.2);
    expect(facts.debts.mostExpensiveDebtName).toBe('Rotativo Nubank');
    expect(facts.debts.incomeCommitmentPercent).toBe(25); // 1500 / 6000 = 25%
    expect(facts.debts.severity).toBe('critica'); // taxa >= 4.0%
  });

  it('computa proteção e reserva com cobertura de meses', () => {
    const transactions = [
      { id: '1', amount: 10000, type: 'income' },
      { id: '2', amount: 4000, type: 'expense' },
    ];

    const financialProfile = {
      monthlyIncome: 10000,
      emergencyReserveTarget: 6,
      emergencyReserveCurrent: 24000,
    };

    const facts = FinancialFactsEngine.computeFacts({ transactions, financialProfile });

    // Custo estimado = 4000 (despesas reais)
    // 24000 / 4000 = 6.0 meses cobertos
    expect(facts.protection.reserveCurrent).toBe(24000);
    expect(facts.protection.monthsCovered).toBe(6);
    expect(facts.protection.status).toBe('blindada');
  });

  it('calcula compromissos imediatos e margem operacional projetada', () => {
    const bills = [
      { name: 'Aluguel', amount: 2000, isActive: true },
      { name: 'Internet', amount: 150, isActive: true },
      { name: 'Academia inativa', amount: 100, isActive: false },
    ];

    const invoices = [
      { cardName: 'Cartão Black', totalAmount: 1850 },
    ];

    const debts = [
      { nome: 'Consignado', valorParcela: 500, saldoDevedor: 8000, taxaMensal: 1.5 },
    ];

    const financialProfile = {
      monthlyIncome: 7000,
      emergencyReserveTarget: 6,
      emergencyReserveCurrent: 5000,
    };

    const facts = FinancialFactsEngine.computeFacts({ bills, invoices, debts, financialProfile });

    expect(facts.immediateCommitments.fixedBillsTotal).toBe(2150); // 2000 + 150
    expect(facts.immediateCommitments.invoicesTotal).toBe(1850);
    expect(facts.immediateCommitments.totalImmediate).toBe(4500); // 2150 + 1850 + 500
    expect(facts.immediateCommitments.projectedMargin).toBe(2500); // 7000 - 4500

    const promptText = FinancialFactsEngine.formatForPrompt(facts);
    expect(promptText).toContain('Compromissos estruturais imediatos');
    expect(promptText).toContain('4.500,00');
    expect(promptText).toContain('2.500,00');
  });
});
