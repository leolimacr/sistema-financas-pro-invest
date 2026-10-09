import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RentVsFinanceTool } from '../RentVsFinanceTool';

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
    totalInvestments: 120000,
    patrimonioLiquido: 120000,
  }),
}));

vi.mock('../../../hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [
      { id: '1', tipo: 'despesa', descricao: 'Aluguel Apartamento', valor: 2800, data: '2026-08-05' },
      { id: '2', tipo: 'despesa', descricao: 'Aluguel Apartamento', valor: 2800, data: '2026-09-05' },
    ],
  }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-alugar-test-123' },
    userMeta: {},
    isAuthenticated: true,
  }),
}));

vi.mock('../buy-cash-or-installments/selicService', () => ({
  fetchCurrentSelicRate: vi.fn(() => Promise.resolve(10.75)),
}));

describe('RentVsFinanceTool — Ferramenta Soberana Alugar vs Comprar', () => {
  const onNavigateMock = vi.fn();
  const onCalcUpdateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os elementos soberanos da ferramenta e parâmetros iniciais', () => {
    render(
      <RentVsFinanceTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    expect(screen.getByText('Alugar vs Comprar Imóvel')).toBeInTheDocument();
    expect(
      screen.getByText('Simulador soberano de custo de oportunidade, juros, valorização e impostos.')
    ).toBeInTheDocument();
    expect(screen.getByText('Decisão Imobiliária Soberana')).toBeInTheDocument();
    expect(screen.getByText('Usar Meus Dados Reais do Finanças Pro')).toBeInTheDocument();
    expect(screen.getByText('SAC (Decrescente)')).toBeInTheDocument();
    expect(screen.getByText('PRICE (Parcelas Fixas)')).toBeInTheDocument();
  });

  it('sincroniza dados reais de patrimônio e despesas com aluguel do usuário', () => {
    render(
      <RentVsFinanceTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const syncBtn = screen.getByRole('button', { name: /sincronizar dados/i });
    fireEvent.click(syncBtn);

    expect(screen.getByText(/✓ Dados reais sincronizados do seu app:/i)).toBeInTheDocument();
    expect(screen.getByText(/120\.000 para entrada/i)).toBeInTheDocument();
    expect(screen.getByText(/aluguel detectado/i)).toBeInTheDocument();
  });

  it('calcula o veredito e exibe a evolução patrimonial e ponto de equilíbrio', () => {
    render(
      <RentVsFinanceTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    expect(screen.getByText(/Veredito em 30 anos/i)).toBeInTheDocument();
    expect(screen.getByText(/deixa você com mais patrimônio no final/i)).toBeInTheDocument();
    expect(screen.getByText('Se Alugar e Investir')).toBeInTheDocument();
    expect(screen.getByText('Se Comprar e Financiar')).toBeInTheDocument();
    expect(screen.getByText('Salvar Como Meta no Painel')).toBeInTheDocument();
  });

  it('permite alternar entre os sistemas de amortização SAC e PRICE', () => {
    render(
      <RentVsFinanceTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const priceBtn = screen.getByRole('button', { name: /price \(parcelas fixas\)/i });
    fireEvent.click(priceBtn);

    expect(screen.getByText(/Veredito em 30 anos • Tabela PRICE/i)).toBeInTheDocument();
  });

  it('permite alternar entre as abas de Gráfico, Tabela de Marcos e Fundamentos', () => {
    render(
      <RentVsFinanceTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    // Clica na Tabela
    const tableTab = screen.getByRole('button', { name: /tabela de marcos temporais/i });
    fireEvent.click(tableTab);

    expect(screen.getByText('Detalhamento dos Marcos Financeiros')).toBeInTheDocument();
    expect(screen.getByText('1º ano')).toBeInTheDocument();
    expect(screen.getByText('Saldo Devedor')).toBeInTheDocument();
    expect(screen.getByText('Vantagem Líquida')).toBeInTheDocument();

    // Clica em Fundamentos
    const learnTab = screen.getByRole('button', { name: /fundamentos da decisão/i });
    fireEvent.click(learnTab);

    expect(screen.getByText(/A Ilusão do "Aluguel é Dinheiro Jogado Fora"/i)).toBeInTheDocument();
  });

  it('redireciona para criação de meta com query parameters ao clicar em Salvar Como Meta no Painel', () => {
    render(
      <RentVsFinanceTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const saveGoalBtn = screen.getByRole('button', { name: /salvar como meta no painel/i });
    fireEvent.click(saveGoalBtn);

    expect(onNavigateMock).toHaveBeenCalledWith(expect.stringContaining('metas?action=new'));
  });
});
