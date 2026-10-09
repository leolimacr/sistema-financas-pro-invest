import { describe, it, expect } from 'vitest';
import {
  PIX_CONFIG,
  validateRecipientName,
  normalizeText,
  resolveMatchingPlan,
} from '../src/config/pixManualConfig';

describe('Pix Manual & Gemini Flash Audit Architecture', () => {
  describe('pixManualConfig', () => {
    it('configura favorecida e banco corretamente', () => {
      expect(PIX_CONFIG.recipientName).toBe('Finanças Pro Invest');
      expect(PIX_CONFIG.bankName).toBe('Instituição Autorizada');
      expect(PIX_CONFIG.pixKey).toBe('');
    });

    it('possui os planos Pro e Premium configurados com preços corretos', () => {
      expect(PIX_CONFIG.plans.pro_monthly.price).toBe(19.90);
      expect(PIX_CONFIG.plans.pro_monthly.tier).toBe('pro');
      expect(PIX_CONFIG.plans.pro_annual.price).toBe(199.00);

      expect(PIX_CONFIG.plans.premium_monthly.price).toBe(39.90);
      expect(PIX_CONFIG.plans.premium_monthly.tier).toBe('premium');
      expect(PIX_CONFIG.plans.premium_annual.price).toBe(399.00);
    });
  });

  describe('normalizeText', () => {
    it('remove acentos, pontuações e converte para minúsculas', () => {
      expect(normalizeText('FÍNÂNÇAS PRÔ ÍNVÉST!')).toBe('financas pro invest');
      expect(normalizeText('  São   Paulo - SP  ')).toBe('sao paulo sp');
    });
  });

  describe('validateRecipientName', () => {
    const expected = 'Finanças Pro Invest';

    it('valida nome exato sem distinção de maiúsculas/minúsculas ou acentos', () => {
      expect(validateRecipientName('Finanças Pro Invest', expected)).toBe(true);
      expect(validateRecipientName('FINANCAS PRO INVEST', expected)).toBe(true);
      expect(validateRecipientName('finanças pro invest', expected)).toBe(true);
    });

    it('valida quando primeiro e último nome batem mesmo com abreviações no meio', () => {
      expect(validateRecipientName('Finanças P. Invest', expected)).toBe(true);
      expect(validateRecipientName('Finanças Invest', expected)).toBe(true);
    });

    it('rejeita nomes de terceiros ou divergentes', () => {
      expect(validateRecipientName('João da Silva', expected)).toBe(false);
      expect(validateRecipientName('Outra Empresa Ltda', expected)).toBe(false);
      expect(validateRecipientName('', expected)).toBe(false);
    });
  });

  describe('resolveMatchingPlan (Validação Inteligente & Auto-Upgrade)', () => {
    it('aceita valor exato do plano solicitado', () => {
      const res = resolveMatchingPlan('pro_monthly', 19.90);
      expect(res).not.toBeNull();
      expect(res?.planId).toBe('pro_monthly');
      expect(res?.isAutoUpgraded).toBe(false);
    });

    it('aceita pequeno arredondamento para cima (ex: R$ 20,00 em vez de R$ 19,90)', () => {
      const res = resolveMatchingPlan('pro_monthly', 20.00);
      expect(res).not.toBeNull();
      expect(res?.planId).toBe('pro_monthly');
      expect(res?.isAutoUpgraded).toBe(false);
    });

    it('executa auto-upgrade se o usuário selecionou Pro mas pagou Premium (R$ 39,90)', () => {
      const res = resolveMatchingPlan('pro_monthly', 39.90);
      expect(res).not.toBeNull();
      expect(res?.planId).toBe('premium_monthly');
      expect(res?.isAutoUpgraded).toBe(true);
      expect(res?.plan.tier).toBe('premium');
    });

    it('executa auto-upgrade se o usuário selecionou Pro Mensal mas pagou Pro Anual (R$ 199,00)', () => {
      const res = resolveMatchingPlan('pro_monthly', 199.00);
      expect(res).not.toBeNull();
      expect(res?.planId).toBe('pro_annual');
      expect(res?.isAutoUpgraded).toBe(true);
      expect(res?.plan.cycle).toBe('yearly');
    });

    it('rejeita quando o valor transferido for inferior ao plano', () => {
      const res = resolveMatchingPlan('pro_monthly', 10.00);
      expect(res).toBeNull();
    });
  });
});
