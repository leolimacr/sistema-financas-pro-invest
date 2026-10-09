import { describe, expect, it } from 'vitest';
import {
  expandRecurrence,
  generateCommitmentId,
  generateSeriesId,
  lastWeekdayOfMonth,
  nextWeekday,
  resolveDateExpression,
  todayYmdInProductTimezone,
  ymdToIso,
  type YMD,
} from '../agenda-time';

const TODAY: YMD = { y: 2026, m0: 7, d: 12 };

describe('agenda-time', () => {
  it('resolve a próxima terça-feira no calendário do produto', () => {
    expect(resolveDateExpression('próxima terça-feira', TODAY)).toEqual({
      iso: '2026-08-18',
      confidence: 'high',
    });
  });

  it('resolve a última terça-feira de novembro de 2026', () => {
    expect(resolveDateExpression('última terça-feira de novembro de 2026', TODAY)).toEqual({
      iso: '2026-11-24',
      confidence: 'high',
    });
  });

  it('calcula nextWeekday estritamente depois do anchor', () => {
    const nextTuesday = nextWeekday(TODAY, 2);
    expect(ymdToIso(nextTuesday)).toBe('2026-08-18');
  });

  it('calcula o último weekday sem depender do timezone do processo', () => {
    expect(ymdToIso(lastWeekdayOfMonth(2026, 10, 2))).toBe('2026-11-24');
  });

  it('expande as 15 terças do exemplo', () => {
    const expanded = expandRecurrence({
      freq: 'weekly',
      startIso: '2026-08-18',
      untilIso: '2026-11-24',
    });

    expect(expanded.truncated).toBe(false);
    expect(expanded.occurrences).toHaveLength(15);
    expect(expanded.first).toBe('2026-08-18');
    expect(expanded.last).toBe('2026-11-24');
  });

  it('limita uma recorrência diária de dois anos a 366 ocorrências', () => {
    const expanded = expandRecurrence({
      freq: 'daily',
      startIso: '2026-01-01',
      untilIso: '2027-12-31',
    });

    expect(expanded.truncated).toBe(true);
    expect(expanded.occurrences).toHaveLength(366);
    expect(expanded.first).toBe('2026-01-01');
    expect(expanded.last).toBe('2027-01-01');
  });

  it('gera IDs determinísticos e diferentes para ocorrências diferentes', () => {
    const series = generateSeriesId('Reunião com o coordenador', '2026-08-18');
    expect(series).toBe(generateSeriesId('  reunião com o coordenador ', '2026-08-18'));
    expect(series).toMatch(/^srv_[a-f0-9]{16}$/);

    const first = generateCommitmentId(series, '2026-08-18', '17:00');
    const second = generateCommitmentId(series, '2026-08-25', '17:00');
    expect(first).toMatch(/^nex_[a-f0-9]{16}$/);
    expect(second).not.toBe(first);
  });

  it('lê o dia civil correto no fuso oficial', () => {
    const now = new Date('2026-08-12T02:00:00.000Z');
    expect(todayYmdInProductTimezone(now)).toEqual({ y: 2026, m0: 7, d: 11 });
  });

  it('resolve "todos os domingos do mês de setembro" para o primeiro domingo do mês', () => {
    expect(resolveDateExpression('todos os domingos do mês de setembro', TODAY)).toEqual({
      iso: '2026-09-06',
      confidence: 'high',
    });
  });

  it('resolve "todas as terças-feiras de dezembro de 2026" cruzando ano', () => {
    expect(resolveDateExpression('todas as terças-feiras de dezembro de 2026', TODAY)).toEqual({
      iso: '2026-12-01',
      confidence: 'high',
    });
  });
});
