export declare const createAsaasPixSubscription: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    subscriptionId: string;
    paymentId: string;
    pixQrCodeImage: string;
    pixPayload: string;
    expirationDate: string;
    value: number;
    planName: string;
    tier: "pro" | "premium";
}>, unknown>;
