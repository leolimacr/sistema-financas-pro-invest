import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  calculateTextSimilarity,
  calculateAmountSimilarity,
  findMatchingBillsForTransaction,
  findCandidateTransactionsForBill,
} from '../reconciliationMatcher';
import type { RecurringBill, Transaction } from '../../types';

describe('reconciliationMatcher — Normalização e Similaridade', () => {
  it('normaliza textos removendo acentos, pontuação e espaços extras', () => {
    expect(normalizeText('  Água & Saneamento - Sabesp! ')).toBe('agua saneamento sabesp');
    expect(normalizeText('Internet Claro / Fibra 500MB')).toBe('internet claro fibra 500mb');
    expect(normalizeText(null)).toBe('');
  });

  it('reconhece sinônimos de concessionárias brasileiras no mesmo cluster', () => {
    // Enel x Luz
    expect(calculateTextSimilarity('Enel', 'Conta de Luz')).toBeGreaterThanOrEqual(0.8);
    // Sabesp x Água
    expect(calculateTextSimilarity('Sabesp', 'Água e Esgoto')).toBeGreaterThanOrEqual(0.8);
    // Claro x Internet
    expect(calculateTextSimilarity('Claro Fibra', 'Internet')).toBeGreaterThanOrEqual(0.8);
    // QuintoAndar x Aluguel
    expect(calculateTextSimilarity('QuintoAndar Imobiliária', 'Aluguel')).toBeGreaterThanOrEqual(0.8);
  });

  it('calcula similaridade de valor com tolerância para contas de consumo variável', () => {
    // Exato
    expect(calculateAmountSimilarity(120, 120)).toBe(1.0);
    // Até 5% de diferença
    expect(calculateAmountSimilarity(120, 125)).toBe(0.95);
    // Até 15% de diferença (ex: luz R$ 150 vs R$ 165)
    expect(calculateAmountSimilarity(150, 165)).toBe(0.80);
    // Mais de 25% de diferença não deve casar
    expect(calculateAmountSimilarity(100, 200)).toBe(0);
  });
});

describe('reconciliationMatcher — findMatchingBillsForTransaction (Momento do Lançamento)', () => {
  const pendingBills: RecurringBill[] = [
    {
      id: 'bill-luz',
      userId: 'user-1',
      name: 'Conta de Luz',
      amount: 150,
      dueDay: 10,
      category: 'Moradia',
      type: 'fixed',
      isActive: true,
    },
    {
      id: 'bill-net',
      userId: 'user-1',
      name: 'Internet Claro',
      amount: 120,
      dueDay: 15,
      category: 'Serviços',
      type: 'fixed',
      isActive: true,
    },
    {
      id: 'bill-aluguel',
      userId: 'user-1',
      name: 'Aluguel Apartamento',
      amount: 1800,
      dueDay: 5,
      category: 'Moradia',
      type: 'fixed',
      isActive: true,
    },
  ];

  it('encontra a conta fixa ao digitar concessionária e valor aproximado', () => {
    const matches = findMatchingBillsForTransaction(
      { description: 'Enel Distribuição', amount: 158, category: 'Moradia' },
      pendingBills
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].bill.id).toBe('bill-luz');
    expect(matches[0].confidence).toBe('high');
  });

  it('encontra a conta de internet ao digitar "Claro Fibra" de R$ 120', () => {
    const matches = findMatchingBillsForTransaction(
      { description: 'Claro Fibra 500MB', amount: 120 },
      pendingBills
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].bill.id).toBe('bill-net');
  });

  it('não sugere contas inativas ou sem relação', () => {
    const matches = findMatchingBillsForTransaction(
      { description: 'Almoço Restaurante', amount: 45, category: 'Alimentação' },
      pendingBills
    );

    expect(matches.length).toBe(0);
  });
});

describe('reconciliationMatcher — findCandidateTransactionsForBill (Momento da Conciliação)', () => {
  const billLuz: RecurringBill = {
    id: 'bill-luz',
    userId: 'user-1',
    name: 'Conta de Luz',
    amount: 150,
    dueDay: 10,
    category: 'Moradia',
    type: 'fixed',
    isActive: true,
  };

  const currentMonth = 4; // Maio (0-indexed)
  const currentYear = 2026;

  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      userId: 'user-1',
      description: 'Enel Energia Eletrica',
      amount: 162.4,
      date: '2026-05-08',
      type: 'expense',
      category: 'Moradia',
      paymentMethod: 'money',
    },
    {
      id: 'tx-2',
      userId: 'user-1',
      description: 'Supermercado Pão de Açúcar',
      amount: 350.0,
      date: '2026-05-05',
      type: 'expense',
      category: 'Alimentação',
      paymentMethod: 'credit',
    },
    {
      id: 'tx-3',
      userId: 'user-1',
      description: 'Enel do mês passado',
      amount: 150.0,
      date: '2026-04-10', // Mês anterior
      type: 'expense',
      category: 'Moradia',
      paymentMethod: 'money',
    },
  ];

  it('encontra a transação avulsa correspondente no mês corrente mesmo com variação de consumo', () => {
    const candidates = findCandidateTransactionsForBill(billLuz, transactions, currentMonth, currentYear);

    expect(candidates.length).toBe(1);
    expect(candidates[0].transaction.id).toBe('tx-1');
    expect(candidates[0].confidence).toBe('high');
  });

  it('ignora transações de meses diferentes ou de categorias completamente distintas', () => {
    const candidates = findCandidateTransactionsForBill(billLuz, transactions, currentMonth, currentYear);
    const hasMonthPrev = candidates.some((c) => c.transaction.id === 'tx-3');
    const hasMarket = candidates.some((c) => c.transaction.id === 'tx-2');

    expect(hasMonthPrev).toBe(false);
    expect(hasMarket).toBe(false);
  });
});
