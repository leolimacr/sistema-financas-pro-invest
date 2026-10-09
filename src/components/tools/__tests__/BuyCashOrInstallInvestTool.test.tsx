import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BuyCashOrInstallInvestTool from '../buy-cash-or-installments/BuyCashOrInstallInvestTool';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock dos hooks do ecossistema
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-parcelado-test-123' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../hooks/useWealthData', () => ({
  useWealthData: () => ({
    totalInvestments: 25000,
    patrimonioLiquido: 25000,
  }),
}));

vi.mock('../buy-cash-or-installments/selicService', () => ({
  fetchCurrentSelicRate: vi.fn(() => Promise.resolve(10.75)),
}));

describe('BuyCashOrInstallInvestTool — Ferramenta Soberana À Vista ou Parcelado', () => {
  const onNavigateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os elementos soberanos da ferramenta e veredito inicial', () => {
    render(
      <BuyCashOrInstallInvestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
      />
    );

    expect(screen.getByText('À Vista ou Parcelado')).toBeInTheDocument();
    expect(
      screen.getByText(/Compare pagar à vista com desconto ou parcelar no cartão/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Dados da Oferta de Compra')).toBeInTheDocument();
    expect(screen.getByText('Veredito Soberano da Decisão')).toBeInTheDocument();
  });

  it('permite alternar entre o modo básico e modo avançado', () => {
    render(
      <BuyCashOrInstallInvestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
      />
    );

    const advancedBtn = screen.getByRole('button', { name: /abrir modo avançado/i });
    fireEvent.click(advancedBtn);

    expect(screen.getByText('Parâmetros Econômicos Avançados')).toBeInTheDocument();
    expect(screen.getByText(/Rentabilidade Líquida \(% a\.a\.\)/i)).toBeInTheDocument();
  });

  it('permite consultar a reserva de liquidez do usuário', () => {
    render(
      <BuyCashOrInstallInvestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
      />
    );

    const checkLiquidityBtn = screen.getByRole('button', { name: /consultar minha reserva/i });
    fireEvent.click(checkLiquidityBtn);

    expect(screen.getByTestId('sync-notice')).toBeInTheDocument();
    expect(screen.getByText(/Você possui R\$\s*25\.000,00 em investimentos\/reserva/i)).toBeInTheDocument();
  });

  it('permite alternar entre as abas de Gráfico, Cronograma Mês a Mês e Estratégia', () => {
    render(
      <BuyCashOrInstallInvestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
      />
    );

    // Clica no Cronograma
    const scheduleTab = screen.getByRole('button', { name: /cronograma mês a mês/i });
    fireEvent.click(scheduleTab);

    expect(screen.getByText('Cronograma Detalhado da Aplicação vs. Parcelas')).toBeInTheDocument();
    expect(screen.getByText('Saldo Aplicado Inicial')).toBeInTheDocument();
    expect(screen.getByText('Rendimento Líquido (Mês)')).toBeInTheDocument();

    // Clica em Estratégia
    const fundamentalsTab = screen.getByRole('button', { name: /estratégia & quando parcelar/i });
    fireEvent.click(fundamentalsTab);

    expect(screen.getByText('A Regra de Ouro da Disciplina')).toBeInTheDocument();
    expect(screen.getByText('O Mito do "Sem Juros"')).toBeInTheDocument();
    expect(screen.getByText('Tabela Regressiva do IR')).toBeInTheDocument();
  });

  it('redireciona para criação de meta com query parameters ao clicar em Salvar Vantagem como Meta', () => {
    render(
      <BuyCashOrInstallInvestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
      />
    );

    const saveGoalBtn = screen.getByRole('button', { name: /salvar vantagem como meta no painel/i });
    fireEvent.click(saveGoalBtn);

    expect(onNavigateMock).toHaveBeenCalledWith(expect.stringContaining('metas?action=new'));
  });
});
