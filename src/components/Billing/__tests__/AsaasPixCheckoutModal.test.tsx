import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AsaasPixCheckoutModal } from '../AsaasPixCheckoutModal';
import * as asaasService from '../../../services/asaasService';

// Mock contexts
const mockUseAuth = vi.fn();
const mockUseEntitlement = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../../hooks/useEntitlement', () => ({
  useEntitlement: () => mockUseEntitlement(),
}));

vi.mock('../../../services/asaasService', () => ({
  createAsaasPixSubscription: vi.fn(),
}));

describe('AsaasPixCheckoutModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    tier: 'pro' as const,
    cycle: 'monthly' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { uid: 'user_test_123', email: 'test@example.com', displayName: 'Investidor Teste' },
    });
    mockUseEntitlement.mockReturnValue({
      effectiveTier: 'free',
      loading: false,
    });
  });

  it('não renderiza quando isOpen for false', () => {
    const { container } = render(
      <AsaasPixCheckoutModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza o formulário com dados iniciais e plano Pro', () => {
    render(<AsaasPixCheckoutModal {...defaultProps} />);

    expect(screen.getByText('Assinatura via Pix Recorrente')).toBeInTheDocument();
    expect(screen.getByText(/Finanças Pro/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 19,90 \/ mês/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Seu nome como no banco')).toHaveValue('Investidor Teste');
    expect(screen.getByRole('button', { name: /Gerar Pix de Pagamento/i })).toBeInTheDocument();
  });

  it('valida CPF obrigatório antes de prosseguir', async () => {
    render(<AsaasPixCheckoutModal {...defaultProps} />);

    const cpfInput = screen.getByPlaceholderText('000.000.000-00');
    fireEvent.change(cpfInput, { target: { value: '12345' } });

    const form = cpfInput.closest('form')!;
    fireEvent.submit(form);

    expect(await screen.findByText(/Por favor, informe um CPF válido com 11 dígitos/i)).toBeInTheDocument();
    expect(asaasService.createAsaasPixSubscription).not.toHaveBeenCalled();
  });

  it('gera QR Code Pix com sucesso ao preencher CPF válido', async () => {
    vi.mocked(asaasService.createAsaasPixSubscription).mockResolvedValueOnce({
      success: true,
      subscriptionId: 'sub_123',
      paymentId: 'pay_123',
      pixEncodedImage: 'mock_base64_img',
      pixPayload: '00020126580014br.gov.bcb.pix0136asaas_key_test',
      value: 19.9,
      dueDate: '2026-09-17',
    });

    render(<AsaasPixCheckoutModal {...defaultProps} />);

    const cpfInput = screen.getByPlaceholderText('000.000.000-00');
    fireEvent.change(cpfInput, { target: { value: '12345678909' } });

    const form = cpfInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(asaasService.createAsaasPixSubscription).toHaveBeenCalledWith({
        planId: 'pro_monthly',
        customer: {
          name: 'Investidor Teste',
          cpfCnpj: '12345678909',
          phone: undefined,
        },
      });
    });

    // Passo do PIX exibido
    expect(await screen.findByText(/Aguardando confirmação do banco\.\.\./i)).toBeInTheDocument();
    expect(screen.getAllByText(/Pix Copia e Cola/i).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('00020126580014br.gov.bcb.pix0136asaas_key_test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument();
  });

  it('permite copiar o código Pix para a área de transferência', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    vi.mocked(asaasService.createAsaasPixSubscription).mockResolvedValueOnce({
      success: true,
      subscriptionId: 'sub_123',
      paymentId: 'pay_123',
      pixPayload: '00020126580014br.gov.bcb.pix0136asaas_key_test',
      value: 19.9,
      dueDate: '2026-09-17',
    });

    render(<AsaasPixCheckoutModal {...defaultProps} />);

    const cpfInput = screen.getByPlaceholderText('000.000.000-00');
    fireEvent.change(cpfInput, { target: { value: '12345678909' } });

    const form = cpfInput.closest('form')!;
    fireEvent.submit(form);

    const copyBtn = await screen.findByRole('button', { name: /Copiar/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('00020126580014br.gov.bcb.pix0136asaas_key_test');
    expect(await screen.findByText(/Copiado!/i)).toBeInTheDocument();
  });

  it('transiciona para tela de sucesso quando o Firestore confirma o pagamento', async () => {
    const { rerender } = render(<AsaasPixCheckoutModal {...defaultProps} />);

    vi.mocked(asaasService.createAsaasPixSubscription).mockResolvedValueOnce({
      success: true,
      subscriptionId: 'sub_123',
      paymentId: 'pay_123',
      pixPayload: '00020126580014br.gov.bcb.pix0136asaas_key_test',
      value: 19.9,
      dueDate: '2026-09-17',
    });

    const cpfInput = screen.getByPlaceholderText('000.000.000-00');
    fireEvent.change(cpfInput, { target: { value: '12345678909' } });

    const form = cpfInput.closest('form')!;
    fireEvent.submit(form);

    await screen.findByText(/Aguardando confirmação do banco/i);

    // Simula atualização reativa do Firestore (onSnapshot) mudando effectiveTier para 'pro'
    mockUseEntitlement.mockReturnValue({
      effectiveTier: 'pro',
      loading: false,
    });

    rerender(<AsaasPixCheckoutModal {...defaultProps} />);

    expect(await screen.findByText('Plano Finanças Pro Ativado!')).toBeInTheDocument();
    expect(screen.getByText(/Seu pagamento foi confirmado com sucesso/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Começar a Usar Agora/i })).toBeInTheDocument();
  });
});
