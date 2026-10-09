export type InvoiceStatus = 'open' | 'paid' | 'partial';

export interface CardInvoice {
  id: string;
  cardId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  total: number;
  status: InvoiceStatus;
  paidAmount: number;
  remainingAmount: number;
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
  lastTransactionDate?: string;
  rotativoConverted?: boolean;
  rotativoDebtId?: string;
  rotativoConvertedAt?: string;
  rotativoSettled?: boolean;
  _fingerprint?: string;
}

export type CardType = 'credit' | 'voucher';
export type VoucherType = 'alimentacao' | 'refeicao' | 'outro';

export interface CreditCard {
  id: string;
  name: string;
  isActive?: boolean;
  type?: CardType;
  voucherType?: VoucherType;
  closingDay?: number;
  dueDay?: number;
  limit?: number;
  saldoUtilizadoTotal?: number; // [NEXUS] Controle reativo de limite
  proposito?: string; // [NEXUS] Finalidade emocional ou estratégica
  taxaJuros?: number; // Percentual mensal do cartão (ex: 14.9 = 14.9% ao mês)
  voucherBalance?: number; // Saldo disponível do cartão voucher
}

export interface RecurringBill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  isActive: boolean;
  type: 'fixed' | 'subscription'; // fixed = conta fixa, subscription = assinatura
  proposito?: string; // [NEXUS] Por que essa conta existe?
  lastPaidDate?: string; // NOVO: Data do último pagamento para controle de notificação
}

export type AssetFlexibility = 'intocavel' | 'negociavel' | 'liquidez';

export interface ActiveAsset {
  id?: string;
  name: string;
  category: string;
  currentValue: number;
  proposito?: string; // [NEXUS] Meta ou motivo do investimento
  flexibility?: AssetFlexibility; // [NEXUS] Nível de apego ou liquidez estratégica
}

export interface PassiveAsset {
  id?: string;
  description: string;
  category: string;
  currentValue: number;
  observations?: string;
  proposito?: string; // [NEXUS] O que esse bem representa?
  flexibility?: AssetFlexibility; // [NEXUS] Nível de apego ou flexibilidade de venda
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod?: 'money' | 'credit' | 'voucher';
  cardId?: string;
  isVirtual?: boolean; // Lançamento virtual sem impacto imediato no caixa (ex.: fatura futura projetada)
  linkedDebtId?: string; // [NEXUS] Vínculo para amortização assistida
  isBillPayment?: boolean; // [NEXUS] Identifica pagamento de fatura
  linkedRecurringBillId?: string; // [NEXUS] Vínculo para conta recorrente paga
  linkedCardId?: string;  // [NEXUS] ID do cartão para liberação de limite
  linkedInvoicePeriodEnd?: string; // [NEXUS] periodEnd da fatura alvo para matching explícito
  linkedInvoiceId?: string;        // [NEXUS] ID da fatura alvo para matching explícito
  installments?: number;        // Total de parcelas (ex: 12)
  currentInstallment?: number; // Parcela atual (ex: 1)
  installmentId?: string;      // ID único para agrupar as parcelas de uma mesma compra
  purchaseDate?: string;       // Data original da compra física (YYYY-MM-DD)
  createdAtMs?: number;        // Momento técnico de criação
  sortKey?: string;            // Chave composta para ordenação e paginação
}

export interface Category {
  id?: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  userId?: string;
}

export interface CategoryBudget {
  categoryName: string;
  categoryKey: string;
  limit: number;
  alertThreshold: number;
  rollover: boolean;
}

export interface Budget {
  id: string;
  userId: string;
  month: string;
  totalIncome: number;
  totalBudget: number;
  categories: CategoryBudget[];
  savingsGoal: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialProfile {
  monthlyIncome: number;
  emergencyReserveTarget: number;
  emergencyReserveCurrent: number;
  colchaoCurrent?: number;
  marcoZero?: number;
  protectionMonths?: number;
  declaredNoDebts?: boolean;
  colchaoInicialTarget?: number;
}

export type Archetype = 'resilient' | 'guardian' | 'commander';

export interface PersonaContext {
  archetype: Archetype;
  languageLevel: 1 | 2 | 3; // 1: Simples, 2: Formal, 3: Técnico
  calibratedAt: string;
  answers: Record<string, string>;
  scores: {
    r: number; // Resiliência
    g: number; // Guardião
    c: number; // Comandante
  };
}

/** Assinatura legada (Etapa 7 — E7-06): mantida para compatibilidade com
 * usuários migrados. Fonte canônica: `users/{uid}/billing/main`.
 * Remoção total em futura Etapa 7.2, após evidência de migração. */
export interface LegacySubscription {
  active: boolean;
  status?: string | null;
  planId?: string | null;
  currentPeriodEnd?: unknown;
}

export interface UserMeta {
  /** Legado (Etapa 7 — E7-06): ver `LegacySubscription`. Fonte canônica: billing/main. */
  plan: string;
  nickname?: string;
  launchLimit: number;
  launchCount: number;
  onboardingCompleted?: boolean;
  onboardingPersona?: 'dividas' | 'patrimonio' | 'geral';
  financialProfile?: FinancialProfile;
  /** Legado (Etapa 7 — E7-06): ver `LegacySubscription`. */
  subscription?: LegacySubscription;
  persona?: PersonaContext; // [NEXUS] Inteligência de Persona
  email?: string;
  role?: string;
  isAdmin?: boolean;
}

export * from './market';
