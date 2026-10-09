export const queryKeys = {
  debts: {
    all: ['debts'] as const,
    byUser: (userId: string) => ['debts', userId] as const,
  },
  goals: {
    all: ['goals'] as const,
    byUser: (userId: string) => ['goals', userId] as const,
  },
  wealth: {
    all: ['wealth'] as const,
    assetsByUser: (userId: string) => ['wealth', userId, 'assets'] as const,
    passivesByUser: (userId: string) => ['wealth', userId, 'passives'] as const,
    historyByUser: (userId: string) => ['wealth', userId, 'history'] as const,
  },
  user: {
    all: ['user'] as const,
    profile: (userId: string) => ['user', userId, 'profile'] as const,
  },
  categories: {
    all: ['categories'] as const,
    byUser: (userId: string) => ['categories', userId] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    byUser: (userId: string) => ['transactions', userId] as const,
  },
  cards: {
    all: ['cards'] as const,
    byUser: (userId: string) => ['cards', userId] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    byUser: (userId: string) => ['invoices', userId] as const,
    byCard: (userId: string, cardId: string) => ['invoices', userId, cardId] as const,
  },
  bills: {
    all: ['recurring_bills'] as const,
    byUser: (userId: string) => ['recurring_bills', userId] as const,
  },
  agenda: {
    all: ['agenda'] as const,
    upcoming: (userId: string, limit: number) => ['agenda', userId, 'upcoming', limit] as const,
    byMonth: (userId: string, year: number, month: number) => ['agenda', userId, 'month', year, month] as const,
  },
  presence: {
    all: ['presence'] as const,
    byUser: (userId: string) => ['presence', userId] as const,
  },
  jurosRotativos: {
    all: ['jurosRotativos'] as const,
    byUser: (userId: string) => ['jurosRotativos', userId] as const,
    byDebt: (userId: string, debtId: string) => ['jurosRotativos', userId, debtId] as const,
  },
  budget: {
    byUser: (userId: string, month: string) => ['budget', userId, month] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
};
