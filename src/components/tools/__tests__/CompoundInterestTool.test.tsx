import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompoundInterestTool } from '../CompoundInterestTool';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock dos hooks do ecossistema
vi.mock('../../../hooks/useWealthData', () => ({
  useWealthData: () => ({
    totalInvestments: 50000,
    patrimonioLiquido: 50000,
  }),
}));

vi.mock('../../../hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [
      { id: '1', tipo: 'receita', valor: 8000, data: '2026-08-01' },
      { id: '2', tipo: 'despesa', valor: 5000, data: '2026-08-10' },
      { id: '3', tipo: 'receita', valor: 8000, data: '2026-09-01' },
      { id: '4', tipo: 'despesa', valor: 5000, data: '2026-09-10' },
    ],
  }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-juros-test-123' },
    userMeta: {},
    isAuthenticated: true,
  }),
}));

describe('CompoundInterestTool — Reformulação Soberana da Calculadora de Juros Compostos', () => {
  const onNavigateMock = vi.fn();
  const onCalcUpdateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os elementos soberanos da ferramenta e banner de sincronização', () => {
    render(
      <CompoundInterestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    expect(screen.getByText('Calculadora de Juros Compostos')).toBeInTheDocument();
    expect(
      screen.getByText('O poder da multiplicação patrimonial pelo tempo e pelos juros.')
    ).toBeInTheDocument();
    expect(screen.getByText('Efeito Bola de Neve')).toBeInTheDocument();
    expect(screen.getByText('Usar Meus Dados Reais do Finanças Pro')).toBeInTheDocument();
    expect(screen.getByText('Poupança (6.17% a.a.)')).toBeInTheDocument();
    expect(screen.getByText('Selic / 100% CDI (10.75% a.a.)')).toBeInTheDocument();
  });

  it('sincroniza dados reais ao clicar em Usar Meus Dados Reais', () => {
    render(
      <CompoundInterestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const syncBtn = screen.getByRole('button', { name: /usar meus dados reais/i });
    fireEvent.click(syncBtn);

    expect(screen.getByText(/✓ Dados reais sincronizados do seu app:/i)).toBeInTheDocument();
    expect(screen.getByText(/50\.000,00 em investimentos/i)).toBeInTheDocument();
  });

  it('executa cálculo completo com Ponto de Virada, Poder Real (IPCA) e Sensibilidade', () => {
    render(
      <CompoundInterestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    // Preenche Aporte Inicial: R$ 5.000
    const inputs = screen.getAllByRole('textbox');
    // Input 0: Aporte Inicial
    fireEvent.change(inputs[0], { target: { value: '500000' } }); // 5000.00
    // Input 1: Aporte Mensal
    fireEvent.change(inputs[1], { target: { value: '50000' } }); // 500.00

    // Clica em CALCULAR
    const calcBtn = screen.getByRole('button', { name: /calcular multiplicação/i });
    fireEvent.click(calcBtn);

    // Verifica bloco de resultados
    expect(screen.getByText('Patrimônio Bruto Acumulado')).toBeInTheDocument();
    expect(screen.getByText('120 meses')).toBeInTheDocument();
    expect(screen.getByText('Total do Seu Bolso')).toBeInTheDocument();
    expect(screen.getByText('Lucro em Juros')).toBeInTheDocument();
    expect(screen.getByText('Multiplicador de Capital')).toBeInTheDocument();
    expect(screen.getByText('O Efeito Bola de Neve (Ponto de Virada)')).toBeInTheDocument();
    expect(screen.getByText(/O Impacto de Render Apenas 1% ou 2% a Mais/i)).toBeInTheDocument();
  });

  it('permite alternar entre Visão Anual e Visão Mensal na tabela', () => {
    render(
      <CompoundInterestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    // Preenche e calcula
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '100000' } });
    fireEvent.change(inputs[1], { target: { value: '20000' } });

    const calcBtn = screen.getByRole('button', { name: /calcular multiplicação/i });
    fireEvent.click(calcBtn);

    // Clica na aba Tabela de Crescimento
    const tableTab = screen.getByRole('button', { name: /tabela de crescimento/i });
    fireEvent.click(tableTab);

    // Por padrão está na Visão Anual
    expect(screen.getByText('Visão Anual (Consolidada)')).toBeInTheDocument();
    expect(screen.getByText('Ano 1')).toBeInTheDocument();

    // Alterna para Visão Mensal
    const monthlyToggle = screen.getByRole('button', { name: /visão mensal \(completa\)/i });
    fireEvent.click(monthlyToggle);

    expect(screen.getByText('Mês 1 (Ano 1)')).toBeInTheDocument();
  });

  it('redireciona para criação de meta com query parameters ao clicar em Salvar Meta no App', () => {
    render(
      <CompoundInterestTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '100000' } });
    fireEvent.change(inputs[1], { target: { value: '50000' } });

    const calcBtn = screen.getByRole('button', { name: /calcular multiplicação/i });
    fireEvent.click(calcBtn);

    const saveGoalBtn = screen.getByRole('button', { name: /salvar meta no app/i });
    fireEvent.click(saveGoalBtn);

    expect(onNavigateMock).toHaveBeenCalledTimes(1);
    expect(onNavigateMock.mock.calls[0][0]).toContain('metas?action=new');
    expect(onNavigateMock.mock.calls[0][0]).toContain('Ac%C3%BAmulo%20de%20Patrim%C3%B4nio');
  });
});
