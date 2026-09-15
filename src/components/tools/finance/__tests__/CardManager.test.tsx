import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CardManager from '../CardManager';
import * as cardService from '../../../../services/cardService';
import type { CreditCard } from '../../../../types';

vi.mock('../../../../services/cardService', () => ({
  getCards: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  addCard: vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

describe('CardManager - Confirmação ao Ocultar Cartão', () => {
  const mockCards: CreditCard[] = [
    {
      id: 'card-1',
      name: 'Nubank Ultravioleta',
      type: 'credit',
      limit: 5000,
      closingDay: 5,
      dueDay: 12,
      isActive: true,
      saldoUtilizadoTotal: 1200,
    },
    {
      id: 'card-2',
      name: 'Cartão Antigo',
      type: 'credit',
      limit: 1000,
      closingDay: 10,
      dueDay: 17,
      isActive: false,
      saldoUtilizadoTotal: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cardService.getCards).mockResolvedValue([...mockCards]);
    vi.mocked(cardService.updateCard).mockResolvedValue(undefined);
  });

  it('exibe confirmação com orientação sobre a aba Ocultos e não oculta se usuário cancelar', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <CardManager
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
        transactions={[]}
        onEditTransaction={vi.fn()}
      />
    );

    // Aguarda carregar cartões
    await waitFor(() => {
      expect(screen.getByText('Nubank Ultravioleta')).toBeInTheDocument();
    });

    const hideButton = screen.getByTitle(/Ocultar Cartão/i);
    expect(hideButton).toBeInTheDocument();

    fireEvent.click(hideButton);

    // 1. Confirmação disparada com pergunta e menção à aba Ocultos
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Deseja realmente ocultar o cartão "Nubank Ultravioleta".*Ocultos/s)
    );

    // 2. Como o usuário cancelou, updateCard NÃO deve ter sido chamado
    expect(cardService.updateCard).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('oculta o cartão quando o usuário confirmar na caixa de diálogo', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <CardManager
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
        transactions={[]}
        onEditTransaction={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Nubank Ultravioleta')).toBeInTheDocument();
    });

    const hideButton = screen.getByTitle(/Ocultar Cartão/i);
    fireEvent.click(hideButton);

    expect(confirmSpy).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(cardService.updateCard).toHaveBeenCalledWith('user-123', 'card-1', {
        isActive: false,
      });
    });

    confirmSpy.mockRestore();
  });

  it('reativa o cartão na aba Ocultos sem solicitar confirmação de ocultar', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(
      <CardManager
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
        transactions={[]}
        onEditTransaction={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Nubank Ultravioleta')).toBeInTheDocument();
    });

    // Clica na aba "Ocultos"
    const hiddenTabButton = screen.getByRole('button', { name: /^Ocultos$/i });
    fireEvent.click(hiddenTabButton);

    await waitFor(() => {
      expect(screen.getByText('Cartão Antigo')).toBeInTheDocument();
    });

    const reactivateButton = screen.getByRole('button', { name: /Reativar Cartão/i });
    fireEvent.click(reactivateButton);

    // Reativação direta sem confirmação de ocultação
    expect(confirmSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(cardService.updateCard).toHaveBeenCalledWith('user-123', 'card-2', {
        isActive: true,
      });
    });

    confirmSpy.mockRestore();
  });
});
