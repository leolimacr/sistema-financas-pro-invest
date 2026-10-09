export type EffectiveTier = 'free' | 'pro' | 'premium';

const FEATURE_DEFINITIONS: Record<string, { tier: EffectiveTier }> = {
  controla:                   { tier: 'free' },
  base_protecao:              { tier: 'free' },
  central_basic:              { tier: 'free' },
  ferramentas:                { tier: 'free' },
  metas:                      { tier: 'free' },
  nexus_insights:             { tier: 'free' },
  nexus_chat:                 { tier: 'free' },
  nexus_history:              { tier: 'pro' },
  transaction_history:        { tier: 'pro' },
  historical_evolution:       { tier: 'pro' },
  export_csv_pdf:             { tier: 'pro' },
  backup_cloud:               { tier: 'pro' },
  debts:                      { tier: 'premium' },
  investments:                { tier: 'premium' },
  passives:                   { tier: 'premium' },
  reports_weekly_email:       { tier: 'premium' },
  google_sheets_integration:  { tier: 'premium' },
};

const TIER_ORDER: Record<EffectiveTier, number> = { free: 0, pro: 1, premium: 2 };

export function getEffectiveTier(tier: EffectiveTier, status: string | null): EffectiveTier {
  if (status === null || status === 'expired' || status === 'incomplete') {
    return 'free';
  }
  return tier;
}

export function computeEntitlements(
  tier: EffectiveTier,
  status: string | null,
): string[] {
  const effective = getEffectiveTier(tier, status);
  const minOrder = TIER_ORDER[effective];

  return Object.keys(FEATURE_DEFINITIONS).filter((key) => {
    const requiredOrder = TIER_ORDER[FEATURE_DEFINITIONS[key].tier];
    return requiredOrder <= minOrder;
  });
}

export function getUsageLimit(
  tier: EffectiveTier,
  status: string | null,
  key: string,
): number | null {
  if (key === 'nexus_chat' && getEffectiveTier(tier, status) === 'free') {
    return 5;
  }
  return null;
}
