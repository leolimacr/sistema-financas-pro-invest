import React from 'react';
import type { Timestamp } from 'firebase/firestore';
import type { AgendaCommitment } from '../services/agendaService';
import type { YearMonth } from './useInfiniteMonthScroll';

export interface AgendaHubProps {
  onNavigate?: (tool: string, state?: any) => void;
  /** Modo de validação dev: compromissos em memória, sem Firebase (página dev-agenda.html). */
  seedCommitments?: AgendaCommitment[];
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Altura única de cada faixa da agenda — fonte única de verdade para TODAS as
// linhas (vazias, compromisso de 1 linha e cada fragmento de compromisso multilinha).
export const AGENDA_ROW_HEIGHT = 28;

// Pauta única do caderno: uma linha horizontal no fim de cada faixa, derivada da
// mesma constante AGENDA_ROW_HEIGHT. Aplicada UMA vez no wrapper do caderno;
// nenhuma linha desenha a própria régua.
export const agendaPautaStyle: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${AGENDA_ROW_HEIGHT - 1}px, var(--agenda-pauta-color, #7dd3fc) ${AGENDA_ROW_HEIGHT - 1}px ${AGENDA_ROW_HEIGHT}px)`,
};

// Limite máximo de "Próximos Compromissos" e chave de persistência (localStorage)
export const UPCOMING_LIMIT_MAX = 50;
export const UPCOMING_LIMIT_KEY = 'fpi-agenda-proximos-limit';

export function getInitialUpcomingLimit(): number {
  try {
    const v = Number(localStorage.getItem(UPCOMING_LIMIT_KEY));
    if (Number.isFinite(v) && v >= 1) return Math.min(Math.floor(v), UPCOMING_LIMIT_MAX);
  } catch {
    /* localStorage indisponível — usa padrão */
  }
  return 5;
}

// Janela (ms) em que a extensão automática fica suspensa após uma navegação
// programática de mês — cobre a duração do scroll smooth até a seção alvo.
export const MONTH_NAV_SUPPRESS_MS = 500;

export function measureCommitLines(el: HTMLElement): string[] | null {
  const textNode = Array.from(el.childNodes).find((n) => n.nodeType === Node.TEXT_NODE) as Text | undefined;
  if (!textNode) return null;
  const text = textNode.textContent ?? '';
  if (!text) return [''];
  try {
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    if (rects.length <= 1) return [text];
    const spansLines = (start: number, end: number): number => {
      const r = document.createRange();
      r.setStart(textNode, start);
      r.setEnd(textNode, end);
      return r.getClientRects().length;
    };
    const lines: string[] = [];
    let start = 0;
    while (start < text.length) {
      while (start < text.length && /\s/.test(text[start])) start++;
      if (start >= text.length) break;
      let lineEnd = start;
      let idx = start;
      while (idx < text.length) {
        let wordEnd = idx;
        while (wordEnd < text.length && !/\s/.test(text[wordEnd])) wordEnd++;
        let afterWord = wordEnd;
        while (afterWord < text.length && /\s/.test(text[afterWord])) afterWord++;
        if (spansLines(start, afterWord) >= 2) break;
        lineEnd = afterWord;
        idx = afterWord;
      }
      if (lineEnd === start) {
        let lo = start + 1;
        let hi = text.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (spansLines(start, mid) >= 2) hi = mid;
          else lo = mid + 1;
        }
        lines.push(text.slice(start, lo - 1));
        start = lo - 1;
      } else {
        lines.push(text.slice(start, lineEnd));
        start = lineEnd;
      }
    }
    return lines;
  } catch {
    return [text];
  }
}

export function tsToDate(ts: Timestamp | Date): Date {
  return ts instanceof Date ? ts : ts.toDate();
}

export function toDateInputStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function groupSeedByMonth(seed: AgendaCommitment[] | undefined): Record<string, AgendaCommitment[]> {
  const out: Record<string, AgendaCommitment[]> = {};
  if (!seed) return out;
  for (const c of seed) {
    const d = tsToDate(c.date);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    (out[k] ??= []).push(c);
  }
  return out;
}

// Garante que (year, month) exista no stream mantendo a ordem cronológica.
// Se já existir, devolve a MESMA referência (sem mutação/duplicação).
export function withMonthInStream(stream: YearMonth[], year: number, month: number): YearMonth[] {
  if (stream.some((m) => m.year === year && m.month === month)) return stream;
  const idx = stream.findIndex((m) => m.year > year || (m.year === year && m.month > month));
  if (idx === -1) return [...stream, { year, month }];
  if (idx === 0) return [{ year, month }, ...stream];
  return [...stream.slice(0, idx), { year, month }, ...stream.slice(idx)];
}

export function commitmentTimeLabel(c: AgendaCommitment): string {
  if (c.time) return c.time;
  const d = tsToDate(c.date);
  if (d.getHours() || d.getMinutes()) return formatTime(d);
  return '';
}
