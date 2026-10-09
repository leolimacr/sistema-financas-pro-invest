import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject, MutableRefObject } from 'react';
import { getScrollContainerOffset, resolveScrollContainer, scrollContainerBy, scrollContainerViewport } from './scrollContainer';
import { pickActiveMonth, type MonthSectionRect, type YearMonth } from './activeMonth';
import { hasDistantMonths, type ScrollDirection } from './monthMath';

// Fase 1 — debounce do fling para inserção na DOM:
// O cálculo de "precisa estender" continua rodando uma vez por frame (rAF),
// mas o setMonthStream (inserção real) só é efetivado após este intervalo sem
// novo evento de scroll. Durante o scroll ativo as direções necessárias são
// acumuladas e a DOM permanece estável (sem crescimento/remoção por frame).
const EXTEND_DEBOUNCE_MS = 140;
// Teto de cadência do flush durante scroll contínuo/veloz: garante que o flush
// não fique "faminto" (o debounce de 140ms é reiniciado a cada evento). Mesmo
// com a roda girando sem parar, uma extensão acontece no máximo a cada
// EXTEND_CEILING_MS — a tela não trava na borda do stream. O teto é medido
// desde o INÍCIO do burst (primeira intenção pendente), não por evento.
const EXTEND_CEILING_MS = 300;
// Teto de meses inseridos por intenção/direção em cada flush — evita estourar
// o stream num único acionamento quando o usuário arremessa o dedo muito longe.
const EXTEND_MAX_MONTHS_PER_FLUSH = 4;
// Janela (ms) em que o probe ignora eventos de scroll gerados pela própria
// compensação de posição (scrollContainerBy dispara um evento `scroll` novo).
// Quebra o ciclo flush → compensa → scroll → probe → flush sem input do user.
const SCROLL_INTERLOCK_MS = 200;
// Uma âncora de compensação capturada há mais que isso não é mais confiável
// (re-render tardio não deve aplicar rolagem mágica sobre o viewport atual).
const SCROLL_ANCHOR_TTL_MS = 600;
// Poda só roda fora de um gesto de scroll recente (pós-settle) ou após
// navegação — nunca no mesmo ciclo do flush. Podar no meio desloca o conteúdo
// sob o viewport; separar as duas operações mantém a compensação de âncora estável.
const SCROLL_SETTLE_MS = 250;
// Distância máxima de mês do mês ativo permitida no stream — acima dela a poda
// (sempre fora do flush) remove. Mesma regra do pruneDistantMonths do AgendaHub.
const PRUNE_MAX_DISTANCE = 3;

// Interlock contra scroll sintético: eventos de scroll da própria compensação
// não devem reabrir o probe/flush (loop auto-sustentado na borda do stream).
export function isProbeInterlocked(nowPerf: number, interlockUntil: number): boolean {
  return nowPerf < interlockUntil;
}

// Decisão do flush com pendência única de direção: devolve a direção a estender
// (se houver) e se o `pending` deve ser zerado. `suppress` zera sem estender;
// sem pendência não faz nada. Um flush nunca processa duas direções.
export function resolveFlushDirection(
  pending: ScrollDirection | null,
  suppress: boolean,
): { clear: boolean; direction: ScrollDirection | null } {
  if (!pending) return { clear: false, direction: null };
  if (suppress) return { clear: true, direction: null };
  return { clear: true, direction: pending };
}

// Debounce com teto real por burst: o flush nunca espera mais que `ceilingMs`
// desde o início do burst (primeira intenção pendente), mesmo que novos eventos
// reabra o debounce. Cada reagendamento posterga até `now + debounceMs`, nunca
// além de `burstStartedAt + ceilingMs`.
export function nextExtendDelay(
  now: number,
  burstStartedAt: number,
  debounceMs: number,
  ceilingMs: number,
): number {
  const deadline = Math.min(now + debounceMs, burstStartedAt + ceilingMs);
  return Math.max(0, deadline - now);
}

// Buffer de extensão proporcional à viewport do container rolável (1.25x a
// altura visível), com piso de 400px e teto de 1200px. Só a borda compatível
// com a direção atual do gesto usa esse buffer.
export function getExtendBuffer(viewportHeight: number): number {
  return Math.max(400, Math.min(1200, Math.round(viewportHeight * 1.25)));
}

// Seções mensais do caderno — SEMPRE dentro do notebook deste hook. Nunca o
// documento inteiro: em páginas com mais de uma agenda (ou com elementos
// simulados), apenas o caderno fornecido ao hook pode influenciar o motor.
function monthSections(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('[data-month-section]'));
}

export interface InfiniteMonthScrollOptions {
  notebookRef: RefObject<HTMLDivElement | null>;
  monthHeaderRef: RefObject<HTMLDivElement | null>;
  monthStream: YearMonth[];
  activeMonth: YearMonth;
  initialLoading: boolean;
  onActiveMonthChange: (next: YearMonth) => void;
  // Extensão ATÔMICA: uma única chamada por flush, com a direção e a contagem
  // explícita de meses a inserir (1..EXTEND_MAX_MONTHS_PER_FLUSH). O chamador
  // nunca vê múltiplas chamadas para compor um único crescimento.
  onExtendMonths: (direction: ScrollDirection, count: number) => void;
  onPruneDistantMonths: (year: number, month: number) => void;
}

export interface InfiniteMonthScrollApi {
  captureScrollAnchor: () => void;
  suppressAutoExtendRef: MutableRefObject<boolean>;
}

export type { YearMonth };
export type { ScrollDirection } from './monthMath';

// Motor de infinite scroll do caderno da Agenda: resolve o container rolável,
// escuta o scroll nativo com rAF + debounce/teto anti-starvation, decide
// extensão forward/backward pela direção física do gesto nas buffer zones,
// captura âncora e compensa a posição após mutações no topo, e ainda informa o
// mês ativo pelo cruzamento da linha de referência do cabeçalho.
export function useInfiniteMonthScroll(options: InfiniteMonthScrollOptions): InfiniteMonthScrollApi {
  const {
    notebookRef,
    monthHeaderRef,
    monthStream,
    activeMonth,
    initialLoading,
    onActiveMonthChange,
    onExtendMonths,
    onPruneDistantMonths,
  } = options;

  // Fase 1 — direção pendente de extensão (UMA por vez, a última real do
  // usuário vence) e o timer de debounce que só efetiva a inserção no DOM após
  // silêncio de scroll.
  const pendingExtendRef = useRef<ScrollDirection | null>(null);
  const extendTimerRef = useRef<number | null>(null);
  // Container real de rolagem (o <main overflow-y-auto> no app; a janela na
  // página standalone). Enquanto o caderno não estiver montado, resolve window.
  const scrollContainerRef = useRef<Window | HTMLElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  // Timestamp do último evento real de scroll — usada para não podar o stream
  // no meio de um gesto ativo.
  const lastScrollEventRef = useRef(0);
  // Interlock contra scroll sintético (ver SCROLL_INTERLOCK_MS): janela em
  // performance.now() durante a qual o probe ignora eventos de scroll.
  const scrollInterlockUntilRef = useRef(0);
  // Último offset de rolagem conhecido do container — a diferença entre dois
  // eventos consecutivos define a direção física do gesto. Atualizado SEMPRE
  // (inclusive em scrolls programáticos/suprimidos/interlock), para o próximo
  // evento manual ser classificado contra o offset real e não o antigo.
  const lastScrollOffsetRef = useRef<number | null>(null);
  // Início do burst de scroll: instante da PRIMEIRA intenção pendente. O teto
  // do flush é medido a partir daqui (nunca resetado por evento novo).
  const extendBurstStartedAtRef = useRef<number | null>(null);
  // Timer da poda pós-settle: reagendado a cada evento de scroll e só executa
  // depois de SCROLL_SETTLE_MS sem evento novo. NUNCA roda no mesmo ciclo da
  // extensão (flush) — inserir e remover no mesmo frame tornaria a compensação
  // de âncora instável.
  const pruneTimerRef = useRef<number | null>(null);
  // Âncora de compensação: primeira seção visível capturada ANTES de cada
  // mutação do stream (key + topo em coordenadas de viewport + instante). No
  // layout pós-render a rolagem é ajustada para devolver a âncora ao mesmo Y
  // — cobre inserção e poda no topo sem overshoot de altura.
  const anchorBeforeRef = useRef<{ key: string; top: number; at: number } | null>(null);
  // Refs de leitura barata (sem re-render) para o mês ativo e o stream atual
  // dentro de timers/efeitos.
  const activeRef = useRef(activeMonth);
  activeRef.current = activeMonth;
  const monthStreamRef = useRef(monthStream);
  monthStreamRef.current = monthStream;
  // Sinal de "navegação em curso" compartilhado com o chamador (goPrev/goNext/
  // goToDate/goToday) para pausar extensões automáticas durante a virada.
  const suppressAutoExtendRef = useRef(false);

  // Resolve o scroller correto. Reroda quando o loading termina: durante o
  // spinner o caderno é curto e o candidato pode ser `window`; após inserir
  // os meses o container real passa a ser o <main overflow-y-auto> do app.
  // Sincroniza também o offset de referência com o container recém-resolvido.
  useLayoutEffect(() => {
    scrollContainerRef.current = resolveScrollContainer(notebookRef.current);
    const sc = scrollContainerRef.current;
    lastScrollOffsetRef.current = sc ? getScrollContainerOffset(sc) : null;
    return () => {
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    };
  }, [initialLoading, notebookRef]);

  // Captura a âncora de compensação imediatamente antes de mutar o stream.
  // A primeira seção cujo fundo cruza o topo da viewport (a que contém a linha
  // de referência do cabeçalho) é estável sob prepend e poda no topo.
  const captureScrollAnchor = useCallback(() => {
    const sc = scrollContainerRef.current ?? window;
    const vp = scrollContainerViewport(sc);
    const sections = monthSections(notebookRef.current);
    for (const s of sections) {
      const rect = s.getBoundingClientRect();
      if (rect.bottom > vp.top) {
        const key = s.getAttribute('data-month-section');
        if (key) {
          anchorBeforeRef.current = { key, top: rect.top, at: Date.now() };
          return;
        }
      }
    }
    anchorBeforeRef.current = null;
  }, [notebookRef]);

  // Compensação de scroll quando o stream muda no início (inserção OU poda de
  // meses acima do viewport): restaura o Y da âncora capturada antes da
  // mutação, preservando a posição visual sem overshoot. O scroll injetado
  // aqui (scrollContainerBy) fica coberto pelo interlock posterior.
  useLayoutEffect(() => {
    const anchor = anchorBeforeRef.current;
    if (!anchor) return;
    anchorBeforeRef.current = null;
    if (Date.now() - anchor.at > SCROLL_ANCHOR_TTL_MS) return;
    const el = notebookRef.current?.querySelector<HTMLElement>(`[data-month-section="${anchor.key}"]`);
    if (!el) return;
    const newTop = el.getBoundingClientRect().top;
    const shift = newTop - anchor.top;
    if (shift !== 0) {
      scrollInterlockUntilRef.current = performance.now() + SCROLL_INTERLOCK_MS;
      const sc = scrollContainerRef.current ?? window;
      scrollContainerBy(sc, shift);
    }
  }, [monthStream, notebookRef]);

  // Poda de meses distantes — compartilhada pelo timer pós-settle (scroll) e
  // pelo efeito de navegação (activeMonth mudou). Sempre confirmada: sem gesto
  // recente, sem interlock, e só existe mês distante de verdade.
  const maybePruneDistantMonths = useCallback(() => {
    if (Date.now() - lastScrollEventRef.current < SCROLL_SETTLE_MS) return;
    if (isProbeInterlocked(performance.now(), scrollInterlockUntilRef.current)) return;
    const active = activeRef.current;
    if (!hasDistantMonths(monthStreamRef.current, active, PRUNE_MAX_DISTANCE)) return;
    captureScrollAnchor();
    onPruneDistantMonths(active.year, active.month);
  }, [captureScrollAnchor, onPruneDistantMonths]);

  // Poda após navegação manual: activeMonth mudou e não há gesto recente. A
  // poda do scroll é coberta pelo timer dedicado no onScroll.
  useEffect(() => {
    maybePruneDistantMonths();
  }, [activeMonth, maybePruneDistantMonths]);

  // --- Scroll detection: centro da viewport + buffer zones dirigidas ---
  useEffect(() => {
    // Fase 1 — Fling debounce: o cálculo de necessidade (mês ativo + zona de
    // buffer compatível) continua rodando uma vez por frame via rAF, mas a
    // inserção real no DOM (setMonthStream) só acontece após o debounce com
    // teto por burst. Durante o scroll ativo apenas acumulamos a direção
    // necessária; a DOM permanece estável (sem crescimento nem poda por frame).
    const flushPendingExtends = () => {
      // Ordem crítica: NÃO zera `pending` antes de saber se vai estender. Um
      // flush processa no máximo UMA direção; suppress descarta sem estender.
      const decision = resolveFlushDirection(
        pendingExtendRef.current,
        suppressAutoExtendRef.current,
      );
      if (decision.clear) {
        pendingExtendRef.current = null;
        extendBurstStartedAtRef.current = null;
      }
      if (!decision.direction) return;

      const sections = monthSections(notebookRef.current);
      if (sections.length === 0) return;
      const sc = scrollContainerRef.current ?? window;
      const vp = scrollContainerViewport(sc);
      const viewportHeight = vp.bottom - vp.top;
      const buffer = getExtendBuffer(viewportHeight);
      const monthEst = (rect: { height: number }, gap: number) => (
        rect.height > 0 ? Math.max(1, Math.ceil(gap / rect.height)) : 1
      );

      // Apenas a borda compatível com a direção do flush define o count.
      let count = 0;
      if (decision.direction === 'forward') {
        const lastSec = sections[sections.length - 1];
        const lastRect = lastSec.getBoundingClientRect();
        const gap = (vp.bottom + buffer) - lastRect.bottom;
        if (gap > 0) {
          count = Math.min(EXTEND_MAX_MONTHS_PER_FLUSH, monthEst(lastRect, gap));
        }
      } else {
        const firstSec = sections[0];
        const firstRect = firstSec.getBoundingClientRect();
        const gap = firstRect.top - (vp.top - buffer);
        if (gap > 0) {
          count = Math.min(EXTEND_MAX_MONTHS_PER_FLUSH, monthEst(firstRect, gap));
        }
      }

      // Sem gap real não existe mutação de stream: nem âncora, nem callback.
      if (count <= 0) return;
      // Extensão ATÔMICA: uma única âncora capturada antes, uma única chamada
      // onExtendMonths(direction, count). A poda NUNCA roda aqui — ela é
      // reagendada por scroll e só executa depois do settle.
      captureScrollAnchor();
      onExtendMonths(decision.direction, count);
    };

    const scheduleExtendFlush = () => {
      const now = Date.now();
      // Início do burst = primeira intenção pendente. Nunca é resetado por
      // evento novo — o teto (burstStartedAt + ceiling) é absoluto do gesto.
      if (extendBurstStartedAtRef.current == null) {
        extendBurstStartedAtRef.current = now;
      }
      // Reagenda a cada intenção: cada evento pode postergar até o debounce,
      // mas nunca além do teto do burst (nextExtendDelay). Não acumula timers.
      if (extendTimerRef.current != null) {
        window.clearTimeout(extendTimerRef.current);
        extendTimerRef.current = null;
      }
      const delay = nextExtendDelay(
        now,
        extendBurstStartedAtRef.current,
        EXTEND_DEBOUNCE_MS,
        EXTEND_CEILING_MS,
      );
      extendTimerRef.current = window.setTimeout(() => {
        extendTimerRef.current = null;
        flushPendingExtends();
      }, delay);
    };

    // Poda só depois do settle: cada evento real de scroll cancela a tentativa
    // anterior e agenda uma nova SCROLL_SETTLE_MS à frente. A execução revalida
    // settle/interlock e a existência real de meses distantes.
    const schedulePruneAttempt = () => {
      if (pruneTimerRef.current != null) {
        window.clearTimeout(pruneTimerRef.current);
        pruneTimerRef.current = null;
      }
      pruneTimerRef.current = window.setTimeout(() => {
        pruneTimerRef.current = null;
        maybePruneDistantMonths();
      }, SCROLL_SETTLE_MS);
    };

    // Toda a lógica de zona (mês ativo + extensão dirigida) roda uma vez por
    // frame na melhor das hipóteses, para um fless rápido não acumular múltiplas
    // inserções/compensações indevidas. A direção vem do scroll nativo do
    // container; aqui só reagem à geometria, sem reverter o sinal. A extensão
    // só avalia a borda compatível com a direção do gesto.
    const probe = (direction: ScrollDirection | null) => {
      const sections = monthSections(notebookRef.current);
      if (suppressAutoExtendRef.current || sections.length === 0) return;

      // Mês ativo: primeira seção que cruza a linha de referência — logo abaixo
      // do cabeçalho sticky. Seções mensais são altas, então o rótulo só alterna
      // quando a fronteira do próximo mês realmente alcança a linha.
      const headerEl = monthHeaderRef.current;
      const referenceY = headerEl ? headerEl.getBoundingClientRect().bottom : window.innerHeight * 0.2;
      const activeRects: MonthSectionRect[] = [];
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const key = section.getAttribute('data-month-section');
        if (!key) continue;
        const [y, m] = key.split('-').map(Number);
        activeRects.push({ year: y, month: m, top: rect.top, bottom: rect.bottom });
      }
      const active = pickActiveMonth(activeRects, referenceY);
      if (active) {
        const cur = activeRef.current;
        if (active.year !== cur.year || active.month !== cur.month) {
          onActiveMonthChange(active);
        }
      }

      // Sem direção real (ex.: scroll sem variação de offset) → nunca agenda
      // extensão; apenas o mês ativo acima é avaliado.
      if (!direction) return;

      // Buffer proporcional à viewport do container rolável real.
      const sc = scrollContainerRef.current ?? window;
      const vp = scrollContainerViewport(sc);
      const viewportHeight = vp.bottom - vp.top;
      const buffer = getExtendBuffer(viewportHeight);

      if (direction === 'forward') {
        // Buffer forward — estende se último mês está próximo do fim da viewport
        const lastSec = sections[sections.length - 1];
        const lastRect = lastSec.getBoundingClientRect();
        const fwdHot = lastRect.bottom < vp.bottom + buffer;
        if (fwdHot) {
          pendingExtendRef.current = 'forward';
          scheduleExtendFlush();
        }
      } else {
        // Buffer backward — estende se primeiro mês está próximo do topo da viewport
        const firstSec = sections[0];
        const firstRect = firstSec.getBoundingClientRect();
        const backHot = firstRect.top > vp.top - buffer;
        if (backHot) {
          pendingExtendRef.current = 'backward';
          scheduleExtendFlush();
        }
      }
    };

    const onScroll = (e?: Event) => {
      lastScrollEventRef.current = Date.now();
      // Cada evento real de scroll adia a poda (pós-settle) — ver
      // schedulePruneAttempt. A extensão, se houver, é uma operação separada
      // que NUNCA dispara poda síncrona.
      schedulePruneAttempt();

      if (
        e?.target instanceof HTMLElement &&
        e.target !== scrollContainerRef.current
      ) {
        const ov = getComputedStyle(e.target).overflowY;
        if (ov === 'auto' || ov === 'scroll') {
          scrollContainerRef.current = e.target;
        }
      }

      // Direção física do gesto ANTES de qualquer condição de retorno: o offset
      // de referência é SEMPRE atualizado, inclusive em scrolls programáticos
      // (compensação) e suprimidos — assim o próximo scroll manual é classificado
      // contra o offset real e não contra um valor defasado.
      const sc = scrollContainerRef.current ?? window;
      const currentOffset = getScrollContainerOffset(sc);
      const previousOffset = lastScrollOffsetRef.current;
      lastScrollOffsetRef.current = currentOffset;
      const delta = previousOffset == null ? 0 : currentOffset - previousOffset;
      const direction: ScrollDirection | null =
        delta > 0 ? 'forward' :
        delta < 0 ? 'backward' :
        null;

      // Ignora eventos de scroll gerados pela própria compensação de posição
      // (scrollContainerBy dispara `scroll` no container) para não reabrir o
      // probe/flush num ciclo sem input do usuário.
      if (isProbeInterlocked(performance.now(), scrollInterlockUntilRef.current)) return;
      if (suppressAutoExtendRef.current) {
        pendingExtendRef.current = null;
        extendBurstStartedAtRef.current = null;
        if (extendTimerRef.current != null) {
          window.clearTimeout(extendTimerRef.current);
          extendTimerRef.current = null;
        }
        if (scrollRafRef.current != null) {
          cancelAnimationFrame(scrollRafRef.current);
          scrollRafRef.current = null;
        }
        return;
      }
      // Coalesce eventos de scroll do mesmo frame: no máximo uma sonda por frame,
      // evitando acúmulo de extensões durante movimentos rápidos da roda.
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        probe(direction);
      });
    };

    if (!scrollContainerRef.current || scrollContainerRef.current === window) {
      scrollContainerRef.current = resolveScrollContainer(notebookRef.current);
    }
    const sc = scrollContainerRef.current ?? window;
    sc.addEventListener('scroll', onScroll, { passive: true });
    const isWindow = sc === window || !(sc instanceof HTMLElement);
    if (!isWindow) {
      window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    }
    return () => {
      sc.removeEventListener('scroll', onScroll);
      if (!isWindow) {
        window.removeEventListener('scroll', onScroll, { capture: true });
      }
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      if (extendTimerRef.current != null) {
        window.clearTimeout(extendTimerRef.current);
        extendTimerRef.current = null;
      }
      if (pruneTimerRef.current != null) {
        window.clearTimeout(pruneTimerRef.current);
        pruneTimerRef.current = null;
      }
      pendingExtendRef.current = null;
      extendBurstStartedAtRef.current = null;
    };
  }, [
    monthHeaderRef,
    notebookRef,
    onActiveMonthChange,
    onExtendMonths,
    maybePruneDistantMonths,
    captureScrollAnchor,
    initialLoading,
  ]);

  return { captureScrollAnchor, suppressAutoExtendRef };
}
