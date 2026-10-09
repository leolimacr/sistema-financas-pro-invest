import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import SovereignMapCard from '../SovereignMapCard';
import CommandRitual from '../CommandRitual';
import AppCockpit from '../AppCockpit';
import ProtectionBar from '../../tools/finance/dashboard/ProtectionBar';
import type { StageInfo } from '../../../services/sovereignMap';
import { getCentralInsights, getPrioritizedInsight, buildUserContext } from '../../../services/nexusInsightEngine';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-test-123' } }),
}));

if (!('ResizeObserver' in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}


vi.mock('../../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({ effectiveTier: 'premium', isPro: true, isPremium: true }),
}));

vi.mock('../Cockpit/useCockpitData', () => ({
  useCockpitData: () => ({
    sovereign: {
      heroValue: 5000,
      sovereignFreeBalance: 2000,
      protectionShortfall: 0,
      accumulatedBalance: 10000,
      monthBalance: 3000,
      projectedBalance: 2000,
      leewayDays: 45,
      commandMode: true,
      income: 8000,
      expenses: 5000,
      colchaoShortfall: 0,
      reserveShortfall: 0,
      totalPendingBills: 0,
      virtualImpact: 0,
    },
    urgentBills: [],
    totals: { validatedModules: {} },
    detailedCards: [],
    evolutionData: [],
    totalInvestments: 0,
    totalProperty: 0,
    totalDebts: 0,
    marcoZero: 3000,
    reserveCurrent: 5000,
    stage: {
      id: 'estavel',
      numericStage: 3,
      name: 'Estável',
      explanation: 'Estrutura sólida.',
      blockers: [],
      nextStep: 'Aumentar a margem mensal',
    },
    contextualEvent: null,
  }),
}));

vi.mock('../../../services/debt/debt.hooks', () => ({
  useDebts: () => ({ data: [] }),
}));

vi.mock('../../../hooks/useWealthData', () => ({
  useWealthData: () => ({ assets: [], passives: [], patrimonioLiquido: 50000 }),
}));

vi.mock('../../../hooks/useBudget', () => ({
  useBudget: () => ({ budget: null, isLoading: false }),
}));

vi.mock('../../../contexts/ExclusionsContext', () => ({
  useExclusions: () => ({
    excluirReserva: false,
    excluirColchao: false,
    toggleReserva: vi.fn(),
    toggleColchao: vi.fn(),
  }),
  useExclusionAmount: () => 0,
}));

describe('Central — Separação de Papéis e Tom Responsável', () => {
  const sampleStage: StageInfo = {
    id: 'colchao-incompleto',
    numericStage: 2,
    name: 'Colchão Incompleto',
    explanation: 'Sua disponibilidade real é positiva, mas a proteção ainda está incompleta.',
    blockers: ['Faltam R$ 443,00 para completar a proteção'],
    nextStep: 'Completar o Colchão Inicial e a Reserva de Emergência',
  };

  describe('1. SovereignMapCard — Explicação sem Próximo Passo', () => {
    it('exibe nome do estágio, explicação e fatores limitantes', () => {
      render(<SovereignMapCard stage={sampleStage} />);

      expect(screen.getByText('Colchão Incompleto')).toBeInTheDocument();
      expect(screen.getByText(/Sua disponibilidade real é positiva/i)).toBeInTheDocument();
      expect(screen.getByText('Fatores limitantes')).toBeInTheDocument();
      expect(screen.getByText(/Faltam R\$ 443,00 para completar a proteção/i)).toBeInTheDocument();
    });

    it('NÃO renderiza "Próximo passo" nem repete a ação do comando', () => {
      render(<SovereignMapCard stage={sampleStage} />);

      expect(screen.queryByText(/próximo passo/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Completar o Colchão Inicial e a Reserva de Emergência')).not.toBeInTheDocument();
    });

    it('renderiza link secundário para explorar alocação somente em estágio avançado (>=4)', () => {
      const advancedStage: StageInfo = {
        ...sampleStage,
        id: 'solido',
        numericStage: 4,
        name: 'Sólido',
      };
      const onNavigate = vi.fn();
      render(<SovereignMapCard stage={advancedStage} onNavigate={onNavigate} />);

      expect(screen.getByRole('button', { name: /explorar alocação/i })).toBeInTheDocument();
    });
  });

  describe('2. CommandRitual — Posição e Comando com Ação Única', () => {
    it('renderiza posição, comando e CTA principal da sessão', () => {
      const onNavigate = vi.fn();
      render(
        <CommandRitual
          stage={sampleStage}
          event={null}
          onNavigate={onNavigate}
          freeBalance={1500}
          shortfall={443}
          launchCount={12}
        />
      );

      expect(screen.getByText('SEU COMANDO')).toBeInTheDocument();
      expect(screen.getByText('Colchão Incompleto')).toBeInTheDocument();
      expect(screen.getByText('Completar o Colchão Inicial e a Reserva de Emergência')).toBeInTheDocument();
      expect(screen.getByText(/Faltam R\$ 443,00 para completar sua proteção/i)).toBeInTheDocument();

      // Botão primário com ação de ajuste de proteção
      const actionButton = screen.getByRole('button', { name: /ajustar proteção/i });
      expect(actionButton).toBeInTheDocument();
      expect(actionButton.className).toContain('bg-slate-800');
    });

    it('exibe texto conciso e objetivo quando estágio for indefinido', () => {
      const indefinidoStage: StageInfo = {
        id: 'indefinido',
        numericStage: 0,
        name: 'Indefinido',
        explanation: 'Poucos lançamentos.',
        blockers: [],
        nextStep: 'Registrar movimentações regularmente',
      };
      render(
        <CommandRitual
          stage={indefinidoStage}
          event={null}
          onNavigate={vi.fn()}
          freeBalance={0}
          shortfall={0}
          launchCount={2}
        />
      );

      expect(screen.getByText(/Aguardando base mínima de 5 lançamentos para calibrar o Mapa de Soberania/i)).toBeInTheDocument();
    });
  });

  describe('3. ProtectionBar — Tom Neutro e Factual', () => {
    it('com saldo insuficiente, exibe texto neutro sem imperativo agressivo ("Revise suas despesas")', () => {
      render(
        <ProtectionBar
          saldoRealTotal={-500}
          colchaoTarget={2000}
          reserveTarget={5000}
          isPrivacyMode={false}
          effectiveBalanceOverride={0}
        />
      );

      expect(screen.queryByText(/Saldo disponível insuficiente\. Revise suas despesas\./i)).not.toBeInTheDocument();
      expect(screen.getByText(/Saldo no período abaixo da meta de proteção\. Acompanhe as despesas e a evolução da folga para decidir como recompor essa margem\./i)).toBeInTheDocument();
    });
  });

  describe('4. Nexus Insights — Linguagem Responsável e não prescritiva', () => {
    it('central-debt-interest não usa metáfora alarmista de "balde furado" nem "estancar juros"', () => {
      const ctx = buildUserContext({
        hasDebts: true,
        debts: [{ id: 'd1', nome: 'Cartão', saldoDevedor: 5000, taxaMensal: 8 } as any],
        sovereignFreeBalance: 1000,
      });
      const insights = getCentralInsights(ctx);
      const debtInsight = insights.find(i => i.id === 'central-debt-interest');

      expect(debtInsight).toBeDefined();
      expect(debtInsight?.message.title).toBe('Impacto dos Juros');
      expect(debtInsight?.message.title).not.toContain('Hemorragia');
      expect(debtInsight?.message.body).not.toContain('balde furado');
      expect(debtInsight?.message.body).not.toContain('tapar esse buraco');
      expect(debtInsight?.message.body).toContain('simular uma rota de amortização');
      expect(debtInsight?.message.ctaLabel).toBe('Ver Estratégia');
    });

    it('strategic-opportunity-cost não afirma qual é o "melhor investimento hoje"', () => {
      const ctx = buildUserContext({
        debts: [{ id: 'd1', nome: 'Dívida', saldoDevedor: 3000, taxaMensal: 6 } as any],
        assets: [{ id: 'a1', category: 'Tesouro Selic', currentValue: 2000, flexibility: 'liquidez' } as any],
        sovereignFreeBalance: 1000,
      });
      const insight = getPrioritizedInsight(ctx);

      if (insight && insight.id === 'strategic-opportunity-cost') {
        expect(insight.message.body).not.toContain('seu melhor investimento hoje');
        expect(insight.message.body).toContain('amortizar é uma alternativa que reduz o custo total de juros');
      }
    });
  });

  describe('5. AppCockpit — Eliminação do Fallback e Prontidão Operacional', () => {
    const today = new Date().toISOString().split('T')[0];
    const recentTransactions = [
      { id: 'tx-1', date: today, amount: 150, type: 'expense', category: 'Alimentação' } as any,
    ];

    it('usuário saudável (Premium, perfil completo, dados recentes) NÃO vê fallback genérico nem Prioridade Agora', () => {
      const userMeta = {
        financialProfile: {
          colchaoInicialTarget: 2000,
          emergencyReserveTarget: 5000,
        },
      } as any;

      render(
        <MemoryRouter>
          <AppCockpit
            transactions={recentTransactions}
            isPrivacyMode={false}
            onNavigate={vi.fn()}
            onOpenForm={vi.fn()}
            userMeta={userMeta}
          />
        </MemoryRouter>
      );

      // Não exibe o fallback genérico que competia com o Comando
      expect(screen.queryByText(/Revise alocação e proteção/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Abrir leitura estratégica/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Prioridade agora/i)).not.toBeInTheDocument();
      // Não renderiza bloco de prontidão quando não há pendência
      expect(screen.queryByLabelText('Prontidão dos dados')).not.toBeInTheDocument();
    });

    it('usuário com dados desatualizados (>= 7 dias) vê aviso de Prontidão dos dados, nunca Prioridade agora', () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const oldTransactions = [
        { id: 'tx-old', date: oldDate, amount: 200, type: 'expense', category: 'Mercado' } as any,
      ];
      const userMeta = {
        financialProfile: {
          colchaoInicialTarget: 2000,
          emergencyReserveTarget: 5000,
        },
      } as any;

      render(
        <MemoryRouter>
          <AppCockpit
            transactions={oldTransactions}
            isPrivacyMode={false}
            onNavigate={vi.fn()}
            onOpenForm={vi.fn()}
            userMeta={userMeta}
          />
        </MemoryRouter>
      );

      expect(screen.getByLabelText('Prontidão dos dados')).toBeInTheDocument();
      expect(screen.getByText('Prontidão dos dados')).toBeInTheDocument();
      expect(screen.getByText(/Atualize seus registros recentes/i)).toBeInTheDocument();
      expect(screen.queryByText(/Prioridade agora/i)).not.toBeInTheDocument();
    });

    it('usuário sem perfil financeiro vê lembrete secundário de configuração sem upsell de plano', () => {
      const userMeta = {
        financialProfile: null,
      } as any;

      render(
        <MemoryRouter>
          <AppCockpit
            transactions={recentTransactions}
            isPrivacyMode={false}
            onNavigate={vi.fn()}
            onOpenForm={vi.fn()}
            userMeta={userMeta}
          />
        </MemoryRouter>
      );

      expect(screen.getByLabelText('Prontidão dos dados')).toBeInTheDocument();
      expect(screen.getByText(/Configure suas metas de proteção/i)).toBeInTheDocument();
      expect(screen.queryByText(/Prioridade agora/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Conhecer o Premium/i)).not.toBeInTheDocument();
    });
  });
});
