import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PixReceiptCheckoutModal } from '../PixReceiptCheckoutModal';
import * as pixReceiptService from '../../../services/pixReceiptService';
import * as adminPixAuditService from '../../../services/adminPixAuditService';

// Mock contexts
const mockUseAuth = vi.fn();
const mockUseEntitlement = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../../hooks/useEntitlement', () => ({
  useEntitlement: () => mockUseEntitlement(),
}));

vi.mock('../../../services/pixReceiptService', () => ({
  fileToBase64: vi.fn(),
  verifyPixReceipt: vi.fn(),
}));

vi.mock('../../../services/adminPixAuditService', () => ({
  requestPixRefund: vi.fn(),
}));

describe('PixReceiptCheckoutModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    tier: 'pro' as const,
    cycle: 'monthly' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { uid: 'user_123', email: 'investidor@teste.com' },
    });
    mockUseEntitlement.mockReturnValue({
      effectiveTier: 'free',
      loading: false,
    });
  });

  it('não renderiza quando isOpen for false', () => {
    const { container } = render(
      <PixReceiptCheckoutModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza dados da favorecida institucional e banco', () => {
    render(<PixReceiptCheckoutModal {...defaultProps} />);

    expect(screen.getByText('Assinatura com Chave Pix')).toBeInTheDocument();
    expect(screen.getAllByText(/Finanças Pro/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/19,90/).length).toBeGreaterThan(0);
    expect(screen.getByText('Finanças Pro Invest')).toBeInTheDocument();
    expect(screen.getByText('Instituição Autorizada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Já fiz o Pix — Enviar Comprovante/i })).toBeInTheDocument();
  });

  it('permite copiar a chave Pix para a área de transferência', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<PixReceiptCheckoutModal {...defaultProps} />);

    const copyBtn = screen.getByRole('button', { name: /Copiar/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('pix@financasproinvest.com.br');
    expect(await screen.findByText(/Copiada!/i)).toBeInTheDocument();
  });

  it('avança para tela de upload e permite anexar comprovante', async () => {
    render(<PixReceiptCheckoutModal {...defaultProps} />);

    // Clica para avançar
    fireEvent.click(screen.getByRole('button', { name: /Já fiz o Pix — Enviar Comprovante/i }));

    expect(screen.getByText('Anexe o Comprovante do Pix')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Validar Comprovante no Sistema/i })).toBeDisabled();

    // Simula upload do arquivo
    const file = new File(['dummy-content'], 'comprovante-pix.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('comprovante-pix.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Validar Comprovante no Sistema/i })).not.toBeDisabled();
  });

  it('executa auditoria com sucesso e exibe tela de ativação da assinatura', async () => {
    vi.mocked(pixReceiptService.fileToBase64).mockResolvedValueOnce({
      base64: 'mock_base64_string',
      mimeType: 'image/png',
    });

    vi.mocked(pixReceiptService.verifyPixReceipt).mockResolvedValueOnce({
      success: true,
      verifiedData: {
        planName: 'Finanças Pro',
        tier: 'pro',
        cycle: 'monthly',
        amount: 19.90,
        recipientName: 'Finanças Pro Invest',
        transactionId: 'E0003816620260916_TEST',
        currentPeriodEnd: '2026-10-16T00:00:00.000Z',
      },
    });

    render(<PixReceiptCheckoutModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Já fiz o Pix — Enviar Comprovante/i }));

    const file = new File(['dummy-content'], 'comprovante.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const validateBtn = screen.getByRole('button', { name: /Validar Comprovante no Sistema/i });
    fireEvent.click(validateBtn);

    expect(await screen.findByText('Plano Finanças Pro Ativado!')).toBeInTheDocument();
    expect(screen.getByText(/Seu comprovante foi auditado e aprovado com sucesso pelo Sistema Finanças Pro Invest/i)).toBeInTheDocument();
    expect(screen.getByText('E0003816620260916_TEST')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Começar a Usar Agora/i })).toBeInTheDocument();
  });

  it('exibe mensagem amigável de erro se a validação rejeitar por motivo genérico', async () => {
    vi.mocked(pixReceiptService.fileToBase64).mockResolvedValueOnce({
      base64: 'mock_base64_string',
      mimeType: 'image/png',
    });

    vi.mocked(pixReceiptService.verifyPixReceipt).mockRejectedValueOnce(
      new Error('Favorecido no comprovante não confere com Finanças Pro Invest.')
    );

    render(<PixReceiptCheckoutModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Já fiz o Pix — Enviar Comprovante/i }));

    const file = new File(['dummy-content'], 'comprovante.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const validateBtn = screen.getByRole('button', { name: /Validar Comprovante no Sistema/i });
    fireEvent.click(validateBtn);

    expect(await screen.findByText(/Atenção ao Comprovante/i)).toBeInTheDocument();
    expect(screen.getByText(/Favorecido no comprovante não confere/i)).toBeInTheDocument();
  });

  it('transiciona para o formulário de devolução quando o valor for inferior (UNDERPAID)', async () => {
    vi.mocked(pixReceiptService.fileToBase64).mockResolvedValueOnce({
      base64: 'mock_base64_string',
      mimeType: 'image/png',
    });

    const underpaidError = new Error(
      JSON.stringify({
        code: 'UNDERPAID',
        amountPaid: 1.0,
        requiredAmount: 19.9,
        transactionId: 'TX_UNDERPAID_123',
        payerName: 'Leonardo Teste',
        planName: 'Finanças Pro',
      })
    );

    vi.mocked(pixReceiptService.verifyPixReceipt).mockRejectedValueOnce(underpaidError);
    vi.mocked(adminPixAuditService.requestPixRefund).mockResolvedValueOnce({
      success: true,
      message: 'Chave Pix registrada com sucesso!',
    });

    render(<PixReceiptCheckoutModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Já fiz o Pix — Enviar Comprovante/i }));

    const file = new File(['dummy-content'], 'comprovante_1real.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const validateBtn = screen.getByRole('button', { name: /Validar Comprovante no Sistema/i });
    fireEvent.click(validateBtn);

    // Deve exibir o aviso de valor menor e estorno
    expect(await screen.findByText('Valor menor que o plano contratado')).toBeInTheDocument();
    expect(screen.getAllByText(/Leonardo Teste/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prazo Garantido:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/até 2 dias úteis/i).length).toBeGreaterThan(0);

    // Preenche chave Pix
    const pixInput = screen.getByPlaceholderText(/Digite seu CPF/i);
    fireEvent.change(pixInput, { target: { value: '123.456.789-00' } });

    // Submete a chave
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Chave de Devolução/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminPixAuditService.requestPixRefund).toHaveBeenCalledWith({
        transactionId: 'TX_UNDERPAID_123',
        pixKey: '123.456.789-00',
        pixKeyType: 'cpf',
      });
    });

    expect(await screen.findByText('Chave Pix Registrada com Sucesso!')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument();
  });
});
