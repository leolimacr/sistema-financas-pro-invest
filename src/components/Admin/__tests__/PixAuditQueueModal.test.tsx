import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PixAuditQueueModal } from '../PixAuditQueueModal';
import * as adminPixAuditService from '../../../services/adminPixAuditService';

vi.mock('../../../services/adminPixAuditService');

describe('PixAuditQueueModal (Esteira de Auditoria Pix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada quando isOpen for false', () => {
    const { container } = render(
      <PixAuditQueueModal isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título e regras da tripla via quando aberto', async () => {
    vi.mocked(adminPixAuditService.fetchPixAuditQueue).mockResolvedValue([]);

    render(<PixAuditQueueModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText(/Auditoria Soberana Pix/i)).toBeInTheDocument();
    expect(screen.getByText(/Tripla Via/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Confirmar/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Revogar/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Inércia/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Nenhum comprovante na fila/i)).toBeInTheDocument();
    });
  });

  it('exibe itens da fila com status correspondente e botões de ação', async () => {
    const mockItems: adminPixAuditService.PixAuditItem[] = [
      {
        id: 'tx_pending_1',
        transactionId: 'tx_pending_1',
        userId: 'user_1',
        userEmail: 'cliente@teste.com',
        planId: 'pro_monthly',
        planName: 'Plano Pro Mensal',
        tier: 'pro',
        cycle: 'monthly',
        amount: 19.90,
        recipientName: 'Finanças Pro Invest',
        payerName: 'Maria Silva',
        bankOrigin: 'Nubank',
        bankDestination: 'Banco Bradesco',
        receiptDate: '2026-09-17',
        confidence: 0.99,
        status: 'pending_review',
        effectiveStatus: 'pending_review',
        createdAt: new Date().toISOString(),
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        hasReceiptImage: true,
        receiptBase64: 'base64_sample',
        mimeType: 'image/jpeg',
      },
      {
        id: 'tx_auto_2',
        transactionId: 'tx_auto_2',
        userId: 'user_2',
        userEmail: 'cliente2@teste.com',
        planId: 'premium_monthly',
        planName: 'Plano Premium Mensal',
        tier: 'premium',
        cycle: 'monthly',
        amount: 39.90,
        recipientName: 'Finanças Pro Invest',
        payerName: 'João Santos',
        bankOrigin: 'Itaú',
        bankDestination: 'Banco Bradesco',
        receiptDate: '2026-09-10',
        confidence: 0.98,
        status: 'pending_review',
        effectiveStatus: 'auto_confirmed', // Inércia de 3 dias transcorrida
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        hasReceiptImage: false,
      },
    ];

    vi.mocked(adminPixAuditService.fetchPixAuditQueue).mockResolvedValue(mockItems);

    render(<PixAuditQueueModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('R$ 19,90')).toBeInTheDocument();
      expect(screen.getByText('R$ 39,90')).toBeInTheDocument();
      expect(screen.getByText(/Efetivado por Inércia/i)).toBeInTheDocument();
      expect(screen.getByText('Confirmar Pagamento')).toBeInTheDocument();
      expect(screen.getAllByText('Revogar Assinatura').length).toBe(2);
    });
  });

  it('permite confirmar pagamento com um clique', async () => {
    const mockItems: adminPixAuditService.PixAuditItem[] = [
      {
        id: 'tx_pending_1',
        transactionId: 'tx_pending_1',
        userId: 'user_1',
        userEmail: 'cliente@teste.com',
        planId: 'pro_monthly',
        planName: 'Plano Pro Mensal',
        tier: 'pro',
        cycle: 'monthly',
        amount: 19.90,
        recipientName: 'Finanças Pro Invest',
        payerName: 'Maria Silva',
        bankOrigin: 'Nubank',
        bankDestination: 'Banco Bradesco',
        receiptDate: '2026-09-17',
        confidence: 0.99,
        status: 'pending_review',
        effectiveStatus: 'pending_review',
        createdAt: new Date().toISOString(),
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        hasReceiptImage: false,
      },
    ];

    vi.mocked(adminPixAuditService.fetchPixAuditQueue).mockResolvedValue(mockItems);
    vi.mocked(adminPixAuditService.executePixAuditDecision).mockResolvedValue({
      success: true,
      action: 'confirm',
      message: 'Confirmado com sucesso',
    });

    render(<PixAuditQueueModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Confirmar Pagamento')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirmar Pagamento'));

    await waitFor(() => {
      expect(adminPixAuditService.executePixAuditDecision).toHaveBeenCalledWith({
        transactionId: 'tx_pending_1',
        action: 'confirm',
      });
      expect(screen.getByText('Confirmado Manualmente')).toBeInTheDocument();
    });
  });
});
