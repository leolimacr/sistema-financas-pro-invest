export interface AsaasPlanConfig {
    tier: 'pro' | 'premium';
    cycle: 'monthly' | 'annual';
    value: number;
    name: string;
    description: string;
}
export declare const ASAAS_PLANS: Record<string, AsaasPlanConfig>;
export declare function getAsaasBaseUrl(isProd?: boolean): string;
