import { resolveMatchingPlan, type PlanResolution } from './src/config/pixManualConfig';
export { resolveMatchingPlan, type PlanResolution };
export interface PixAuditResult {
    isPixReceipt: boolean;
    amount: number | null;
    recipientName: string | null;
    payerName: string | null;
    date: string | null;
    transactionId: string | null;
    bankOrigin: string | null;
    bankDestination: string | null;
    confidence: number;
    rejectionReason?: string | null;
}
export declare const verifyPixReceipt: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    verifiedData: {
        planName: string;
        tier: "pro" | "premium";
        cycle: "monthly" | "yearly";
        amount: number;
        recipientName: string;
        transactionId: string;
        currentPeriodEnd: string;
        isAutoUpgraded: boolean;
        upgradeMessage: string | undefined;
    };
} | undefined>, unknown>;
