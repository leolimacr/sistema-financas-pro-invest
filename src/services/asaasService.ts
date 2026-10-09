import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { BillingTier } from '../types/billing';

export interface AsaasPixSubscriptionRequest {
  planId: 'pro_monthly' | 'premium_monthly' | 'pro_annual' | 'premium_annual';
  customer: {
    name: string;
    cpfCnpj: string;
    phone?: string;
  };
}

export interface AsaasPixSubscriptionResponse {
  success: boolean;
  subscriptionId: string;
  paymentId: string;
  pixQrCodeImage: string;
  pixPayload: string;
  expirationDate: string;
  value: number;
  planName: string;
  tier: BillingTier;
}

/**
 * Invoca a Cloud Function para gerar a assinatura e o QR Code Pix no Asaas
 */
export async function createAsaasPixSubscription(
  data: AsaasPixSubscriptionRequest
): Promise<AsaasPixSubscriptionResponse> {
  const fn = httpsCallable<AsaasPixSubscriptionRequest, AsaasPixSubscriptionResponse>(
    functions,
    'createAsaasPixSubscription'
  );

  const result = await fn(data);
  return result.data;
}
