export interface AsaasPlanConfig {
  tier: 'pro' | 'premium';
  cycle: 'monthly' | 'annual';
  value: number;
  name: string;
  description: string;
}

export const ASAAS_PLANS: Record<string, AsaasPlanConfig> = {
  pro_monthly: {
    tier: 'pro',
    cycle: 'monthly',
    value: 19.90,
    name: 'Finanças Pro — Mensal',
    description: 'Assinatura mensal do Plano Pro do Finanças Pro Invest.',
  },
  premium_monthly: {
    tier: 'premium',
    cycle: 'monthly',
    value: 39.90,
    name: 'Finanças Premium — Mensal',
    description: 'Assinatura mensal do Plano Premium do Finanças Pro Invest.',
  },
  pro_annual: {
    tier: 'pro',
    cycle: 'annual',
    value: 199.00,
    name: 'Finanças Pro — Anual',
    description: 'Assinatura anual do Plano Pro do Finanças Pro Invest.',
  },
  premium_annual: {
    tier: 'premium',
    cycle: 'annual',
    value: 399.00,
    name: 'Finanças Premium — Anual',
    description: 'Assinatura anual do Plano Premium do Finanças Pro Invest.',
  },
};

export function getAsaasBaseUrl(isProd = false): string {
  if (process.env.ASAAS_ENVIRONMENT === 'production' || isProd) {
    return 'https://api.asaas.com/v3';
  }
  return 'https://sandbox.asaas.com/api/v3';
}
