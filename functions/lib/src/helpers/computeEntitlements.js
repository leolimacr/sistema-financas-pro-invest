"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveTier = getEffectiveTier;
exports.computeEntitlements = computeEntitlements;
exports.getUsageLimit = getUsageLimit;
const FEATURE_DEFINITIONS = {
    controla: { tier: 'free' },
    base_protecao: { tier: 'free' },
    central_basic: { tier: 'free' },
    ferramentas: { tier: 'free' },
    metas: { tier: 'free' },
    nexus_insights: { tier: 'free' },
    nexus_chat: { tier: 'free' },
    nexus_history: { tier: 'pro' },
    transaction_history: { tier: 'pro' },
    historical_evolution: { tier: 'pro' },
    export_csv_pdf: { tier: 'pro' },
    backup_cloud: { tier: 'pro' },
    debts: { tier: 'premium' },
    investments: { tier: 'premium' },
    passives: { tier: 'premium' },
    reports_weekly_email: { tier: 'premium' },
    google_sheets_integration: { tier: 'premium' },
};
const TIER_ORDER = { free: 0, pro: 1, premium: 2 };
function getEffectiveTier(tier, status) {
    if (status === null || status === 'expired' || status === 'incomplete') {
        return 'free';
    }
    return tier;
}
function computeEntitlements(tier, status) {
    const effective = getEffectiveTier(tier, status);
    const minOrder = TIER_ORDER[effective];
    return Object.keys(FEATURE_DEFINITIONS).filter((key) => {
        const requiredOrder = TIER_ORDER[FEATURE_DEFINITIONS[key].tier];
        return requiredOrder <= minOrder;
    });
}
function getUsageLimit(tier, status, key) {
    if (key === 'nexus_chat' && getEffectiveTier(tier, status) === 'free') {
        return 5;
    }
    return null;
}
//# sourceMappingURL=computeEntitlements.js.map