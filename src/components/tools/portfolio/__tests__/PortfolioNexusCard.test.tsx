import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioNexusCard } from '../PortfolioNexusCard';
import type { PortfolioAdvisorInsight } from '../../../../core/portfolio/nexusPortfolioAdvisor';

describe('PortfolioNexusCard - Painel de Recomendações Estratégicas do Nexus', () => {
  const mockInsights: PortfolioAdvisorInsight[] = [
    {
      id: 'insight-1',
      severity: 'warning',
      category: 'CONCENTRATION',
      title: 'Concentração Elevada em VALE3',
      message: 'VALE3 representa 35% do patrimônio.',
      actionLabel: 'Ver Posição',
    },
    {
      id: 'insight-2',
      severity: 'action',
      category: 'OPPORTUNITY_CASH',
      title: 'Caixa Estratégico Disponível',
      message: 'Você possui R$ 5.000 em caixa.',
      actionLabel: 'Simular Rebalanceamento',
    },
  ];

  it('1. Não deve renderizar nada quando a lista de insights for vazia', () => {
    const { container } = render(<PortfolioNexusCard insights={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('2. Deve renderizar os cards de insights com severidade, título e mensagem', () => {
    render(<PortfolioNexusCard insights={mockInsights} />);

    expect(screen.getByTestId('portfolio-nexus-card')).toBeInTheDocument();
    expect(screen.getByText('Concentração Elevada em VALE3')).toBeInTheDocument();
    expect(screen.getByText('Caixa Estratégico Disponível')).toBeInTheDocument();
    expect(screen.getByText('VALE3 representa 35% do patrimônio.')).toBeInTheDocument();
  });

  it('3. Deve permitir dispensar um insight individualmente ao clicar no botão X', () => {
    render(<PortfolioNexusCard insights={mockInsights} />);

    expect(screen.getByText('Concentração Elevada em VALE3')).toBeInTheDocument();

    const dismissBtns = screen.getAllByTitle('Dispensar aviso');
    fireEvent.click(dismissBtns[0]); // Dispensa o primeiro

    expect(screen.queryByText('Concentração Elevada em VALE3')).not.toBeInTheDocument();
    expect(screen.getByText('Caixa Estratégico Disponível')).toBeInTheDocument();
  });

  it('4. Deve disparar onOpenSimulator ao clicar na ação de rebalanceamento', () => {
    const handleSimulator = vi.fn();
    render(
      <PortfolioNexusCard
        insights={mockInsights}
        onOpenSimulator={handleSimulator}
      />
    );

    const actionBtn = screen.getByRole('button', { name: /simular rebalanceamento/i });
    fireEvent.click(actionBtn);
    expect(handleSimulator).toHaveBeenCalledTimes(1);
  });

  it('5. Deve disparar onNavigateToReserve ao clicar em Ver Reserva (LIQUIDITY_SHIELD)', () => {
    const handleReserve = vi.fn();
    const reserveInsight: PortfolioAdvisorInsight[] = [
      {
        id: 'insight-liquidity-shield-reserve',
        severity: 'warning',
        category: 'LIQUIDITY_SHIELD',
        title: 'Reserva de Emergência Vulnerável',
        message: 'Sua reserva está abaixo da margem recomendada.',
        actionLabel: 'Ver Reserva',
      },
    ];

    render(
      <PortfolioNexusCard
        insights={reserveInsight}
        onNavigateToReserve={handleReserve}
      />
    );

    const actionBtn = screen.getByRole('button', { name: /ver reserva/i });
    fireEvent.click(actionBtn);
    expect(handleReserve).toHaveBeenCalledTimes(1);
  });

  it('6. Deve disparar onNavigateToCentral ao clicar em Ver Central (LIQUIDITY_SHIELD deficitário)', () => {
    const handleCentral = vi.fn();
    const centralInsight: PortfolioAdvisorInsight[] = [
      {
        id: 'insight-liquidity-shield-negative',
        severity: 'warning',
        category: 'LIQUIDITY_SHIELD',
        title: 'Blindagem de Liquidez: Saldo Livre Deficitário',
        message: 'Seu saldo livre está deficitário.',
        actionLabel: 'Ver Central',
      },
    ];

    render(
      <PortfolioNexusCard
        insights={centralInsight}
        onNavigateToCentral={handleCentral}
      />
    );

    const actionBtn = screen.getByRole('button', { name: /ver central/i });
    fireEvent.click(actionBtn);
    expect(handleCentral).toHaveBeenCalledTimes(1);
  });

  it('7. Deve disparar onOpenPositionDetails ao clicar em Ver Posição (CONCENTRATION)', () => {
    const handleDetails = vi.fn();
    const concentrationInsight: PortfolioAdvisorInsight[] = [
      {
        id: 'insight-concentration-vale-123',
        severity: 'warning',
        category: 'CONCENTRATION',
        title: 'Concentração Elevada em VALE3',
        message: 'VALE3 representa 35% do patrimônio.',
        actionLabel: 'Ver Posição',
        actionPayload: { assetId: 'vale-123' },
      },
    ];

    render(
      <PortfolioNexusCard
        insights={concentrationInsight}
        onOpenPositionDetails={handleDetails}
      />
    );

    const actionBtn = screen.getByRole('button', { name: /ver posição/i });
    fireEvent.click(actionBtn);
    expect(handleDetails).toHaveBeenCalledWith('vale-123');
  });
});
