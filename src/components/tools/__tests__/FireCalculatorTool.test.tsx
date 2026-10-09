import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FireCalculatorTool } from '../FireCalculatorTool';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock dos hooks de dados do app
vi.mock('../../../hooks/useWealthData', () => ({
  useWealthData: () => ({
    totalInvestments: 80000,
    patrimonioLiquido: 80000,
  }),
}));

vi.mock('../../../hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [
      { id: '1', tipo: 'despesa', valor: 4000, data: '2026-08-10' },
      { id: '2', tipo: 'despesa', valor: 4000, data: '2026-09-10' },
    ],
  }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-fire-test-123' },
    userMeta: {
      idade: 35,
      financialProfile: {
        monthlyExpenseBudget: 4000,
      },
    },
    isAuthenticated: true,
  }),
}));

describe('FireCalculatorTool — Evolução da Calculadora de Independência Financeira', () => {
  const onNavigateMock = vi.fn();
  const onCalcUpdateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza com copywriting sóbrio e parâmetros iniciais', () => {
    render(
      <FireCalculatorTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    expect(screen.getByText('Calculadora FIRE')).toBeInTheDocument();
    expect(
      screen.getByText('Veja quanto tempo você ainda precisa trabalhar para conseguir a sua independência financeira.')
    ).toBeInTheDocument();
    expect(screen.getByText('Tempo de Trabalho Real')).toBeInTheDocument();
    expect(screen.getByText('Sincronizar com Meus Dados Reais do App')).toBeInTheDocument();
  });

  it('sincroniza dados reais do ecossistema ao clicar no botão de sincronização', () => {
    render(
      <FireCalculatorTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const syncBtn = screen.getByRole('button', { name: /Usar Meus Dados Reais/i });
    fireEvent.click(syncBtn);

    // Deve exibir aviso de confirmação com os dados puxados
    expect(screen.getByText(/Dados sincronizados do seu app:/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 80\.000 em investimentos/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 4\.000\/mês em despesas médias/i)).toBeInTheDocument();
  });

  it('executa o cálculo completo e exibe a Alavanca do Tempo e Marcos Intermediários', async () => {
    render(
      <FireCalculatorTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    // Clica no botão de calcular
    const calcBtn = screen.getByRole('button', { name: /Calcular Minha Liberdade/i });
    fireEvent.click(calcBtn);

    // 1. Número da Liberdade e Tempo
    expect(screen.getByText('Seu Número da Liberdade')).toBeInTheDocument();
    expect(screen.getByText(/Tempo Estimado com Seus Aportes/i)).toBeInTheDocument();

    // 2. Alavanca do Tempo (Economia de Anos de Trabalho por Corte de Gastos)
    expect(screen.getByText('Alavanca do Tempo de Trabalho')).toBeInTheDocument();
    expect(
      screen.getByText('Quanto tempo de vida você ganha ao enxugar gastos?')
    ).toBeInTheDocument();
    expect(screen.getByText(/Tempo de trabalho economizado da sua vida/i)).toBeInTheDocument();
    expect(screen.getByText(/Alívio no Patrimônio Alvo/i)).toBeInTheDocument();

    // 3. Marcos Intermediários de Soberania (Coast FIRE e Semi-Aposentadoria)
    expect(
      screen.getByText('Marcos Intermediários de Soberania (Vitórias no Caminho)')
    ).toBeInTheDocument();
    expect(screen.getByText(/Marco 1 · Coast FIRE/i)).toBeInTheDocument();
    expect(screen.getByText(/Marco 2 · Semi-Aposentadoria/i)).toBeInTheDocument();
  });

  it('conecta ação ao Painel de Metas com parâmetros de query string pré-preenchidos', () => {
    render(
      <FireCalculatorTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    // Executa cálculo
    const calcBtn = screen.getByRole('button', { name: /Calcular Minha Liberdade/i });
    fireEvent.click(calcBtn);

    // Clica no botão de salvar meta
    const saveGoalBtn = screen.getByRole('button', { name: /Salvar Meta de Aporte no Meu Painel/i });
    fireEvent.click(saveGoalBtn);

    expect(onNavigateMock).toHaveBeenCalledTimes(1);
    const destination = onNavigateMock.mock.calls[0][0];
    expect(destination).toContain('metas?action=new');
    expect(destination).toContain('nome=Independ%C3%AAncia%20Financeira%20(FIRE)');
    expect(destination).toContain('valor=1000');
    expect(destination).toContain('metaAlvo=1500000');
  });

  it('permite alternar cortes na Alavanca do Tempo e recalcula a economia de anos de trabalho', () => {
    render(
      <FireCalculatorTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    const calcBtn = screen.getByRole('button', { name: /Calcular Minha Liberdade/i });
    fireEvent.click(calcBtn);

    // Clica no botão de corte de -R$ 500/mês
    const cut500Btn = screen.getByRole('button', { name: /- R\$ 500\/mês/i });
    fireEvent.click(cut500Btn);

    // Com corte de 500, a redução do patrimônio alvo deve ser R$ 150.000 (500 * 12 / 0.04)
    expect(screen.getByText('- R$ 150.000')).toBeInTheDocument();
  });

  it('exibe explicação clara da Regra de Retirada Anual Segura e abre painel didático ao clicar na interrogação', () => {
    render(
      <FireCalculatorTool
        isAuthenticated={true}
        onNavigate={onNavigateMock}
        onCalcUpdate={onCalcUpdateMock}
      />
    );

    // Texto explicativo visível de imediato
    expect(
      screen.getByText(
        /A fatia percentual que você saca por ano do seu patrimônio investido para pagar seu custo de vida, sem esgotar o capital\./i
      )
    ).toBeInTheDocument();

    // Multiplicadores nos cards
    expect(screen.getByText('33× anual')).toBeInTheDocument();
    expect(screen.getByText('25× anual')).toBeInTheDocument();
    expect(screen.getByText('20× anual')).toBeInTheDocument();

    // Clica no botão de ajuda da Regra de Retirada
    const helpBtn = screen.getByRole('button', {
      name: /Mais informações sobre a Regra de Retirada Anual Segura/i,
    });
    fireEvent.click(helpBtn);

    // Deve abrir o painel com a explicação didática da Retirada Segura
    expect(
      screen.getByText(/O que é e como funciona a Retirada Segura\?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Padrão · 4% \(Trinity\)/i)
    ).toBeInTheDocument();
  });
});
