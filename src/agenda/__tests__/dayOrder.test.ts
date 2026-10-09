import { describe, it, expect } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import type { AgendaCommitment } from '../../services/agendaService';
import { compareDayCommitments, moveCommitment, nextOrderForDay, replaceDayInMonth } from '../dayOrder';

function ts(d: Date): Timestamp {
  return { toDate: () => d, toMillis: () => d.getTime() } as unknown as Timestamp;
}

function make(id: string, opts: { id?: string; order?: number; time?: string; createdAt?: Date; date?: Date } = {}): AgendaCommitment {
  const date = opts.date ?? new Date(2026, 7, 1, 9);
  const createdAt = opts.createdAt ? ts(opts.createdAt) : undefined;
  return {
    id: opts.id ?? id,
    date: ts(date),
    title: `Título ${id}`,
    completed: false,
    ...(opts.order !== undefined ? { order: opts.order } : {}),
    ...(opts.time !== undefined ? { time: opts.time } : {}),
    ...(createdAt ? { createdAt } : {}),
  } as AgendaCommitment;
}

describe('compareDayCommitments', () => {
  it('ordena por order explícito quando ambos têm', () => {
    const a = make('a', { order: 2 });
    const b = make('b', { order: 0 });
    const c = make('c', { order: 1 });
    const list = [a, b, c];
    list.sort(compareDayCommitments);
    expect(list.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('coloca itens com order depois do grupo legado (sem order)', () => {
    const legacy = make('legacy', { time: '09:00', createdAt: new Date(100) });
    const ordered = make('ordered', { order: 0 });
    expect(compareDayCommitments(legacy, ordered)).toBeLessThan(0);
  });

  it('legados ordenam por time, depois createdAt, depois id', () => {
    const late = make('late', { time: '18:00', createdAt: new Date(200) });
    const early = make('early', { time: '09:00', createdAt: new Date(100) });
    const noTimeOld = make('noTimeOld', { createdAt: new Date(50) });
    const noTimeNew = make('noTimeNew', { createdAt: new Date(500) });
    const list = [late, noTimeNew, noTimeOld, early];
    list.sort(compareDayCommitments);
    // '' < '09:00' < '18:00' no localeCompare: sem hora primeiro (compatível
    // com o Firestore, que ordena null antes nas buscas asc)
    expect(list.map((x) => x.id)).toEqual(['noTimeOld', 'noTimeNew', 'early', 'late']);
  });

  it('sem time e mesmo createdAt, desempata por id (determinístico)', () => {
    const a = make('b-id', { createdAt: new Date(100) });
    const b = make('a-id', { createdAt: new Date(100) });
    expect(compareDayCommitments(a, b)).toBeGreaterThan(0);
    expect(compareDayCommitments(b, a)).toBeLessThan(0);
  });
});

describe('moveCommitment', () => {
  function three(): AgendaCommitment[] {
    return [
      make('a', { order: 0 }),
      make('b', { order: 1 }),
      make('c', { order: 2 }),
    ];
  }

  it('move primeiro para o fim e re-normaliza ordens', () => {
    const out = moveCommitment(three(), 0, 2);
    expect(out.map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(out.map((x) => x.order)).toEqual([0, 1, 2]);
  });

  it('move último para o início', () => {
    const out = moveCommitment(three(), 2, 0);
    expect(out.map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(out.map((x) => x.order)).toEqual([0, 1, 2]);
  });

  it('move do meio para baixo', () => {
    const out = moveCommitment(three(), 1, 2);
    expect(out.map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });

  it('é imutável — mesma referência quando nada muda, nova referência quando muda', () => {
    const list = three();
    expect(moveCommitment(list, 1, 1)).toBe(list);
    const moved = moveCommitment(list, 1, 2);
    expect(moved).not.toBe(list);
    expect(list.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(list.map((x) => x.order)).toEqual([0, 1, 2]);
  });

  it('ignora índices fora do array', () => {
    const list = three();
    expect(moveCommitment(list, -1, 0)).toBe(list);
    expect(moveCommitment(list, 0, 3)).toBe(list);
  });

  it('normaliza legados (sem order) ao reordenar', () => {
    const legacy = make('a', { createdAt: new Date(100) });
    const legacy2 = make('b', { createdAt: new Date(200) });
    const out = moveCommitment([legacy, legacy2], 1, 0);
    expect(out.map((x) => x.id)).toEqual(['b', 'a']);
    expect(out.map((x) => x.order)).toEqual([0, 1]);
  });
});

describe('nextOrderForDay', () => {
  it('anexa após o maior order explícito', () => {
    const list = [
      make('a', { order: 0 }),
      make('b', { order: 3 }),
    ];
    expect(nextOrderForDay(list)).toBe(4);
  });

  it('dia inteiramente legado devolve 0 (vai para o fim pelo comparador)', () => {
    const list = [
      make('a', { createdAt: new Date(100) }),
      make('b', { createdAt: new Date(200) }),
    ];
    expect(nextOrderForDay(list)).toBe(0);
  });

  it('dia vazio devolve 0', () => {
    expect(nextOrderForDay([])).toBe(0);
  });
});

describe('replaceDayInMonth', () => {
  const day1a = make('a', { date: new Date(2026, 7, 1, 9) });
  const day1b = make('b', { date: new Date(2026, 7, 1, 10) });
  const day2 = make('c', { date: new Date(2026, 7, 2, 9) });

  it('substitui apenas os itens do dia alvo', () => {
    const month = [day1a, day2, day1b];
    const reordered = [make('b', { order: 0 }), make('a', { order: 1 })];
    const out = replaceDayInMonth(month, '2026-7-1', reordered);
    expect(out).toHaveLength(3);
    expect(out.filter((x) => x.id === 'c')).toHaveLength(1);
    const dayItems = out.filter((x) => x.id === 'a' || x.id === 'b');
    expect(dayItems.map((x) => x.order)).toEqual([0, 1]);
  });

  it('devolve a mesma referência quando o dia não está presente', () => {
    const month = [day2];
    expect(replaceDayInMonth(month, '2026-7-1', [day1a])).toBe(month);
  });
});