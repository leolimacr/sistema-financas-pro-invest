export interface PixRecipientConfig {
  recipientName: string;
  bankName: string;
  pixKey: string;
  pixKeyType: string;
  plans: Record<string, { tier: 'pro' | 'premium'; cycle: 'monthly' | 'yearly'; price: number; name: string }>;
}

export const PIX_CONFIG: PixRecipientConfig = {
  recipientName: process.env.PIX_RECIPIENT_NAME || 'Finanças Pro Invest',
  bankName: process.env.PIX_BANK_NAME || 'Instituição Autorizada',
  pixKey: process.env.PIX_KEY || '',
  pixKeyType: process.env.PIX_KEY_TYPE || 'Chave Aleatória',
  plans: {
    pro_monthly: {
      tier: 'pro',
      cycle: 'monthly',
      price: 19.90,
      name: 'Finanças Pro',
    },
    pro_annual: {
      tier: 'pro',
      cycle: 'yearly',
      price: 199.00,
      name: 'Finanças Pro Anual',
    },
    premium_monthly: {
      tier: 'premium',
      cycle: 'monthly',
      price: 39.90,
      name: 'Finanças Premium',
    },
    premium_annual: {
      tier: 'premium',
      cycle: 'yearly',
      price: 399.00,
      name: 'Finanças Premium Anual',
    },
  },
};

/**
 * Normaliza strings removendo acentos, pontuação e espaços extras para comparação forense.
 */
export function normalizeText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valida se o nome do favorecido extraído corresponde ao nome cadastrado.
 */
export function validateRecipientName(extracted: string, expected: string): boolean {
  const normExtracted = normalizeText(extracted);
  const normExpected = normalizeText(expected);

  if (!normExtracted || !normExpected) return false;
  if (normExtracted.includes(normExpected)) return true;

  // Quebra por partes do nome
  const expectedParts = normExpected.split(' ').filter((p) => p.length > 2);
  const extractedParts = normExtracted.split(' ').filter((p) => p.length > 2);

  // Primeiro e último nome devem bater
  const firstExpected = expectedParts[0];
  const lastExpected = expectedParts[expectedParts.length - 1];

  const hasFirst = extractedParts.some((p) => p === firstExpected);
  const hasLast = extractedParts.some((p) => p === lastExpected);

  return hasFirst && hasLast;
}

export interface PlanResolution {
  planId: keyof typeof PIX_CONFIG.plans;
  plan: (typeof PIX_CONFIG.plans)[keyof typeof PIX_CONFIG.plans];
  isAutoUpgraded: boolean;
  message?: string;
}

/**
 * Validação inteligente de plano com suporte a arredondamento para cima e auto-upgrade
 */
export function resolveMatchingPlan(
  requestedPlanId: keyof typeof PIX_CONFIG.plans,
  paidAmount: number
): PlanResolution | null {
  const requestedPlan = PIX_CONFIG.plans[requestedPlanId];
  if (!requestedPlan) return null;

  const allPlans = Object.entries(PIX_CONFIG.plans) as [
    keyof typeof PIX_CONFIG.plans,
    (typeof PIX_CONFIG.plans)[keyof typeof PIX_CONFIG.plans]
  ][];

  // 1. Se o valor pago atende ao plano solicitado (com tolerância de R$ 0,10 para baixo e até R$ 5,00 para cima de arredondamento)
  if (paidAmount >= requestedPlan.price - 0.10 && paidAmount <= requestedPlan.price + 5.00) {
    return {
      planId: requestedPlanId,
      plan: requestedPlan,
      isAutoUpgraded: false,
    };
  }

  // 2. Auto-Upgrade Inteligente: Se o valor cobre algum plano superior do ecossistema
  const eligiblePlans = allPlans
    .filter(([_, plan]) => paidAmount >= plan.price - 0.10)
    .sort((a, b) => b[1].price - a[1].price);

  if (eligiblePlans.length > 0) {
    const [bestPlanId, bestPlan] = eligiblePlans[0];
    return {
      planId: bestPlanId,
      plan: bestPlan,
      isAutoUpgraded: bestPlanId !== requestedPlanId,
      message:
        bestPlanId !== requestedPlanId
          ? `Pagamento de R$ ${paidAmount.toFixed(2)} identificado. Ativando o plano correspondente: ${bestPlan.name}!`
          : undefined,
    };
  }

  return null;
}

