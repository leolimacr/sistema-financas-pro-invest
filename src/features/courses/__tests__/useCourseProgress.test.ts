import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCourseProgress } from '../hooks/useCourseProgress';

describe('useCourseProgress hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inicializa com progresso vazio para o curso investidor-iniciante', () => {
    const { result } = renderHook(() => useCourseProgress('investidor-iniciante'));

    expect(result.current.progress).not.toBeNull();
    expect(result.current.progress?.completedLessons).toEqual([]);
    expect(result.current.getCourseCompletionPercentage()).toBe(0);
    expect(result.current.isLessonCompleted('qualquer-aula')).toBe(false);
  });

  it('marca aula como concluída e calcula percentual real do curso', async () => {
    const { result } = renderHook(() => useCourseProgress('investidor-iniciante'));

    await act(async () => {
      await result.current.markLessonAsCompleted('a-matematica-inegociavel-por-que-e-proibido-investir-devendo');
    });

    expect(
      result.current.isLessonCompleted('a-matematica-inegociavel-por-que-e-proibido-investir-devendo')
    ).toBe(true);

    const percentage = result.current.getCourseCompletionPercentage();
    expect(percentage).toBeGreaterThan(0);
    expect(percentage).toBeLessThanOrEqual(100);

    // Verifica persistência no localStorage
    const stored = localStorage.getItem('fpi_course_progress_investidor-iniciante');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.completedLessons).toContain(
      'a-matematica-inegociavel-por-que-e-proibido-investir-devendo'
    );
  });

  it('calcula percentual de conclusão por módulo e desbloqueia badge', async () => {
    const { result } = renderHook(() => useCourseProgress('investidor-iniciante'));

    // Módulo 1 tem 2 aulas
    await act(async () => {
      await result.current.markLessonAsCompleted('a-matematica-inegociavel-por-que-e-proibido-investir-devendo');
    });

    const halfMod = result.current.getModuleCompletionPercentage('o-pre-requisito-sagrado-dividas-zero');
    expect(halfMod).toBe(50);

    await act(async () => {
      await result.current.markLessonAsCompleted('divida-boa-vs-divida-ruim-e-o-saldo-livre-real');
    });

    const fullMod = result.current.getModuleCompletionPercentage('o-pre-requisito-sagrado-dividas-zero');
    expect(fullMod).toBe(100);

    // Badge "Fundação Limpa" deve ter sido desbloqueada
    expect(result.current.progress?.unlockedBadges).toContain('Fundação Limpa');
  });

  it('permite resetar o progresso', async () => {
    const { result } = renderHook(() => useCourseProgress('investidor-iniciante'));

    await act(async () => {
      await result.current.markLessonAsCompleted('a-matematica-inegociavel-por-que-e-proibido-investir-devendo');
    });

    expect(result.current.progress?.completedLessons.length).toBe(1);

    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.progress?.completedLessons).toEqual([]);
    expect(result.current.getCourseCompletionPercentage()).toBe(0);
  });

  it('preserva integridade e persistência offline no localStorage', async () => {
    const { result } = renderHook(() => useCourseProgress('dividas'));

    await act(async () => {
      await result.current.markLessonAsCompleted('aula-teste-offline');
    });

    expect(result.current.isLessonCompleted('aula-teste-offline')).toBe(true);
    const stored = localStorage.getItem('fpi_course_progress_dividas');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).completedLessons).toContain('aula-teste-offline');
  });
});
