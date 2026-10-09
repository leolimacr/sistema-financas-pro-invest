import { describe, expect, it } from 'vitest';
import { ActionManager } from '../../nexus-core/action-registry';

describe('ActionManager - Objeto de Decisão Estruturado e Ações Canônicas', () => {
  describe('extractActions', () => {
    it('extrai tags canônicas e limpa o texto', () => {
      const input = 'Recomendo que você revise suas dívidas ativas para conter juros.\n\n[ACTION:NAV_DEBTS]';
      const result = ActionManager.extractActions(input);

      expect(result.cleanText).toBe('Recomendo que você revise suas dívidas ativas para conter juros.');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].id).toBe('NAV_DEBTS');
      expect(result.actions[0].route).toBe('/app/minhas-dividas');
    });

    it('ignora tags inexistentes ou desconhecidas', () => {
      const input = 'Consulte seu planejamento. [ACTION:UNKNOWN_ACTION]';
      const result = ActionManager.extractActions(input);

      expect(result.cleanText).toBe('Consulte seu planejamento.');
      expect(result.actions).toHaveLength(0);
    });
  });

  describe('parseDecision - Respostas em Texto Livre com Tags', () => {
    it('converte texto livre com [ACTION:NAV_DEBTS] em Objeto de Decisão com impacto correspondente', () => {
      const rawText = 'Seu comprometimento de renda com dívidas atingiu 32% este mês.\nPriorize quitar o cartão mais caro.\n[ACTION:NAV_DEBTS]';
      const basis = {
        period: 'outubro/2026',
        sources: ['extrato', 'dívidas cadastradas'],
        dataStatus: 'ok' as const,
        limitations: [],
      };

      const result = ActionManager.parseDecision(rawText, basis);

      expect(result.cleanText).not.toContain('[ACTION:');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].id).toBe('NAV_DEBTS');

      const decision = result.decision;
      expect(decision.observedFact).toBe('Seu comprometimento de renda com dívidas atingiu 32% este mês.');
      expect(decision.confidenceLevel).toBe('alta');
      expect(decision.impact).toContain('Redução de juros');
      expect(decision.analyzedPeriod).toBe('outubro/2026');
      expect(decision.sourcesUsed).toEqual(['extrato', 'dívidas cadastradas']);
      expect(decision.assumptions.length).toBeGreaterThan(0);
      expect(decision.invalidatingCondition).toBeTruthy();
    });

    it('atribui confiança baixa quando os dados do usuário estiverem vazios', () => {
      const rawText = 'Você ainda não registrou transações este mês para uma leitura precisa.';
      const basis = {
        period: 'mês corrente',
        sources: [],
        dataStatus: 'empty' as const,
        limitations: ['Sem histórico de lançamentos'],
      };

      const result = ActionManager.parseDecision(rawText, basis);

      expect(result.decision.confidenceLevel).toBe('baixa');
      expect(result.decision.sourcesUsed).toEqual([]);
    });

    it('deriva impacto de proteção quando a ação é NAV_RESERVE', () => {
      const rawText = 'Sua reserva de emergência cobre apenas 1,2 meses de despesas essenciais.\n[ACTION:NAV_RESERVE]';
      const result = ActionManager.parseDecision(rawText);

      expect(result.actions[0].id).toBe('NAV_RESERVE');
      expect(result.decision.impact).toContain('Blindagem contra oscilações');
    });
  });

  describe('parseDecision - Respostas em JSON Estruturado', () => {
    it('faz parse com precisão cirúrgica de payload JSON de decisão', () => {
      const jsonPayload = JSON.stringify({
        answer: 'Seu saldo livre projetado é de R$ 850,00 após provisionar a fatura.',
        observedFact: 'Saldo livre real positivo com margem segura de 18%.',
        impact: 'Permite aporte estratégico sem comprometer a liquidez operacional.',
        confidenceLevel: 'alta',
        assumptions: ['Faturas recorrentes mantidas estáveis', 'Sem novos parcelamentos'],
        invalidatingCondition: 'Despesa imprevista superior a R$ 500,00 neste ciclo.',
        actionId: 'NAV_GOALS',
      });

      const result = ActionManager.parseDecision(jsonPayload, {
        period: 'outubro/2026',
        sources: ['contas', 'cartões', 'reserva'],
      });

      expect(result.cleanText).toBe('Seu saldo livre projetado é de R$ 850,00 após provisionar a fatura.');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].id).toBe('NAV_GOALS');

      const decision = result.decision;
      expect(decision.observedFact).toBe('Saldo livre real positivo com margem segura de 18%.');
      expect(decision.impact).toBe('Permite aporte estratégico sem comprometer a liquidez operacional.');
      expect(decision.confidenceLevel).toBe('alta');
      expect(decision.assumptions).toEqual(['Faturas recorrentes mantidas estáveis', 'Sem novos parcelamentos']);
      expect(decision.invalidatingCondition).toBe('Despesa imprevista superior a R$ 500,00 neste ciclo.');
    });

    it('faz fallback gracioso caso o JSON seja malformado', () => {
      const malformed = '{"answer": "Parcialmente quebrado", "observedFact": ';
      const result = ActionManager.parseDecision(malformed);

      expect(result.decision).toBeDefined();
      expect(result.decision.confidenceLevel).toBe('media');
    });
  });
});
