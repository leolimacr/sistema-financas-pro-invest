import type { AgendaCommitment } from '../services/agendaService';

// Ordenação manual dos compromissos DENTRO de um mesmo dia.
//
// `order` (número explícito) é a fonte de verdade quando presente — a ordem que
// o usuário definiu na UI prevalece sobre o horário (reordenação totalmente
// manual). Compromissos legados (sem `order`, criados antes deste campo) caem
// num fallback estável (time → createdAt → id) e ficam agrupados ANTES dos
// itens já ordenados — assim uma nova inserção anexa ao fim do dia.

function timestampMs(c: AgendaCommitment): number {
  if (!c.createdAt) return 0;
  return c.createdAt instanceof Date ? c.createdAt.getTime() : c.createdAt.toMillis();
}

export function compareDayCommitments(a: AgendaCommitment, b: AgendaCommitment): number {
  const aHas = typeof a.order === 'number';
  const bHas = typeof b.order === 'number';
  if (aHas !== bHas) return aHas ? 1 : -1;
  if (aHas && bHas) {
    if (a.order !== b.order) return (a.order ?? 0) - (b.order ?? 0);
    return (a.id ?? '').localeCompare(b.id ?? '');
  }
  const ta = a.time ?? '';
  const tb = b.time ?? '';
  if (ta !== tb) return ta.localeCompare(tb);
  const ca = timestampMs(a);
  const cb = timestampMs(b);
  if (ca !== cb) return ca - cb;
  return (a.id ?? '').localeCompare(b.id ?? '');
}

/** Move o item em `fromIndex` para `toIndex` e re-normaliza `order` 0..n-1.
 * Imutável: devolve um novo array (mesma referência se nada mudar). */
export function moveCommitment(
  list: AgendaCommitment[],
  fromIndex: number,
  toIndex: number
): AgendaCommitment[] {
  if (fromIndex === toIndex) return list;
  if (fromIndex < 0 || fromIndex >= list.length) return list;
  if (toIndex < 0 || toIndex >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((c, i) => ({ ...c, order: i }));
}

/** Próximo `order` para um compromisso recém-criado no dia: sempre anexa ao fim
 * (max explícito + 1; 0 quando o dia ainda é inteiramente legado — o comparador
 * coloca itens com `order` após o grupo legado). */
export function nextOrderForDay(list: AgendaCommitment[]): number {
  let max = -1;
  for (const c of list) {
    if (typeof c.order === 'number' && c.order > max) max = c.order;
  }
  return max + 1;
}

function dayKeyOf(c: AgendaCommitment): string {
  const d = c.date instanceof Date ? c.date : c.date.toDate();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Substitui no array do mês apenas os itens do dia alvo pelos novos (ordem
 * reordenada). Devolve a MESMA referência se o dia não está presente. */
export function replaceDayInMonth(
  monthList: AgendaCommitment[],
  dayKey: string,
  newDayItems: AgendaCommitment[]
): AgendaCommitment[] {
  const dayItems = monthList.filter((c) => dayKeyOf(c) === dayKey);
  if (dayItems.length === 0) return monthList;
  const kept = monthList.filter((c) => dayKeyOf(c) !== dayKey);
  return [...kept, ...newDayItems];
}