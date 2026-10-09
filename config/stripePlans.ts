export type SubscriptionPlanId = "free" | "pro_monthly" | "pro_annual" | "premium_monthly" | "premium_annual";

export interface StripePlanConfig {
  id: SubscriptionPlanId;
  tier: 'free' | 'pro' | 'premium';
  /** @deprecated Usar stripePriceIdTest/stripePriceIdProd */
  stripePriceId?: string;
  stripePriceIdTest?: string;
  stripePriceIdProd?: string;
  label: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  recommended?: boolean;
  trialDays?: number;
}

export const PLANS: Record<string, StripePlanConfig> = {
  FREE: {
    id: "free",
    tier: "free",
    label: "Grátis",
    price: 0,
    period: "/mês",
    description: "Para começar a organizar a casa e criar o hábito financeiro.",
    features: [
      "Lançamentos ilimitados no Controla",
      "Mês atual e meses futuros",
      "Base de Proteção — veja sua camada de segurança",
      "Central — visão da sua evolução financeira",
      "Ferramentas de simulação financeira"
    ]
  },
  PRO: {
    id: "pro_monthly",
    tier: "pro",
    stripePriceId: "price_pro_trial_PLACEHOLDER",
    stripePriceIdTest: "price_pro_test",
    stripePriceIdProd: "price_pro_prod",
    label: "Pro",
    price: 19.90,
    period: "/mês",
    description: "Para quem quer analisar o passado e construir segurança.",
    recommended: false,
    trialDays: 7,
    features: [
      "Tudo do plano Grátis",
      "Histórico Completo de meses passados",
      "Nexus Pro com comparativo de meses",
      "Exportação de relatórios em PDF",
      "Backup e sincronização na nuvem",
      "Todas as 7 Ferramentas avançadas"
    ]
  },
  PRO_ANNUAL: {
    id: "pro_annual",
    tier: "pro",
    label: "Pro Anual",
    price: 199.00,
    period: "/ano",
    description: "Pro com desconto anual — 2 meses grátis.",
    features: [
      "Tudo do plano Grátis",
      "Histórico Completo de meses passados",
      "Nexus Pro com comparativo de meses",
      "Exportação de relatórios em PDF",
      "Backup e sincronização na nuvem",
      "Todas as 7 Ferramentas avançadas"
    ]
  },
  PREMIUM: {
    id: "premium_monthly",
    tier: "premium",
    stripePriceId: "price_premium_trial_PLACEHOLDER",
    stripePriceIdTest: "price_premium_test",
    stripePriceIdProd: "price_premium_prod",
    label: "Premium",
    price: 39.90,
    period: "/mês",
    description: "Comando Soberano: Rotina, Dívidas e Patrimônio integrados.",
    recommended: true,
    trialDays: 7,
    features: [
      "Tudo do plano Pro",
      "Comando Soberano 360° integrado",
      "Nexus Soberano com visão estratégica",
      "Gestor de Dívidas & Otimizador de Quitação",
      "Gestor de Patrimônio & Renda Passiva",
      "Auditoria de risco e antecipação de tensões"
    ]
  },
  PREMIUM_ANNUAL: {
    id: "premium_annual",
    tier: "premium",
    stripePriceIdTest: "price_premium_annual_test",
    stripePriceIdProd: "price_premium_annual_prod",
    label: "Premium Anual",
    price: 399.00,
    period: "/ano",
    description: "Comando Soberano com desconto anual — 2 meses grátis.",
    recommended: true,
    features: [
      "Tudo do plano Pro",
      "Comando Soberano 360° integrado",
      "Nexus Soberano com visão estratégica",
      "Gestor de Dívidas & Otimizador de Quitação",
      "Gestor de Patrimônio & Renda Passiva",
      "Auditoria de risco e antecipação de tensões"
    ]
  }
};
