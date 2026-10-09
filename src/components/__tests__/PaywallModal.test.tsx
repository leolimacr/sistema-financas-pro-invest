import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaywallModal from '../PaywallModal';

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const entitlementMocks = vi.hoisted(() => ({
  effectiveTier: 'free' as string,
}));

const functionsMocks = vi.hoisted(() => ({
  httpsCallable: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => routerMocks.navigate,
}));

vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({ effectiveTier: entitlementMocks.effectiveTier }),
}));

vi.mock('../../firebase', () => ({
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => functionsMocks.httpsCallable(...args),
}));

vi.mock('@capacitor/browser', () => ({
  Browser: { open: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  entitlementMocks.effectiveTier = 'free';
  functionsMocks.httpsCallable.mockReturnValue(
    vi.fn(() => Promise.resolve({ data: { url: 'https://portal.stripe.test/sess' } }))
  );
});

describe('PaywallModal (Etapa 7 — E7-09)', () => {
  it('free: CTA navega para o pricing', () => {
    render(<PaywallModal open onClose={vi.fn()} feature="historico completo" />);
    fireEvent.click(screen.getByRole('button', { name: /liberar histórico completo/i }));
    expect(routerMocks.navigate).toHaveBeenCalledWith('/app/mais/pricing');
    expect(functionsMocks.httpsCallable).not.toHaveBeenCalled();
  });

  it('premium: CTA abre o portal Stripe (não o pricing)', async () => {
    entitlementMocks.effectiveTier = 'premium';
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PaywallModal open onClose={vi.fn()} feature="fatura premium" />);
    fireEvent.click(screen.getByRole('button', { name: /gerenciar assinatura/i }));
    await waitFor(() => {
      expect(functionsMocks.httpsCallable).toHaveBeenCalledWith(expect.anything(), 'createPortalSession');
    });
    expect(routerMocks.navigate).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('https://portal.stripe.test/sess', '_blank');
    openSpy.mockRestore();
  });

  it('fechado não renderiza nada', () => {
    const { container } = render(<PaywallModal open={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
