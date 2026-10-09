import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VipWaitlistModal from '../VipWaitlistModal';
import * as purchaseService from '../../../services/purchaseService';

const mockUser = {
  uid: 'user-vip-123',
  email: 'investidor@teste.com',
  displayName: 'Leo Lima',
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock('../../../services/purchaseService', () => ({
  registerVipInterest: vi.fn(() => Promise.resolve()),
}));

describe('VipWaitlistModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza quando isOpen é false', () => {
    render(<VipWaitlistModal isOpen={false} onClose={vi.fn()} tier="pro" cycle="monthly" />);
    expect(screen.queryByText(/Lista VIP/i)).not.toBeInTheDocument();
  });

  it('renderiza com dados pré-preenchidos do usuário logado', () => {
    render(<VipWaitlistModal isOpen={true} onClose={vi.fn()} tier="premium" cycle="yearly" />);

    expect(screen.getByText(/Liberando em Primeira Mão/i)).toBeInTheDocument();
    expect(screen.getByText(/Plano Premium/i)).toBeInTheDocument();
    expect(screen.getByText(/Faturamento Anual/i)).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/Seu E-mail/i) as HTMLInputElement;
    expect(emailInput.value).toBe('investidor@teste.com');
  });

  it('registra interesse na Lista VIP e mostra tela de sucesso', async () => {
    const onCloseMock = vi.fn();
    render(<VipWaitlistModal isOpen={true} onClose={onCloseMock} tier="premium" cycle="monthly" />);

    const phoneInput = screen.getByLabelText(/WhatsApp/i);
    fireEvent.change(phoneInput, { target: { value: '11999998888' } });

    const submitBtn = screen.getByRole('button', { name: /Garantir Vaga na Lista VIP/i });
    const form = submitBtn.closest('form')!;
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(purchaseService.registerVipInterest).toHaveBeenCalledWith({
        userId: 'user-vip-123',
        email: 'investidor@teste.com',
        name: 'Leo Lima',
        whatsapp: '11999998888',
        tier: 'premium',
        cycle: 'monthly',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Vaga Garantida na Lista VIP!/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Concluído/i })).toBeInTheDocument();
  });
});
