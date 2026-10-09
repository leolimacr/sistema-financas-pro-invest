export interface AsaasCustomerInput {
    name: string;
    cpfCnpj: string;
    email: string;
    phone?: string;
    externalReference: string;
}
export interface AsaasSubscriptionInput {
    customer: string;
    billingType: 'PIX';
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'ANNUALLY';
    description: string;
    externalReference: string;
}
export interface AsaasPixQrCodeResponse {
    encodedImage: string;
    payload: string;
    expirationDate: string;
}
export declare class AsaasClient {
    private apiKey;
    private baseUrl;
    constructor(apiKey?: string, isProd?: boolean);
    private request;
    findCustomer(externalReference: string, cpfCnpj?: string): Promise<{
        id: string;
        name: string;
        email: string;
    } | null>;
    createOrGetCustomer(input: AsaasCustomerInput): Promise<{
        id: string;
    }>;
    createSubscription(input: AsaasSubscriptionInput): Promise<{
        id: string;
        status: string;
        value: number;
    }>;
    getSubscriptionPayments(subscriptionId: string): Promise<Array<{
        id: string;
        status: string;
        value: number;
        dueDate: string;
    }>>;
    getPaymentPixQrCode(paymentId: string): Promise<AsaasPixQrCodeResponse>;
    getSubscription(subscriptionId: string): Promise<{
        id: string;
        status: string;
        value: number;
        cycle: string;
        externalReference?: string;
        nextDueDate?: string;
    }>;
    getPayment(paymentId: string): Promise<{
        id: string;
        status: string;
        value: number;
        subscription?: string;
        externalReference?: string;
        paymentDate?: string;
        clientPaymentDate?: string;
    }>;
}
export declare function getAsaas(apiKey?: string, isProd?: boolean): AsaasClient;
