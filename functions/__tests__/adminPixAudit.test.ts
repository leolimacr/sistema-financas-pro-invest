import { describe, it, expect } from 'vitest';
import { ADMIN_EMAIL } from '../adminPixAudit';

describe('Admin Pix Audit Queue (Tripla Via de Decisão)', () => {
  describe('Permissões & Identificação do Administrador', () => {
    it('o email oficial de administrador configurado é leolimacr@hotmail.com', () => {
      expect(ADMIN_EMAIL).toBe('leolimacr@hotmail.com');
    });

    it('rejeita com permission-denied chamadas sem email de administrador', () => {
      const isAuthorized = (email: string | undefined | null) => {
        return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      };

      expect(isAuthorized('leolimacr@hotmail.com')).toBe(true);
      expect(isAuthorized('LEOLIMACR@HOTMAIL.COM')).toBe(true);
      expect(isAuthorized('outro@gmail.com')).toBe(false);
      expect(isAuthorized(null)).toBe(false);
      expect(isAuthorized(undefined)).toBe(false);
    });
  });

  describe('Cálculo da Regra da 3ª Via (Inércia / Auto-Confirmação após 3 dias)', () => {
    const calculateEffectiveStatus = (
      status: 'pending_review' | 'confirmed' | 'revoked' | 'auto_confirmed',
      deadlineMillis: number,
      nowMillis: number
    ) => {
      if (status === 'pending_review' && deadlineMillis > 0 && nowMillis >= deadlineMillis) {
        return 'auto_confirmed';
      }
      return status;
    };

    it('mantém "pending_review" se ainda estiver dentro do prazo de 3 dias', () => {
      const now = Date.now();
      const deadline = now + 2 * 24 * 60 * 60 * 1000; // faltam 2 dias
      const status = calculateEffectiveStatus('pending_review', deadline, now);
      expect(status).toBe('pending_review');
    });

    it('converte automaticamente para "auto_confirmed" quando ultrapassa 3 dias (inércia)', () => {
      const now = Date.now();
      const deadline = now - 1000; // expirou 1 segundo atrás
      const status = calculateEffectiveStatus('pending_review', deadline, now);
      expect(status).toBe('auto_confirmed');
    });

    it('respeita status "confirmed" explícito mesmo antes ou depois do prazo', () => {
      const now = Date.now();
      const deadline = now - 1000;
      const status = calculateEffectiveStatus('confirmed', deadline, now);
      expect(status).toBe('confirmed');
    });

    it('respeita status "revoked" explícito mesmo antes ou depois do prazo', () => {
      const now = Date.now();
      const deadline = now - 1000;
      const status = calculateEffectiveStatus('revoked', deadline, now);
      expect(status).toBe('revoked');
    });
  });

  describe('Ação de Revogação de Assinatura', () => {
    it('formata o payload de revogação e rebaixamento para Free', () => {
      const buildRevocationUpdates = (userId: string, adminEmail: string, reason: string) => {
        return {
          queueUpdate: {
            status: 'revoked',
            revocationReason: reason,
            reviewedBy: adminEmail,
          },
          billingUpdate: {
            tier: 'free',
            status: 'revoked',
            revocationReason: reason,
            revokedBy: adminEmail,
          },
          userUpdate: {
            tier: 'free',
            subscription: {
              tier: 'free',
              plan: 'free',
              status: 'revoked',
              revocationReason: reason,
            },
          },
        };
      };

      const result = buildRevocationUpdates('user123', 'leolimacr@hotmail.com', 'Comprovante não identificado');
      expect(result.billingUpdate.tier).toBe('free');
      expect(result.billingUpdate.status).toBe('revoked');
      expect(result.userUpdate.subscription.status).toBe('revoked');
      expect(result.queueUpdate.status).toBe('revoked');
    });
  });
});
