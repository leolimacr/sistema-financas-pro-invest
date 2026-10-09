import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { RefObject } from 'react';
import { useInfiniteMonthScroll, getExtendBuffer, type InfiniteMonthScrollOptions } from '../useInfiniteMonthScroll';
import { scrollContainerBy } from '../scrollContainer';

// O motor compensa a posição chamando scrollContainerBy(sc, shift) — mock para
// observar a direção exata do deslocamento sem depender da implementação de DOM.
vi.mock('../scrollContainer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../scrollContainer')>();
  return { ...actual, scrollContainerBy: vi.fn() };
});

function rect(top: number, bottom: number): DOMRect {
  return {
    x: 0, y: top, width: 200, height: bottom - top, top, right: 200, bottom, left: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

// rAF stub controlável: registra callbacks e permite executá-los sob demanda.
let rafStub: { raf: ReturnType<typeof vi.fn>; caf: ReturnType<typeof vi.fn> };
let rafRegistry: Map<number, FrameRequestCallback>;
let rafSeq: number;

function installRafStub() {
  rafRegistry = new Map();
  rafSeq = 0;
  const raf = vi.fn((cb: FrameRequestCallback) => {
    rafSeq += 1;
    rafRegistry.set(rafSeq, cb);
    return rafSeq;
  });
  const caf = vi.fn((id: number) => {
    rafRegistry.delete(id);
  });
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', caf);
  return { raf, caf };
}

function runNextRaf() {
  const id = rafRegistry.keys().next().value as number;
  const cb = rafRegistry.get(id);
  rafRegistry.delete(id);
  if (cb) cb(performance.now());
}

function section(root: HTMLElement, key: string, top: number, bottom: number): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-month-section', key);
  el.getBoundingClientRect = () => rect(top, bottom);
  root.appendChild(el);
  return el;
}

function setMonthHeaderBottom(header: HTMLElement, bottom: number) {
  header.getBoundingClientRect = () => rect(bottom - 60, bottom);
}

function buildNotebook() {
  const notebook = document.createElement('div');
  const monthHeader = document.createElement('div');
  document.body.appendChild(notebook);
  document.body.appendChild(monthHeader);
  return { notebook, monthHeader };
}

function setup(overrides: Partial<InfiniteMonthScrollOptions> = {}, dom = buildNotebook()) {
  const onActiveMonthChange = vi.fn();
  const onExtendMonths = vi.fn();
  const onPruneDistantMonths = vi.fn();
  const base: InfiniteMonthScrollOptions = {
    notebookRef: { current: dom.notebook } as RefObject<HTMLDivElement | null>,
    monthHeaderRef: { current: dom.monthHeader } as RefObject<HTMLDivElement | null>,
    monthStream: [
      { year: 2026, month: 0 },
      { year: 2026, month: 1 },
    ],
    activeMonth: { year: 2026, month: 0 },
    initialLoading: false,
    onActiveMonthChange,
    onExtendMonths,
    onPruneDistantMonths,
  };
  const props = { ...base, ...overrides };
  const utils = renderHook((p: InfiniteMonthScrollOptions) => useInfiniteMonthScroll(p), {
    initialProps: props,
  });
  return {
    ...utils,
    notebook: dom.notebook,
    monthHeader: dom.monthHeader,
    props,
    onActiveMonthChange,
    onExtendMonths,
    onPruneDistantMonths,
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  window.scrollY = 0;
  vi.clearAllMocks();
  rafStub = installRafStub();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useInfiniteMonthScroll — listener e cleanup', () => {
  it('registra um listener scroll no container resolvido (window em jsdom)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = setup();

    const scrollAdd = addSpy.mock.calls.find((c) => c[0] === 'scroll');
    expect(scrollAdd).toBeDefined();
    expect(scrollAdd?.[2]).toEqual({ passive: true });
    const handler = scrollAdd?.[1] as EventListener;

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('scroll', handler);
  });
});

describe('useInfiniteMonthScroll — cleanup de tarefas pendentes', () => {
  it('cancela o timeout de flush pendente no unmount', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2026-0', 0, 600);
      section(dom.notebook, '2026-1', 600, 1200);
      const { unmount } = setup({}, dom);

      // Direção forward (offset 0 → 100): borda inferior quente → agenda o flush.
      window.scrollY = 100;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      // Dispara o rAF (probe): buffer forward quente → agenda o flush.
      act(() => { vi.advanceTimersByTime(20); });
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancela o requestAnimationFrame pendente no unmount', () => {
    const dom = buildNotebook();
    section(dom.notebook, '2026-0', 0, 600);
    const { unmount } = setup({}, dom);

    act(() => { window.dispatchEvent(new Event('scroll')); });
    const rafId = rafRegistry.keys().next().value as number;
    expect(rafId).toBeDefined();

    unmount();
    expect(rafStub.caf).toHaveBeenCalledWith(rafId);
  });
});

describe('useInfiniteMonthScroll — compensação da âncora pós-mutação', () => {
  it('aplica shift = newTop - previousTop com deslocamento positivo (pré-inserção no topo)', () => {
    const dom = buildNotebook();
    const anchorEl = section(dom.notebook, '2026-0', 100, 700);
    section(dom.notebook, '2026-1', 700, 1300);
    const { result, rerender, props } = setup({}, dom);

    act(() => { result.current.captureScrollAnchor(); });
    // Simula a inserção de um mês acima: a seção-âncora desceu 30px.
    anchorEl.getBoundingClientRect = () => rect(130, 730);

    act(() => {
      rerender({
        ...props,
        monthStream: [
          { year: 2025, month: 11 },
          { year: 2026, month: 0 },
          { year: 2026, month: 1 },
        ],
      });
    });

    expect(scrollContainerBy).toHaveBeenCalledTimes(1);
    expect(scrollContainerBy).toHaveBeenCalledWith(window, 30);
  });

  it('aplica shift = newTop - previousTop com deslocamento negativo (poda no topo)', () => {
    const dom = buildNotebook();
    const anchorEl = section(dom.notebook, '2026-0', 100, 700);
    section(dom.notebook, '2026-1', 700, 1300);
    const { result, rerender, props } = setup({}, dom);

    act(() => { result.current.captureScrollAnchor(); });
    // Simula a poda de um mês acima: a seção-âncora subiu 30px.
    anchorEl.getBoundingClientRect = () => rect(70, 670);

    act(() => {
      rerender({
        ...props,
        monthStream: [
          { year: 2026, month: 0 },
          { year: 2026, month: 1 },
        ],
      });
    });

    expect(scrollContainerBy).toHaveBeenCalledTimes(1);
    expect(scrollContainerBy).toHaveBeenCalledWith(window, -30);
  });
});

describe('useInfiniteMonthScroll — supressão de autoextend', () => {
  it('evento de scroll com suppressAutoExtendRef ativo não dispara extensão', () => {
    const dom = buildNotebook();
    section(dom.notebook, '2026-0', 0, 600);
    section(dom.notebook, '2026-1', 600, 1200);
    const { result, onExtendMonths } = setup({}, dom);

    act(() => { result.current.suppressAutoExtendRef.current = true; });
    act(() => { window.dispatchEvent(new Event('scroll')); });

    expect(onExtendMonths).not.toHaveBeenCalled();
    expect(rafRegistry.size).toBe(0);

    // Controle positivo: sem suppress, o mesmo scroll agenda a sondagem rAF.
    act(() => { result.current.suppressAutoExtendRef.current = false; });
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(rafRegistry.size).toBeGreaterThan(0);
  });
});

describe('useInfiniteMonthScroll — mês ativo (onActiveMonthChange)', () => {
  it('não chama quando a seção na linha de referência é o mês já ativo', () => {
    const dom = buildNotebook();
    section(dom.notebook, '2026-0', -4000, 46000);
    const { onActiveMonthChange } = setup({}, dom);

    act(() => { window.dispatchEvent(new Event('scroll')); });
    runNextRaf();

    expect(onActiveMonthChange).not.toHaveBeenCalled();
  });

  it('chama uma única vez com { year, month } ao cruzar para outro mês', () => {
    const dom = buildNotebook();
    setMonthHeaderBottom(dom.monthHeader, 700);
    section(dom.notebook, '2026-0', 0, 600);
    section(dom.notebook, '2026-1', 600, 1200);
    const { onActiveMonthChange } = setup({}, dom);

    act(() => { window.dispatchEvent(new Event('scroll')); });
    runNextRaf();

    expect(onActiveMonthChange).toHaveBeenCalledTimes(1);
    expect(onActiveMonthChange).toHaveBeenCalledWith({ year: 2026, month: 1 });
  });

  it('detecta mudança de mês quando o evento de scroll parte de um elemento pai com overflow-y auto (ex: main)', () => {
    const main = document.createElement('main');
    main.style.overflowY = 'auto';
    const dom = buildNotebook();
    main.appendChild(dom.notebook);
    main.appendChild(dom.monthHeader);
    document.body.appendChild(main);

    try {
      setMonthHeaderBottom(dom.monthHeader, 700);
      section(dom.notebook, '2026-0', 0, 600);
      section(dom.notebook, '2026-1', 600, 1200);
      const { onActiveMonthChange } = setup({}, dom);

      act(() => { main.dispatchEvent(new Event('scroll')); });
      runNextRaf();

      expect(onActiveMonthChange).toHaveBeenCalledTimes(1);
      expect(onActiveMonthChange).toHaveBeenCalledWith({ year: 2026, month: 1 });
    } finally {
      document.body.removeChild(main);
    }
  });
});

describe('useInfiniteMonthScroll — escopo das seções (notebook, não documento inteiro)', () => {
  it('usa apenas as seções do notebook fornecido; seções externas não interferem', () => {
    // Seção "decoy" FORA do notebook, posicionada para conter a linha de
    // referência. Uma consulta global escolheria 2099-6; a consulta escopada
    // ao notebook deve escolher 2026-1.
    section(document.body, '2099-6', 50, 150);
    const dom = buildNotebook();
    setMonthHeaderBottom(dom.monthHeader, 100);
    section(dom.notebook, '2026-1', -4000, 46000);
    const { onActiveMonthChange } = setup({}, dom);

    act(() => { window.dispatchEvent(new Event('scroll')); });
    runNextRaf();

    expect(onActiveMonthChange).toHaveBeenCalledTimes(1);
    expect(onActiveMonthChange).toHaveBeenCalledWith({ year: 2026, month: 1 });
  });
});

describe('useInfiniteMonthScroll — getExtendBuffer (buffer proporcional à viewport)', () => {
  it('viewport pequena respeita o mínimo de 400px', () => {
    expect(getExtendBuffer(200)).toBe(400);
    expect(getExtendBuffer(320)).toBe(400);
  });

  it('viewport intermediária usa 1.25x arredondado', () => {
    expect(getExtendBuffer(800)).toBe(1000);
    expect(getExtendBuffer(900)).toBe(1125);
  });

  it('viewport muito grande respeita o teto de 1200px', () => {
    expect(getExtendBuffer(2000)).toBe(1200);
    expect(getExtendBuffer(5000)).toBe(1200);
  });
});

describe('useInfiniteMonthScroll — direção física única do gesto', () => {
  it('offset crescente perto da borda inferior → somente onExtendMonths forward (count 1)', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2026-0', 0, 600);
      section(dom.notebook, '2026-1', 600, 1200);
      const { onExtendMonths } = setup({}, dom);

      window.scrollY = 200;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); });
      act(() => { vi.advanceTimersByTime(200); });

      expect(onExtendMonths).toHaveBeenCalledTimes(1);
      expect(onExtendMonths).toHaveBeenCalledWith('forward', 1);
      expect(onExtendMonths).not.toHaveBeenCalledWith('backward', expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it('offset decrescente perto da borda superior → somente onExtendMonths backward (count 1)', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2026-0', 0, 2000);
      section(dom.notebook, '2026-1', 2000, 2600);
      window.scrollY = 300;
      const { onExtendMonths } = setup({}, dom);

      window.scrollY = 100;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); });
      act(() => { vi.advanceTimersByTime(200); });

      expect(onExtendMonths).toHaveBeenCalledTimes(1);
      expect(onExtendMonths).toHaveBeenCalledWith('backward', 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('troca rápida de direção: a última substitui a pendência; o flush executa uma só', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2026-0', 0, 600);
      section(dom.notebook, '2026-1', 600, 1200);
      const { onExtendMonths } = setup({}, dom);

      window.scrollY = 300;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); });

      window.scrollY = 100;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); });

      act(() => { vi.advanceTimersByTime(300); });
      expect(onExtendMonths).toHaveBeenCalledTimes(1);
      expect(onExtendMonths).toHaveBeenCalledWith('backward', 2);
      expect(onExtendMonths).not.toHaveBeenCalledWith('forward', expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it('um flush nunca chama forward e backward juntos', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2026-0', 0, 600);
      section(dom.notebook, '2026-1', 600, 1200);
      const { onExtendMonths } = setup({}, dom);

      window.scrollY = 500;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); });
      act(() => { vi.advanceTimersByTime(200); });

      expect(onExtendMonths).toHaveBeenCalledTimes(1);
      expect(onExtendMonths).toHaveBeenCalledWith('forward', 1);
      expect(onExtendMonths).not.toHaveBeenCalledWith('backward', expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it('scroll contínuo: eventos frequentes nunca adiam o flush além do teto do burst', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2026-0', 0, 600);
      section(dom.notebook, '2026-1', 600, 1200);
      const { onExtendMonths } = setup({}, dom);

      window.scrollY = 100;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); });

      for (let i = 1; i <= 12; i++) {
        window.scrollY = 100 + i * 10;
        act(() => { window.dispatchEvent(new Event('scroll')); });
        act(() => { vi.advanceTimersByTime(20); });
      }

      expect(onExtendMonths).not.toHaveBeenCalled();

      act(() => { vi.advanceTimersByTime(400); });
      expect(onExtendMonths).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('interlock/supressão: o offset é atualizado; o próximo scroll manual é classificado', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      const anchorEl = section(dom.notebook, '2026-0', 100, 700);
      section(dom.notebook, '2026-1', 700, 1300);
      const { result, rerender, props, onExtendMonths } = setup({}, dom);

      // Compensação da âncora → define o interlock (scrollContainerBy é mockado).
      act(() => { result.current.captureScrollAnchor(); });
      anchorEl.getBoundingClientRect = () => rect(130, 730);
      act(() => {
        rerender({
          ...props,
          monthStream: [...props.monthStream, { year: 2026, month: 2 }],
        });
      });
      expect(scrollContainerBy).toHaveBeenCalledTimes(1);

      // Scroll durante o interlock: offset registrado, nenhuma extensão.
      window.scrollY = 500;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); });
      expect(onExtendMonths).not.toHaveBeenCalled();

      // Passa o interlock; o próximo scroll usa a diferença real (500 → 700).
      act(() => { vi.advanceTimersByTime(300); });
      window.scrollY = 700;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); });
      act(() => { vi.advanceTimersByTime(200); });

      expect(onExtendMonths).toHaveBeenCalledTimes(1);
      expect(onExtendMonths).toHaveBeenCalledWith('forward', 1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useInfiniteMonthScroll — extensão atômica (onExtendMonths)', () => {
  it('com count=4 o hook chama onExtendMonths UMA única vez', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2026-0', 0, 600);
      section(dom.notebook, '2026-1', 600, 700); // faixa de 100px → gap grande
      const { onExtendMonths } = setup({}, dom);

      window.scrollY = 200;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); });
      act(() => { vi.advanceTimersByTime(200); });

      expect(onExtendMonths).toHaveBeenCalledTimes(1);
      expect(onExtendMonths).toHaveBeenCalledWith('forward', 4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('não captura âncora quando o flush não encontra gap real para extensão', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2026-0', 0, 600);
      const lastSec = section(dom.notebook, '2026-1', 600, 1200);
      const { rerender, props, onExtendMonths } = setup({}, dom);

      window.scrollY = 200;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); }); // probe → borda quente → pendência
      // Antes do flush, o último mês sai da viewport → sem gap real no flush.
      lastSec.getBoundingClientRect = () => rect(600, 4000);
      act(() => { vi.advanceTimersByTime(200); }); // flush → count 0 → sem extensão

      expect(onExtendMonths).not.toHaveBeenCalled();

      // Sem âncora capturada, a mutação do stream NÃO dispara compensação.
      act(() => {
        rerender({ ...props, monthStream: [...props.monthStream, { year: 2026, month: 2 }] });
      });
      expect(scrollContainerBy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('captura a âncora ANTES de chamar onExtendMonths (compensação reflete posição pré-extensão)', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      const anchorEl = section(dom.notebook, '2026-0', 100, 700);
      section(dom.notebook, '2026-1', 700, 1300);

      let renderProps: InfiniteMonthScrollOptions;
      const onExtendMonths = vi.fn((_direction: 'forward' | 'backward', _count: number) => {
        // Simula o efeito da extensão: um mês entra no topo → âncora desce 200px.
        anchorEl.getBoundingClientRect = () => rect(300, 900);
        renderProps = {
          ...renderProps,
          monthStream: [
            { year: 2025, month: 11 },
            { year: 2026, month: 0 },
            { year: 2026, month: 1 },
          ],
        };
        rerender(renderProps);
      });

      renderProps = {
        notebookRef: { current: dom.notebook } as RefObject<HTMLDivElement | null>,
        monthHeaderRef: { current: dom.monthHeader } as RefObject<HTMLDivElement | null>,
        monthStream: [
          { year: 2026, month: 0 },
          { year: 2026, month: 1 },
        ],
        activeMonth: { year: 2026, month: 0 },
        initialLoading: false,
        onActiveMonthChange: vi.fn(),
        onExtendMonths,
        onPruneDistantMonths: vi.fn(),
      };
      const { rerender } = renderHook(
        (p: InfiniteMonthScrollOptions) => useInfiniteMonthScroll(p),
        { initialProps: renderProps },
      );

      window.scrollY = 200;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); }); // probe → borda quente → agenda flush
      act(() => { vi.advanceTimersByTime(200); }); // flush → onExtendMonths → rerender → compensa

      expect(onExtendMonths).toHaveBeenCalledTimes(1);
      expect(onExtendMonths).toHaveBeenCalledWith('forward', 1);
      expect(scrollContainerBy).toHaveBeenCalledTimes(1);
      expect(scrollContainerBy).toHaveBeenCalledWith(window, 200);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useInfiniteMonthScroll — poda separada do flush (pós-settle)', () => {
  it('a extensão NÃO dispara poda no mesmo ciclo', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2024-0', 0, 600);
      section(dom.notebook, '2026-0', 600, 1200);
      const { onExtendMonths, onPruneDistantMonths } = setup(
        {
          monthStream: [{ year: 2024, month: 0 }, { year: 2026, month: 0 }],
          activeMonth: { year: 2026, month: 0 },
        },
        dom,
      );
      // No mount o efeito de navegação já poda (mês distante presente). Zera o
      // mock para isolar o comportamento do ciclo de scroll abaixo.
      onPruneDistantMonths.mockClear();

      window.scrollY = 100;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(20); }); // probe → flush agendado
      act(() => { vi.advanceTimersByTime(180); }); // flush roda; settle (250) ainda não

      expect(onExtendMonths).toHaveBeenCalledTimes(1);
      expect(onPruneDistantMonths).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('poda só roda após o settle de scroll e chama onPruneDistantMonths UMA vez', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2024-0', 0, 600);
      section(dom.notebook, '2026-0', 600, 1200);
      const { onPruneDistantMonths } = setup(
        {
          monthStream: [{ year: 2024, month: 0 }, { year: 2026, month: 0 }],
          activeMonth: { year: 2026, month: 0 },
        },
        dom,
      );
      onPruneDistantMonths.mockClear(); // isola o ciclo de scroll (ver teste acima)

      window.scrollY = 100;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(250); }); // settle → poda

      expect(onPruneDistantMonths).toHaveBeenCalledTimes(1);
      expect(onPruneDistantMonths).toHaveBeenCalledWith(2026, 0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('novo scroll reinicia o timer da poda (não dispara no deadline anterior)', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2024-0', 0, 600);
      section(dom.notebook, '2026-0', 600, 1200);
      const { onPruneDistantMonths } = setup(
        {
          monthStream: [{ year: 2024, month: 0 }, { year: 2026, month: 0 }],
          activeMonth: { year: 2026, month: 0 },
        },
        dom,
      );
      onPruneDistantMonths.mockClear(); // isola o ciclo de scroll (ver teste acima)

      window.scrollY = 100;
      act(() => { window.dispatchEvent(new Event('scroll')); }); // poda agendada p/ 250
      act(() => { vi.advanceTimersByTime(100); });

      window.scrollY = 200;
      act(() => { window.dispatchEvent(new Event('scroll')); }); // poda reagendada p/ 350
      act(() => { vi.advanceTimersByTime(220); }); // t=320: anterior (250) não disparou
      expect(onPruneDistantMonths).not.toHaveBeenCalled();

      act(() => { vi.advanceTimersByTime(60); }); // t=380 > 350 → poda UMA vez
      expect(onPruneDistantMonths).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sem meses distantes a poda não chama o callback nem captura âncora', () => {
    vi.useFakeTimers();
    try {
      const dom = buildNotebook();
      section(dom.notebook, '2026-0', -4000, 46000); // borda longe → nenhum flush
      const { rerender, props, onPruneDistantMonths } = setup({}, dom);

      window.scrollY = 200;
      act(() => { window.dispatchEvent(new Event('scroll')); });
      act(() => { vi.advanceTimersByTime(250); }); // settle → sem meses distantes
      expect(onPruneDistantMonths).not.toHaveBeenCalled();

      // Sem âncora capturada, a mutação do stream NÃO dispara compensação.
      act(() => {
        rerender({ ...props, monthStream: [...props.monthStream, { year: 2026, month: 2 }] });
      });
      expect(scrollContainerBy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
