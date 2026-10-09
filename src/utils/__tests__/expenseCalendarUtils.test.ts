import { describe, it, expect } from 'vitest';
import type { Transaction } from '../../types';
import {
  getCalendarGridDays,
  computeDailyExpenseMap,
  formatDayExpenseAmount,
  formatMobileExpenseAmount,
  formatCalendarFullDate,
  getWeekdayNameFromIso,
} from '../expenseCalendarUtils';

const mockTx = (overrides: Partial<Transaction> & { id: string }): Transaction => ({
  userId: 'user-123',
  type: 'expense',
  date: '2026-09-15',
  description: 'Almoço',
  category: 'Alimentação',
  amount: 45.5,
  ...overrides,
});

describe('expenseCalendarUtils', () => {
  describe('getCalendarGridDays', () => {
    it('gera corretamente os 35 quadradinhos de setembro de 2026 (terça-feira a quarta-feira)', () => {
      // 01/09/2026 é Terça-feira (getDay() = 2) -> 2 dias de padding de agosto (30 e 31)
      // Setembro tem 30 dias -> 2 + 30 = 32 células -> + 3 dias de outubro (1, 2, 3) = 35 células
      const cells = getCalendarGridDays(2026, 9, new Date(2026, 8, 25));

      expect(cells).toHaveLength(35);

      // Primeiro dia da grade: 30 de agosto de 2026 (Domingo)
      expect(cells[0]).toMatchObject({
        dateIso: '2026-08-30',
        dayNumber: 30,
        isCurrentMonth: false,
        dayOfWeek: 0,
      });

      // Terceiro dia da grade: 1 de setembro de 2026 (Terça-feira)
      expect(cells[2]).toMatchObject({
        dateIso: '2026-09-01',
        dayNumber: 1,
        isCurrentMonth: true,
        dayOfWeek: 2,
      });

      // Último dia do mês: 30 de setembro de 2026
      expect(cells[31]).toMatchObject({
        dateIso: '2026-09-30',
        dayNumber: 30,
        isCurrentMonth: true,
      });

      // Padding final de outubro
      expect(cells[32]).toMatchObject({
        dateIso: '2026-10-01',
        dayNumber: 1,
        isCurrentMonth: false,
      });

      // Marcação do dia de hoje (25/09/2026)
      const todayCell = cells.find((c) => c.dateIso === '2026-09-25');
      expect(todayCell?.isToday).toBe(true);
    });

    it('trata ano bissexto para fevereiro (29 dias em 2028 vs 28 dias em 2026)', () => {
      const feb2028 = getCalendarGridDays(2028, 2);
      const daysFeb28 = feb2028.filter((c) => c.isCurrentMonth);
      expect(daysFeb28).toHaveLength(29);

      const feb2026 = getCalendarGridDays(2026, 2);
      const daysFeb26 = feb2026.filter((c) => c.isCurrentMonth);
      expect(daysFeb26).toHaveLength(28);
    });
  });

  describe('computeDailyExpenseMap (Rigor Contábil)', () => {
    it('computa apenas saídas (expense) reais e ignora receitas', () => {
      const txs = [
        mockTx({ id: 't1', type: 'expense', amount: 100, date: '2026-09-05' }),
        mockTx({ id: 't2', type: 'expense', amount: 50, date: '2026-09-05' }),
        mockTx({ id: 't3', type: 'income', amount: 3000, date: '2026-09-05' }), // Receita: DEVE ser ignorada
        mockTx({ id: 't4', type: 'expense', amount: 200, date: '2026-09-12' }),
        mockTx({ id: 't5', type: 'expense', amount: 80, date: '2026-08-30' }), // Outro mês: DEVE ser ignorada
      ];

      const summary = computeDailyExpenseMap(txs, '2026-09');

      expect(summary.totalMonthExpenses).toBe(350);
      expect(summary.totalTransactionsCount).toBe(3);
      expect(summary.daysWithExpensesCount).toBe(2);

      const day5 = summary.dailyMap.get('2026-09-05');
      expect(day5?.totalAmount).toBe(150);
      expect(day5?.transactionCount).toBe(2);
      expect(day5?.transactions).toHaveLength(2);

      const day12 = summary.dailyMap.get('2026-09-12');
      expect(day12?.totalAmount).toBe(200);

      expect(summary.highestExpenseDay).toEqual({
        dateIso: '2026-09-12',
        amount: 200,
      });
    });

    it('ignora transações virtuais (isVirtual)', () => {
      const txs = [
        mockTx({ id: 't1', type: 'expense', amount: 120, date: '2026-09-10', isVirtual: false }),
        mockTx({ id: 't2', type: 'expense', amount: 500, date: '2026-09-10', isVirtual: true }), // Virtual: NÃO deve pontuar
      ];

      const summary = computeDailyExpenseMap(txs, '2026-09');
      expect(summary.totalMonthExpenses).toBe(120);
      expect(summary.dailyMap.get('2026-09-10')?.totalAmount).toBe(120);
    });

    it('preserva compras no cartão de crédito na data da compra e descarta pagamento técnico de fatura', () => {
      const txs = [
        // Compra no cartão no dia 08/09: DEVE entrar no dia 08
        mockTx({
          id: 'card-buy-1',
          type: 'expense',
          amount: 150,
          date: '2026-09-08',
          description: 'Restaurante',
          paymentMethod: 'credit',
          cardId: 'card-nubank',
        }),
        // Quitação de fatura no dia 20/09: NÃO deve entrar no calendário para não duplicar compras
        mockTx({
          id: 'pay-invoice-1',
          type: 'expense',
          amount: 150,
          date: '2026-09-20',
          description: 'Pagamento Fatura Nubank',
          category: 'Fatura - Cartão de Crédito',
          isBillPayment: true,
          linkedCardId: 'card-nubank',
        }),
      ];

      const summary = computeDailyExpenseMap(txs, '2026-09');

      // Total deve ser 150 (apenas o restaurante), nunca 300!
      expect(summary.totalMonthExpenses).toBe(150);
      expect(summary.dailyMap.get('2026-09-08')?.totalAmount).toBe(150);
      expect(summary.dailyMap.has('2026-09-20')).toBe(false);
    });
  });

  describe('formatDayExpenseAmount', () => {
    it('formata valores monetários em BRL', () => {
      expect(formatDayExpenseAmount(120.5)).toContain('120,50');
      expect(formatDayExpenseAmount(0)).toBe('');
      expect(formatDayExpenseAmount(-10)).toBe('');
    });

    it('mascara no modo de privacidade', () => {
      expect(formatDayExpenseAmount(120.5, { isPrivacyMode: true })).toBe('••••••');
    });

    it('formata modo compacto para telas móveis', () => {
      expect(formatDayExpenseAmount(85, { compact: true })).toBe('R$ 85');
      expect(formatDayExpenseAmount(1500, { compact: true })).toBe('R$ 1,5k');
    });
  });

  describe('formatMobileExpenseAmount (Células mobile sem truncamento)', () => {
    it('formata valores menores que 100 com centavos', () => {
      expect(formatMobileExpenseAmount(9.9)).toContain('9,90');
      expect(formatMobileExpenseAmount(45.7)).toContain('45,70');
    });

    it('arredonda centavos para valores entre 100 e 9.999 para caber na célula sem truncar', () => {
      expect(formatMobileExpenseAmount(154.3)).toBe('154');
      expect(formatMobileExpenseAmount(220)).toBe('220');
      expect(formatMobileExpenseAmount(1450.8)).toContain('1.451');
    });

    it('compacta com sufixo k para valores iguais ou superiores a 10.000', () => {
      expect(formatMobileExpenseAmount(12500)).toContain('12,5k');
      expect(formatMobileExpenseAmount(20000)).toContain('20k');
    });

    it('mascara no modo de privacidade com ••••', () => {
      expect(formatMobileExpenseAmount(150, true)).toBe('••••');
    });

    it('retorna string vazia para valores menores ou iguais a zero', () => {
      expect(formatMobileExpenseAmount(0)).toBe('');
      expect(formatMobileExpenseAmount(-50)).toBe('');
    });
  });

  describe('formatCalendarFullDate e getWeekdayNameFromIso', () => {
    it('formata data completa em pt-BR', () => {
      expect(formatCalendarFullDate('2026-09-25')).toContain('25 de setembro de 2026');
    });

    it('retorna o dia da semana correto', () => {
      expect(getWeekdayNameFromIso('2026-09-25')).toBe('Sexta-feira');
      expect(getWeekdayNameFromIso('2026-09-20')).toBe('Domingo');
      expect(getWeekdayNameFromIso('2026-09-21')).toBe('Segunda-feira');
    });
  });
});
