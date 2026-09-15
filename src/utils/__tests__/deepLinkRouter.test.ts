import { describe, it, expect } from 'vitest';
import { resolveAppRoute } from '../deepLinkRouter';

describe('deepLinkRouter - Resolução Soberana de Rotas', () => {
  describe('Rotas Canônicas (/app/...)', () => {
    it('preserva rotas completas /app/*', () => {
      expect(resolveAppRoute('/app/agenda')).toBe('/app/agenda');
      expect(resolveAppRoute('/app/controla')).toBe('/app/controla');
      expect(resolveAppRoute('/app/controla?action=new-transaction')).toBe('/app/controla?action=new-transaction');
      expect(resolveAppRoute('/app/minhas-dividas')).toBe('/app/minhas-dividas');
      expect(resolveAppRoute('/app/investimentos')).toBe('/app/investimentos');
    });

    it('converte URLs nativas de marcação de conta', () => {
      expect(resolveAppRoute('app://mark-bill-paid/bill-123')).toBe('/app/controla');
    });
  });

  describe('Normalização de Apelidos de Módulos (Sem prefixo)', () => {
    it('conduz termos de agenda para /app/agenda', () => {
      expect(resolveAppRoute('agenda')).toBe('/app/agenda');
      expect(resolveAppRoute('compromissos')).toBe('/app/agenda');
      expect(resolveAppRoute('calendario')).toBe('/app/agenda');
    });

    it('conduz termos de despesas, contas e lançamentos para /app/controla', () => {
      expect(resolveAppRoute('controla')).toBe('/app/controla');
      expect(resolveAppRoute('manager')).toBe('/app/controla');
      expect(resolveAppRoute('despesas')).toBe('/app/controla');
      expect(resolveAppRoute('despesa')).toBe('/app/controla');
      expect(resolveAppRoute('lancamentos')).toBe('/app/controla');
      expect(resolveAppRoute('gastos')).toBe('/app/controla');
    });

    it('conduz formulário de lançamento para /app/controla com action de criação', () => {
      expect(resolveAppRoute('transaction-form')).toBe('/app/controla?action=new-transaction');
      expect(resolveAppRoute('novo-lancamento')).toBe('/app/controla?action=new-transaction');
      expect(resolveAppRoute('nova-despesa')).toBe('/app/controla?action=new-transaction');
    });

    it('conduz cartões e faturas para /app/controla com tab de cartões', () => {
      expect(resolveAppRoute('cartoes')).toBe('/app/controla?tab=cartoes');
      expect(resolveAppRoute('cartao')).toBe('/app/controla?tab=cartoes');
      expect(resolveAppRoute('faturas')).toBe('/app/controla?tab=cartoes');
      expect(resolveAppRoute('fatura')).toBe('/app/controla?tab=cartoes');
    });

    it('conduz dívidas para /app/minhas-dividas', () => {
      expect(resolveAppRoute('minhas-dividas')).toBe('/app/minhas-dividas');
      expect(resolveAppRoute('dividas')).toBe('/app/minhas-dividas');
      expect(resolveAppRoute('divida')).toBe('/app/minhas-dividas');
    });

    it('conduz investimentos e aportes para /app/investimentos', () => {
      expect(resolveAppRoute('investimentos')).toBe('/app/investimentos');
      expect(resolveAppRoute('investimento')).toBe('/app/investimentos');
      expect(resolveAppRoute('aportes')).toBe('/app/investimentos');
      expect(resolveAppRoute('carteira')).toBe('/app/investimentos');
    });

    it('conduz patrimônio e passivos para /app/passivos', () => {
      expect(resolveAppRoute('patrimonio')).toBe('/app/passivos');
      expect(resolveAppRoute('passivos')).toBe('/app/passivos');
      expect(resolveAppRoute('bens')).toBe('/app/passivos');
    });

    it('conduz metas para /app/metas', () => {
      expect(resolveAppRoute('metas')).toBe('/app/metas');
      expect(resolveAppRoute('meta')).toBe('/app/metas');
      expect(resolveAppRoute('objetivos')).toBe('/app/metas');
    });

    it('conduz IA e consultor para /app/ia', () => {
      expect(resolveAppRoute('ia')).toBe('/app/ia');
      expect(resolveAppRoute('chat')).toBe('/app/ia');
      expect(resolveAppRoute('nexus')).toBe('/app/ia');
      expect(resolveAppRoute('consultor')).toBe('/app/ia');
    });
  });

  describe('Dedutibilidade Inteligente por EventType (Quando target é vazio)', () => {
    it('deduz eventos de agenda', () => {
      expect(resolveAppRoute('', 'agenda.alarm_due')).toBe('/app/agenda');
      expect(resolveAppRoute(null, 'agenda.reminder')).toBe('/app/agenda');
    });

    it('deduz eventos financeiros e de contas a vencer', () => {
      expect(resolveAppRoute('', 'finance.recurring_bill_due_today')).toBe('/app/controla');
      expect(resolveAppRoute(null, 'recurring_bill_due')).toBe('/app/controla');
      expect(resolveAppRoute(undefined, 'finance.bill_pending')).toBe('/app/controla');
    });

    it('deduz eventos de dívidas', () => {
      expect(resolveAppRoute('', 'debt.due_soon_3d')).toBe('/app/minhas-dividas');
      expect(resolveAppRoute(null, 'debt.critical_interest')).toBe('/app/minhas-dividas');
    });

    it('deduz eventos de aporte e investimento', () => {
      expect(resolveAppRoute('', 'wealth.aport_scheduled')).toBe('/app/investimentos');
    });

    it('deduz eventos de lembretes diários e reengajamento para novo lançamento', () => {
      expect(resolveAppRoute('', 'daily_reminder')).toBe('/app/controla?action=new-transaction');
      expect(resolveAppRoute(null, 'reengagement')).toBe('/app/controla?action=new-transaction');
    });

    it('cai no fallback seguro para a Central quando evento e target são desconhecidos', () => {
      expect(resolveAppRoute(null, null)).toBe('/app/central');
      expect(resolveAppRoute('', '')).toBe('/app/central');
      expect(resolveAppRoute('qualquer_coisa_estranha', '')).toBe('/app/central');
    });
  });
});
