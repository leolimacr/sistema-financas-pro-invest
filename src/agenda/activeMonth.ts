import { type YearMonth } from './monthMath';

export type { YearMonth };

export interface MonthSectionRect {
  year: number;
  month: number;
  top: number;
  bottom: number;
}

// Mês ativo do cabeçalho: a primeira seção mensal (da mais alta para a mais
// baixa) que contém estritamente a linha de referência — o fim do cabeçalho
// sticky. Enquanto a linha estiver dentro da mesma seção o rótulo não muda;
// só alterna quando a fronteira do próximo mês cruza a linha.
export function pickActiveMonth(sections: MonthSectionRect[], referenceY: number): YearMonth | null {
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.top <= referenceY && s.bottom >= referenceY) return { year: s.year, month: s.month };
    const next = sections[i + 1];
    if (next && s.bottom < referenceY && next.top > referenceY) {
      return { year: next.year, month: next.month };
    }
  }
  return null;
}
