import { describe, it, expect } from 'vitest';
import { getBudgetStatus, calcBudgetProgress, toBudgetInsightData } from '../budgetMath';
import { getPreviousBudgetId, formatBudgetMonthName, buildBudgetId } from '../../utils/budgetUtils';
import type { Budget, Transaction } from '../../types';

describe('budgetMath & budgetUtils', () => {
  describe('getBudgetStatus - Correção de Escala (0.8 vs 80%)', () => {
    it('retorna green para porcentagens abaixo do limiar', () => {
      expect(getBudgetStatus(0, 0.8)).toBe('green');
      expect(getBudgetStatus(1, 0.8)).toBe('green'); // 1% não vira amarelo!
      expect(getBudgetStatus(50, 0.8)).toBe('green');
      expect(getBudgetStatus(79.9, 0.8)).toBe('green');
    });

    it('funciona tanto com limiar decimal (0.8) quanto inteiro (80)', () => {
      expect(getBudgetStatus(10, 80)).toBe('green');
      expect(getBudgetStatus(80, 80)).toBe('yellow');
      expect(getBudgetStatus(80, 0.8)).toBe('yellow');
      expect(getBudgetStatus(90, 0.8)).toBe('yellow');
    });

    it('retorna red para porcentagens acima de 95%', () => {
      expect(getBudgetStatus(95.1, 0.8)).toBe('red');
      expect(getBudgetStatus(100, 0.8)).toBe('red');
      expect(getBudgetStatus(150, 0.8)).toBe('red');
    });
  });

  describe('calcBudgetProgress - Rigor Contábil e Categorias Não Orçadas', () => {
    const mockBudget: Budget = {
      id: '2026-09',
      userId: 'test-user',
      month: '2026-09',
      totalIncome: 5000,
      totalBudget: 2000,
      savingsGoal: 1000,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      categories: [
        {
          categoryName: 'Supermercado',
          categoryKey: 'supermercado',
          limit: 1500,
          alertThreshold: 0.8,
          rollover: false,
        },
        {
          categoryName: 'Transporte',
          categoryKey: 'transporte',
          limit: 500,
          alertThreshold: 0.8,
          rollover: false,
        },
      ],
    };

    const mockTransactions: Transaction[] = [
      // Despesa orçada real
      {
        id: 'tx-1',
        type: 'expense',
        amount: 300,
        category: 'Supermercado',
        date: '2026-09-05',
        description: 'Mercado semanal',
      },
      // Despesa em transporte
      {
        id: 'tx-2',
        type: 'expense',
        amount: 450,
        category: 'Transporte',
        date: '2026-09-10',
        description: 'Combustível',
      },
      // Despesa NÃO orçada (Saúde)
      {
        id: 'tx-3',
        type: 'expense',
        amount: 250,
        category: 'Saúde & Farmácia',
        date: '2026-09-12',
        description: 'Farmácia',
      },
      // Transação virtual (projeção futura) -> DEVE SER IGNORADA
      {
        id: 'tx-4',
        type: 'expense',
        amount: 800,
        category: 'Supermercado',
        date: '2026-09-28',
        description: 'Fatura projetada',
        isVirtual: true,
      },
      // Pagamento de fatura -> DEVE SER IGNORADO
      {
        id: 'tx-5',
        type: 'expense',
        amount: 1500,
        category: 'Pagamento de Fatura',
        date: '2026-09-15',
        description: 'Fatura Nubank',
        isBillPayment: true,
      },
      // Receita -> DEVE SER IGNORADA
      {
        id: 'tx-6',
        type: 'income',
        amount: 5000,
        category: 'Salário',
        date: '2026-09-01',
        description: 'Salário',
      },
      // Despesa de outro mês -> DEVE SER IGNORADA
      {
        id: 'tx-7',
        type: 'expense',
        amount: 200,
        category: 'Supermercado',
        date: '2026-08-30',
        description: 'Mês passado',
      },
    ];

    it('calcula progresso ignorando virtuais e pagamentos de fatura', () => {
      const progress = calcBudgetProgress(mockBudget, mockTransactions);

      expect(progress.totalBudget).toBe(2000);
      // Gasto orçado: 300 (Mercado) + 450 (Transporte) = 750
      expect(progress.totalSpent).toBe(750);
      expect(progress.totalPercentage).toBe((750 / 2000) * 100);

      // Categoria Supermercado: 300 / 1500 = 20% -> green
      const mercado = progress.categories.find((c) => c.categoryKey === 'supermercado');
      expect(mercado).toBeDefined();
      expect(mercado?.spent).toBe(300);
      expect(mercado?.percentage).toBe(20);
      expect(mercado?.status).toBe('green');

      // Categoria Transporte: 450 / 500 = 90% -> yellow
      const transporte = progress.categories.find((c) => c.categoryKey === 'transporte');
      expect(transporte).toBeDefined();
      expect(transporte?.spent).toBe(450);
      expect(transporte?.percentage).toBe(90);
      expect(transporte?.status).toBe('yellow');

      // Gastos não orçados: 250 (Saúde & Farmácia)
      expect(progress.unbudgetedSpent).toBe(250);
      expect(progress.unbudgetedCategories).toHaveLength(1);
      expect(progress.unbudgetedCategories[0].categoryName).toBe('Saúde & Farmácia');
      expect(progress.unbudgetedCategories[0].spent).toBe(250);

      // Total real: 750 + 250 = 1000
      expect(progress.totalRealSpent).toBe(1000);
    });
  });

  describe('toBudgetInsightData - Adaptador para Nexus', () => {
    it('formata os dados com dias transcorridos e dias no mês', () => {
      const mockBudget: Budget = {
        id: '2026-09',
        userId: 'test-user',
        month: '2026-09',
        totalIncome: 5000,
        totalBudget: 1000,
        savingsGoal: 500,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        categories: [
          { categoryName: 'Lazer', categoryKey: 'lazer', limit: 1000, alertThreshold: 0.8, rollover: false },
        ],
      };

      const progress = calcBudgetProgress(mockBudget, [
        { id: '1', type: 'expense', amount: 850, category: 'Lazer', date: '2026-09-10' },
      ]);

      const refDate = new Date(2026, 8, 15); // 15 de setembro de 2026 (mês 8 em 0-index)
      const insightData = toBudgetInsightData(progress, refDate);

      expect(insightData.daysElapsed).toBe(15);
      expect(insightData.daysInMonth).toBe(30); // Setembro tem 30 dias
      expect(insightData.totalBudget).toBe(1000);
      expect(insightData.totalSpent).toBe(850);
      expect(insightData.totalPercentage).toBe(85);
      expect(insightData.categories[0].status).toBe('yellow');
    });
  });

  describe('budgetUtils helpers', () => {
    it('calcula o mês anterior corretamente', () => {
      expect(getPreviousBudgetId('2026-09')).toBe('2026-08');
      expect(getPreviousBudgetId('2026-01')).toBe('2025-12');
    });

    it('formata o nome do mês em português', () => {
      const formatted = formatBudgetMonthName('2026-09');
      expect(formatted).toContain('2026');
      expect(formatted.toLowerCase()).toContain('setembro');
    });

    it('constrói budgetId padronizado com 2 dígitos para o mês', () => {
      expect(buildBudgetId(2026, 5)).toBe('2026-05');
      expect(buildBudgetId(2026, 11)).toBe('2026-11');
    });
  });

  describe('Deduplicação de Cartão de Crédito & Preservação de Concessionárias', () => {
    it('isCreditCardInvoiceCategory: identifica categorias de fatura de cartão sem falsos positivos em concessionárias', async () => {
      const { isCreditCardInvoiceCategory } = await import('../../utils/budgetUtils');

      // Faturas de Cartão (Devem retornar true)
      expect(isCreditCardInvoiceCategory('Fatura - Cartão Nubank')).toBe(true);
      expect(isCreditCardInvoiceCategory('fatura de cartao')).toBe(true);
      expect(isCreditCardInvoiceCategory('Fatura do Cartão')).toBe(true);
      expect(isCreditCardInvoiceCategory('Pagamento de Fatura')).toBe(true);
      expect(isCreditCardInvoiceCategory('Cartão de Crédito')).toBe(true);
      expect(isCreditCardInvoiceCategory('Cartao Credito')).toBe(true);

      // Com nomes de cartões do usuário
      expect(isCreditCardInvoiceCategory('Fatura Nubank', ['Nubank', 'Inter'])).toBe(true);
      expect(isCreditCardInvoiceCategory('Fatura Inter', ['Nubank', 'Inter'])).toBe(true);

      // Contas de Consumo / Concessionárias (NÃO devem ser excluídas!)
      expect(isCreditCardInvoiceCategory('Fatura de Internet')).toBe(false);
      expect(isCreditCardInvoiceCategory('Fatura de Energia')).toBe(false);
      expect(isCreditCardInvoiceCategory('Fatura de Água')).toBe(false);
      expect(isCreditCardInvoiceCategory('Fatura do Celular')).toBe(false);
      expect(isCreditCardInvoiceCategory('Supermercado')).toBe(false);
      expect(isCreditCardInvoiceCategory('Transporte')).toBe(false);
    });

    it('isCreditCardPaymentTransaction: identifica liquidações técnicas de cartão e preserva compras no cartão e contas fixas', async () => {
      const { isCreditCardPaymentTransaction } = await import('../../utils/budgetUtils');

      // 1. Quitação de cartão com flag de sistema
      expect(isCreditCardPaymentTransaction({
        type: 'expense',
        amount: 1500,
        isBillPayment: true,
        linkedCardId: 'card-nubank',
      })).toBe(true);

      // 2. Lançamento manual avulso de fatura por categoria
      expect(isCreditCardPaymentTransaction({
        type: 'expense',
        amount: 2000,
        category: 'Fatura - Cartão Nubank',
      })).toBe(true);

      // 3. Lançamento manual avulso de fatura por descrição
      expect(isCreditCardPaymentTransaction({
        type: 'expense',
        amount: 1200,
        description: 'Pagamento Fatura Nubank',
      })).toBe(true);

      // 4. Compra no Cartão de Crédito (DEVE RETORNAR FALSE para pontuar na categoria!)
      expect(isCreditCardPaymentTransaction({
        type: 'expense',
        amount: 350,
        category: 'Supermercado',
        paymentMethod: 'credit',
        cardId: 'card-nubank',
        description: 'Compras Pão de Açúcar',
      })).toBe(false);

      // 5. Conta Fixa Recorrente Paga (Aluguel em Moradia)
      expect(isCreditCardPaymentTransaction({
        type: 'expense',
        amount: 1800,
        category: 'Moradia',
        isBillPayment: true,
        linkedRecurringBillId: 'bill-aluguel',
        description: 'Aluguel do Mês',
      })).toBe(false);
    });

    it('calcBudgetProgress: compras no cartão pontuam no orçamento e quitação de fatura é ignorada sem gerar gasto não orçado', () => {
      const budget: Budget = {
        id: '2026-09',
        userId: 'u1',
        month: '2026-09',
        totalIncome: 5000,
        totalBudget: 2500,
        savingsGoal: 1000,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        categories: [
          { categoryName: 'Supermercado', categoryKey: 'supermercado', limit: 1500, alertThreshold: 0.8, rollover: false },
          { categoryName: 'Moradia', categoryKey: 'moradia', limit: 1000, alertThreshold: 0.8, rollover: false },
        ],
      };

      const transactions: Transaction[] = [
        // Compra no Cartão de Crédito em Supermercado -> Consome o teto de Supermercado
        {
          id: 'tx-card-purchase',
          userId: 'u1',
          type: 'expense',
          amount: 600,
          category: 'Supermercado',
          paymentMethod: 'credit',
          cardId: 'card-1',
          date: '2026-09-10',
          description: 'Supermercado no cartão',
        },
        // Conta fixa paga (Aluguel) em Moradia -> Consome o teto de Moradia
        {
          id: 'tx-bill-aluguel',
          userId: 'u1',
          type: 'expense',
          amount: 800,
          category: 'Moradia',
          date: '2026-09-12',
          description: 'Aluguel',
          isBillPayment: true,
          linkedRecurringBillId: 'bill-1',
        },
        // Pagamento da fatura anterior no banco -> NÃO deve pontuar nem ir para Não Orçados!
        {
          id: 'tx-card-pay',
          userId: 'u1',
          type: 'expense',
          amount: 2500,
          category: 'Fatura - Cartão Nubank',
          date: '2026-09-15',
          description: 'Pagamento Fatura Nubank',
          isBillPayment: true,
          linkedCardId: 'card-1',
        },
      ];

      const progress = calcBudgetProgress(budget, transactions);

      // Supermercado consumiu 600
      const mercado = progress.categories.find(c => c.categoryKey === 'supermercado');
      expect(mercado?.spent).toBe(600);
      expect(mercado?.percentage).toBe(40);

      // Moradia consumiu 800
      const moradia = progress.categories.find(c => c.categoryKey === 'moradia');
      expect(moradia?.spent).toBe(800);
      expect(moradia?.percentage).toBe(80);

      // Total gasto orçado = 600 + 800 = 1400 (e NÃO 3900!)
      expect(progress.totalSpent).toBe(1400);

      // Gastos não orçados = 0 (o pagamento de fatura não caiu em unbudgetedSpent!)
      expect(progress.unbudgetedSpent).toBe(0);
      expect(progress.unbudgetedCategories).toHaveLength(0);
      expect(progress.totalRealSpent).toBe(1400);
    });
  });
});
