export interface PixRecipientConfig {
    recipientName: string;
    bankName: string;
    pixKey: string;
    pixKeyType: string;
    plans: Record<string, {
        tier: 'pro' | 'premium';
        cycle: 'monthly' | 'yearly';
        price: number;
        name: string;
    }>;
}
export declare const PIX_CONFIG: PixRecipientConfig;
export declare function normalizeText(text: string): string;
export declare function validateRecipientName(extracted: string, expected: string): boolean;
export interface PlanResolution {
    planId: keyof typeof PIX_CONFIG.plans;
    plan: (typeof PIX_CONFIG.plans)[keyof typeof PIX_CONFIG.plans];
    isAutoUpgraded: boolean;
    message?: string;
}
export declare function resolveMatchingPlan(requestedPlanId: keyof typeof PIX_CONFIG.plans, paidAmount: number): PlanResolution | null;
