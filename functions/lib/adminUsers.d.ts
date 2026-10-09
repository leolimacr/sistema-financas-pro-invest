export interface AdminUserData {
    uid: string;
    email: string | null;
    displayName: string | null;
    tier: 'free' | 'pro' | 'premium';
    billingStatus: string | null;
    billingCycle: string | null;
    planName: string;
    createdAt: string | null;
    lastActiveAt: string | null;
    daysSinceLastActive: number;
    launchCount: number;
    hasFinancialProfile: boolean;
    onboardingCompleted: boolean;
    abandonmentScore: number;
    abandonmentLabel: string;
    isActive: boolean;
}
export interface ListAdminUsersSummary {
    totalUsers: number;
    byTier: {
        free: number;
        pro: number;
        premium: number;
    };
    activeUsers: number;
    inactiveUsers: number;
    abandonedCount: number;
    averageAbandonmentScore: number;
}
export interface ListAdminUsersResponse {
    success: boolean;
    summary: ListAdminUsersSummary;
    users: AdminUserData[];
}
export declare function calculateAbandonmentScore(params: {
    daysSinceLastActive: number;
    launchCount: number;
    hasFinancialProfile: boolean;
}): {
    score: number;
    label: string;
};
export interface ResolveTierParams {
    email?: string | null;
    directTier?: string | null;
    directPlan?: string | null;
    subscription?: {
        tier?: string | null;
        planId?: string | null;
        plan?: string | null;
        status?: string | null;
        cycle?: string | null;
    } | null;
    billingMain?: {
        tier?: string | null;
        status?: string | null;
        billingCycle?: string | null;
    } | null;
}
export declare function resolveAdminUserTier(params: ResolveTierParams): {
    tier: 'free' | 'pro' | 'premium';
    planName: string;
    billingStatus: string;
    billingCycle: string;
};
export declare const listAdminUsers: import("firebase-functions/v2/https").CallableFunction<any, Promise<ListAdminUsersResponse>, unknown>;
