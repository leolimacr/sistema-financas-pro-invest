import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TransactionForm from '../TransactionForm';
import type { Transaction } from '../../../../types';

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-test-123' } }),
}));

vi.mock('../../../../hooks/useDebts', () => ({
  useDebts: () => ({ debts: [] }),
}));

vi.mock('../../../../services/cardService', () => ({
  getCards: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../../services/billService', () => ({
  addRecurringBill: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../CategoryManager', () => ({
  default: () => null,
}));

vi.mock('../CardManager', () => ({
  default: () => null,
}));

vi.mock('../NexusInlineAdvisor', () => ({
  default: () => null,
}));

describe('TransactionForm - Blindagem e Bloqueio de Fatura (isBillPayment)', () => {
  const defaultCategories = [
    { id: 'cat-1', name: 'Alimentação', color: '#10b981', icon: 'utensils', type: 'expense' as const },
    { id: 'cat-2', name: 'Fatura - Nubank', color: '#8b5cf6', icon: 'credit-card', type: 'expense' as const },
  ];

  const billPaymentTransaction: Partial<Transaction> = {
    id: 'tx-bill-1',
    description: 'Pagamento Fatura Nubank',
    amount: 1450.5,
    type: 'expense',
    category: 'Fatura - Nubank',
    date: '2026-09-10',
    paymentMethod: 'money',
    isBillPayment: true,
    linkedCardId: 'card-nubank',
    linkedInvoiceId: 'inv-123',
    linkedInvoicePeriodEnd: '2026-09-08',
  };

  const regularTransaction: Partial<Transaction> = {
    id: 'tx-regular-1',
    description: 'Supermercado Central',
    amount: 250.0,
    type: 'expense',
    category: 'Alimentação',
    date: '2026-09-12',
    paymentMethod: 'money',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trava valor, descrição, tipo e meio de pagamento, mas mantém data editável para isBillPayment', () => {
    render(
      <TransactionForm
        initialData={billPaymentTransaction}
        categories={defaultCategories}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onSaveCategory={vi.fn()}
        onDeleteCategory={vi.fn()}
        transactions={[]}
      />
    );

    // 1. Banner explicativo do bloqueio de fatura está visível
    expect(
      screen.getByText(/Este lançamento representa o pagamento consolidado da fatura do cartão/i)
    ).toBeInTheDocument();

    // 2. Input de Valor está desabilitado (read-only)
    const amountInput = screen.getByPlaceholderText('R$ 0,00') as HTMLInputElement;
    expect(amountInput).toBeDisabled();
    expect(amountInput.value).toContain('1.450,50');

    // 3. Input de Descrição está desabilitado
    const descInput = screen.getByDisplayValue('Pagamento Fatura Nubank') as HTMLInputElement;
    expect(descInput).toBeDisabled();

    // 4. Input de Data NÃO está desabilitado (data deve ser editável)
    const dateInput = screen.getByDisplayValue('2026-09-10') as HTMLInputElement;
    expect(dateInput).not.toBeDisabled();

    // 5. Botões de Tipo (Saída / Entrada) estão desabilitados
    const expenseBtn = screen.getByRole('button', { name: /Saída/i });
    const incomeBtn = screen.getByRole('button', { name: /Entrada/i });
    expect(expenseBtn).toBeDisabled();
    expect(incomeBtn).toBeDisabled();

    // 6. Botões de Meio de Pagamento estão desabilitados
    const moneyBtn = screen.getByRole('button', { name: /Dinheiro/i });
    const cardBtn = screen.getByRole('button', { name: /Cartão/i });
    const voucherBtn = screen.getByRole('button', { name: /Voucher/i });
    expect(moneyBtn).toBeDisabled();
    expect(cardBtn).toBeDisabled();
    expect(voucherBtn).toBeDisabled();

    // 7. Botão de Gerenciar Categorias não é exibido
    expect(screen.queryByText('Gerenciar Categorias')).not.toBeInTheDocument();
  });

  it('permite alterar a data de pagamento e salva preservando integridade da fatura e valor original', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <TransactionForm
        initialData={billPaymentTransaction}
        categories={defaultCategories}
        onSave={handleSave}
        onCancel={vi.fn()}
        onSaveCategory={vi.fn()}
        onDeleteCategory={vi.fn()}
        transactions={[]}
      />
    );

    const dateInput = screen.getByDisplayValue('2026-09-10') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-09-14' } });
    expect(dateInput.value).toBe('2026-09-14');

    const submitBtn = screen.getByRole('button', { name: /Atualizar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedPayload = handleSave.mock.calls[0][0];
    expect(savedPayload.date).toBe('2026-09-14');
    expect(savedPayload.amount).toBe(1450.5); // Valor preservado intacto
    expect(savedPayload.isBillPayment).toBe(true); // Flag preservada
    expect(savedPayload.linkedCardId).toBe('card-nubank');
    expect(savedPayload.linkedInvoiceId).toBe('inv-123');
    expect(savedPayload.linkedInvoicePeriodEnd).toBe('2026-09-08');
  });

  it('exibe botão de exclusão com alerta de estorno para pagamento de fatura', async () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined);
    const handleCancel = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TransactionForm
        initialData={billPaymentTransaction}
        categories={defaultCategories}
        onSave={vi.fn()}
        onCancel={handleCancel}
        onSaveCategory={vi.fn()}
        onDeleteCategory={vi.fn()}
        onDelete={handleDelete}
        transactions={[]}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /Excluir/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Excluir este pagamento de fatura irá estornar o valor e restabelecer o limite do cartão')
    );
    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith('tx-bill-1');
      expect(handleCancel).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('não bloqueia campos quando for uma transação regular (não-fatura)', () => {
    render(
      <TransactionForm
        initialData={regularTransaction}
        categories={defaultCategories}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onSaveCategory={vi.fn()}
        onDeleteCategory={vi.fn()}
        transactions={[]}
      />
    );

    // Não exibe banner de trava de fatura
    expect(
      screen.queryByText(/Este lançamento representa o pagamento consolidado da fatura/i)
    ).not.toBeInTheDocument();

    // Valor habilitado
    const amountInput = screen.getByPlaceholderText('R$ 0,00') as HTMLInputElement;
    expect(amountInput).not.toBeDisabled();

    // Descrição habilitada
    const descInput = screen.getByDisplayValue('Supermercado Central') as HTMLInputElement;
    expect(descInput).not.toBeDisabled();

    // Meios de pagamento habilitados
    const moneyBtn = screen.getByRole('button', { name: /Dinheiro/i });
    expect(moneyBtn).not.toBeDisabled();

    // Gerenciar categorias visível
    expect(screen.getByText('Gerenciar Categorias')).toBeInTheDocument();
  });

  it('nunca trata conta fixa recorrente (ex: Conta de Luz Brumado / IPTV) como fatura de cartão de crédito', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const recurringBillList = [
      {
        id: 'bill-luz-brumado',
        userId: 'user-test-123',
        name: 'Conta de Luz Brumado',
        amount: 130,
        dueDay: 1,
        category: 'Água',
        type: 'fixed' as const,
        isActive: true,
      },
    ];

    render(
      <TransactionForm
        initialData={{
          type: 'expense',
          category: 'Água',
          amount: 130,
          description: 'Conta de Luz Brumado',
          date: '2026-09-25',
          autoFocusAmount: true,
          linkedRecurringBillId: 'bill-luz-brumado',
          // Mesmo que um dado legado venha com isBillPayment: true, linkedRecurringBillId prevalece como Conta Fixa
          isBillPayment: true,
        }}
        categories={[
          ...defaultCategories,
          { id: 'cat-agua', name: 'Água', color: '#0ea5e9', icon: 'droplet', type: 'expense' as const },
        ]}
        recurringBills={recurringBillList}
        onSave={handleSave}
        onCancel={vi.fn()}
        onSaveCategory={vi.fn()}
        onDeleteCategory={vi.fn()}
        transactions={[]}
      />
    );

    // 1. NUNCA deve exibir o aviso de fatura de cartão de crédito
    expect(
      screen.queryByText(/Este lançamento representa o pagamento consolidado da fatura do cartão/i)
    ).not.toBeInTheDocument();

    // 2. Campos de Valor, Descrição e Meio de Pagamento devem estar 100% HABILITADOS
    const amountInput = screen.getByPlaceholderText('R$ 0,00') as HTMLInputElement;
    expect(amountInput).not.toBeDisabled();

    const descInput = screen.getByDisplayValue('Conta de Luz Brumado') as HTMLInputElement;
    expect(descInput).not.toBeDisabled();

    const moneyBtn = screen.getByRole('button', { name: /Dinheiro/i });
    expect(moneyBtn).not.toBeDisabled();

    // 3. Deve exibir o badge verde de vínculo com a conta fixa
    expect(screen.getByTestId('transaction-linked-bill-badge')).toHaveTextContent('Conta de Luz Brumado');

    // 4. O botão deve ser "Salvar" (novo lançamento) e não "Atualizar"
    const saveBtn = screen.getByRole('button', { name: /^Salvar$/i });
    expect(saveBtn).toBeInTheDocument();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedPayload = handleSave.mock.calls[0][0];
    expect(savedPayload.linkedRecurringBillId).toBe('bill-luz-brumado');
    expect(savedPayload.isBillPayment).toBe(false);
  });
});
