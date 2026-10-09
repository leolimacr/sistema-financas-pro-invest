import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PendingObligations, { formatCycleDate, invoiceGridClass } from './PendingObligations';
import { reconcileTransactionWithBill, markBillPaidDirectly } from '../../../../services/transactionService';
import { ToastContext } from '../../../../contexts/ToastContext';

vi.mock('../../../../services/transactionService', () => ({
  reconcileTransactionWithBill: vi.fn().mockResolvedValue(undefined),
  markBillPaidDirectly: vi.fn().mockResolvedValue(undefined),
}));

describe('formatCycleDate', () => {
  it('formata DD/MM de data válida', () => {
    expect(formatCycleDate('2026-10-14')).toBe('14/10');
  });

  it('retorna null para data ausente (nunca "Invalid Date")', () => {
    expect(formatCycleDate(undefined)).toBeNull();
    expect(formatCycleDate(null)).toBeNull();
    expect(formatCycleDate('')).toBeNull();
  });

  it('retorna null para data inválida', () => {
    expect(formatCycleDate('não-é-data')).toBeNull();
  });
});

describe('invoiceGridClass', () => {
  it('1 fatura: coluna única com largura controlada', () => {
    expect(invoiceGridClass(1)).toContain('grid-cols-1');
    expect(invoiceGridClass(1)).toContain('md:max-w-md');
    expect(invoiceGridClass(1)).not.toContain('lg:grid-cols-3');
  });

  it('2 faturas: 2 colunas a partir do tablet, sem 3ª trilha no desktop', () => {
    expect(invoiceGridClass(2)).toContain('md:grid-cols-2');
    expect(invoiceGridClass(2)).not.toContain('lg:grid-cols-3');
  });

  it('3+ faturas: até 3 colunas no desktop', () => {
    expect(invoiceGridClass(3)).toContain('lg:grid-cols-3');
    expect(invoiceGridClass(5)).toContain('lg:grid-cols-3');
  });

  it('zero faturas: classe de coluna única', () => {
    expect(invoiceGridClass(0)).toContain('grid-cols-1');
  });
});

const baseProps = {
  pendingBills: [],
  recurringBills: [],
  safeTransactions: [],
  isPrivacyMode: false,
  onOpenForm: vi.fn(),
  onNavigate: vi.fn(),
};

describe('PendingObligations (render)', () => {
  it('não renderiza "Invalid Date" com fatura sem data; mostra mensagem neutra', () => {
    render(
      <PendingObligations
        {...baseProps}
        activeInvoices={[{ cardId: 'c1', cardName: 'Cartão X', total: 100, dueDate: undefined }]}
      />
    );
    expect(document.body.textContent).not.toContain('Invalid Date');
    expect(screen.getByText('Fatura em aberto')).toBeDefined();
  });

  it('renderiza título do painel e subgrupo de faturas', () => {
    render(
      <PendingObligations
        {...baseProps}
        activeInvoices={[{ cardId: 'c1', cardName: 'Cartão X', total: 100, dueDate: '2026-10-14' }]}
      />
    );
    expect(screen.getByText('Obrigações do mês')).toBeDefined();
    expect(screen.getByText('Faturas do ciclo')).toBeDefined();
    expect(screen.getByText('em 14/10')).toBeDefined();
  });

  it('retorna null sem faturas, pendentes e recorrentes', () => {
    const { container } = render(<PendingObligations {...baseProps} activeInvoices={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('toggle de recorrentes expande e colapsa com aria-expanded', () => {
    render(
      <PendingObligations
        {...baseProps}
        activeInvoices={[]}
        recurringBills={[{ id: 'b1', name: 'Luz', amount: 50, dueDay: 10, isActive: true, category: 'Casa' }]}
      />
    );
    const toggle = screen.getByText('Contas Fixas Recorrentes').closest('button');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle!);
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
  });

  it('expande contas automaticamente e destaca item quando view=contas e highlightBill são informados', () => {
    delete (window as any).location;
    window.location = new URL('https://financas-pro-invest.web.app/app/controla?view=contas&highlightBill=b1') as any;

    render(
      <PendingObligations
        {...baseProps}
        activeInvoices={[]}
        recurringBills={[{ id: 'b1', name: 'Internet Fibra', amount: 120, dueDay: 15, isActive: true, category: 'Casa' }]}
      />
    );

    const toggle = screen.getByText('Contas Fixas Recorrentes').closest('button');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Citada na Notificação')).toBeDefined();
    expect(screen.getByText('Internet Fibra')).toBeDefined();
  });
});

describe('PendingObligations (Conciliação Inteligente de Contas)', () => {
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = now.getFullYear();
  const validTxDate = `${currentYear}-${currentMonthStr}-05`;

  const recurringBills = [
    {
      id: 'bill-1',
      name: 'Conta de Luz',
      amount: 150,
      dueDay: 10,
      category: 'Moradia',
      type: 'fixed',
      isActive: true,
    },
    {
      id: 'bill-2',
      name: 'Internet Fibra',
      amount: 120,
      dueDay: 15,
      category: 'Telecom',
      type: 'subscription',
      isActive: true,
    },
  ];

  const candidateTransactions = [
    {
      id: 'tx-1',
      description: 'Enel Energia Luz',
      amount: 152.5,
      date: validTxDate,
      type: 'expense',
      category: 'Moradia',
    },
    {
      id: 'tx-2',
      description: 'Vivo Fibra Internet',
      amount: 120.0,
      date: validTxDate,
      type: 'expense',
      category: 'Telecom',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detecta pagamentos avulsos e exibe banner em lote e sugestões individuais', () => {
    delete (window as any).location;
    window.location = new URL('https://financas-pro-invest.web.app/app/controla?view=contas') as any;

    render(
      <PendingObligations
        {...baseProps}
        activeInvoices={[]}
        recurringBills={recurringBills}
        safeTransactions={candidateTransactions}
      />
    );

    expect(screen.getByTestId('batch-reconciliation-banner')).toBeDefined();
    expect(screen.getByText(/Detectamos 2 pagamentos avulsos no extrato/)).toBeDefined();
    expect(screen.getByTestId('reconciliation-suggestion-bill-1')).toBeDefined();
    expect(screen.getByTestId('reconciliation-suggestion-bill-2')).toBeDefined();
  });

  it('permite conciliar conta avulsa com 1 clique', async () => {
    delete (window as any).location;
    window.location = new URL('https://financas-pro-invest.web.app/app/controla?view=contas') as any;

    render(
      <PendingObligations
        {...baseProps}
        userId="user-123"
        activeInvoices={[]}
        recurringBills={[recurringBills[0]]}
        safeTransactions={[candidateTransactions[0]]}
      />
    );

    const reconcileBtn = screen.getByTestId('reconcile-btn-bill-1');
    fireEvent.click(reconcileBtn);

    await waitFor(() => {
      expect(reconcileTransactionWithBill).toHaveBeenCalledWith(
        'user-123',
        'tx-1',
        expect.objectContaining({ id: 'bill-1' }),
        validTxDate
      );
    });
  });

  it('permite conciliar todas as contas em lote com 1 clique', async () => {
    delete (window as any).location;
    window.location = new URL('https://financas-pro-invest.web.app/app/controla?view=contas') as any;

    render(
      <PendingObligations
        {...baseProps}
        userId="user-123"
        activeInvoices={[]}
        recurringBills={recurringBills}
        safeTransactions={candidateTransactions}
      />
    );

    const reconcileAllBtn = screen.getByTestId('reconcile-all-btn');
    fireEvent.click(reconcileAllBtn);

    await waitFor(() => {
      expect(reconcileTransactionWithBill).toHaveBeenCalledTimes(2);
    });
  });

  it('permite dar baixa manual sem débito pelo botão Já Paguei', async () => {
    delete (window as any).location;
    window.location = new URL('https://financas-pro-invest.web.app/app/controla?view=contas') as any;

    render(
      <PendingObligations
        {...baseProps}
        userId="user-123"
        activeInvoices={[]}
        recurringBills={[recurringBills[0]]}
        safeTransactions={[]}
      />
    );

    const markPaidBtn = screen.getByTestId('mark-paid-direct-bill-1');
    fireEvent.click(markPaidBtn);

    await waitFor(() => {
      expect(markBillPaidDirectly).toHaveBeenCalledWith(
        'user-123',
        'bill-1',
        expect.any(String)
      );
    });
  });

  it('permite ignorar a sugestão de conciliação para uma conta', () => {
    delete (window as any).location;
    window.location = new URL('https://financas-pro-invest.web.app/app/controla?view=contas') as any;

    render(
      <PendingObligations
        {...baseProps}
        userId="user-123"
        activeInvoices={[]}
        recurringBills={[recurringBills[0]]}
        safeTransactions={[candidateTransactions[0]]}
      />
    );

    expect(screen.getByTestId('reconciliation-suggestion-bill-1')).toBeDefined();

    const ignoreBtn = screen.getByText('Ignorar');
    fireEvent.click(ignoreBtn);

    expect(screen.queryByTestId('reconciliation-suggestion-bill-1')).toBeNull();
  });

  it('sensibiliza de imediato na UI ao clicar em Conciliar e Baixar (marca como paga, oculta sugestão e emite toast)', async () => {
    delete (window as any).location;
    window.location = new URL('https://financas-pro-invest.web.app/app/controla?view=contas') as any;

    const mockAddToast = vi.fn();

    render(
      <ToastContext.Provider value={{ addToast: mockAddToast }}>
        <PendingObligations
          {...baseProps}
          userId="user-123"
          activeInvoices={[]}
          pendingBills={[recurringBills[0]]}
          recurringBills={[recurringBills[0]]}
          safeTransactions={[candidateTransactions[0]]}
        />
      </ToastContext.Provider>
    );

    expect(screen.getByTestId('reconciliation-suggestion-bill-1')).toBeDefined();
    const reconcileBtn = screen.getByTestId('reconcile-btn-bill-1');
    fireEvent.click(reconcileBtn);

    // Sensibilização imediata
    expect(mockAddToast).toHaveBeenCalledWith('"Conta de Luz" sensibilizado!', 'success');
    expect(screen.queryByTestId('reconciliation-suggestion-bill-1')).toBeNull();
    expect(screen.getByText('Paga')).toBeDefined();

    await waitFor(() => {
      expect(reconcileTransactionWithBill).toHaveBeenCalledTimes(1);
    });
  });

  it('sensibiliza de imediato na UI ao dar baixa manual (Já paguei)', async () => {
    delete (window as any).location;
    window.location = new URL('https://financas-pro-invest.web.app/app/controla?view=contas') as any;

    const mockAddToast = vi.fn();

    render(
      <ToastContext.Provider value={{ addToast: mockAddToast }}>
        <PendingObligations
          {...baseProps}
          userId="user-123"
          activeInvoices={[]}
          pendingBills={[recurringBills[0]]}
          recurringBills={[recurringBills[0]]}
          safeTransactions={[]}
        />
      </ToastContext.Provider>
    );

    const markPaidBtn = screen.getByTestId('mark-paid-direct-bill-1');
    fireEvent.click(markPaidBtn);

    expect(mockAddToast).toHaveBeenCalledWith('"Conta de Luz" sensibilizado!', 'success');
    expect(screen.getByText('Paga')).toBeDefined();

    await waitFor(() => {
      expect(markBillPaidDirectly).toHaveBeenCalledTimes(1);
    });
  });
});

