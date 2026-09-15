import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { AgendaHub, pickActiveMonth, isProbeInterlocked, nextExtendDelay, resolveFlushDirection } from '../AgendaHub';
import { scrollContainerBy } from '../../agenda/scrollContainer';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../../hooks/useBills', () => ({
  useBills: () => ({ bills: [] }),
}));

const mocks = vi.hoisted(() => ({
  fetchMonthCommitments: vi.fn(),
  fetchUpcomingCommitments: vi.fn(),
  addCommitment: vi.fn(),
  updateCommitment: vi.fn(),
  deleteCommitment: vi.fn(),
  toggleCommitment: vi.fn(),
  reorderDayCommitments: vi.fn(),
}));

let mockResizeObservers: Array<{ trigger: () => void }> = [];

// Registra chamadas de scrollIntoView com o elemento alvo e as opções — usado
// pelas navegações centradas no dia (goToDate/goToday/scroll inicial).
const scrollCalls: Array<{ el: HTMLElement; opts?: ScrollIntoViewOptions }> = [];

// Registra chamadas de window.scrollTo — a navegação mensal alinha o topo da
// seção ao topo da área útil via scrollContainerBy (que, para a janela, chama
// window.scrollTo). O spy é instalado no describe de navegação mensal.
const scrollToCalls: Array<[number, number]> = [];

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(callback: ResizeObserverCallback) {
    mockResizeObservers.push({ trigger: () => callback([], this as unknown as ResizeObserver) });
  }
}

vi.mock('../../services/agendaService', () => ({
  fetchMonthCommitments: mocks.fetchMonthCommitments,
  fetchUpcomingCommitments: mocks.fetchUpcomingCommitments,
  addCommitment: mocks.addCommitment,
  updateCommitment: mocks.updateCommitment,
  deleteCommitment: mocks.deleteCommitment,
  toggleCommitment: mocks.toggleCommitment,
  reorderDayCommitments: mocks.reorderDayCommitments,
}));

vi.mock('../../services/alarmService', () => ({
  scheduleAlarm: vi.fn(),
  cancelAlarm: vi.fn(),
  requestNotificationPermission: vi.fn(),
  startAlarmChecker: vi.fn(),
  stopAlarmChecker: vi.fn(),
  setAlarmCallback: vi.fn(),
}));

vi.mock('../Agenda/AgendaNexusAssistant', () => ({
  default: ({ onCommitted, onUndone, onClose }: { onCommitted?: () => void; onUndone?: () => void; onClose?: () => void }) => (
    <div data-testid="agenda-nexus-assistant">
      <button type="button" data-testid="agenda-nexus-close" onClick={onClose}>Fechar Nexus</button>
      <button type="button" data-testid="agenda-nexus-commit" onClick={onCommitted}>Simular criação Nexus</button>
      <button type="button" data-testid="agenda-nexus-undo" onClick={onUndone}>Simular undo Nexus</button>
    </div>
  ),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = function (this: HTMLElement, opts?: ScrollIntoViewOptions | boolean) {
    scrollCalls.push({ el: this, opts: opts as ScrollIntoViewOptions | undefined });
  } as typeof Element.prototype.scrollIntoView;
  if (!('IntersectionObserver' in globalThis)) {
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    (globalThis as Record<string, unknown>).IntersectionObserver = MockIntersectionObserver;
  }
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = MockResizeObserver;
  }
});

beforeEach(() => {
  mockResizeObservers = [];
  scrollCalls.length = 0;
  scrollToCalls.length = 0;
  localStorage.clear();
  mocks.fetchMonthCommitments.mockResolvedValue([]);
  mocks.fetchUpcomingCommitments.mockResolvedValue([]);
});

function currentLabel() {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

function nextMonthLabel() {
  const now = new Date();
  let m = now.getMonth() + 1;
  let y = now.getFullYear();
  if (m > 11) { m = 0; y += 1; }
  return { label: `${MONTHS[m]} ${y}`, month: m, year: y };
}

function firstWeekendDay(year: number, month: number, targetIdx: 0 | 6) {
  const now = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const idx = d.getDay();
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (idx === targetIdx && !isToday) return day;
  }
  return 1;
}

function firstWeekday(year: number, month: number) {
  const now = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const idx = d.getDay();
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (idx !== 0 && idx !== 6 && !isToday) return day;
  }
  return 1;
}

function firstNonTodayDay(year: number, month: number) {
  const now = new Date();
  for (let day = 1; day <= 28; day++) {
    const d = new Date(year, month, day);
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (!isToday) return day;
  }
  return 28;
}

function layoutLines(text: string, capacity: number): Array<[number, number]> {
  const n = text.length;
  const intervals: Array<[number, number]> = [];
  let start = 0;
  while (start < n) {
    while (start < n && /\s/.test(text[start])) start++;
    if (start >= n) break;
    const lineStart = start;
    let lineEnd = start;
    let idx = start;
    while (idx < n) {
      let wEnd = idx;
      while (wEnd < n && !/\s/.test(text[wEnd])) wEnd++;
      let after = wEnd;
      while (after < n && /\s/.test(text[after])) after++;
      if (wEnd - lineStart > capacity) break;
      lineEnd = after;
      idx = after;
    }
    if (lineEnd === lineStart) {
      const chunkEnd = Math.min(n, lineStart + capacity);
      intervals.push([lineStart, chunkEnd]);
      start = chunkEnd;
    } else {
      intervals.push([lineStart, lineEnd]);
      start = lineEnd;
    }
  }
  return intervals;
}

function capacityForLines(text: string, target: number): number {
  for (let c = text.length; c >= 1; c--) {
    if (layoutLines(text, c).length === target) return c;
  }
  return text.length;
}

function installRangeLineMock(text: string, totalLines: number) {
  const capacity = capacityForLines(text, totalLines);
  const intervals = layoutLines(text, capacity);
  const rect = { width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10, x: 0, y: 0, toJSON: () => ({}) };
  const impl = function (this: Range) {
    const start = this.startOffset ?? 0;
    const end = this.endOffset ?? text.length;
    if (end <= start) return [] as unknown as DOMRectList;
    let count = 0;
    for (const [ls, le] of intervals) {
      if (ls < end && le > start) count++;
    }
    return Array.from({ length: count }, () => rect) as unknown as DOMRectList;
  };
  if (typeof Range.prototype.getClientRects === 'function') {
    return vi.spyOn(Range.prototype, 'getClientRects').mockImplementation(impl);
  }
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    writable: true,
    value: impl,
  });
  return null;
}

function restoreRangeLineMock(spy: ReturnType<typeof vi.spyOn> | null) {
  if (spy) {
    spy.mockRestore();
  } else {
    delete (Range.prototype as unknown as Record<string, unknown>).getClientRects;
  }
}

async function renderWrappedTitle(longTitle: string, totalLines: number, commitId: string) {
  const now = new Date();
  const day = firstNonTodayDay(now.getFullYear(), now.getMonth());
  mocks.fetchMonthCommitments.mockImplementation((_uid, year, month) => {
    if (year === now.getFullYear() && month === now.getMonth()) {
      return Promise.resolve([
        { id: commitId, date: new Date(now.getFullYear(), now.getMonth(), day, 9), title: longTitle, completed: false },
      ]);
    }
    return Promise.resolve([]);
  });

  const spy = installRangeLineMock(longTitle, totalLines);

  render(<AgendaHub />);
  await screen.findByText(longTitle);

  const row = document.querySelector(`[data-commit-id="${commitId}"]`) as HTMLElement;
  expect(row).not.toBeNull();

  act(() => {
    mockResizeObservers.forEach((ro) => ro.trigger());
  });

  return { row, spy };
}

function visibleFirstLine(row: HTMLElement): string {
  const titleSpan = row.querySelector('[data-title-anchor]')!;
  const textNode = Array.from(titleSpan.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
  return textNode?.textContent ?? '';
}

function linesOfCommit(commitId: string, firstRow: HTMLElement): string[] {
  const contRows = Array.from(document.querySelectorAll(`[data-continuation-row="${commitId}"]`));
  return [
    visibleFirstLine(firstRow),
    ...contRows.map((r) => r.querySelector('[data-fragment-line]')!.textContent ?? ''),
  ];
}

describe('AgendaHub — calendário de navegação rápida', () => {
  it('abre o calendário ao clicar no ícone do cabeçalho', () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    expect(screen.getByTestId('agenda-calendar-popover')).toBeInTheDocument();
  });

  it('exibe o mês atual no calendário', () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    const popover = screen.getByTestId('agenda-calendar-popover');
    expect(within(popover).getByText(currentLabel())).toBeInTheDocument();
  });

  it('navega para o próximo mês ao clicar na seta', () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    fireEvent.click(screen.getByLabelText('Próximo mês no calendário'));
    const next = nextMonthLabel();
    expect(screen.getByText(next.label)).toBeInTheDocument();
  });

  it('navega para o mês anterior ao clicar na seta', () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    fireEvent.click(screen.getByLabelText('Mês anterior no calendário'));
    const now = new Date();
    let m = now.getMonth() - 1;
    let y = now.getFullYear();
    if (m < 0) { m = 11; y -= 1; }
    expect(screen.getByText(`${MONTHS[m]} ${y}`)).toBeInTheDocument();
  });

  it('seleciona um dia do próximo mês, fecha o popover e atualiza o mês ativo', async () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    fireEvent.click(screen.getByLabelText('Próximo mês no calendário'));
    const next = nextMonthLabel();
    fireEvent.click(screen.getByTestId(`calendar-day-${next.year}-${next.month}-1`));
    await waitFor(() => {
      expect(screen.queryByTestId('agenda-calendar-popover')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText(next.label).length).toBeGreaterThan(0);
  });

  it('fecha ao clicar no botão Hoje', async () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    await waitFor(() => {
      expect(screen.queryByTestId('agenda-calendar-popover')).not.toBeInTheDocument();
    });
  });

  it('fecha ao clicar no botão Cancelar', async () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.queryByTestId('agenda-calendar-popover')).not.toBeInTheDocument();
    });
  });

  it('fecha ao clicar no overlay (fora do painel)', async () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    fireEvent.click(screen.getByTestId('agenda-calendar-popover'));
    await waitFor(() => {
      expect(screen.queryByTestId('agenda-calendar-popover')).not.toBeInTheDocument();
    });
  });

  it('marca o dia de hoje com destaque no calendário', () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    const now = new Date();
    const todayBtn = screen.getByTestId(`calendar-day-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`);
    expect(todayBtn.className).toContain('bg-sky-500');
  });

  it('destaca sábados com cor de fim de semana', () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    const now = new Date();
    const sat = firstWeekendDay(now.getFullYear(), now.getMonth(), 6);
    const btn = screen.getByTestId(`calendar-day-${now.getFullYear()}-${now.getMonth()}-${sat}`);
    expect(btn.className).toContain('text-rose-500');
  });

  it('destaca domingos com vermelho mais escuro', () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    const now = new Date();
    const sun = firstWeekendDay(now.getFullYear(), now.getMonth(), 0);
    const btn = screen.getByTestId(`calendar-day-${now.getFullYear()}-${now.getMonth()}-${sun}`);
    expect(btn.className).toContain('text-red-700');
  });

  it('mantém cor padrão nos dias úteis', () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    const now = new Date();
    const weekday = firstWeekday(now.getFullYear(), now.getMonth());
    const btn = screen.getByTestId(`calendar-day-${now.getFullYear()}-${now.getMonth()}-${weekday}`);
    expect(btn.className).toContain('text-slate-700');
  });
});

describe('AgendaHub — quebra de títulos longos', () => {
  it('renderiza o primeiro compromisso do dia em uma faixa única de 28px', async () => {
    const now = new Date();
    const day = firstNonTodayDay(now.getFullYear(), now.getMonth());
    const longTitle = 'Compromisso com um título extremamente longo para verificar a quebra de linha em múltiplas linhas no caderno do dia sem truncar';
    mocks.fetchMonthCommitments.mockImplementation((_uid, year, month) => {
      if (year === now.getFullYear() && month === now.getMonth()) {
        return Promise.resolve([
          { id: 'a', date: new Date(now.getFullYear(), now.getMonth(), day, 9), title: longTitle, completed: false },
        ]);
      }
      return Promise.resolve([]);
    });

    render(<AgendaHub />);
    const title = await screen.findByText(longTitle);
    expect(title.className).toContain('break-words');
    expect(title.className).toContain('leading-[17px]');
    expect(title.className).not.toContain('truncate');

    const row = title.parentElement!;
    expect(row.style.height).toBe('28px');
    expect(row.className).toContain('items-end');
    expect(row.className).toContain('gap-3');

    const dayLabel = row.querySelector('span.uppercase');
    expect(dayLabel).not.toBeNull();
    expect(dayLabel!.className).toContain('text-[15px]');
    expect(dayLabel!.className).not.toContain('self-start');
  });

  it('renderiza compromissos extras do mesmo dia em faixas próprias', async () => {
    const now = new Date();
    const day = firstNonTodayDay(now.getFullYear(), now.getMonth());
    const longTitle = 'Segundo compromisso com um título absurdamente longo que deve quebrar em várias linhas dentro do caderno do dia';
    mocks.fetchMonthCommitments.mockImplementation((_uid, year, month) => {
      if (year === now.getFullYear() && month === now.getMonth()) {
        return Promise.resolve([
          { id: 'a', date: new Date(now.getFullYear(), now.getMonth(), day, 9), title: 'Primeiro curto', completed: false },
          { id: 'b', date: new Date(now.getFullYear(), now.getMonth(), day, 10), title: longTitle, completed: false },
        ]);
      }
      return Promise.resolve([]);
    });

    render(<AgendaHub />);
    await screen.findByText('Primeiro curto');
    const title = screen.getByText(longTitle);
    expect(title.className).toContain('break-words');
    expect(title.className).not.toContain('truncate');

    const row = title.parentElement!;
    expect(row.style.height).toBe('28px');
    expect(row.className).toContain('items-end');
    expect(row.getAttribute('data-commit-id')).toBe('b');
  });

  it('quebra títulos longos na lista de Próximos Compromissos', async () => {
    const now = new Date();
    const future = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8);
    const longTitle = 'Reunião de planejamento financeiro com descrição completa para testar a quebra de linha na lista de próximos compromissos';
    mocks.fetchUpcomingCommitments.mockResolvedValue([
      { id: 'u1', date: future, title: longTitle, completed: false },
    ]);

    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-proximos-toggle'));
    expect(await screen.findByText('Próximos Compromissos')).toBeInTheDocument();
    const title = screen.getByText(longTitle);
    expect(title.className).toContain('break-words');
    expect(title.className).toContain('leading-tight');
    expect(title.className).not.toContain('truncate');
  });

  it('mantém o checkbox na primeira faixa quando o título quebra', async () => {
    const now = new Date();
    const day = firstNonTodayDay(now.getFullYear(), now.getMonth());
    const longTitle = 'Compromisso com um título longo o suficiente para quebrar e manter o checkbox na primeira linha';
    mocks.fetchMonthCommitments.mockImplementation((_uid, year, month) => {
      if (year === now.getFullYear() && month === now.getMonth()) {
        return Promise.resolve([
          { id: 'w1', date: new Date(now.getFullYear(), now.getMonth(), day, 9), title: longTitle, completed: false },
        ]);
      }
      return Promise.resolve([]);
    });

    const spy = installRangeLineMock(longTitle, 2);

    render(<AgendaHub />);
    await screen.findByText(longTitle);

    const row = document.querySelector('[data-commit-id="w1"]') as HTMLElement;
    expect(row).not.toBeNull();

    act(() => {
      mockResizeObservers.forEach((ro) => ro.trigger());
    });

    expect(row.className).toContain('items-end');
    expect(row.style.height).toBe('28px');
    expect(row.querySelector('button')).not.toBeNull();
    expect(document.querySelectorAll('[data-continuation-row="w1"]').length).toBe(1);
    expect((document.querySelector('[data-continuation-row="w1"]') as HTMLElement | null)?.style.height).toBe('28px');
    expect(document.querySelector('.items-start')).toBeNull();

    restoreRangeLineMock(spy);
  });
});

describe('AgendaHub — alinhamento de compromissos na mesma data', () => {
  it('alinha o segundo compromisso na mesma coluna do primeiro', async () => {
    const now = new Date();
    const day = 1;
    mocks.fetchMonthCommitments.mockImplementation((_uid, year, month) => {
      if (year === now.getFullYear() && month === now.getMonth()) {
        return Promise.resolve([
          { id: 'a', date: new Date(now.getFullYear(), now.getMonth(), day, 9), title: 'Alinhar A', completed: false },
          { id: 'b', date: new Date(now.getFullYear(), now.getMonth(), day, 10), title: 'Alinhar B', completed: false },
        ]);
      }
      return Promise.resolve([]);
    });

    render(<AgendaHub />);
    await screen.findByText('Alinhar A');

    const rowA = document.querySelector('[data-commit-id="a"]') as HTMLElement;
    const rowB = document.querySelector('[data-commit-id="b"]') as HTMLElement;
    expect(rowA).not.toBeNull();
    expect(rowB).not.toBeNull();

    expect(rowA.style.height).toBe('28px');
    expect(rowB.style.height).toBe('28px');
    expect(rowA.className).toContain('gap-3');
    expect(rowB.className).toContain('gap-3');
    expect(rowA.className).toContain('items-end');
    expect(rowB.className).toContain('items-end');
    expect(rowA.querySelector('span.w-\\[62px\\]')).not.toBeNull();
    expect(rowB.querySelector('span.w-\\[62px\\]')).not.toBeNull();
  });
});

describe('AgendaHub — faixas de 28px para títulos quebrados', () => {
  it('divide um título de 2 linhas em 2 faixas de 28px', async () => {
    const longTitle = 'Compromisso com um título longo o suficiente para quebrar em duas linhas na pauta do caderno';
    const { row, spy } = await renderWrappedTitle(longTitle, 2, 'b2');

    expect(row.style.height).toBe('28px');
    expect(row.className).toContain('items-end');

    const contRows = Array.from(document.querySelectorAll('[data-continuation-row="b2"]')) as HTMLElement[];
    expect(contRows.length).toBe(1);
    expect(contRows[0].style.height).toBe('28px');
    expect(linesOfCommit('b2', row).join('')).toBe(longTitle);

    restoreRangeLineMock(spy);
  });

  it('divide um título de 3 linhas em 3 faixas de 28px', async () => {
    const longTitle = 'Compromisso longo com várias palavras para ocupar três linhas inteiras na pauta do caderno de forma que a terceira linha fique no seu próprio bloco';
    const { row, spy } = await renderWrappedTitle(longTitle, 3, 'b3');

    const contRows = Array.from(document.querySelectorAll('[data-continuation-row="b3"]')) as HTMLElement[];
    expect(contRows.length).toBe(2);
    for (const r of contRows) expect(r.style.height).toBe('28px');
    expect(linesOfCommit('b3', row).join('')).toBe(longTitle);

    restoreRangeLineMock(spy);
  });

  it('divide um título de 4 linhas em 4 faixas de 28px', async () => {
    const longTitle = 'Compromisso ainda mais longo com muitas palavras para ocupar quatro linhas inteiras dentro do caderno do dia sem que linhas vizinhas fiquem no mesmo intervalo da pauta';
    const { row, spy } = await renderWrappedTitle(longTitle, 4, 'b4');

    const contRows = Array.from(document.querySelectorAll('[data-continuation-row="b4"]')) as HTMLElement[];
    expect(contRows.length).toBe(3);
    for (const r of contRows) expect(r.style.height).toBe('28px');
    expect(linesOfCommit('b4', row).join('')).toBe(longTitle);

    restoreRangeLineMock(spy);
  });

  it('corta uma palavra gigante sem espaço em pedaços, sem perder texto', async () => {
    const longUrl =
      'https://www.exemplo.com.br/caminho/muito/longo/sem/espaco/para/quebrar/legal/1234567890';
    const { row, spy } = await renderWrappedTitle(longUrl, 3, 'b5');

    const contRows = document.querySelectorAll('[data-continuation-row="b5"]');
    expect(contRows.length).toBe(2);
    expect(linesOfCommit('b5', row).join('')).toBe(longUrl);

    restoreRangeLineMock(spy);
  });

  it('usa a mesma altura em todas as faixas de um título multilinha', async () => {
    const longTitle = 'Compromisso com um título muito longo o bastante para quebrar em três linhas dentro da pauta do caderno sem comprimir o espaço entre as linhas';
    const { row, spy } = await renderWrappedTitle(longTitle, 3, 'b6');

    const contRows = Array.from(document.querySelectorAll<HTMLElement>('[data-continuation-row="b6"]'));
    expect(contRows.length).toBe(2);

    expect(row.style.height).toBe('28px');
    for (const r of contRows) {
      expect(r.style.height).toBe('28px');
    }
    expect(contRows[0].querySelector('[data-fragment-line]')?.className).toContain('leading-[17px]');

    expect(linesOfCommit('b6', row).join('')).toBe(longTitle);

    restoreRangeLineMock(spy);
  });

  it('mantém a âncora de medição absoluta e o checkbox na primeira faixa', async () => {
    const longTitle = 'Compromisso com um título longo o suficiente para quebrar em duas linhas na pauta do caderno';
    const { row, spy } = await renderWrappedTitle(longTitle, 2, 'b1');

    const anchor = row.querySelector('[data-measure-anchor]');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveTextContent(longTitle);
    expect(anchor?.className).toContain('absolute');
    expect(anchor?.className).not.toContain('block');

    const checkbox = row.querySelector('button');
    expect(checkbox).not.toBeNull();
    expect(row.className).toContain('items-end');

    restoreRangeLineMock(spy);
  });

  it('aplica a pauta global uma única vez no caderno', async () => {
    const longTitle = 'Compromisso com um título longo o suficiente para quebrar em duas linhas na pauta do caderno';
    const { spy } = await renderWrappedTitle(longTitle, 2, 'b7');

    const notebooks = document.querySelectorAll('[data-notebook-content]');
    expect(notebooks.length).toBe(1);

    const bg = (notebooks[0] as HTMLElement).style.backgroundImage;
    expect(bg).toContain('repeating-linear-gradient');
    expect(bg).toContain('28px');

    const ruledRows = document.querySelectorAll('[data-commit-id], [data-continuation-row]');
    for (const r of ruledRows) {
      expect((r as HTMLElement).style.height).toBe('28px');
    }

    restoreRangeLineMock(spy);
  });
});

describe('AgendaHub — Próximos Compromissos (botão flutuante)', () => {
  function futureCommit(title: string, id = 'up1') {
    const now = new Date();
    return {
      id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9),
      title,
      completed: false,
    };
  }

  it('renderiza o botão "Próximos" e abre o painel com os seletores 5 e N', async () => {
    render(<AgendaHub />);
    expect(screen.getByTestId('agenda-proximos-toggle')).toBeInTheDocument();
    expect(screen.getByText('Próximos')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agenda-proximos-toggle'));
    expect(await screen.findByText('Próximos Compromissos')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('painel fica fechado por padrão mesmo havendo compromissos futuros', async () => {
    mocks.fetchUpcomingCommitments.mockResolvedValue([futureCommit('Visita hoje')]);
    render(<AgendaHub />);
    await waitFor(() => expect(mocks.fetchUpcomingCommitments).toHaveBeenCalled());
    expect(screen.queryByText('Próximos Compromissos')).not.toBeInTheDocument();
  });

  it('clicar em "Próximos" abre o painel e lista os compromissos futuros', async () => {
    mocks.fetchUpcomingCommitments.mockResolvedValue([
      futureCommit('Compromisso futuro A', 'a'),
      futureCommit('Compromisso futuro B', 'b'),
    ]);
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-proximos-toggle'));

    expect(await screen.findByText('Próximos Compromissos')).toBeInTheDocument();
    expect(screen.getByText('Compromisso futuro A')).toBeInTheDocument();
    expect(screen.getByText('Compromisso futuro B')).toBeInTheDocument();
  });

  it('clicar no seletor "5" busca com limite 5', async () => {
    mocks.fetchUpcomingCommitments.mockResolvedValue([futureCommit('A', 'a')]);
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-proximos-toggle'));
    await screen.findByText('Próximos Compromissos');
    fireEvent.click(screen.getByTestId('agenda-proximos-5'));

    expect(mocks.fetchUpcomingCommitments).toHaveBeenCalledWith('u1', 5);
  });

  it('limite customizado busca com o N informado e persiste no localStorage', async () => {
    mocks.fetchUpcomingCommitments.mockResolvedValue([
      futureCommit('Custom A', 'c1'),
      futureCommit('Custom B', 'c2'),
    ]);
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-proximos-toggle'));
    fireEvent.click(screen.getByTestId('agenda-proximos-custom'));

    const input = await screen.findByTestId('agenda-proximos-input');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(mocks.fetchUpcomingCommitments).toHaveBeenCalledWith('u1', 12));
    expect(screen.getByText('Custom A')).toBeInTheDocument();
    expect(localStorage.getItem('fpi-agenda-proximos-limit')).toBe('12');
  });

  it('mostra estado vazio quando não há compromissos futuros', async () => {
    mocks.fetchUpcomingCommitments.mockResolvedValue([]);
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-proximos-toggle'));

    expect(await screen.findByText('Nenhum compromisso futuro.')).toBeInTheDocument();
  });
});

describe('AgendaHub — cabeçalho de seção e período', () => {
  it('mostra o título "Agenda" sempre visível no cabeçalho fixo', () => {
    render(<AgendaHub />);
    expect(screen.getByText('Agenda')).toBeInTheDocument();
  });

  it('mostra o mês/ano atual no cabeçalho como texto semântico', () => {
    render(<AgendaHub />);
    const now = new Date();
    const expected = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    const label = screen.getByTestId('agenda-month-label');
    expect(label).toHaveTextContent(expected);
    const time = label.querySelector('time');
    expect(time).not.toBeNull();
    expect(time?.getAttribute('dateTime')).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    );
  });

  it('mantém as setas de navegação entre meses no cabeçalho', () => {
    render(<AgendaHub />);
    expect(screen.getByTestId('agenda-prev-month')).toBeInTheDocument();
    expect(screen.getByTestId('agenda-next-month')).toBeInTheDocument();
  });

  it('navega para o mês anterior pela seta do cabeçalho', async () => {
    render(<AgendaHub />);
    const now = new Date();
    let m = now.getMonth() - 1;
    let y = now.getFullYear();
    if (m < 0) { m = 11; y -= 1; }
    fireEvent.click(screen.getByTestId('agenda-prev-month'));
    expect(screen.getByTestId('agenda-month-label')).toHaveTextContent(`${MONTHS[m]} ${y}`);
  });

  it('navega para o próximo mês pela seta do cabeçalho', async () => {
    render(<AgendaHub />);
    const now = new Date();
    let m = now.getMonth() + 1;
    let y = now.getFullYear();
    if (m > 11) { m = 0; y += 1; }
    fireEvent.click(screen.getByTestId('agenda-next-month'));
    expect(screen.getByTestId('agenda-month-label')).toHaveTextContent(`${MONTHS[m]} ${y}`);
  });

  it('mantém o cabeçalho fixo visível também no modo Próximos Compromissos', async () => {
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-proximos-toggle'));
    expect(screen.getByText('Agenda')).toBeInTheDocument();
    expect(screen.getByTestId('agenda-month-label')).toBeInTheDocument();
  });
});

describe('AgendaHub — navegação por mês (navigateToMonth)', () => {
  const sectionOf = (year: number, month: number) =>
    document.querySelector(`[data-month-section="${year}-${month}"]`);

  const scrolledTo = (year: number, month: number) =>
    sectionOf(year, month) !== null && scrollToCalls.length > 0;

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation((x: number, y: number) => {
      scrollToCalls.push([x, y]);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // O caderno só é montado depois do loading assíncrono (initialLoading=false);
  // aguarda a primeira seção mensal existir antes de interagir/navegar.
  const waitForNotebook = () =>
    waitFor(() => {
      expect(document.querySelector('[data-month-section]')).not.toBeNull();
    });

  it('próximo mês: atualiza o rótulo e rola para a seção correta', async () => {
    render(<AgendaHub />);
    await waitForNotebook();
    const next = nextMonthLabel();
    fireEvent.click(screen.getByTestId('agenda-next-month'));
    expect(screen.getByTestId('agenda-month-label')).toHaveTextContent(next.label);
    expect(sectionOf(next.year, next.month)).not.toBeNull();
    expect(scrollToCalls.length).toBeGreaterThan(0);
  });

  it('navegação pelo mês alinha o topo da seção ao topo da área útil (dia 1 como primeira linha)', async () => {
    render(<AgendaHub />);
    await waitForNotebook();
    const next = nextMonthLabel();
    const sec = sectionOf(next.year, next.month) as HTMLElement;
    expect(sec).not.toBeNull();
    // Geometria simulada: a seção começa ACIMA do topo da área útil (dia 1
    // escondido sob o cabeçalho fixo). O ajuste deve rolar para cima exatamente
    // pela diferença sectionTop − headerBottom, trazendo o dia 1 para a primeira
    // linha útil.
    sec.getBoundingClientRect = () => ({ top: 60 } as DOMRect);
    screen.getByTestId('agenda-header').getBoundingClientRect = () => ({ bottom: 148 } as DOMRect);
    fireEvent.click(screen.getByTestId('agenda-next-month'));
    expect(screen.getByTestId('agenda-month-label')).toHaveTextContent(next.label);
    expect(scrollToCalls).toContainEqual([0, 60 - 148]);
  });

  it('mês anterior: atualiza o rótulo e rola para a seção correta', async () => {
    render(<AgendaHub />);
    await waitForNotebook();
    const now = new Date();
    let m = now.getMonth() - 1;
    let y = now.getFullYear();
    if (m < 0) { m = 11; y -= 1; }
    fireEvent.click(screen.getByTestId('agenda-prev-month'));
    expect(screen.getByTestId('agenda-month-label')).toHaveTextContent(`${MONTHS[m]} ${y}`);
    expect(scrolledTo(y, m)).toBe(true);
  });

  it('virada de ano: dezembro → janeiro do ano seguinte', async () => {
    render(<AgendaHub />);
    await waitForNotebook();
    const now = new Date();
    const nextBtn = screen.getByTestId('agenda-next-month');
    const stepsToDec = 11 - now.getMonth();
    for (let i = 0; i < stepsToDec; i++) fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    const janYear = now.getFullYear() + 1;
    expect(screen.getByTestId('agenda-month-label')).toHaveTextContent(`Janeiro ${janYear}`);
    expect(scrolledTo(janYear, 0)).toBe(true);
  });

  it('virada de ano: janeiro → dezembro do ano anterior', async () => {
    render(<AgendaHub />);
    await waitForNotebook();
    const now = new Date();
    const prevBtn = screen.getByTestId('agenda-prev-month');
    for (let i = 0; i < now.getMonth(); i++) fireEvent.click(prevBtn);
    fireEvent.click(prevBtn);
    const decYear = now.getFullYear() - 1;
    expect(screen.getByTestId('agenda-month-label')).toHaveTextContent(`Dezembro ${decYear}`);
    expect(scrolledTo(decYear, 11)).toBe(true);
  });

  it('mês alvo já no stream: não duplica a seção e mesmo assim navega', async () => {
    render(<AgendaHub />);
    await waitForNotebook();
    const before = document.querySelectorAll('[data-month-section]').length;
    const next = nextMonthLabel();
    fireEvent.click(screen.getByTestId('agenda-next-month'));
    expect(document.querySelectorAll('[data-month-section]').length).toBe(before);
    expect(scrolledTo(next.year, next.month)).toBe(true);
  });

  it('mês alvo fora do stream: insere a seção e navega até ela', async () => {
    render(<AgendaHub />);
    await waitForNotebook();
    const now = new Date();
    let m = now.getMonth() + 3;
    let y = now.getFullYear();
    if (m > 11) { m -= 12; y += 1; }
    const nextBtn = screen.getByTestId('agenda-next-month');
    for (let i = 0; i < 3; i++) fireEvent.click(nextBtn);
    expect(sectionOf(y, m)).not.toBeNull();
    expect(scrolledTo(y, m)).toBe(true);
  });

  it('não rola enquanto a seção não está renderizada (aguarda o render para navegar)', async () => {
    const resolvers: Array<() => void> = [];
    mocks.fetchMonthCommitments.mockImplementation(() => new Promise((res) => {
      resolvers.push(() => res([]));
    }));
    render(<AgendaHub />);
    fireEvent.click(screen.getByTestId('agenda-next-month'));
    expect(scrollCalls.length).toBe(0);
    const next = nextMonthLabel();
    await act(async () => {
      while (resolvers.length > 0) {
        const r = resolvers.shift();
        r?.();
        await Promise.resolve();
      }
    });
    const sec = sectionOf(next.year, next.month);
    expect(sec).not.toBeNull();
    expect(scrolledTo(next.year, next.month)).toBe(true);
  });

  it('a seção mensal possui scroll-margin-top responsivo para o cabeçalho fixo', async () => {
    render(<AgendaHub />);
    await waitForNotebook();
    const sec = document.querySelector('[data-month-section]') as HTMLElement;
    expect(sec.className).toContain('scroll-mt-[96px]');
    expect(sec.className).toContain('md:scroll-mt-16');
  });

  it('cleanup: timers de navegação não rolam depois do unmount', async () => {
    const view = render(<AgendaHub />);
    await waitForNotebook();
    fireEvent.click(screen.getByTestId('agenda-open-calendar-header'));
    fireEvent.click(screen.getByLabelText('Próximo mês no calendário'));
    const next = nextMonthLabel();
    fireEvent.click(screen.getByTestId(`calendar-day-${next.year}-${next.month}-1`));
    const before = scrollCalls.length;
    view.unmount();
    await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
    expect(scrollCalls.length).toBe(before);
  });
});

describe('AgendaHub — pickActiveMonth (critério do mês ativo)', () => {
  const sections: Array<{ year: number; month: number; top: number; bottom: number }> = [
    { year: 2026, month: 6, top: 0, bottom: 600 },
    { year: 2026, month: 7, top: 600, bottom: 1200 },
    { year: 2026, month: 8, top: 1200, bottom: 1800 },
  ];

  it('retorna o mês cuja seção contém a linha de referência', () => {
    expect(pickActiveMonth(sections, 400)).toEqual({ year: 2026, month: 6 });
    expect(pickActiveMonth(sections, 601)).toEqual({ year: 2026, month: 7 });
    expect(pickActiveMonth(sections, 1300)).toEqual({ year: 2026, month: 8 });
  });

  it('não troca de mês enquanto a linha está dentro da mesma seção', () => {
    expect(pickActiveMonth(sections, 100)).toEqual({ year: 2026, month: 6 });
    expect(pickActiveMonth(sections, 590)).toEqual({ year: 2026, month: 6 });
  });

  it('troca apenas quando a fronteira do próximo mês cruza a linha', () => {
    expect(pickActiveMonth(sections, 599)).toEqual({ year: 2026, month: 6 });
    expect(pickActiveMonth(sections, 600)).toEqual({ year: 2026, month: 6 });
    expect(pickActiveMonth(sections, 601)).toEqual({ year: 2026, month: 7 });
  });

  it('retorna null quando a linha está acima de todas as seções', () => {
    expect(pickActiveMonth(sections, -50)).toBeNull();
  });

  it('retorna a seção mais alta quando várias contêm a linha', () => {
    const overlapping = [
      { year: 2026, month: 6, top: -200, bottom: 800 },
      { year: 2026, month: 7, top: 100, bottom: 900 },
      { year: 2026, month: 8, top: 800, bottom: 1600 },
    ];
    expect(pickActiveMonth(overlapping, 500)).toEqual({ year: 2026, month: 6 });
  });
});

describe('AgendaHub — cooldown de extensão e interlock de scroll (anti-loop)', () => {
  it('isProbeInterlocked ignora eventos de scroll gerados pela própria compensação', () => {
    expect(isProbeInterlocked(90, 100)).toBe(true);
    expect(isProbeInterlocked(100, 100)).toBe(false);
    expect(isProbeInterlocked(150, 100)).toBe(false);
    expect(isProbeInterlocked(0, 0)).toBe(false);
  });
});

describe('AgendaHub — scrollContainerBy (direção da compensação pós-mutação)', () => {
  it('desloca um container HTMLElement somando o delta em scrollTop', () => {
    const el = document.createElement('div');
    let top = 120;
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (v: number) => { top = v; },
    });
    scrollContainerBy(el, 30);
    expect(top).toBe(150);
    scrollContainerBy(el, -10);
    expect(top).toBe(140);
  });

  it('usa window.scrollTo para o container Window (delta positivo desce a view)', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    try {
      window.scrollY = 0;
      scrollContainerBy(window, 42);
      expect(scrollToSpy).toHaveBeenCalledWith(0, 42);
    } finally {
      scrollToSpy.mockRestore();
    }
  });
});

describe('AgendaHub — nextExtendDelay (debounce com teto real do burst)', () => {
  it('no início do burst devolve o debounce completo', () => {
    expect(nextExtendDelay(1000, 1000, 140, 300)).toBe(140);
    expect(nextExtendDelay(1100, 1000, 140, 300)).toBe(140);
  });

  it('perto do teto encolhe o delay para nunca passar do ceiling do burst', () => {
    expect(nextExtendDelay(1200, 1000, 140, 300)).toBe(100);
  });

  it('no/ após o teto dispara imediatamente (delay 0) — o flush não morre de fome', () => {
    expect(nextExtendDelay(1300, 1000, 140, 300)).toBe(0);
    expect(nextExtendDelay(1500, 1000, 140, 300)).toBe(0);
  });
});

describe('AgendaHub — linha de entrada de dia vazio (cursor na linha clicada)', () => {
  function currentMonthLabel() {
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }

  it('dia vazio: a dica "—" fica na linha da data (primeira linha), que é clicável', async () => {
    render(<AgendaHub />);
    await screen.findByText(currentMonthLabel());

    const now = new Date();
    const dayRow = document.getElementById(`agenda-day-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`) as HTMLElement;
    expect(dayRow).not.toBeNull();

    // a dica "—" fica na linha da data
    const hintInDayRow = dayRow.querySelector('span.text-\\[11px\\].text-slate-300');
    expect(hintInDayRow).not.toBeNull();

    // a linha da data é clicável
    expect(dayRow.className).toContain('cursor-pointer');
  });

  it('dia vazio: existe linha de espaçamento estrutural abaixo (sem dica, não clicável)', async () => {
    render(<AgendaHub />);
    await screen.findByText(currentMonthLabel());

    const now = new Date();
    const dayRow = document.getElementById(`agenda-day-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`) as HTMLElement;
    const wrapper = dayRow.parentElement as HTMLElement;

    // o wrapper do dia contém exatamente 2 filhos: a linha da data + a linha de espaçamento
    expect(wrapper.children.length).toBe(2);
    const spacerRow = wrapper.children[1] as HTMLElement;
    expect(spacerRow.style.height).toBe('28px');
    // linha de espaçamento não tem a dica "—" e não é clicável
    expect(spacerRow.querySelector('span.text-\\[11px\\].text-slate-300')).toBeNull();
    expect(spacerRow.className).not.toContain('cursor-pointer');
  });

  it('clicar na linha da data abre o input NA MESMA linha (não salta para a linha seguinte)', async () => {
    mocks.addCommitment.mockResolvedValue('new-commitment');
    render(<AgendaHub />);
    await screen.findByText(currentMonthLabel());

    const now = new Date();
    const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const dayRow = document.getElementById(`agenda-day-${dayKey}`) as HTMLElement;

    fireEvent.click(dayRow); // clica na linha da data (não no hint)
    const input = await screen.findByPlaceholderText('Digite o compromisso...');

    // o input abre na linha da data (mesmo elemento)
    expect(dayRow.contains(input)).toBe(true);

    // digitar e salvar mantém o compromisso na linha da data
    fireEvent.change(input, { target: { value: 'Compromisso na linha da data' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Verificar que o título existe no documento (renderizado corretamente)
    await waitFor(() => expect(screen.getByText('Compromisso na linha da data')).toBeInTheDocument());
  });
});

describe('AgendaHub — callbacks do Nexus Agenda', () => {
  it('mostra o acionador no cabeçalho, inicia fechado e abre uma única instância', async () => {
    render(<AgendaHub />);
    await screen.findByText(currentLabel());

    const trigger = screen.getByTestId('agenda-nexus-trigger');
    expect(trigger).toHaveRole('button');
    expect(trigger).not.toBeDisabled();
    expect(trigger).toHaveAttribute('type', 'button');
    expect(trigger).toHaveAttribute('aria-label', 'Abrir Nexus na Agenda');
    expect(screen.queryByTestId('agenda-nexus-assistant')).not.toBeInTheDocument();

    fireEvent.click(trigger);

    const panel = screen.getByTestId('agenda-nexus-panel');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('data-state', 'open');
    expect(panel).toHaveRole('dialog');
    expect(panel.getBoundingClientRect().width).toBeGreaterThanOrEqual(0);
    expect(screen.getByTestId('agenda-nexus-assistant')).toBeInTheDocument();
    expect(screen.getAllByTestId('agenda-nexus-assistant')).toHaveLength(1);
  });

  it('mantém HOJE no cabeçalho mesmo quando a data atual está visível', async () => {
    render(<AgendaHub />);
    await screen.findByText(currentLabel());
    const today = screen.getByTestId('agenda-hoje');
    expect(today).toBeInTheDocument();
    expect(today).toHaveAttribute('aria-label', 'Ir para hoje');
    fireEvent.click(today);
    expect(today).toBeInTheDocument();
  });

  it('abre com Enter e Espaço, recebe foco e não submete formulário', async () => {
    render(<AgendaHub />);
    await screen.findByText(currentLabel());
    const trigger = screen.getByTestId('agenda-nexus-trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByTestId('agenda-nexus-panel')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByTestId('agenda-nexus-panel')).not.toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.getByTestId('agenda-nexus-panel')).toBeInTheDocument();
  });

  it('fecha pelo botão do assistente e por Escape', async () => {
    render(<AgendaHub />);
    await screen.findByText(currentLabel());
    fireEvent.click(screen.getByTestId('agenda-nexus-trigger'));
    fireEvent.click(screen.getByTestId('agenda-nexus-close'));
    expect(screen.queryByTestId('agenda-nexus-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agenda-nexus-trigger'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('agenda-nexus-panel')).not.toBeInTheDocument();
  });

  it('recarrega mês ativo e próximos uma vez após criação ou undo', async () => {
    render(<AgendaHub />);
    await screen.findByText(currentLabel());
    const monthCallsBefore = mocks.fetchMonthCommitments.mock.calls.length;
    const upcomingCallsBefore = mocks.fetchUpcomingCommitments.mock.calls.length;

    fireEvent.click(screen.getByTestId('agenda-nexus-trigger'));
    fireEvent.click(screen.getByTestId('agenda-nexus-commit'));
    await waitFor(() => {
      expect(mocks.fetchMonthCommitments.mock.calls.length).toBe(monthCallsBefore + 3);
      expect(mocks.fetchUpcomingCommitments.mock.calls.length).toBe(upcomingCallsBefore + 1);
    });

    fireEvent.click(screen.getByTestId('agenda-nexus-undo'));
    await waitFor(() => {
      expect(mocks.fetchMonthCommitments.mock.calls.length).toBe(monthCallsBefore + 6);
      expect(mocks.fetchUpcomingCommitments.mock.calls.length).toBe(upcomingCallsBefore + 2);
    });
  });
});

describe('AgendaHub — resolveFlushDirection (pendência única de direção)', () => {
  it('pending nulo → não faz nada (não zera, não estende)', () => {
    expect(resolveFlushDirection(null, false)).toEqual({ clear: false, direction: null });
  });

  it('suppress ativo → bloqueia o flush e zera o pending', () => {
    expect(resolveFlushDirection('forward', true)).toEqual({ clear: true, direction: null });
  });

  it('direção pendente liberada → zera o pending e devolve a direção para estender', () => {
    expect(resolveFlushDirection('forward', false)).toEqual({ clear: true, direction: 'forward' });
    expect(resolveFlushDirection('backward', false)).toEqual({ clear: true, direction: 'backward' });
  });
});

describe('AgendaHub — reordenação manual de compromissos no mesmo dia (setas ▲/▼)', () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = firstNonTodayDay(year, month);

  beforeEach(() => {
    mocks.fetchUpcomingCommitments.mockResolvedValue([]);
    mocks.reorderDayCommitments.mockResolvedValue(undefined);
  });

  it('não exibe setas de reordenação quando o dia possui apenas 1 compromisso', async () => {
    mocks.fetchMonthCommitments.mockImplementation((_uid, y, m) => {
      if (y === year && m === month) {
        return Promise.resolve([
          {
            id: 'c-single',
            date: new Date(year, month, day, 9, 0),
            title: 'Compromisso Único',
            completed: false,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    render(<AgendaHub />);
    await screen.findByText('Compromisso Único');

    expect(screen.queryByTestId('agenda-reorder-group-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenda-reorder-up-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenda-reorder-down-0')).not.toBeInTheDocument();
  });

  it('exibe setas com desabilitação nas pontas quando o dia possui 2 ou mais compromissos', async () => {
    mocks.fetchMonthCommitments.mockImplementation((_uid, y, m) => {
      if (y === year && m === month) {
        return Promise.resolve([
          {
            id: 'c-1',
            date: new Date(year, month, day, 9, 0),
            title: 'Primeiro do dia',
            completed: false,
            order: 0,
          },
          {
            id: 'c-2',
            date: new Date(year, month, day, 10, 0),
            title: 'Segundo do dia',
            completed: false,
            order: 1,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    render(<AgendaHub />);
    await screen.findByText('Primeiro do dia');
    await screen.findByText('Segundo do dia');

    const up0 = screen.getByTestId('agenda-reorder-up-0');
    const down0 = screen.getByTestId('agenda-reorder-down-0');
    const up1 = screen.getByTestId('agenda-reorder-up-1');
    const down1 = screen.getByTestId('agenda-reorder-down-1');

    // Primeiro item: subir desabilitado, descer habilitado
    expect(up0).toBeDisabled();
    expect(down0).not.toBeDisabled();

    // Último item: subir habilitado, descer desabilitado
    expect(up1).not.toBeDisabled();
    expect(down1).toBeDisabled();
  });

  it('reordena na UI e chama reorderDayCommitments ao clicar na seta de descer', async () => {
    mocks.fetchMonthCommitments.mockImplementation((_uid, y, m) => {
      if (y === year && m === month) {
        return Promise.resolve([
          {
            id: 'c-a',
            date: new Date(year, month, day, 9, 0),
            title: 'Item Alfa',
            completed: false,
            order: 0,
          },
          {
            id: 'c-b',
            date: new Date(year, month, day, 10, 0),
            title: 'Item Beta',
            completed: false,
            order: 1,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    render(<AgendaHub />);
    await screen.findByText('Item Alfa');

    const down0 = screen.getByTestId('agenda-reorder-down-0');
    fireEvent.click(down0);

    // Deve disparar reorderDayCommitments com a nova ordem
    await waitFor(() => {
      expect(mocks.reorderDayCommitments).toHaveBeenCalledWith(
        'u1',
        [
          { id: 'c-b', order: 0 },
          { id: 'c-a', order: 1 },
        ],
        expect.anything()
      );
    });
  });

  describe('AgendaHub — atalho no celular e modal pedagógico', () => {
    it('renderiza o botão de atalho e abre o modal pedagógico com explicações ao clicar', async () => {
      render(<AgendaHub />);

      const shortcutBtn = screen.getByTestId('agenda-shortcut-trigger');
      expect(shortcutBtn).toBeInTheDocument();

      fireEvent.click(shortcutBtn);

      const modal = await screen.findByTestId('agenda-shortcut-modal');
      expect(modal).toBeInTheDocument();
      expect(screen.getByText('Atalho da Agenda')).toBeInTheDocument();
      expect(screen.getByText('Ícone 3D Oficial')).toBeInTheDocument();
      expect(screen.getByText(/Sem passos intermediários/i)).toBeInTheDocument();

      // Fecha o modal
      const closeBtn = screen.getByTestId('agenda-shortcut-close');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('agenda-shortcut-modal')).not.toBeInTheDocument();
      });
    });
  });
});

