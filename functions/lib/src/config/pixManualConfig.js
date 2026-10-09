"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIX_CONFIG = void 0;
exports.normalizeText = normalizeText;
exports.validateRecipientName = validateRecipientName;
exports.resolveMatchingPlan = resolveMatchingPlan;
exports.PIX_CONFIG = {
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
function normalizeText(text) {
    return (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function validateRecipientName(extracted, expected) {
    const normExtracted = normalizeText(extracted);
    const normExpected = normalizeText(expected);
    if (!normExtracted || !normExpected)
        return false;
    if (normExtracted.includes(normExpected))
        return true;
    const expectedParts = normExpected.split(' ').filter((p) => p.length > 2);
    const extractedParts = normExtracted.split(' ').filter((p) => p.length > 2);
    const firstExpected = expectedParts[0];
    const lastExpected = expectedParts[expectedParts.length - 1];
    const hasFirst = extractedParts.some((p) => p === firstExpected);
    const hasLast = extractedParts.some((p) => p === lastExpected);
    return hasFirst && hasLast;
}
function resolveMatchingPlan(requestedPlanId, paidAmount) {
    const requestedPlan = exports.PIX_CONFIG.plans[requestedPlanId];
    if (!requestedPlan)
        return null;
    const allPlans = Object.entries(exports.PIX_CONFIG.plans);
    if (paidAmount >= requestedPlan.price - 0.10 && paidAmount <= requestedPlan.price + 5.00) {
        return {
            planId: requestedPlanId,
            plan: requestedPlan,
            isAutoUpgraded: false,
        };
    }
    const eligiblePlans = allPlans
        .filter(([_, plan]) => paidAmount >= plan.price - 0.10)
        .sort((a, b) => b[1].price - a[1].price);
    if (eligiblePlans.length > 0) {
        const [bestPlanId, bestPlan] = eligiblePlans[0];
        return {
            planId: bestPlanId,
            plan: bestPlan,
            isAutoUpgraded: bestPlanId !== requestedPlanId,
            message: bestPlanId !== requestedPlanId
                ? `Pagamento de R$ ${paidAmount.toFixed(2)} identificado. Ativando o plano correspondente: ${bestPlan.name}!`
                : undefined,
        };
    }
    return null;
}
//# sourceMappingURL=pixManualConfig.js.map