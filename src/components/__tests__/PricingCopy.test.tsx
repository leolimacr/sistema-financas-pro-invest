import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PricingPage from '../PricingPage';
import { PLANS } from '../../../config/stripePlans';

vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({
    loading: false,
    effectiveTier: 'free',
    billingStatus: 'expired',
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../../hooks/useNavigation', () => ({
  useNavigation: () => ({ handleNavigate: vi.fn() }),
}));

vi.mock('../../firebase', () => ({
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

/** Etapa 7 — E7-11: copy de features em fonte única (stripePlans), sem drift. */
describe('PricingPage copy consistency (E7-11)', () => {
  it('renderiza exatamente as features de PLANS (free/pro/premium)', () => {
    render(<PricingPage />);
    for (const plan of [PLANS.FREE, PLANS.PRO, PLANS.PREMIUM]) {
      for (const feature of plan.features) {
        expect(screen.getByText(feature)).toBeInTheDocument();
      }
    }
  });

  it('sem contagem obsoleta de ferramentas; preços/planIds intactos', () => {
    render(<PricingPage />);
    expect(screen.queryByText(/todas as 8 ferramentas/i)).not.toBeInTheDocument();
    expect(screen.getByText(/todas as 7 ferramentas/i)).toBeInTheDocument();
    expect(PLANS.PRO.id).toBe('pro_monthly');
    expect(PLANS.PRO.price).toBe(19.9);
    expect(PLANS.PREMIUM.price).toBe(39.9);
    expect(PLANS.PREMIUM_ANNUAL.price).toBe(399);
  });
});
