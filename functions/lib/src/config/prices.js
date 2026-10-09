"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_IDS = void 0;
exports.resolvePriceId = resolvePriceId;
exports.resolvePlanId = resolvePlanId;
exports.resolvePriceMapping = resolvePriceMapping;
exports.determineBillingCycle = determineBillingCycle;
exports.PLAN_IDS = ['pro_monthly', 'premium_monthly', 'premium_annual'];
const PRICE_IDS = {
    pro_monthly: { test: 'price_pro_test', prod: 'price_pro_prod' },
    premium_monthly: { test: 'price_premium_test', prod: 'price_premium_prod' },
    premium_annual: { test: 'price_premium_annual_test', prod: 'price_premium_annual_prod' },
};
const PRICE_MAP_TEST = {
    price_pro_test: { tier: 'pro', billingCycle: 'monthly' },
    price_premium_test: { tier: 'premium', billingCycle: 'monthly' },
    price_premium_annual_test: { tier: 'premium', billingCycle: 'annual' },
};
const PRICE_MAP_PROD = {
    price_pro_prod: { tier: 'pro', billingCycle: 'monthly' },
    price_premium_prod: { tier: 'premium', billingCycle: 'monthly' },
    price_premium_annual_prod: { tier: 'premium', billingCycle: 'annual' },
};
function resolvePriceId(planId, isProd) {
    return isProd ? PRICE_IDS[planId].prod : PRICE_IDS[planId].test;
}
function resolvePlanId(priceId) {
    for (const [planId, ids] of Object.entries(PRICE_IDS)) {
        if (priceId === ids.test || priceId === ids.prod)
            return planId;
    }
    return null;
}
function resolvePriceMapping(priceId) {
    return PRICE_MAP_TEST[priceId] ?? PRICE_MAP_PROD[priceId] ?? null;
}
function determineBillingCycle(priceId) {
    const mapping = resolvePriceMapping(priceId);
    return mapping?.billingCycle ?? 'monthly';
}
//# sourceMappingURL=prices.js.map