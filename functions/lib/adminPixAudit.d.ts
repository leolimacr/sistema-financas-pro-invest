export declare const ADMIN_EMAIL = "leolimacr@hotmail.com";
export interface PixAuditItem {
    id: string;
    transactionId: string;
    rawTransactionId?: string;
    userId: string;
    userEmail: string | null;
    planId: string;
    planName: string;
    tier: string;
    cycle: string;
    amount: number;
    requiredAmount?: number;
    recipientName: string;
    payerName: string | null;
    bankOrigin: string | null;
    bankDestination: string | null;
    receiptDate: string | null;
    confidence: number;
    status: 'pending_review' | 'confirmed' | 'revoked' | 'auto_confirmed' | 'underpaid' | 'refunded';
    effectiveStatus: 'pending_review' | 'confirmed' | 'revoked' | 'auto_confirmed' | 'underpaid' | 'refunded';
    refundStatus?: 'waiting_pix_key' | 'refund_pending' | 'refunded' | null;
    refundPixKey?: string | null;
    refundPixKeyType?: string | null;
    refundRequestedAt?: string | null;
    refundedAt?: string | null;
    createdAt: string | null;
    deadline: string | null;
    hasReceiptImage: boolean;
    receiptBase64?: string | null;
    mimeType?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    revocationReason?: string | null;
}
export interface ReviewPixAuditPayload {
    transactionId: string;
    action: 'confirm' | 'revoke';
    revocationReason?: string;
}
export declare const listPixAuditQueue: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    items: PixAuditItem[];
}>, unknown>;
export declare const reviewPixAudit: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    action: string;
    message: string;
}>, unknown>;
export interface RequestPixRefundPayload {
    transactionId: string;
    refundPixKey: string;
    refundPixKeyType?: string;
}
export declare const requestPixRefund: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message: string;
}>, unknown>;
export interface CompletePixRefundPayload {
    transactionId: string;
}
export declare const completePixRefund: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message: string;
}>, unknown>;
