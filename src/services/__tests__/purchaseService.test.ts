import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isBillingReady, PLAY_STORE_PRODUCT_IDS, registerVipInterest, purchaseViaGooglePlay } from '../purchaseService';
import { setDoc } from 'firebase/firestore';
import { PresenceEventService } from '../PresenceEventService';
import { Capacitor } from '@capacitor/core';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, path) => ({ path })),
  doc: vi.fn((_dbOrCol, pathOrId) => ({ pathOrId })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

vi.mock('../../firebase', () => ({
  firestore: {},
}));

vi.mock('../PresenceEventService', () => ({
  PresenceEventService: {
    create: vi.fn(() => Promise.resolve('mock-event-id')),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

describe('purchaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isBillingReady', () => {
    it('retorna false no ambiente padrão de pré-lançamento', () => {
      expect(isBillingReady()).toBe(false);
    });
  });

  describe('PLAY_STORE_PRODUCT_IDS', () => {
    it('contém os IDs de produto esperados para a Google Play Store', () => {
      expect(PLAY_STORE_PRODUCT_IDS.pro_monthly).toBe('fpi_pro_monthly');
      expect(PLAY_STORE_PRODUCT_IDS.pro_yearly).toBe('fpi_pro_yearly');
      expect(PLAY_STORE_PRODUCT_IDS.premium_monthly).toBe('fpi_premium_monthly');
      expect(PLAY_STORE_PRODUCT_IDS.premium_yearly).toBe('fpi_premium_yearly');
    });
  });

  describe('registerVipInterest', () => {
    it('grava o interesse no Firestore e emite notificação no Sininho', async () => {
      await registerVipInterest({
        userId: 'user-123',
        email: 'investidor@teste.com',
        name: 'Leonardo',
        whatsapp: '11999999999',
        tier: 'premium',
        cycle: 'monthly',
      });

      // 1. Deve salvar 2 documentos no Firestore (histórico + resumo no perfil)
      expect(setDoc).toHaveBeenCalledTimes(2);

      // 2. Deve disparar notificação com badge de Lista VIP
      expect(PresenceEventService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'user-123',
          eventType: 'billing.vip_waitlist',
          message: expect.objectContaining({
            title: expect.stringContaining('Lista VIP (Premium)'),
          }),
        })
      );
    });
  });

  describe('purchaseViaGooglePlay', () => {
    it('lança erro se chamado fora de plataforma nativa', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      await expect(purchaseViaGooglePlay('fpi_pro_monthly')).rejects.toThrow(
        'Google Play Billing só está disponível no app Android nativo.'
      );
    });
  });
});
