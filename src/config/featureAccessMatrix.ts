import type { BillingTier, BillingStatus, BillingCycle, EffectiveTier } from '../types/billing';

/* ───────── FEATURE DEFINITIONS ───────── */

export const FEATURE_DEFINITIONS = {
  controla:              { tier: 'free', category: 'core',       label: 'Controla' },
  base_protecao:         { tier: 'free', category: 'core',       label: 'Base de Proteção' },
  central_basic:         { tier: 'free', category: 'core',       label: 'Central' },
  ferramentas:           { tier: 'free', category: 'peripheral', label: 'Ferramentas' },
  metas:                 { tier: 'free', category: 'peripheral', label: 'Metas' },
  nexus_insights:        { tier: 'free', category: 'core',       label: 'Nexus Insights' },
  nexus_chat:            { tier: 'free', category: 'core',       label: 'Nexus Chat' },
  nexus_history:         { tier: 'pro',  category: 'core',       label: 'Histórico do Nexus' },
  transaction_history:   { tier: 'pro',  category: 'core',       label: 'Histórico de Transações' },
  historical_evolution:  { tier: 'pro',  category: 'core',       label: 'Evolução Histórica' },
  export_csv_pdf:        { tier: 'pro',  category: 'peripheral', label: 'Exportação CSV/PDF' },
  backup_cloud:          { tier: 'pro',  category: 'peripheral', label: 'Backup na Nuvem' },
  debts:                 { tier: 'premium', category: 'peripheral', label: 'Gestão de Dívidas' },
  investments:           { tier: 'premium', category: 'peripheral', label: 'Investimentos' },
  passives:              { tier: 'premium', category: 'peripheral', label: 'Passivos e Patrimônio' },
  reports_weekly_email:  { tier: 'premium', category: 'peripheral', label: 'Relatórios Semanais' },
  google_sheets_integration: { tier: 'premium', category: 'peripheral', label: 'Integração Google Sheets' },
} as const;

export type EntitlementKey = keyof typeof FEATURE_DEFINITIONS;

/* ───────── TIER ORDER ───────── */

const TIER_ORDER: Record<BillingTier, number> = { free: 0, pro: 1, premium: 2 };

/* ───────── EFFECTIVE TIER ───────── */

export function getEffectiveTier(tier: BillingTier, status: BillingStatus): EffectiveTier {
  if (status === null || status === 'expired' || status === 'incomplete' || status === 'revoked') {
    return 'free';
  }
  return tier;
}

/* ───────── DISPLAY LABEL ───────── */

export function getDisplayLabel(tier: BillingTier, status: BillingStatus): string {
  if (tier === 'free') return 'Gratuito';

  const tierLabel = tier === 'premium' ? 'Premium' : 'Pro';

  switch (status) {
    case 'trialing': return `${tierLabel} (Teste)`;
    case 'active':   return tierLabel;
    case 'past_due': return `${tierLabel} (Pagamento Pendente)`;
    case 'canceled': return `${tierLabel} (Cancelado)`;
    case 'expired':  return `${tierLabel} Expirado`;
    case 'revoked':  return `${tierLabel} (Revogado)`;
    case 'incomplete':
    case null:       return 'Gratuito';
  }
}

/* ───────── ENTITLEMENT CHECKS ───────── */

export function getEntitlements(
  tier: BillingTier,
  status: BillingStatus,
  _billingCycle?: BillingCycle,
): EntitlementKey[] {
  const effective = getEffectiveTier(tier, status);
  const minOrder = TIER_ORDER[effective];

  return (Object.keys(FEATURE_DEFINITIONS) as EntitlementKey[]).filter((key) => {
    const requiredTier = FEATURE_DEFINITIONS[key].tier;
    return TIER_ORDER[requiredTier] <= minOrder;
  });
}

export function hasFeature(
  tier: BillingTier,
  status: BillingStatus,
  key: EntitlementKey,
  _billingCycle?: BillingCycle,
): boolean {
  const effective = getEffectiveTier(tier, status);
  const requiredTier = FEATURE_DEFINITIONS[key]?.tier;
  if (!requiredTier) return false;
  return TIER_ORDER[effective] >= TIER_ORDER[requiredTier];
}

/* ───────── LEGACY PLAN ID MAPPING ───────── */
/* Espelha functions/backfillBilling.ts — LEGACY_PLAN_TABLE */

const LEGACY_PLAN_TABLE: Record<string, { tier: BillingTier; billingCycle: BillingCycle }> = {
  free:             { tier: 'free',    billingCycle: null },
  pro:              { tier: 'pro',     billingCycle: 'monthly' },
  pro_monthly:      { tier: 'pro',     billingCycle: 'monthly' },
  premium:          { tier: 'premium', billingCycle: 'monthly' },
  premium_monthly:  { tier: 'premium', billingCycle: 'monthly' },
  premium_annual:   { tier: 'premium', billingCycle: 'annual' },
  premium_anual:    { tier: 'premium', billingCycle: 'annual' },
};

export function resolveLegacyPlanId(planId: string): { tier: BillingTier; billingCycle: BillingCycle } | null {
  const mapped = LEGACY_PLAN_TABLE[planId];
  if (mapped) return mapped;

  const match = planId.match(/^(pro|premium)/);
  if (match) {
    return { tier: match[1] as BillingTier, billingCycle: 'monthly' };
  }

  return null;
}

/* ───────── USAGE LIMITS ───────── */

export function getUsageLimit(
  tier: BillingTier,
  status: BillingStatus,
  key: EntitlementKey,
): { limit: number; unit: 'day' } | null {
  if (key === 'nexus_chat' && getEffectiveTier(tier, status) === 'free') {
    return { limit: 5, unit: 'day' };
  }
  return null;
}
