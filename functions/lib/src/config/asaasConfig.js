"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASAAS_PLANS = void 0;
exports.getAsaasBaseUrl = getAsaasBaseUrl;
exports.ASAAS_PLANS = {
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
function getAsaasBaseUrl(isProd = false) {
    if (process.env.ASAAS_ENVIRONMENT === 'production' || isProd) {
        return 'https://api.asaas.com/v3';
    }
    return 'https://sandbox.asaas.com/api/v3';
}
//# sourceMappingURL=asaasConfig.js.map