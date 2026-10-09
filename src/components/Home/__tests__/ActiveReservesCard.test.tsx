import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActiveReservesCard from '../ActiveReservesCard';
import type { Goal } from '../../../services/goalService';

describe('ActiveReservesCard', () => {
  it('não deve renderizar nada se não houver metas de reserva', () => {
    const { container } = render(<ActiveReservesCard goals={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar a lista de reservas ativas corretamente', () => {
    const mockGoals: Goal[] = [
      {
        id: '1',
        userId: 'u1',
        title: 'Reserva: Fatura Jan',
        targetAmount: 1500,
        targetDate: '2026-05-30',
        ativa: true,
        type: 'nexus_reserve',
        valor: 1500,
        frequencia: 'mensal',
        dataInicio: {} as any,
        lembretes: {} as any,
        createdAt: {} as any,
        updatedAt: {} as any,
      }
    ];

    render(<ActiveReservesCard goals={mockGoals} />);
    
    expect(screen.getByText('Reservas Estratégicas')).toBeDefined();
    expect(screen.getByText('Reserva: Fatura Jan')).toBeDefined();
    expect(screen.getByText(/1.500,00/)).toBeDefined();
  });
});
