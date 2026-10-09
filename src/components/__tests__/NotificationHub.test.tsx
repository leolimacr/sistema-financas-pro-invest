import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationHub, { formatNotificationDateTime } from '../NotificationHub';
import type { NexusEvent } from '../../contexts/NotificationContext';

const mockDismiss = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockLoadMoreHistory = vi.fn();
let mockUnreadEvents: NexusEvent[] = [];
let mockHistoryEvents: NexusEvent[] = [];

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => ({
    unreadEvents: mockUnreadEvents,
    historyEvents: mockHistoryEvents,
    dismiss: mockDismiss,
    markAllAsRead: mockMarkAllAsRead,
    loadMoreHistory: mockLoadMoreHistory,
    hasMoreHistory: false,
    loading: false,
  }),
}));

describe('NotificationHub - Data/Hora e Confirmação de Leitura (Ciente)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnreadEvents = [];
    mockHistoryEvents = [];
  });

  describe('formatNotificationDateTime', () => {
    it('formata corretamente Timestamp do Firestore com toDate()', () => {
      const mockTimestamp = {
        toDate: () => new Date(2026, 8, 14, 15, 45), // 14 de Setembro de 2026 às 15:45
      };
      const result = formatNotificationDateTime(mockTimestamp);
      expect(result).toBe('14/09/2026 às 15:45');
    });

    it('formata corretamente Timestamp com seconds numérico', () => {
      // 14/09/2026 12:00 UTC = 1789387200 s
      const date = new Date(2026, 8, 14, 10, 30);
      const mockTimestamp = {
        seconds: Math.floor(date.getTime() / 1000),
      };
      const result = formatNotificationDateTime(mockTimestamp);
      expect(result).toBe('14/09/2026 às 10:30');
    });

    it('formata corretamente string ISO e Date nativo', () => {
      const date = new Date(2026, 0, 5, 9, 5); // 05/01/2026 às 09:05
      const resultDate = formatNotificationDateTime(date);
      expect(resultDate).toBe('05/01/2026 às 09:05');

      const resultIso = formatNotificationDateTime(date.toISOString());
      expect(resultIso).toBe('05/01/2026 às 09:05');
    });

    it('retorna string vazia para valores nulos, vazios ou inválidos', () => {
      expect(formatNotificationDateTime(null)).toBe('');
      expect(formatNotificationDateTime(undefined)).toBe('');
      expect(formatNotificationDateTime('data_invalida')).toBe('');
    });
  });

  describe('Renderização e Interação de Notificações', () => {
    const sampleEvent: NexusEvent = {
      id: 'event-1',
      eventType: 'system.announcement',
      channel: 'in_app',
      urgency: 'high',
      urgencyScore: 3,
      read: false,
      createdAt: new Date(2026, 8, 14, 14, 30),
      message: {
        title: 'Comunicado Importante',
        body: 'Atenção aos novos relatórios de fechamento mensal.',
      },
    };

    it('não renderiza o modal quando isOpen é false', () => {
      render(
        <NotificationHub
          isOpen={false}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      );
      expect(screen.queryByText('Comunicado Importante')).not.toBeInTheDocument();
    });

    it('exibe data/hora de envio e botão "Ciente do comunicado" na aba Entrada', () => {
      mockUnreadEvents = [sampleEvent];

      render(
        <NotificationHub
          isOpen={true}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      );

      // Verifica título e mensagem
      expect(screen.getByText('Comunicado Importante')).toBeInTheDocument();
      expect(screen.getByText('Atenção aos novos relatórios de fechamento mensal.')).toBeInTheDocument();

      // Verifica data e hora formatada com prefixo "Enviado em"
      expect(screen.getByText('Enviado em 14/09/2026 às 14:30')).toBeInTheDocument();

      // Verifica presença do botão explícito "Ciente do comunicado"
      const acknowledgeButton = screen.getByRole('button', { name: /ciente do comunicado/i });
      expect(acknowledgeButton).toBeInTheDocument();
    });

    it('chama dismiss(id) ao clicar em "Ciente do comunicado"', () => {
      mockUnreadEvents = [sampleEvent];

      render(
        <NotificationHub
          isOpen={true}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      );

      const acknowledgeButton = screen.getByRole('button', { name: /ciente do comunicado/i });
      fireEvent.click(acknowledgeButton);

      expect(mockDismiss).toHaveBeenCalledTimes(1);
      expect(mockDismiss).toHaveBeenCalledWith('event-1');
    });

    it('exibe o selo "Ciente do comunicado" nas mensagens lidas na aba Histórico', () => {
      const readEvent: NexusEvent = {
        ...sampleEvent,
        id: 'event-hist-1',
        read: true,
        readAt: '2026-09-14T14:35:00.000Z',
      };
      mockHistoryEvents = [readEvent];

      render(
        <NotificationHub
          isOpen={true}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      );

      // Alterna para a aba Histórico
      const historyTab = screen.getByRole('button', { name: /^histórico$/i });
      fireEvent.click(historyTab);

      // Verifica que o card no histórico exibe a notificação e o selo de confirmação
      expect(screen.getByText('Comunicado Importante')).toBeInTheDocument();
      expect(screen.getByText('Enviado em 14/09/2026 às 14:30')).toBeInTheDocument();
      
      // Deve exibir o badge/selo de ciência
      const badge = screen.getByText('Ciente do comunicado');
      expect(badge).toBeInTheDocument();

      // Não deve ter botão interativo de confirmação na aba histórico
      expect(screen.queryByRole('button', { name: /ciente do comunicado/i })).not.toBeInTheDocument();
    });

    it('ao clicar no card da notificação da agenda, conduz para /app/agenda e fecha o hub', () => {
      const agendaEvent: NexusEvent = {
        id: 'event-agenda-1',
        eventType: 'agenda.alarm_due',
        channel: 'in_app',
        urgency: 'high',
        urgencyScore: 3,
        read: false,
        deepLink: 'agenda',
        createdAt: new Date(2026, 8, 14, 14, 30),
        message: {
          title: 'Lembrete da Agenda',
          body: 'Reunião de alinhamento financeiro às 15h.',
        },
      };
      mockUnreadEvents = [agendaEvent];
      const mockNavigate = vi.fn();
      const mockClose = vi.fn();

      render(
        <NotificationHub
          isOpen={true}
          onClose={mockClose}
          onNavigate={mockNavigate}
        />
      );

      const card = screen.getByText('Lembrete da Agenda');
      fireEvent.click(card);

      expect(mockNavigate).toHaveBeenCalledWith('/app/agenda');
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('ao clicar no card de despesa sem deepLink explícito, deduz /app/controla', () => {
      const expenseEvent: NexusEvent = {
        id: 'event-expense-1',
        eventType: 'finance.recurring_bill_due_today',
        channel: 'in_app',
        urgency: 'high',
        urgencyScore: 3,
        read: false,
        createdAt: new Date(2026, 8, 14, 14, 30),
        message: {
          title: 'Internet vence hoje',
          body: 'Conta de internet a vencer.',
        },
      };
      mockUnreadEvents = [expenseEvent];
      const mockNavigate = vi.fn();
      const mockClose = vi.fn();

      render(
        <NotificationHub
          isOpen={true}
          onClose={mockClose}
          onNavigate={mockNavigate}
        />
      );

      const card = screen.getByText('Internet vence hoje');
      fireEvent.click(card);

      expect(mockNavigate).toHaveBeenCalledWith('/app/controla');
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
