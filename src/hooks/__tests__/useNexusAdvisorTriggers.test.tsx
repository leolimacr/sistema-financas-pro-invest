import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNexusAdvisorTriggers } from "../useNexusAdvisorTriggers";
import { PresenceEventService } from "../../services/PresenceEventService";
import type { SovereignSnapshot } from "../../utils/calculations";

vi.mock("../../services/PresenceEventService", () => ({
  PresenceEventService: {
    createNexusAdvisorAlert: vi.fn().mockResolvedValue(true),
  },
}));

const mockSovereign: SovereignSnapshot = {
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
};

describe("useNexusAdvisorTriggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nao dispara alertas se o usuario nao estiver autenticado ou tiver menos de 3 lancamentos", () => {
    renderHook(() =>
      useNexusAdvisorTriggers({
        userId: undefined,
        sovereign: mockSovereign,
        debts: [],
        assets: [],
        userMeta: null,
        launchCount: 2,
      })
    );
    expect(PresenceEventService.createNexusAdvisorAlert).not.toHaveBeenCalled();
  });

  it("dispara alerta de pressao no fluxo quando o saldo livre real for negativo", () => {
    const negSovereign = { ...mockSovereign, sovereignFreeBalance: -500 };
    renderHook(() =>
      useNexusAdvisorTriggers({
        userId: "user-123",
        sovereign: negSovereign,
        debts: [],
        assets: [],
        userMeta: null,
        launchCount: 6,
      })
    );
    expect(PresenceEventService.createNexusAdvisorAlert).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        id: "nexus-alert-negative-free-balance",
        title: "Atenção ao Saldo Livre",
        urgency: "high",
        deepLink: "controla?view=contas",
      })
    );
  });

  it("dispara alerta de juros quando existirem dividas ativas com taxa mensal", () => {
    const debts = [
      {
        id: "debt-1",
        nome: "Cartao Rotativo",
        saldoDevedor: 3000,
        taxaMensal: 12.5,
        valorParcela: 500,
      } as any,
    ];
    renderHook(() =>
      useNexusAdvisorTriggers({
        userId: "user-123",
        sovereign: mockSovereign,
        debts,
        assets: [],
        userMeta: null,
        launchCount: 5,
      })
    );
    expect(PresenceEventService.createNexusAdvisorAlert).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        id: "nexus-alert-debt-interest",
        title: "Impacto dos Juros no Fluxo",
        urgency: "high",
        deepLink: "minhas-dividas?view=estrategia",
      })
    );
  });

  it("dispara alerta de custo de oportunidade se divida cara coexistir com ativos de liquidez", () => {
    const debts = [
      {
        id: "debt-2",
        nome: "Emprestimo Pessoal",
        saldoDevedor: 5000,
        taxaMensal: 4.5,
        valorParcela: 800,
      } as any,
    ];
    const assets = [
      {
        id: "asset-1",
        name: "Tesouro Selic",
        currentValue: 1500,
        flexibility: "liquidez",
      } as any,
    ];
    renderHook(() =>
      useNexusAdvisorTriggers({
        userId: "user-123",
        sovereign: mockSovereign,
        debts,
        assets,
        userMeta: null,
        launchCount: 5,
      })
    );
    expect(PresenceEventService.createNexusAdvisorAlert).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        id: "nexus-alert-opportunity-cost",
        title: "Custo de Oportunidade",
        urgency: "high",
      })
    );
  });

  it("dispara alerta de alocacao de capital ocioso quando o saldo livre exceder a meta com folga", () => {
    const highSovereign = {
      ...mockSovereign,
      sovereignFreeBalance: 6000,
      protectionShortfall: 0,
    };
    const userMeta = {
      financialProfile: {
        colchaoInicialTarget: 2000,
      },
    } as any;
    renderHook(() =>
      useNexusAdvisorTriggers({
        userId: "user-123",
        sovereign: highSovereign,
        debts: [],
        assets: [],
        userMeta,
        launchCount: 8,
      })
    );
    expect(PresenceEventService.createNexusAdvisorAlert).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        id: "nexus-alert-idle-cash",
        title: "Oportunidade de Alocação",
        urgency: "medium",
        deepLink: "investimentos?action=new-asset",
      })
    );
  });

  it("dispara alerta de antecipação de tensão quando houver contas vencendo nos próximos 5 dias pressionando o saldo", () => {
    const todayDay = new Date().getDate();
    const bills = [
      {
        id: "bill-1",
        name: "Aluguel",
        amount: 2500,
        dueDay: todayDay + 2,
        isActive: true,
      } as any,
    ];

    const tightSovereign = {
      ...mockSovereign,
      monthBalance: 1200,
      accumulatedBalance: 1200,
    };

    renderHook(() =>
      useNexusAdvisorTriggers({
        userId: "user-123",
        sovereign: tightSovereign,
        debts: [],
        assets: [],
        bills,
        userMeta: null,
        launchCount: 6,
      })
    );

    expect(PresenceEventService.createNexusAdvisorAlert).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        id: `nexus-alert-bills-5d-${todayDay}`,
        title: "Atenção ao Caixa nos Próximos Dias",
        urgency: "high",
        deepLink: "controla?view=contas&filter=next5days",
      })
    );
  });

  it("dispara alerta de antecipação da Agenda para compromissos nos próximos 7 dias", () => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 2);

    const commitments = [
      {
        id: "comm-1",
        title: "Reunião de Alinhamento",
        date: { toDate: () => futureDate } as any,
        completed: false,
      } as any,
    ];

    renderHook(() =>
      useNexusAdvisorTriggers({
        userId: "user-123",
        sovereign: mockSovereign,
        debts: [],
        assets: [],
        bills: [],
        commitments,
        userMeta: null,
        launchCount: 5,
      })
    );

    expect(PresenceEventService.createNexusAdvisorAlert).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        id: `nexus-alert-agenda-7d-${new Date().getDate()}`,
        title: "Compromisso na sua Semana",
        urgency: "medium",
        deepLink: expect.stringContaining("agenda?view=week&highlight=comm-1"),
      })
    );
  });
});