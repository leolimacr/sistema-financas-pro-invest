// Matemática de mês pura para a Agenda — sem DOM, sem React.

export interface YearMonth {
  year: number;
  month: number;
}

// Direção física do gesto — definição ÚNICA da agenda. Consumida pelo hook
// (useInfiniteMonthScroll), pelo AgendaHub e pelos testes sem duplicação.
export type ScrollDirection = 'forward' | 'backward';

// Chave canônica de mês — formato com zero-pad (`2026-05`), usado em
// groupSeedByMonth, no Record<string, AgendaCommitment[]> de meses carregados,
// no atributo `data-month-section` do render e em todas as buscas por seção.
// Fonte única: nunca monte a chave com template literal fora daqui.
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// Avança/recua `offset` meses a partir de (year, month), cruzando fronteiras de
// ano. Equivale a normalizar `month + offset` com os loops while de AgendaHub.
export function shiftMonth(year: number, month: number, offset: number): YearMonth {
  const total = year * 12 + month + offset;
  return {
    year: Math.floor(total / 12),
    month: ((total % 12) + 12) % 12,
  };
}

// Diferença em meses de (fromYear, fromMonth) até (toYear, toMonth):
// dezembro de um ano → janeiro do seguinte = +1; janeiro → dezembro anterior = -1.
export function monthsBetween(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number,
): number {
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

// Estende o stream de meses em UMA operação atômica, na direção pedida.
// - count é normalizado para inteiro positivo;
// - forward: adiciona até `count` meses após o último mês;
// - backward: adiciona até `count` meses antes do primeiro mês;
// - preserva ordem cronológica e nunca insere duplicatas;
// - se count <= 0, stream vazio ou nenhum mês novo necessário, devolve a MESMA
//   referência anterior (sem mutação).
export function extendMonthStream(
  stream: YearMonth[],
  direction: ScrollDirection,
  count: number,
): YearMonth[] {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount === 0 || stream.length === 0) return stream;

  if (direction === 'forward') {
    const last = stream[stream.length - 1];
    const added: YearMonth[] = [];
    for (let i = 1; i <= safeCount; i++) {
      const next = shiftMonth(last.year, last.month, i);
      if (stream.some((m) => m.year === next.year && m.month === next.month)) break;
      added.push(next);
    }
    if (added.length === 0) return stream;
    return [...stream, ...added];
  }

  const first = stream[0];
  const added: YearMonth[] = [];
  for (let i = safeCount; i >= 1; i--) {
    const prev = shiftMonth(first.year, first.month, -i);
    if (!stream.some((m) => m.year === prev.year && m.month === prev.month)) {
      added.push(prev);
    }
  }
  // O loop decrescente já gera meses ascendentes; ordenar garante ordem
  // cronológica mesmo quando uma duplicata no meio é pulada.
  added.sort((a, b) => monthsBetween(b.year, b.month, a.year, a.month));
  if (added.length === 0) return stream;
  return [...added, ...stream];
}

// Existe mês no stream além da distância máxima do mês ativo? Mesma regra da
// poda da agenda: Math.abs(monthsBetween(item, active)) > maxDistance.
export function hasDistantMonths(
  stream: YearMonth[],
  active: YearMonth,
  maxDistance: number,
): boolean {
  return stream.some((m) =>
    Math.abs(monthsBetween(active.year, active.month, m.year, m.month)) > maxDistance,
  );
}