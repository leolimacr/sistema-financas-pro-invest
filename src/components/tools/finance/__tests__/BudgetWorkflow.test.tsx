import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import BudgetSetupSheet from '../BudgetSetupSheet';
import BudgetStatusCard from '../BudgetStatusCard';
import type { Budget, Category, Transaction } from '../../../../types';

// Mock useBudget
const mockSetBudget = vi.fn().mockResolvedValue(undefined);
const mockDeleteBudget = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../../hooks/useBudget', () => ({
  useBudget: () => ({
    budget: null,
    isLoading: false,
    setBudget: mockSetBudget,
    deleteBudget: mockDeleteBudget,
    isSettingBudget: false,
    isDeletingBudget: false,
  }),
}));

describe('Budget UI Workflow (BudgetSetupSheet & BudgetStatusCard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCategories: Category[] = [
    { id: '1', name: 'Supermercado', type: 'expense' },
    { id: '2', name: 'Transporte', type: 'expense' },
    { id: '3', name: 'Lazer', type: 'expense' },
  ];

  const mockTransactions: Transaction[] = [
    { id: 'tx-1', type: 'expense', amount: 350, category: 'Supermercado', date: '2026-09-05' },
    { id: 'tx-2', type: 'expense', amount: 150, category: 'Transporte', date: '2026-09-10' },
  ];

  const existingBudget: Budget = {
    id: '2026-09',
    userId: 'user-123',
    month: '2026-09',
    totalIncome: 7000,
    totalBudget: 2500,
    savingsGoal: 1500,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    categories: [
      { categoryName: 'Supermercado', categoryKey: 'supermercado', limit: 1800, alertThreshold: 0.8, rollover: false },
      { categoryName: 'Transporte', categoryKey: 'transporte', limit: 700, alertThreshold: 0.8, rollover: false },
    ],
  };

  describe('BudgetSetupSheet — Hidratação e Preservação de Dados', () => {
    it('preserva os limites salvos ao editar orçamento existente (não zera poupança nem sobrescreve limites)', () => {
      render(
        <BudgetSetupSheet
          isOpen={true}
          onClose={vi.fn()}
          userId="user-123"
          categories={mockCategories}
          transactions={mockTransactions}
          monthlyIncome={7000}
          currentBudget={existingBudget}
          targetMonthKey="2026-09"
          onSaved={vi.fn()}
        />
      );

      // Título em modo edição
      expect(screen.getByText('Editar Orçamento')).toBeInTheDocument();
      expect(screen.getByText(/setembro de 2026/i)).toBeInTheDocument();

      // Renda prevista e poupança preservadas
      const incomeInput = screen.getByDisplayValue(/7\.000/);
      expect(incomeInput).toBeInTheDocument();

      const savingsInput = screen.getByDisplayValue(/1\.500/);
      expect(savingsInput).toBeInTheDocument();

      // Limites de categorias preservados
      expect(screen.getByDisplayValue(/1\.800/)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/700/)).toBeInTheDocument();
    });

    it('permite clonar limites do mês anterior quando não há orçamento ativo', () => {
      const prevBudget: Budget = {
        ...existingBudget,
        id: '2026-08',
        month: '2026-08',
        categories: [
          { categoryName: 'Supermercado', categoryKey: 'supermercado', limit: 1600, alertThreshold: 0.8, rollover: false },
        ],
      };

      render(
        <BudgetSetupSheet
          isOpen={true}
          onClose={vi.fn()}
          userId="user-123"
          categories={mockCategories}
          transactions={mockTransactions}
          monthlyIncome={6000}
          currentBudget={null}
          previousBudget={prevBudget}
          targetMonthKey="2026-09"
          onSaved={vi.fn()}
        />
      );

      // Botão de clonar disponível
      const cloneButton = screen.getByRole('button', { name: /clonar/i });
      expect(cloneButton).toBeInTheDocument();

      // Clica em clonar
      fireEvent.click(cloneButton);

      // Limite clonado aparece
      expect(screen.getByDisplayValue(/1\.600/)).toBeInTheDocument();
    });

    it('calcula o banner da equação de folga soberana com contas fixas e faturas', () => {
      render(
        <BudgetSetupSheet
          isOpen={true}
          onClose={vi.fn()}
          userId="user-123"
          categories={mockCategories}
          transactions={mockTransactions}
          monthlyIncome={8000}
          fixedObligationsTotal={2000}
          creditInvoicesTotal={1000}
          targetMonthKey="2026-09"
          onSaved={vi.fn()}
        />
      );

      // Renda: 8.000, Contas: -3.000 -> Folga segura = 5.000
      expect(screen.getByText(/Contas\/Faturas: -R\$\s*3\.000/)).toBeInTheDocument();
      expect(screen.getByText(/Folga Segura para Categorias:/)).toBeInTheDocument();
    });

    it('não exibe categorias de fatura de cartão no seletor e exibe nota educativa de folga segura', () => {
      const categoriesWithInvoice: Category[] = [
        ...mockCategories,
        { id: 'inv-1', name: 'Fatura - Cartão Nubank', type: 'expense' },
        { id: 'inv-2', name: 'Cartão de Crédito', type: 'expense' },
        { id: 'util-1', name: 'Fatura de Internet', type: 'expense' },
      ];

      render(
        <BudgetSetupSheet
          isOpen={true}
          onClose={vi.fn()}
          userId="user-123"
          categories={categoriesWithInvoice}
          transactions={mockTransactions}
          monthlyIncome={5000}
          targetMonthKey="2026-09"
          onSaved={vi.fn()}
        />
      );

      // Categorias normais e conta de concessionária aparecem
      expect(screen.getByText('Supermercado')).toBeInTheDocument();
      expect(screen.getByText('Transporte')).toBeInTheDocument();
      expect(screen.getByText('Fatura de Internet')).toBeInTheDocument();

      // Categorias de fatura de cartão NÃO aparecem
      expect(screen.queryByText('Fatura - Cartão Nubank')).not.toBeInTheDocument();
      expect(screen.queryByText('Cartão de Crédito')).not.toBeInTheDocument();

      // Nota educativa presente
      expect(screen.getByText(/Por que a fatura do cartão não aparece na lista de categorias\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Suas compras no cartão são controladas diretamente nas categorias de consumo/i)).toBeInTheDocument();
    });

    it('sanitiza orçamento legado na edição, expurgando categorias de cartão de crédito salvas no passado', async () => {
      const legacyBudgetWithInvoice: Budget = {
        ...existingBudget,
        categories: [
          ...existingBudget.categories,
          { categoryName: 'Fatura - Cartão Nubank', categoryKey: 'fatura_cartao_nubank', limit: 2500, alertThreshold: 0.8, rollover: false },
        ],
      };

      render(
        <BudgetSetupSheet
          isOpen={true}
          onClose={vi.fn()}
          userId="user-123"
          categories={mockCategories}
          transactions={mockTransactions}
          monthlyIncome={7000}
          currentBudget={legacyBudgetWithInvoice}
          targetMonthKey="2026-09"
          onSaved={vi.fn()}
        />
      );

      // Fatura não aparece na tela
      expect(screen.queryByText('Fatura - Cartão Nubank')).not.toBeInTheDocument();

      // Ao clicar em Salvar/Atualizar, setBudget não deve conter a categoria de fatura
      const saveButton = screen.getByRole('button', { name: /(atualizar|salvar) orçamento/i });
      fireEvent.click(saveButton);

      expect(mockSetBudget).toHaveBeenCalledTimes(1);
      const savedPayload = mockSetBudget.mock.calls[0][0];
      const savedCategoryNames = savedPayload.categories.map((c: any) => c.categoryName);
      expect(savedCategoryNames).not.toContain('Fatura - Cartão Nubank');
      expect(savedCategoryNames).toContain('Supermercado');
      expect(savedCategoryNames).toContain('Transporte');
    });
  });

  describe('BudgetStatusCard — Exibição Soberana e Naked Truth', () => {
    it('exibe mês formatado e barra de progresso das categorias orçadas', () => {
      render(
        <BudgetStatusCard
          budget={existingBudget}
          transactions={mockTransactions}
          onEdit={vi.fn()}
        />
      );

      expect(screen.getByText(/setembro de 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/Total gasto \(categorias orçadas\)/i)).toBeInTheDocument();
      // Gasto de Supermercado (350) + Transporte (150) = 500
      expect(screen.getByText(/20% pactuado/i)).toBeInTheDocument();
      expect(screen.getByText(/2\.500,00/)).toBeInTheDocument();
    });

    it('exibe a linha Naked Truth de gastos fora do orçamento quando houver despesas não orçadas', () => {
      const transactionsWithUnbudgeted: Transaction[] = [
        ...mockTransactions,
        { id: 'tx-extra', type: 'expense', amount: 420, category: 'Saúde & Cuidados', date: '2026-09-12' },
      ];

      render(
        <BudgetStatusCard
          budget={existingBudget}
          transactions={transactionsWithUnbudgeted}
          onEdit={vi.fn()}
        />
      );

      expect(screen.getByText(/categorias fora do teto/i)).toBeInTheDocument();
      expect(screen.getByText(/\+ R\$\s*420,00/)).toBeInTheDocument();
    });

    it('exibe confirmação e chama onDelete ao clicar no ícone de exclusão', () => {
      const mockOnDelete = vi.fn();

      render(
        <BudgetStatusCard
          budget={existingBudget}
          transactions={mockTransactions}
          onEdit={vi.fn()}
          onDelete={mockOnDelete}
        />
      );

      // Clica na lixeira
      const trashButton = screen.getByTitle('Excluir orçamento deste mês');
      fireEvent.click(trashButton);

      // Confirmação aparece
      expect(screen.getByText(/Excluir o orçamento de/i)).toBeInTheDocument();

      // Clica em confirmar exclusão
      const confirmButton = screen.getByRole('button', { name: /^Excluir$/i });
      fireEvent.click(confirmButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });
});
