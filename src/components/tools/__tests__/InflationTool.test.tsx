import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InflationTool } from '../InflationTool';

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
    totalInvestments: 60000,
    patrimonioLiquido: 60000,
  }),
}));

vi.mock('../../../hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [
      { id: '1', tipo: 'despesa', valor: 4500, data: '2026-08-01' },
      { id: '2', tipo: 'despesa', valor: 4500, data: '2026-09-01' },
    ],
  }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-inflacao-test-123' },
    userMeta: {},
    isAuthenticated: true,
  }),
}));

describe('InflationTool — Ferramenta Soberana de Impacto da Inflação', () => {
  const onNavigateMock = vi.fn();
  const onCalcUpdateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os elementos soberanos da ferramenta, presets e botões de sincronização', () => {
    render(
      <InflationTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    expect(screen.getByText('Impacto da Inflação')).toBeInTheDocument();
    expect(
      screen.getByText('O impacto silencioso da perda do poder de compra e as estratégias de blindagem patrimonial.')
    ).toBeInTheDocument();
    expect(screen.getByText('Poder de Compra Real')).toBeInTheDocument();
    expect(screen.getByText('Sincronizar com Meus Dados do Finanças Pro')).toBeInTheDocument();
    expect(screen.getByText('Usar Meu Saldo')).toBeInTheDocument();
    expect(screen.getByText('Usar Meu Custo de Vida')).toBeInTheDocument();
    expect(screen.getByText('IPCA Médio Histórico')).toBeInTheDocument();
    expect(screen.getByText('Custo Familiar Real')).toBeInTheDocument();
  });

  it('sincroniza o saldo real em conta ao clicar em Usar Meu Saldo', () => {
    render(
      <InflationTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const syncSaldoBtn = screen.getByText('Usar Meu Saldo');
    fireEvent.click(syncSaldoBtn);

    expect(screen.getByText(/✓ Sincronizado: R\$ 60\.000,00 do seu patrimônio investido\./i)).toBeInTheDocument();
  });

  it('sincroniza o custo de vida real e altera para modo de custo de vida', () => {
    render(
      <InflationTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const syncCustoBtn = screen.getByText('Usar Meu Custo de Vida');
    fireEvent.click(syncCustoBtn);

    expect(screen.getByText(/✓ Sincronizado: R\$ 3\.000,00\/mês de despesas médias/i)).toBeInTheDocument();
    expect(screen.getByText('Custo de Vida Mensal Atual')).toBeInTheDocument();
  });

  it('executa cálculo de poder de compra com corrosão, blindagem e gráficos', () => {
    render(
      <InflationTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const calcBtn = screen.getByRole('button', { name: /calcular impacto real/i });
    fireEvent.click(calcBtn);

    expect(screen.getByText('Poder de Compra Real Restante')).toBeInTheDocument();
    expect(screen.getByText('Corrosão Inflacionária Acumulada')).toBeInTheDocument();
    expect(screen.getByText('Blindagem no Tesouro IPCA+')).toBeInTheDocument();
    expect(screen.getByText(/O Antídoto Soberano/i)).toBeInTheDocument();
  });

  it('calcula o modo de custo de vida com o aumento necessário para manter o padrão', () => {
    render(
      <InflationTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    // Alterna para lente de custo de vida
    const custoVidaBtn = screen.getByRole('button', { name: /2\. Custo de Vida \(Reposição\)/i });
    fireEvent.click(custoVidaBtn);

    const calcBtn = screen.getByRole('button', { name: /calcular impacto real/i });
    fireEvent.click(calcBtn);

    expect(screen.getByText('Custo Futuro para o Mesmo Estilo de Vida')).toBeInTheDocument();
  });

  it('permite alternar entre as abas de Gráfico, Tabela de Erosão e Fundamentos', () => {
    render(
      <InflationTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const calcBtn = screen.getByRole('button', { name: /calcular impacto real/i });
    fireEvent.click(calcBtn);

    // Clica na Tabela
    const tableTab = screen.getByRole('button', { name: /tabela de erosão ano a ano/i });
    fireEvent.click(tableTab);

    expect(screen.getByText('Detalhamento Cronológico da Erosão do Dinheiro')).toBeInTheDocument();
    expect(screen.getByText('Ano 1')).toBeInTheDocument();
    expect(screen.getByText('Saldo com Blindagem IPCA+')).toBeInTheDocument();

    // Clica nos Fundamentos
    const learnTab = screen.getByRole('button', { name: /fundamentos & blindagem/i });
    fireEvent.click(learnTab);

    expect(screen.getByText(/Por que o dinheiro parado é o investimento mais arriscado que existe\?/i)).toBeInTheDocument();
  });

  it('exibe comparativo de 3 vias (Parado, Poupança e 100% CDI)', () => {
    render(
      <InflationTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const calcBtn = screen.getByRole('button', { name: /calcular impacto real/i });
    fireEvent.click(calcBtn);

    expect(screen.getByText('O Destino Real do Mesmo Capital')).toBeInTheDocument();
    expect(screen.getByText('100% CDI')).toBeInTheDocument();
    expect(screen.getByText('Poupança (~6%)')).toBeInTheDocument();
  });

  it('navega para a tela de investimentos ao clicar no botão de blindagem', () => {
    render(
      <InflationTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const calcBtn = screen.getByRole('button', { name: /calcular impacto real/i });
    fireEvent.click(calcBtn);

    const protectBtn = screen.getByRole('button', { name: /ver investimentos/i });
    fireEvent.click(protectBtn);

    expect(onNavigateMock).toHaveBeenCalledWith('investimentos');
  });

  it('redireciona para criação de meta com query parameters ao clicar em Salvar Meta', () => {
    render(
      <InflationTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const calcBtn = screen.getByRole('button', { name: /calcular impacto real/i });
    fireEvent.click(calcBtn);

    const saveGoalBtn = screen.getByRole('button', { name: /salvar meta/i });
    fireEvent.click(saveGoalBtn);

    expect(onNavigateMock).toHaveBeenCalledWith(expect.stringContaining('metas?action=new'));
    expect(onNavigateMock).toHaveBeenCalledWith(expect.stringContaining('Reserva%20Blindada%20contra%20Infla%C3%A7%C3%A3o'));
  });
});
