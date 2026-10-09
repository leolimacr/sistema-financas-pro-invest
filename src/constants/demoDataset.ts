import type { Transaction, Category, UserMeta, RecurringBill, Budget } from '../types';
import type { DebtItem } from '../services/debt/debt.types';
import type { Goal } from '../services/goalService';

export const DEMO_USER_ID = 'demo-sandbox-soberano';

export const DEMO_USER = {
  uid: DEMO_USER_ID,
  email: 'visitante@financasproinvest.com',
  displayName: 'Investidor Convidado (Modo Demo)',
  isAnonymous: true,
  emailVerified: true,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
} as any;

export const DEMO_USER_META: UserMeta = {
  uid: DEMO_USER_ID,
  email: 'visitante@financasproinvest.com',
  tier: 'pro',
  onboardingCompleted: true,
  onboardingPersona: 'patrimonio',
  lastActiveAt: new Date().toISOString(),
  resumoFinanceiro: {
    patrimonioAtivo: 40000,
    patrimonioPassivo: 14500,
    reservaAtual: 25000,
    reservaMeta: 35000,
  } as any,
};

export const DEMO_CATEGORIES: Category[] = [
  { id: 'cat-salario', name: 'Salário & Renda', type: 'income', color: '#10b981', icon: 'Wallet', userId: DEMO_USER_ID },
  { id: 'cat-extra', name: 'Renda Extra', type: 'income', color: '#06b6d4', icon: 'Sparkles', userId: DEMO_USER_ID },
  { id: 'cat-moradia', name: 'Moradia & Contas', type: 'expense', color: '#6366f1', icon: 'Home', userId: DEMO_USER_ID },
  { id: 'cat-alimentacao', name: 'Supermercado', type: 'expense', color: '#f59e0b', icon: 'ShoppingBag', userId: DEMO_USER_ID },
  { id: 'cat-transporte', name: 'Transporte', type: 'expense', color: '#3b82f6', icon: 'Car', userId: DEMO_USER_ID },
  { id: 'cat-lazer', name: 'Lazer & Restaurante', type: 'expense', color: '#ec4899', icon: 'Utensils', userId: DEMO_USER_ID },
  { id: 'cat-investimentos', name: 'Aportes & Futuro', type: 'expense', color: '#059669', icon: 'TrendingUp', userId: DEMO_USER_ID },
  { id: 'cat-dividas', name: 'Quitação de Dívidas', type: 'expense', color: '#ef4444', icon: 'Calculator', userId: DEMO_USER_ID },
];

export const getDemoTransactions = (): Transaction[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const fmtDate = (day: number) => `${year}-${month}-${String(day).padStart(2, '0')}`;

  return [
    {
      id: 'demo-tx-01',
      userId: DEMO_USER_ID,
      type: 'income',
      date: fmtDate(5),
      description: 'Salário Líquido Mensal',
      category: 'Salário & Renda',
      amount: 6800.0,
      paymentMethod: 'money',
      createdAtMs: Date.now() - 86400000 * 15,
    },
    {
      id: 'demo-tx-02',
      userId: DEMO_USER_ID,
      type: 'income',
      date: fmtDate(15),
      description: 'Consultoria / Renda Extra',
      category: 'Renda Extra',
      amount: 1200.0,
      paymentMethod: 'money',
      createdAtMs: Date.now() - 86400000 * 7,
    },
    {
      id: 'demo-tx-03',
      userId: DEMO_USER_ID,
      type: 'expense',
      date: fmtDate(6),
      description: 'Aporte Tesouro Selic / IPCA+',
      category: 'Aportes & Futuro',
      amount: 1500.0,
      paymentMethod: 'money',
      createdAtMs: Date.now() - 86400000 * 14,
    },
    {
      id: 'demo-tx-04',
      userId: DEMO_USER_ID,
      type: 'expense',
      date: fmtDate(10),
      description: 'Aluguel & Condomínio',
      category: 'Moradia & Contas',
      amount: 2300.0,
      paymentMethod: 'money',
      createdAtMs: Date.now() - 86400000 * 12,
    },
    {
      id: 'demo-tx-05',
      userId: DEMO_USER_ID,
      type: 'expense',
      date: fmtDate(8),
      description: 'Supermercado & Feira do Mês',
      category: 'Supermercado',
      amount: 1350.0,
      paymentMethod: 'money',
      createdAtMs: Date.now() - 86400000 * 13,
    },
    {
      id: 'demo-tx-06',
      userId: DEMO_USER_ID,
      type: 'expense',
      date: fmtDate(12),
      description: 'Conta de Energia Elétrica',
      category: 'Moradia & Contas',
      amount: 280.0,
      paymentMethod: 'money',
      createdAtMs: Date.now() - 86400000 * 10,
    },
    {
      id: 'demo-tx-07',
      userId: DEMO_USER_ID,
      type: 'expense',
      date: fmtDate(14),
      description: 'Internet Fibra 500MB',
      category: 'Moradia & Contas',
      amount: 140.0,
      paymentMethod: 'money',
      createdAtMs: Date.now() - 86400000 * 8,
    },
    {
      id: 'demo-tx-08',
      userId: DEMO_USER_ID,
      type: 'expense',
      date: fmtDate(18),
      description: 'Combustível & Transporte',
      category: 'Transporte',
      amount: 380.0,
      paymentMethod: 'money',
      createdAtMs: Date.now() - 86400000 * 4,
    },
    {
      id: 'demo-tx-09',
      userId: DEMO_USER_ID,
      type: 'expense',
      date: fmtDate(22),
      description: 'Jantar em Família & Lazer',
      category: 'Lazer & Restaurante',
      amount: 420.0,
      paymentMethod: 'money',
      createdAtMs: Date.now() - 86400000 * 2,
    },
    {
      id: 'demo-tx-10',
      userId: DEMO_USER_ID,
      type: 'expense',
      date: fmtDate(25),
      description: 'Financiamento Veicular (Parcela 06/24)',
      category: 'Quitação de Dívidas',
      amount: 780.0,
      paymentMethod: 'money',
      linkedDebtId: 'demo-debt-auto',
      createdAtMs: Date.now() - 86400000,
    },
  ];
};

export const DEMO_DEBTS: DebtItem[] = [
  {
    id: 'demo-debt-auto',
    nome: 'Financiamento Veicular',
    tipo: 'veiculo',
    saldoDevedor: 14040.0,
    taxaMensal: 1.45,
    parcelasRestantes: 18,
    valorParcela: 780.0,
    totalParcelas: 24,
    parcelasPagas: 6,
    dataVencimento: '2026-10-25',
    historicoPagamentos: [],
  },
];

export const DEMO_GOALS: Goal[] = [
  {
    id: 'demo-goal-reserva',
    userId: DEMO_USER_ID,
    name: 'Reserva de Emergência (6 Meses)',
    currentAmount: 25000,
    targetAmount: 35000,
    deadline: '2026-12-31',
    category: 'Segurança',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-goal-fire',
    userId: DEMO_USER_ID,
    name: 'Independência Financeira (Coast FIRE)',
    currentAmount: 40000,
    targetAmount: 200000,
    deadline: '2030-12-31',
    category: 'Liberdade',
    createdAt: new Date().toISOString(),
  },
];

export const DEMO_BILLS: RecurringBill[] = [
  {
    id: 'demo-bill-aluguel',
    userId: DEMO_USER_ID,
    name: 'Aluguel & Condomínio',
    amount: 2300.0,
    dueDay: 10,
    category: 'Moradia & Contas',
    isActive: true,
    type: 'fixed',
  },
  {
    id: 'demo-bill-energia',
    userId: DEMO_USER_ID,
    name: 'Energia Elétrica',
    amount: 280.0,
    dueDay: 12,
    category: 'Moradia & Contas',
    isActive: true,
    type: 'fixed',
  },
  {
    id: 'demo-bill-internet',
    userId: DEMO_USER_ID,
    name: 'Internet Fibra',
    amount: 140.0,
    dueDay: 14,
    category: 'Moradia & Contas',
    isActive: true,
    type: 'fixed',
  },
];

export const getDemoBudget = (budgetId?: string): Budget => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthKey = budgetId || `${year}-${month}`;

  return {
    id: monthKey,
    userId: DEMO_USER_ID,
    month: monthKey,
    totalIncome: 6800,
    totalBudget: 2850,
    savingsGoal: 1000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    categories: [
      {
        categoryName: 'Supermercado',
        categoryKey: 'supermercado',
        limit: 1200,
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
      {
        categoryName: 'Lazer & Restaurante',
        categoryKey: 'lazer_restaurante',
        limit: 650,
        alertThreshold: 0.8,
        rollover: false,
      },
      {
        categoryName: 'Aportes & Futuro',
        categoryKey: 'aportes_futuro',
        limit: 500,
        alertThreshold: 0.8,
        rollover: false,
      },
    ],
  };
};
