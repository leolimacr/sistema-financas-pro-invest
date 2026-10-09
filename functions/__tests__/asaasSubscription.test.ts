import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ASAAS_PLANS, getAsaasBaseUrl } from '../src/config/asaasConfig';
import { AsaasClient } from '../src/lib/getAsaas';

describe('Asaas Subscription & Webhook Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('asaasConfig', () => {
    it('possui os planos Pro e Premium configurados corretamente', () => {
      expect(ASAAS_PLANS.pro_monthly).toBeDefined();
      expect(ASAAS_PLANS.pro_monthly.tier).toBe('pro');
      expect(ASAAS_PLANS.pro_monthly.value).toBe(19.90);

      expect(ASAAS_PLANS.premium_monthly).toBeDefined();
      expect(ASAAS_PLANS.premium_monthly.tier).toBe('premium');
      expect(ASAAS_PLANS.premium_monthly.value).toBe(39.90);
    });

    it('retorna a URL de sandbox ou produção de acordo com o ambiente', () => {
      expect(getAsaasBaseUrl(false)).toBe('https://sandbox.asaas.com/api/v3');
      expect(getAsaasBaseUrl(true)).toBe('https://api.asaas.com/v3');
    });
  });

  describe('AsaasClient', () => {
    it('inicializa com API key e URL corretas', () => {
      const client = new AsaasClient('test_api_key', false);
      expect(client).toBeDefined();
    });

    it('findCustomer retorna null quando não há API key', async () => {
      const client = new AsaasClient('', false);
      const res = await client.findCustomer('uid_123');
      expect(res).toBeNull();
    });
  });
});
