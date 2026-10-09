import type { UserDataResult } from "./nexus-core/data-integrator";
interface NexusAnalysisBasis {
    generatedAt: string;
    dataStatus: UserDataResult['dataStatus'];
    sources: string[];
    period: string;
    limitations: string[];
}
export declare function getUserPlan(userId: string): Promise<string | undefined>;
export declare const NEXUS_QUOTA_INTERIM: Record<string, number>;
export declare function nexusQuotaDay(now?: Date): string;
export declare function nexusQuotaForPlan(plan?: string): number;
export declare function checkNexusQuota(db: {
    collection: (path: string) => {
        doc: (id: string) => {
            get(): Promise<{
                data(): Record<string, unknown> | undefined;
            }>;
            set(data: Record<string, unknown>, opts?: unknown): Promise<unknown>;
        };
    };
}, uid: string, plan?: string, dayStr?: string): Promise<{
    allowed: boolean;
    used: number;
    quota: number;
}>;
export declare function checkTavilyQuota(db: {
    collection: (path: string) => {
        doc: (id: string) => {
            get(): Promise<{
                data(): Record<string, unknown> | undefined;
            }>;
            set(data: Record<string, unknown>, opts?: unknown): Promise<unknown>;
        };
    };
}, now?: Date): Promise<boolean>;
export declare const askAiAdvisor: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    answer: string;
    context: {
        intent: string;
        model: string;
        hasTransactions?: undefined;
        hasGoals?: undefined;
        actions?: undefined;
        analysisBasis?: undefined;
        decisionObject?: undefined;
        deterministicFacts?: undefined;
    };
    error?: undefined;
} | {
    success: boolean;
    answer: string;
    context: {
        model: string;
        intent: string;
        hasTransactions: boolean;
        hasGoals: boolean;
        actions: import("./nexus-core/action-registry").ContextualAction[] | undefined;
        analysisBasis: NexusAnalysisBasis;
        decisionObject: import("./nexus-core/action-registry").NexusDecisionObject;
        deterministicFacts: import("./nexus-core/financial-facts").DeterministicFinancialFacts;
    };
    error?: undefined;
} | {
    success: boolean;
    answer: string;
    error: any;
    context?: undefined;
}>, unknown>;
export {};
