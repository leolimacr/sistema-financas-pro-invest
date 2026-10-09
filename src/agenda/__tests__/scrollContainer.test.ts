import { describe, it, expect, vi } from 'vitest';
import { getScrollContainerOffset, resolveScrollContainer, scrollContainerBy, scrollContainerViewport } from '../scrollContainer';

describe('scrollContainer — scrollContainerBy', () => {
  it('incrementa scrollTop de um HTMLElement pelo delta', () => {
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

  it('chama window.scrollTo com scrollY + delta para a janela', () => {
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

describe('scrollContainer — scrollContainerViewport', () => {
  it('retorna top 0 e bottom = innerHeight para a janela', () => {
    const innerHeightSpy = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    try {
      expect(scrollContainerViewport(window)).toEqual({ top: 0, bottom: 800 });
    } finally {
      innerHeightSpy.mockRestore();
    }
  });

  it('retorna o box real de um HTMLElement com getBoundingClientRect mockado', () => {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({ top: 40, bottom: 640 } as DOMRect);
    expect(scrollContainerViewport(el)).toEqual({ top: 40, bottom: 640 });
  });
});

describe('scrollContainer — getScrollContainerOffset', () => {
  it('retorna o scrollTop de um HTMLElement', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollTop', { configurable: true, value: 320 });
    expect(getScrollContainerOffset(el)).toBe(320);
  });

  it('retorna window.scrollY para a janela', () => {
    const prev = window.scrollY;
    try {
      window.scrollY = 250;
      expect(getScrollContainerOffset(window)).toBe(250);
    } finally {
      window.scrollY = prev;
    }
  });
});

describe('scrollContainer — resolveScrollContainer', () => {
  it('retorna window quando não há ancestral rolável (null)', () => {
    expect(resolveScrollContainer(null)).toBe(window);
  });

  it('retorna window para um elemento sem ancestral com overflow rolável', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    try {
      expect(resolveScrollContainer(el)).toBe(window);
    } finally {
      document.body.removeChild(el);
    }
  });
});