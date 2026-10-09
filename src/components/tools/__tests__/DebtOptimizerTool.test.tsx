import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DebtOptimizerTool } from '../DebtOptimizerTool';

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
    user: { uid: 'user-dividas-test-123' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../hooks/useDebts', () => ({
  useDebts: () => ({
    debts: [
      {
        id: 'debt-caixa-1',
        nome: 'Financiamento Imobiliário Caixa',
        tipo: 'financiamento',
        saldoDevedor: 120000,
        taxaMensal: 0.85,
        parcelasRestantes: 180,
        valorParcela: 1450,
      },
      {
        id: 'debt-cartao-2',
        nome: 'Cartão de Crédito Nubank',
        tipo: 'cartao',
        saldoDevedor: 5000,
        taxaMensal: 12.0,
        parcelasRestantes: 0,
        valorParcela: 600,
      },
    ],
    isLoading: false,
  }),
}));

describe('DebtOptimizerTool — Calculadora Soberana de Dívidas', () => {
  const onNavigateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renderiza os elementos soberanos da ferramenta e parâmetros iniciais', () => {
    render(<DebtOptimizerTool isAuthenticated={true} onNavigate={onNavigateMock} />);

    expect(screen.getByText('Calculadora de Dívidas')).toBeInTheDocument();
    expect(
      screen.getByText(/Descubra o melhor caminho para quitar seus débitos/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Importar Minhas Dívidas Reais')).toBeInTheDocument();
    expect(screen.getByText('Financiamento Imobiliário Caixa')).toBeInTheDocument();
    expect(screen.getByText('Cartão de Crédito Nubank')).toBeInTheDocument();
  });

  it('sincroniza dados de uma dívida cadastrada real ao clicar no card de importação', () => {
    render(<DebtOptimizerTool isAuthenticated={true} onNavigate={onNavigateMock} />);

    const debtCard = screen.getByText('Financiamento Imobiliário Caixa');
    fireEvent.click(debtCard);

    expect(
      screen.getByText(/Dívida "Financiamento Imobiliário Caixa" importada com sucesso do seu painel!/i)
    ).toBeInTheDocument();
  });

  it('permite alternar entre os sistemas de amortização Price e SAC', () => {
    render(<DebtOptimizerTool isAuthenticated={true} onNavigate={onNavigateMock} />);

    const sacBtn = screen.getByRole('button', { name: /sistema sac/i });
    fireEvent.click(sacBtn);

    const calcBtn = screen.getByRole('button', { name: /calcular cenários/i });
    fireEvent.click(calcBtn);

    expect(screen.getByText(/Sistema SAC \(Amortização Constante\)/i)).toBeInTheDocument();
  });

  it('aplica amortização extraordinária via atalhos rápidos e exibe card heroico de economia', () => {
    render(<DebtOptimizerTool isAuthenticated={true} onNavigate={onNavigateMock} />);

    // Clica no atalho rápido de +R$ 300
    const extra300Btn = screen.getByRole('button', { name: /\+R\$\s*300/i });
    fireEvent.click(extra300Btn);

    const calcBtn = screen.getByRole('button', { name: /calcular cenários/i });
    fireEvent.click(calcBtn);

    expect(screen.getByText(/Alavanca da Liberdade Financeira/i)).toBeInTheDocument();
    expect(screen.getByText(/Você elimina/i)).toBeInTheDocument();
    expect(screen.getByText(/em juros!/i)).toBeInTheDocument();
  });

  it('permite alternar entre as abas de Gráfico, Cronograma de Amortização e Estratégia', () => {
    render(<DebtOptimizerTool isAuthenticated={true} onNavigate={onNavigateMock} />);

    // Clica na aba Cronograma
    const cronogramaTab = screen.getByRole('button', { name: /cronograma de amortização/i });
    fireEvent.click(cronogramaTab);

    expect(screen.getByText('Cronograma Detalhado de Amortização')).toBeInTheDocument();
    expect(screen.getByText('Marcos Anuais')).toBeInTheDocument();
    expect(screen.getByText('Parcela Total')).toBeInTheDocument();

    // Clica na aba Estratégia
    const estrategiaTab = screen.getByRole('button', { name: /estratégia & fundamentos/i });
    fireEvent.click(estrategiaTab);

    expect(screen.getByText('SAC vs Tabela Price')).toBeInTheDocument();
    expect(screen.getByText('O Poder da Amortização Extra')).toBeInTheDocument();
    expect(screen.getByText('Bola de Neve vs Avalanche')).toBeInTheDocument();
  });

  it('redireciona para criação de meta com query parameters ao clicar em Salvar como Meta', () => {
    render(<DebtOptimizerTool isAuthenticated={true} onNavigate={onNavigateMock} />);

    // Clica no botão de meta
    const saveGoalBtn = screen.getByRole('button', { name: /salvar como meta de aporte/i });
    fireEvent.click(saveGoalBtn);

    expect(onNavigateMock).toHaveBeenCalledWith(expect.stringContaining('metas?action=new'));
  });
});
