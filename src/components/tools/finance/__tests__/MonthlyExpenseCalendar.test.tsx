import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthlyExpenseCalendar } from '../calendar/MonthlyExpenseCalendar';
import type { Transaction } from '../../../../types';

const mockTransactions: Transaction[] = [
  {
    id: 't-1',
    userId: 'u1',
    type: 'expense',
    date: '2026-09-10',
    description: 'Supermercado Central',
    category: 'Alimentação',
    amount: 154.3,
    paymentMethod: 'money',
  },
  {
    id: 't-2',
    userId: 'u1',
    type: 'expense',
    date: '2026-09-10',
    description: 'Farmácia Popular',
    category: 'Saúde',
    amount: 45.7,
    paymentMethod: 'credit',
  },
  {
    id: 't-3',
    userId: 'u1',
    type: 'expense',
    date: '2026-09-22',
    description: 'Combustível',
    category: 'Transporte',
    amount: 220,
    paymentMethod: 'credit',
  },
  {
    id: 't-4',
    userId: 'u1',
    type: 'income',
    date: '2026-09-05',
    description: 'Salário',
    category: 'Renda',
    amount: 5000,
  },
  {
    id: 't-5',
    userId: 'u1',
    type: 'expense',
    date: '2026-08-15',
    description: 'Restaurante Agosto',
    category: 'Alimentação',
    amount: 90,
  },
];

describe('MonthlyExpenseCalendar', () => {
  it('renderiza o cabeçalho com o mês e o total consolidado de saídas', () => {
    render(
      <MonthlyExpenseCalendar
        transactions={mockTransactions}
        initialMonthKey="2026-09"
      />
    );

    // Título do mês
    const heading = screen.getByTestId('calendar-month-heading');
    expect(heading.textContent?.toLowerCase()).toContain('setembro');
    expect(heading.textContent).toContain('2026');

    // Total de saídas do mês: 154.30 + 45.70 + 220 = 420.00 (Salário e gasto de agosto ignorados)
    const monthTotal = screen.getByTestId('calendar-month-total');
    expect(monthTotal.textContent).toContain('420,00');
  });

  it('exibe o valor gasto nos quadradinhos dos dias com saídas', () => {
    render(
      <MonthlyExpenseCalendar
        transactions={mockTransactions}
        initialMonthKey="2026-09"
      />
    );

    // Dia 10 teve duas compras que somam 200,00
    const day10Amount = screen.getByTestId('day-amount-2026-09-10');
    expect(day10Amount.textContent).toContain('200,00');

    // Dia 22 teve combustível de 220,00
    const day22Amount = screen.getByTestId('day-amount-2026-09-22');
    expect(day22Amount.textContent).toContain('220,00');
  });

  it('navega para o mês anterior e próximo através das setas', () => {
    const onMonthChange = vi.fn();
    render(
      <MonthlyExpenseCalendar
        transactions={mockTransactions}
        initialMonthKey="2026-09"
        onMonthChange={onMonthChange}
      />
    );

    const prevButton = screen.getByLabelText('Mês anterior');
    fireEvent.click(prevButton);

    expect(onMonthChange).toHaveBeenCalledWith('2026-08');
    const heading = screen.getByTestId('calendar-month-heading');
    expect(heading.textContent?.toLowerCase()).toContain('agosto');

    // Em agosto, tínhamos o gasto de 90,00
    const monthTotalAug = screen.getByTestId('calendar-month-total');
    expect(monthTotalAug.textContent).toContain('90,00');

    // Avança de volta para setembro
    const nextButton = screen.getByLabelText('Próximo mês');
    fireEvent.click(nextButton);
    expect(onMonthChange).toHaveBeenCalledWith('2026-09');
  });

  it('ao clicar em um dia, abre o modal com a lista de despesas e o total do dia logo abaixo', () => {
    const onEdit = vi.fn();
    render(
      <MonthlyExpenseCalendar
        transactions={mockTransactions}
        initialMonthKey="2026-09"
        onEditTransaction={onEdit}
      />
    );

    // Clica no quadradinho do dia 10
    const day10Cell = screen.getByTestId('calendar-cell-2026-09-10');
    fireEvent.click(day10Cell);

    // Modal aberto
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Supermercado Central')).toBeInTheDocument();
    expect(screen.getByText('Farmácia Popular')).toBeInTheDocument();

    // Valor total do dia destacado logo abaixo
    const dayTotal = screen.getByTestId('day-total-amount');
    expect(dayTotal.textContent).toContain('200,00');

    // Fecha o modal pelo botão X do topo
    const closeBtn = screen.getByLabelText('Fechar detalhamento do dia');
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('respeita o modo de privacidade mascarando os valores como ••••••', () => {
    render(
      <MonthlyExpenseCalendar
        transactions={mockTransactions}
        initialMonthKey="2026-09"
        isPrivacyMode={true}
      />
    );

    const monthTotal = screen.getByTestId('calendar-month-total');
    expect(monthTotal.textContent).toBe('••••••');

    const day10Amount = screen.getByTestId('day-amount-2026-09-10');
    expect(day10Amount.textContent).toBe('••••••');

    const mobileDay10Amount = screen.getByTestId('mobile-day-amount-2026-09-10');
    expect(mobileDay10Amount.textContent).toBe('••••');
  });

  it('renderiza visualização compacta inteligente para mobile sem truncamento', () => {
    render(
      <MonthlyExpenseCalendar
        transactions={mockTransactions}
        initialMonthKey="2026-09"
      />
    );

    // No mobile, dia 10 soma 200,00 -> prefixo R$ e valor 200
    const mobileDay10 = screen.getByTestId('mobile-day-amount-2026-09-10');
    expect(mobileDay10.textContent).toContain('R$');
    expect(mobileDay10.textContent).toContain('200');

    // No mobile, dia 22 soma 220,00 -> prefixo R$ e valor 220
    const mobileDay22 = screen.getByTestId('mobile-day-amount-2026-09-22');
    expect(mobileDay22.textContent).toContain('R$');
    expect(mobileDay22.textContent).toContain('220');
  });

  it('permite alternar para a visão de Agenda no mobile e navegar pelas despesas', () => {
    render(
      <MonthlyExpenseCalendar
        transactions={mockTransactions}
        initialMonthKey="2026-09"
      />
    );

    // Botão de Agenda do seletor mobile
    const agendaBtn = screen.getByTestId('calendar-view-mode-agenda');
    fireEvent.click(agendaBtn);

    // Visão de Agenda visível com os dias com gastos
    const agendaView = screen.getByTestId('calendar-agenda-view');
    expect(agendaView).toBeInTheDocument();

    // Dias com gastos na agenda (dia 10 e dia 22)
    const day10Agenda = screen.getByTestId('agenda-day-2026-09-10');
    expect(day10Agenda).toBeInTheDocument();
    expect(day10Agenda.textContent).toContain('Supermercado Central');
    expect(day10Agenda.textContent).toContain('Farmácia Popular');

    const day22Agenda = screen.getByTestId('agenda-day-2026-09-22');
    expect(day22Agenda).toBeInTheDocument();
    expect(day22Agenda.textContent).toContain('Combustível');

    // Clica no card do dia 10 na agenda e abre o modal de detalhamento
    const day10Header = day10Agenda.querySelector('button');
    expect(day10Header).not.toBeNull();
    fireEvent.click(day10Header!);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('day-total-amount').textContent).toContain('200,00');

    // Fecha o modal
    const closeBtn = screen.getByLabelText('Fechar detalhamento do dia');
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Alterna de volta para a visão de grade
    const gridBtn = screen.getByTestId('calendar-view-mode-grid');
    fireEvent.click(gridBtn);
    expect(screen.queryByTestId('calendar-agenda-view')).not.toBeInTheDocument();
  });
});
