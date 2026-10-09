import { describe, it, expect } from 'vitest';
import { extendMonthStream, hasDistantMonths, monthKey, monthsBetween, shiftMonth } from '../monthMath';

describe('monthMath — shiftMonth', () => {
  it('avança dezembro → janeiro do ano seguinte', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it('recua janeiro → dezembro do ano anterior', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('avanço dentro do mesmo ano', () => {
    expect(shiftMonth(2026, 5, 5)).toEqual({ year: 2026, month: 10 });
  });

  it('offset zero mantém o par intacto', () => {
    expect(shiftMonth(2026, 0, 0)).toEqual({ year: 2026, month: 0 });
    expect(shiftMonth(2026, 11, 0)).toEqual({ year: 2026, month: 11 });
  });

  it('offset cruza mais de um ano inteiro', () => {
    expect(shiftMonth(2026, 0, 13)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 0, -13)).toEqual({ year: 2024, month: 11 });
  });
});

describe('monthMath — monthsBetween', () => {
  it('diferença de um ano inteiro = 12', () => {
    expect(monthsBetween(2026, 0, 2027, 0)).toBe(12);
  });

  it('avanço simples de um mês', () => {
    expect(monthsBetween(2026, 0, 2026, 1)).toBe(1);
  });

  it('recuo de janeiro para dezembro do ano anterior = -1', () => {
    expect(monthsBetween(2026, 0, 2025, 11)).toBe(-1);
  });

  it('mesmo par = 0', () => {
    expect(monthsBetween(2026, 5, 2026, 5)).toBe(0);
  });

  it('atravessa a fronteira de ano (dezembro ↔ janeiro)', () => {
    expect(monthsBetween(2026, 11, 2027, 0)).toBe(1);
    expect(monthsBetween(2026, 11, 2026, 10)).toBe(-1);
  });
});

describe('monthMath — monthKey', () => {
  it('gera a chave `${year}-${month}` com zero-pad (fonte única, A4)', () => {
    expect(monthKey(2026, 11)).toBe('2026-11');
    expect(monthKey(2026, 0)).toBe('2026-00');
    expect(monthKey(2026, 4)).toBe('2026-04');
  });
});

describe('monthMath — extendMonthStream (extensão atômica)', () => {
  it('forward anexa `count` meses após o último', () => {
    const stream = [{ year: 2026, month: 0 }, { year: 2026, month: 1 }];
    expect(extendMonthStream(stream, 'forward', 2)).toEqual([
      { year: 2026, month: 0 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
      { year: 2026, month: 3 },
    ]);
  });

  it('forward cruza a fronteira de ano', () => {
    const stream = [{ year: 2026, month: 11 }];
    expect(extendMonthStream(stream, 'forward', 1)).toEqual([
      { year: 2026, month: 11 },
      { year: 2027, month: 0 },
    ]);
  });

  it('forward anexa a partir do último mês mesmo em stream não contíguo', () => {
    const stream = [
      { year: 2026, month: 0 },
      { year: 2026, month: 1 },
      { year: 2026, month: 3 },
    ];
    expect(extendMonthStream(stream, 'forward', 2)).toEqual([
      { year: 2026, month: 0 },
      { year: 2026, month: 1 },
      { year: 2026, month: 3 },
      { year: 2026, month: 4 },
      { year: 2026, month: 5 },
    ]);
  });

  it('backward anexa meses imediatamente anteriores ao primeiro mês do stream', () => {
    const stream = [
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2026, month: 0 },
    ];
    expect(extendMonthStream(stream, 'backward', 2)).toEqual([
      { year: 2025, month: 8 },
      { year: 2025, month: 9 },
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2026, month: 0 },
    ]);
  });

  it('backward não duplica mês já presente no stream (mesma referência)', () => {
    // Stream não ordenado contendo um mês anterior ao primeiro: o alvo do
    // backward já existe → nada a anexar.
    const stream = [
      { year: 2025, month: 8 },
      { year: 2025, month: 9 },
      { year: 2025, month: 7 },
    ];
    expect(extendMonthStream(stream, 'backward', 1)).toBe(stream);
  });

  it('backward pré-anexa `count` meses antes do primeiro, em ordem cronológica', () => {
    const stream = [{ year: 2026, month: 0 }, { year: 2026, month: 1 }];
    expect(extendMonthStream(stream, 'backward', 3)).toEqual([
      { year: 2025, month: 9 },
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2026, month: 0 },
      { year: 2026, month: 1 },
    ]);
  });

  it('backward cruza a fronteira de ano', () => {
    const stream = [{ year: 2026, month: 0 }];
    expect(extendMonthStream(stream, 'backward', 1)).toEqual([
      { year: 2025, month: 11 },
      { year: 2026, month: 0 },
    ]);
  });

  it('count <= 0 devolve a mesma referência (sem mutação)', () => {
    const stream = [{ year: 2026, month: 0 }];
    expect(extendMonthStream(stream, 'forward', 0)).toBe(stream);
    expect(extendMonthStream(stream, 'backward', -3)).toBe(stream);
  });

  it('stream vazio devolve a mesma referência', () => {
    const empty: { year: number; month: number }[] = [];
    expect(extendMonthStream(empty, 'forward', 5)).toBe(empty);
    expect(extendMonthStream(empty, 'backward', 5)).toBe(empty);
  });

  it('não muta o stream original', () => {
    const stream = [{ year: 2026, month: 0 }];
    extendMonthStream(stream, 'forward', 1);
    extendMonthStream(stream, 'backward', 1);
    expect(stream).toEqual([{ year: 2026, month: 0 }]);
  });
});

describe('monthMath — hasDistantMonths', () => {
  const active = { year: 2026, month: 0 };

  it('true quando existe mês além da distância máxima', () => {
    const stream = [
      { year: 2024, month: 0 },
      { year: 2026, month: 0 },
      { year: 2026, month: 1 },
    ];
    expect(hasDistantMonths(stream, active, 3)).toBe(true);
  });

  it('false quando todos os meses estão dentro da distância máxima', () => {
    const stream = [
      { year: 2025, month: 9 },
      { year: 2026, month: 0 },
      { year: 2026, month: 3 },
    ];
    expect(hasDistantMonths(stream, active, 3)).toBe(false);
  });

  it('distância exatamente igual ao máximo NÃO conta como distante', () => {
    const stream = [{ year: 2025, month: 9 }, { year: 2026, month: 3 }];
    expect(hasDistantMonths(stream, active, 3)).toBe(false);
  });

  it('stream vazio nunca tem meses distantes', () => {
    expect(hasDistantMonths([], active, 3)).toBe(false);
  });
});