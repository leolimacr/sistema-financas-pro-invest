import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { BillingTier } from '../types/billing';

export interface VerifyPixReceiptRequest {
  base64File: string;
  mimeType: string;
  planId: 'pro_monthly' | 'pro_annual' | 'premium_monthly' | 'premium_annual';
}

export interface VerifyPixReceiptResponse {
  success: boolean;
  verifiedData: {
    planName: string;
    tier: BillingTier;
    cycle: 'monthly' | 'yearly';
    amount: number;
    recipientName: string;
    transactionId: string;
    currentPeriodEnd: string;
  };
}

/**
 * Converte um arquivo do navegador (imagem ou PDF) em string Base64 e MIME type
 */
export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        base64,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Invoca a Cloud Function para auditar o comprovante Pix via Gemini Flash e ativar o plano
 */
export async function verifyPixReceipt(
  data: VerifyPixReceiptRequest
): Promise<VerifyPixReceiptResponse> {
  const fn = httpsCallable<VerifyPixReceiptRequest, VerifyPixReceiptResponse>(
    functions,
    'verifyPixReceipt'
  );

  const result = await fn(data);
  return result.data;
}
