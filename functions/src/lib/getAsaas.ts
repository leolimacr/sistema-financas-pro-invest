import * as logger from 'firebase-functions/logger';
import { getAsaasBaseUrl } from '../config/asaasConfig';

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
  nextDueDate: string; // YYYY-MM-DD
  cycle: 'MONTHLY' | 'ANNUALLY';
  description: string;
  externalReference: string;
}

export interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export class AsaasClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, isProd = false) {
    this.apiKey = apiKey || process.env.ASAAS_API_KEY || '';
    this.baseUrl = getAsaasBaseUrl(isProd);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'access_token': this.apiKey,
      ...(options.headers as Record<string, string> || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      logger.error(`[AsaasClient] Erro HTTP ${res.status} em ${endpoint}: ${errorBody}`);
      throw new Error(`Asaas API error [${res.status}]: ${errorBody}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Busca cliente existente pelo externalReference (userId) ou CPF
   */
  async findCustomer(externalReference: string, cpfCnpj?: string): Promise<{ id: string; name: string; email: string } | null> {
    if (!this.apiKey) return null;
    try {
      const res = await this.request<{ data: Array<{ id: string; name: string; email: string; cpfCnpj: string }> }>(
        `/customers?externalReference=${encodeURIComponent(externalReference)}`
      );
      if (res.data && res.data.length > 0) {
        return res.data[0];
      }

      if (cpfCnpj) {
        const cleanedCpf = cpfCnpj.replace(/\D/g, '');
        const resCpf = await this.request<{ data: Array<{ id: string; name: string; email: string; cpfCnpj: string }> }>(
          `/customers?cpfCnpj=${encodeURIComponent(cleanedCpf)}`
        );
        if (resCpf.data && resCpf.data.length > 0) {
          return resCpf.data[0];
        }
      }
      return null;
    } catch (err) {
      logger.warn('[AsaasClient] Falha ao buscar cliente:', err);
      return null;
    }
  }

  /**
   * Cria ou obtém cliente no Asaas
   */
  async createOrGetCustomer(input: AsaasCustomerInput): Promise<{ id: string }> {
    const existing = await this.findCustomer(input.externalReference, input.cpfCnpj);
    if (existing) {
      return { id: existing.id };
    }

    const payload = {
      name: input.name.trim(),
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ''),
      email: input.email.trim().toLowerCase(),
      mobilePhone: input.phone ? input.phone.replace(/\D/g, '') : undefined,
      externalReference: input.externalReference,
      notificationDisabled: false,
    };

    const res = await this.request<{ id: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res;
  }

  /**
   * Cria assinatura Pix no Asaas
   */
  async createSubscription(input: AsaasSubscriptionInput): Promise<{ id: string; status: string; value: number }> {
    const res = await this.request<{ id: string; status: string; value: number }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res;
  }

  /**
   * Obtém a lista de cobranças geradas para uma assinatura
   */
  async getSubscriptionPayments(subscriptionId: string): Promise<Array<{ id: string; status: string; value: number; dueDate: string }>> {
    const res = await this.request<{ data: Array<{ id: string; status: string; value: number; dueDate: string }> }>(
      `/subscriptions/${subscriptionId}/payments`
    );
    return res.data || [];
  }

  /**
   * Obtém o QR Code e código Copia e Cola do Pix para uma cobrança
   */
  async getPaymentPixQrCode(paymentId: string): Promise<AsaasPixQrCodeResponse> {
    const res = await this.request<AsaasPixQrCodeResponse>(`/payments/${paymentId}/pixQrCode`);
    return res;
  }

  /**
   * Obtém detalhes de uma assinatura
   */
  async getSubscription(subscriptionId: string): Promise<{ id: string; status: string; value: number; cycle: string; externalReference?: string; nextDueDate?: string }> {
    return this.request(`/subscriptions/${subscriptionId}`);
  }

  /**
   * Obtém detalhes de uma cobrança
   */
  async getPayment(paymentId: string): Promise<{ id: string; status: string; value: number; subscription?: string; externalReference?: string; paymentDate?: string; clientPaymentDate?: string }> {
    return this.request(`/payments/${paymentId}`);
  }
}

let clientInstance: AsaasClient | null = null;

export function getAsaas(apiKey?: string, isProd = false): AsaasClient {
  if (apiKey) {
    return new AsaasClient(apiKey, isProd);
  }
  if (!clientInstance) {
    clientInstance = new AsaasClient(process.env.ASAAS_API_KEY, isProd);
  }
  return clientInstance;
}
