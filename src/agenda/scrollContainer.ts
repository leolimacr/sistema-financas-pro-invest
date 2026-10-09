// Helpers de "onde e como medir/rolar" o container da Agenda — isolados para
// teste e reutilização. Comportamento idêntico ao que vivia em AgendaHub.

// Descobre o container real de rolagem do caderno: sobe até o ancestral com
// overflow-y = auto/scroll que de fato rola (o <main overflow-y-auto> do app).
// Na página standalone (windows como scroller) retorna window. Assim o scroll,
// a medição de zonas e a compensação de posição miram o mesmo elemento que o
// navegador usa — a direção da roda nunca é invertida por compensa incorreta.
export function resolveScrollContainer(el: HTMLElement | null): Window | HTMLElement {
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.documentElement) {
    const ov = getComputedStyle(cur).overflowY;
    if (ov === 'auto' || ov === 'scroll') {
      return cur;
    }
    cur = cur.parentElement;
  }
  return window;
}

// Aplica rolagem relativa no container correto, preservando a posição visual após
// a inserção de meses no início do caderno.
export function scrollContainerBy(container: Window | HTMLElement, delta: number) {
  if (container instanceof HTMLElement) {
    container.scrollTop += delta;
  } else {
    window.scrollTo(0, window.scrollY + delta);
  }
}

// Posição atual de rolagem do container — fonte única da direção física do
// gesto. Para a janela equivale ao window.scrollY; para o <main> ao scrollTop.
export function getScrollContainerOffset(container: Window | HTMLElement): number {
  return container instanceof HTMLElement ? container.scrollTop : window.scrollY;
}

// Altura visível + topo do container rolável (para as zonas de buffer). Para a
// janela equivale à viewport; para o <main> usa o box real.
export function scrollContainerViewport(container: Window | HTMLElement): { top: number; bottom: number } {
  if (container === window || !(container instanceof HTMLElement)) {
    return { top: 0, bottom: window.innerHeight };
  }
  const r = container.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom };
}