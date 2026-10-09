import { describe, it, expect } from 'vitest';
import {
  calculateWalletStatementSummary,
  getVoucherCardAvailableBalance,
  toIntegerCents,
  type WalletTxLike,
} from '../calculations';

describe('calculateWalletStatementSummary — Fórmula Soberana de Saldo de Carteira/Extrato', () => {
  it('Cenário 1: entradas de 4.276,89 e despesas de 999,56 resultam em saldo de 3.277,33', () => {
    const transactions: WalletTxLike[] = [
      {
        type: 'income',
        amount: 4276.89,
        description: 'Recarga Benefício Alimentação',
      },
      {
        type: 'expense',
        amount: 999.56,
        description: 'Compras Supermercado',
      },
    ];

    const summary = calculateWalletStatementSummary(transactions);

    expect(summary.totalIncomes).toBe(4276.89);
    expect(summary.totalExpenses).toBe(999.56);
    expect(summary.availableBalance).toBe(3277.33);
    expect(summary.totalIncomesCents).toBe(427689);
    expect(summary.totalExpensesCents).toBe(99956);
    expect(summary.availableBalanceCents).toBe(327733);
    expect(summary.transactionCount).toBe(2);
  });

  it('Cenário 2: carteira sem movimentações resulta em saldo zero', () => {
    const transactions: WalletTxLike[] = [];

    const summary = calculateWalletStatementSummary(transactions);

    expect(summary.totalIncomes).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.availableBalance).toBe(0);
    expect(summary.totalIncomesCents).toBe(0);
    expect(summary.totalExpensesCents).toBe(0);
    expect(summary.availableBalanceCents).toBe(0);
    expect(summary.transactionCount).toBe(0);
  });

  it('Cenário 3: somente despesas resultam em saldo negativo', () => {
    const transactions: WalletTxLike[] = [
      {
        type: 'expense',
        amount: 150.25,
        description: 'Gasto Restaurante',
      },
      {
        type: 'expense',
        amount: 49.75,
        description: 'Lanche',
      },
    ];

    const summary = calculateWalletStatementSummary(transactions);

    expect(summary.totalIncomes).toBe(0);
    expect(summary.totalExpenses).toBe(200.0);
    expect(summary.availableBalance).toBe(-200.0);
    expect(summary.availableBalanceCents).toBe(-20000);
  });

  it('Cenário 4: somente recargas resultam em saldo positivo', () => {
    const transactions: WalletTxLike[] = [
      {
        type: 'income',
        amount: 650.0,
        description: 'Primeira Recarga',
      },
      {
        type: 'income',
        amount: 350.5,
        description: 'Segunda Recarga',
      },
    ];

    const summary = calculateWalletStatementSummary(transactions);

    expect(summary.totalIncomes).toBe(1000.5);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.availableBalance).toBe(1000.5);
    expect(summary.availableBalanceCents).toBe(100050);
  });

  it('Cenário 5: lançamentos de ajuste seguem a regra de sinal/tipo definida pelo projeto', () => {
    const transactions: WalletTxLike[] = [
      // Ajuste a crédito/estorno registrado como income
      {
        type: 'income',
        amount: 80.0,
        category: 'Ajuste',
        description: 'Estorno de cobrança duplicada',
      },
      // Ajuste a débito registrado como expense
      {
        type: 'expense',
        amount: 30.0,
        category: 'Ajuste',
        description: 'Ajuste de regularização',
      },
      // Recarga normal
      {
        type: 'income',
        amount: 500.0,
        description: 'Recarga Mensal',
      },
    ];

    const summary = calculateWalletStatementSummary(transactions);

    // Entradas: 80 + 500 = 580
    expect(summary.totalIncomes).toBe(580.0);
    // Despesas: 30
    expect(summary.totalExpenses).toBe(30.0);
    // Saldo: 580 - 30 = 550
    expect(summary.availableBalance).toBe(550.0);
  });

  it('Cenário 6: o saldo exibido usa o mesmo resultado consolidado dos totais', () => {
    const transactions: WalletTxLike[] = [
      { type: 'income', amount: '1250,50' },
      { type: 'expense', amount: '250,25' },
      { type: 'expense', amount: 100.25 },
    ];

    const summary = calculateWalletStatementSummary(transactions);

    // Verifica que a fórmula saldo = entradas - despesas é matematicamente idêntica
    expect(summary.availableBalance).toBe(
      Number((summary.totalIncomes - summary.totalExpenses).toFixed(2))
    );
    expect(summary.availableBalanceCents).toBe(
      summary.totalIncomesCents - summary.totalExpensesCents
    );
    expect(summary.availableBalance).toBe(900.0);
  });

  it('filtra transações por targetCardId e ignora lançamentos virtuais', () => {
    const transactions: WalletTxLike[] = [
      { type: 'income', amount: 1000, cardId: 'target-card' },
      { type: 'expense', amount: 200, cardId: 'target-card' },
      { type: 'expense', amount: 500, cardId: 'other-card' },
      { type: 'expense', amount: 300, cardId: 'target-card', isVirtual: true },
    ];

    const summary = calculateWalletStatementSummary(transactions, 'target-card');

    expect(summary.totalIncomes).toBe(1000);
    expect(summary.totalExpenses).toBe(200);
    expect(summary.availableBalance).toBe(800);
    expect(summary.transactionCount).toBe(2);
  });

  it('toIntegerCents converte com precisão strings e números decimais', () => {
    expect(toIntegerCents(4276.89)).toBe(427689);
    expect(toIntegerCents('4276.89')).toBe(427689);
    expect(toIntegerCents('4276,89')).toBe(427689);
    expect(toIntegerCents(999.56)).toBe(99956);
    expect(toIntegerCents(0)).toBe(0);
    expect(toIntegerCents(null)).toBe(0);
    expect(toIntegerCents(undefined)).toBe(0);
  });
});

describe('getVoucherCardAvailableBalance — Obtenção Soberana de Saldo do Cartão Voucher', () => {
  it('retorna o saldo calculado a partir do extrato de transações quando houver movimentações', () => {
    const card = { id: 'card-1', voucherBalance: 0 }; // Saldo cadastrado desatualizado/zerado
    const transactions: WalletTxLike[] = [
      { type: 'income', amount: 4276.89, cardId: 'card-1' },
      { type: 'expense', amount: 999.56, cardId: 'card-1' },
      { type: 'income', amount: 500, cardId: 'card-2' }, // Outro cartão
    ];

    const balance = getVoucherCardAvailableBalance(card, transactions);

    expect(balance).toBe(3277.33);
  });

  it('retorna o voucherBalance do cartão caso não existam transações para o cartão', () => {
    const card = { id: 'card-novo', voucherBalance: 450.0 };
    const transactions: WalletTxLike[] = [
      { type: 'income', amount: 1000, cardId: 'outro-card' },
    ];

    const balance = getVoucherCardAvailableBalance(card, transactions);

    expect(balance).toBe(450.0);
  });

  it('retorna voucherBalance ou zero caso o array de transações seja indefinido ou vazio', () => {
    const cardComSaldo = { id: 'card-1', voucherBalance: 250.0 };
    const cardSemSaldo = { id: 'card-2' };

    expect(getVoucherCardAvailableBalance(cardComSaldo, [])).toBe(250.0);
    expect(getVoucherCardAvailableBalance(cardComSaldo, undefined)).toBe(250.0);
    expect(getVoucherCardAvailableBalance(cardSemSaldo, [])).toBe(0);
    expect(getVoucherCardAvailableBalance(cardSemSaldo, undefined)).toBe(0);
  });

  it('respeita o saldo calculado mesmo quando negativo', () => {
    const card = { id: 'card-devedor', voucherBalance: 100 };
    const transactions: WalletTxLike[] = [
      { type: 'expense', amount: 120.5, cardId: 'card-devedor' },
    ];

    const balance = getVoucherCardAvailableBalance(card, transactions);

    expect(balance).toBe(-120.5);
  });
});

