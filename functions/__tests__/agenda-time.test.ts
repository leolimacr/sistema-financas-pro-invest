import { describe, expect, it } from 'vitest';
import {
  expandRecurrence,
  resolveDateExpression,
  resolvePeriodRange,
  resolveWindowExpression,
  todayYmdInProductTimezone,
  type YMD,
} from '../nexus-core/agenda-time';

const TODAY: YMD = { y: 2026, m0: 7, d: 12 };

function resolve(raw: string) {
  return resolveDateExpression(raw, TODAY);
}

describe('resolveDateExpression — fim de período / mês', () => {
  it('resolve "fim de setembro" para o último dia do mês', () => {
    expect(resolve('fim de setembro')).toEqual({ iso: '2026-09-30', confidence: 'high' });
  });

  it('resolve "o fim de setembro" com artigo', () => {
    expect(resolve('o fim de setembro')).toEqual({ iso: '2026-09-30', confidence: 'high' });
  });

  it('resolve "até o fim de setembro" (prefixo até)', () => {
    expect(resolve('até o fim de setembro')).toEqual({ iso: '2026-09-30', confidence: 'high' });
  });

  it('resolve "fim de setembro de 2026" com ano explícito', () => {
    expect(resolve('fim de setembro de 2026')).toEqual({ iso: '2026-09-30', confidence: 'high' });
  });

  it('resolve "fim de dezembro de 2026" cruzando ano', () => {
    expect(resolve('fim de dezembro de 2026')).toEqual({ iso: '2026-12-31', confidence: 'high' });
  });

  it('resolve "até dezembro" para o fim de dezembro', () => {
    expect(resolve('até dezembro')).toEqual({ iso: '2026-12-31', confidence: 'high' });
  });

  it('resolve "fim do mês" para o último dia do mês corrente', () => {
    expect(resolve('fim do mês')).toEqual({ iso: '2026-08-31', confidence: 'high' });
  });

  it('resolve "fim do mês que vem" para o próximo mês', () => {
    expect(resolve('fim do mês que vem')).toEqual({ iso: '2026-09-30', confidence: 'high' });
  });
});

describe('resolveDateExpression — dias da semana (singular e plural)', () => {
  it('mantém "toda terça-feira" como próxima terça', () => {
    expect(resolve('toda terça-feira')).toEqual({ iso: '2026-08-18', confidence: 'high' });
  });

  it('resolve "toda terça feira" sem hífen', () => {
    expect(resolve('toda terça feira')).toEqual({ iso: '2026-08-18', confidence: 'high' });
  });

  it('resolve o plural "todas as terças"', () => {
    expect(resolve('todas as terças')).toEqual({ iso: '2026-08-18', confidence: 'high' });
  });

  it('resolve o plural "todas as terças-feiras"', () => {
    expect(resolve('todas as terças-feiras')).toEqual({ iso: '2026-08-18', confidence: 'high' });
  });

  it('resolve "terças que vem"', () => {
    expect(resolve('terças que vem')).toEqual({ iso: '2026-08-18', confidence: 'high' });
  });

  it('mantém "próxima quinta" e datas absolutas intactos', () => {
    expect(resolve('próxima quinta')).toEqual({ iso: '2026-08-13', confidence: 'high' });
    expect(resolve('25/08')).toEqual({ iso: '2026-08-25', confidence: 'high' });
  });

  it('mantém "última terça-feira de novembro de 2026"', () => {
    expect(resolve('última terça-feira de novembro de 2026')).toEqual({ iso: '2026-11-24', confidence: 'high' });
  });
});

describe('expandRecurrence — série de terças até o fim de setembro', () => {
  it('gera exatamente as 7 terças de 18/08 a 29/09', () => {
    const expanded = expandRecurrence({ freq: 'weekly', startIso: '2026-08-18', untilIso: '2026-09-30' });
    expect(expanded.occurrences).toEqual([
      '2026-08-18',
      '2026-08-25',
      '2026-09-01',
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29',
    ]);
    expect(expanded.first).toBe('2026-08-18');
    expect(expanded.last).toBe('2026-09-29');
    expect(expanded.truncated).toBe(false);
  });

  it('mantém fuso de produto estável', () => {
    expect(todayYmdInProductTimezone(new Date('2026-08-12T15:00:00.000Z'))).toEqual({ y: 2026, m0: 7, d: 12 });
  });
});

describe('resolveWindowExpression — janelas relativas', () => {
  it('resolve "nos próximos 5 dias"', () => {
    expect(resolveWindowExpression('nos próximos 5 dias', TODAY)).toBe('2026-08-17');
  });

  it('resolve "nos próximos 2 dias"', () => {
    expect(resolveWindowExpression('nos próximos 2 dias', TODAY)).toBe('2026-08-14');
  });

  it('resolve "próxima semana"', () => {
    expect(resolveWindowExpression('próxima semana', TODAY)).toBe('2026-08-19');
  });

  it('resolve "2 semanas"', () => {
    expect(resolveWindowExpression('2 semanas', TODAY)).toBe('2026-08-26');
  });

  it('resolve "1 mês"', () => {
    expect(resolveWindowExpression('1 mês', TODAY)).toBe('2026-09-12');
  });

  it('retorna null para texto não reconhecido', () => {
    expect(resolveWindowExpression('qualquer dia', TODAY)).toBeNull();
    expect(resolveWindowExpression('', TODAY)).toBeNull();
  });
});

describe('resolvePeriodRange — intervalo de mês inteiro', () => {
  const novStart = Date.UTC(2026, 10, 1) - 3 * 60 * 60 * 1000;
  const dezStart = Date.UTC(2026, 11, 1) - 3 * 60 * 60 * 1000;

  it('resolve "novembro" para [1º/11, 1º/12) em SP', () => {
    expect(resolvePeriodRange('novembro', TODAY)).toEqual({ startMs: novStart, endMs: dezStart });
  });

  it('resolve "em novembro" com preposição', () => {
    expect(resolvePeriodRange('em novembro', TODAY)).toEqual({ startMs: novStart, endMs: dezStart });
  });

  it('resolve "novembro de 2026" com ano explícito', () => {
    expect(resolvePeriodRange('novembro de 2026', TODAY)).toEqual({ startMs: novStart, endMs: dezStart });
  });

  it('resolve "mês que vem" relativo a hoje', () => {
    // Hoje é agosto/2026 → mês que vem = setembro.
    const setStart = Date.UTC(2026, 8, 1) - 3 * 60 * 60 * 1000;
    const outStart = Date.UTC(2026, 9, 1) - 3 * 60 * 60 * 1000;
    expect(resolvePeriodRange('mês que vem', TODAY)).toEqual({ startMs: setStart, endMs: outStart });
  });

  it('retorna null para expressões que não são mês puro', () => {
    expect(resolvePeriodRange('amanhã', TODAY)).toBeNull();
    expect(resolvePeriodRange('fim de setembro', TODAY)).toBeNull();
    expect(resolvePeriodRange('próxima terça-feira', TODAY)).toBeNull();
    expect(resolvePeriodRange('', TODAY)).toBeNull();
  });
});

describe('resolveDateExpression — prefixo composto "dia"', () => {
  it('resolve "até o dia 15/12/2026" para a data absoluta', () => {
    expect(resolve('até o dia 15/12/2026')).toEqual({ iso: '2026-12-15', confidence: 'high' });
  });

  it('resolve "o dia 15/12/2026" com artigo', () => {
    expect(resolve('o dia 15/12/2026')).toEqual({ iso: '2026-12-15', confidence: 'high' });
  });

  it('resolve "no dia 15/12/2026" com preposição', () => {
    expect(resolve('no dia 15/12/2026')).toEqual({ iso: '2026-12-15', confidence: 'high' });
  });

  it('resolve "até o dia de 15/12/2026" com "de"', () => {
    expect(resolve('até o dia de 15/12/2026')).toEqual({ iso: '2026-12-15', confidence: 'high' });
  });

  it('resolve "até o dia 15 de dezembro de 2026" por extenso', () => {
    expect(resolve('até o dia 15 de dezembro de 2026')).toEqual({ iso: '2026-12-15', confidence: 'high' });
  });
});