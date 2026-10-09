import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DividendsTool } from '../DividendsTool';

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
    user: { uid: 'user-dividendos-test-123' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../hooks/useWealthData', () => ({
  useWealthData: () => ({
    totalInvestments: 85000,
    patrimonioLiquido: 85000,
  }),
}));

vi.mock('../../../hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [
      { id: '1', tipo: 'despesa', valor: 4500, descricao: 'Contas do mês' },
      { id: '2', tipo: 'despesa', valor: 4200, descricao: 'Despesas gerais' },
    ],
  }),
}));

describe('DividendsTool — Simulador Soberano de Dividendos', () => {
  const onNavigateMock = vi.fn();
  const onCalcUpdateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os elementos soberanos da ferramenta e projeção da Bola de Neve', () => {
    render(
      <DividendsTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    expect(screen.getByText('Simulador de Dividendos')).toBeInTheDocument();
    expect(
      screen.getByText(/Projete o crescimento exponencial da sua renda passiva/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Efeito Bola de Neve')).toBeInTheDocument();
    expect(screen.getByText('Meta de Salário Passivo')).toBeInTheDocument();
    expect(screen.getByText('Salário Vitalício Projetado')).toBeInTheDocument();
  });

  it('permite alternar para o modo Meta de Salário Passivo', () => {
    render(
      <DividendsTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const targetModeBtn = screen.getByRole('button', { name: /meta de salário passivo/i });
    fireEvent.click(targetModeBtn);

    expect(screen.getByText('Renda Mensal Desejada')).toBeInTheDocument();
    expect(screen.getByText('Patrimônio Necessário')).toBeInTheDocument();
  });

  it('aplica presets de mercado para FIIs e Ações com 1 clique', () => {
    render(
      <DividendsTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const fiiPresetBtn = screen.getByRole('button', { name: /fiis \(9,5% a\.a\.\)/i });
    fireEvent.click(fiiPresetBtn);

    const yieldInput = screen.getByPlaceholderText('Ex: 8.5') as HTMLInputElement;
    expect(yieldInput.value).toBe('9.5');
  });

  it('sincroniza dados reais de patrimônio e despesas do usuário', () => {
    render(
      <DividendsTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const syncBtn = screen.getByRole('button', { name: /usar meus dados reais/i });
    fireEvent.click(syncBtn);

    expect(
      screen.getByText(/Dados reais de patrimônio e orçamento sincronizados com sucesso!/i)
    ).toBeInTheDocument();
    const capitalInput = screen.getByPlaceholderText('Ex: 50000') as HTMLInputElement;
    expect(capitalInput.value).toBe('85.000,00');
  });

  it('permite alternar entre as abas de Gráfico, Tabela, Marcos e Estratégia', () => {
    render(
      <DividendsTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    // Clica na Tabela
    const tableTab = screen.getByRole('button', { name: /tabela cronológica/i });
    fireEvent.click(tableTab);

    expect(screen.getByText('Cronograma de Crescimento da Renda Passiva')).toBeInTheDocument();
    expect(screen.getByText('Aportes do Bolso')).toBeInTheDocument();
    expect(screen.getByText('Proventos no Ano')).toBeInTheDocument();

    // Clica em Marcos
    const milestonesTab = screen.getByRole('button', { name: /marcos de cobertura/i });
    fireEvent.click(milestonesTab);

    expect(screen.getByText('Régua de Conquistas de Renda Passiva')).toBeInTheDocument();
    expect(screen.getByText('Contas Básicas (Energia e Água)')).toBeInTheDocument();
    expect(screen.getByText('Supermercado Essencial')).toBeInTheDocument();

    // Clica em Estratégia
    const fundamentalsTab = screen.getByRole('button', { name: /estratégia previdenciária/i });
    fireEvent.click(fundamentalsTab);

    expect(screen.getByText('O Método Barsi de Previdência')).toBeInTheDocument();
    expect(screen.getByText('Fundos Imobiliários (FIIs)')).toBeInTheDocument();
  });

  it('redireciona para criação de meta com query parameters ao clicar em Salvar como Meta', () => {
    render(
      <DividendsTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const saveGoalBtn = screen.getByRole('button', { name: /salvar como meta de renda passiva/i });
    fireEvent.click(saveGoalBtn);

    expect(onNavigateMock).toHaveBeenCalledWith(expect.stringContaining('metas?action=new'));
  });
});
