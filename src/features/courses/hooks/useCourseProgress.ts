import { useState, useEffect, useCallback, useMemo } from 'react';
import { coursesRegistry, type CourseSlug } from '../registry';

export interface CourseProgress {
  courseSlug: string;
  completedLessons: string[];
  unlockedBadges: string[];
  lastAccessedModule?: string;
  lastAccessedLesson?: string;
  updatedAt?: number;
}

export interface CourseProgressState {
  progress: CourseProgress | null;
  isLoading: boolean;
  markLessonAsCompleted: (lessonSlug: string) => Promise<void>;
  getCourseCompletionPercentage: () => number;
  getModuleCompletionPercentage: (moduleSlug: string) => number;
  isLessonCompleted: (lessonSlug: string) => boolean;
  resetProgress: () => void;
}

const getStorageKey = (slug: string) => `fpi_course_progress_${slug}`;

export const useCourseProgress = (courseSlug: string): CourseProgressState => {
  const safeSlug = (courseSlug || 'dividas') as CourseSlug;
  const course = coursesRegistry[safeSlug];

  const [progress, setProgress] = useState<CourseProgress | null>(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(safeSlug));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Erro ao carregar progresso do curso:', e);
    }
    return {
      courseSlug: safeSlug,
      completedLessons: [],
      unlockedBadges: [],
    };
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sincroniza caso o courseSlug mude
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(safeSlug));
      if (stored) {
        setProgress(JSON.parse(stored));
      } else {
        setProgress({
          courseSlug: safeSlug,
          completedLessons: [],
          unlockedBadges: [],
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar progresso do curso:', e);
    }
    setIsLoading(false);
  }, [safeSlug]);

  // Lista de todos os slugs de aulas deste curso
  const allLessonSlugs = useMemo(() => {
    if (!course) return new Set<string>();
    const slugs = new Set<string>();
    course.modules.forEach((mod) => {
      mod.lessons.forEach((l) => slugs.add(l.slug));
    });
    return slugs;
  }, [course]);

  // Total de aulas do curso
  const totalCourseLessons = useMemo(() => {
    return allLessonSlugs.size || 1;
  }, [allLessonSlugs]);

  const markLessonAsCompleted = useCallback(
    async (lessonSlug: string) => {
      setProgress((prev) => {
        const currentCompleted = prev?.completedLessons || [];
        const isAlreadyCompleted = currentCompleted.includes(lessonSlug);
        const updatedCompleted = isAlreadyCompleted
          ? currentCompleted
          : [...currentCompleted, lessonSlug];

        // Avalia desbloqueio de badges dos módulos
        const currentBadges = new Set(prev?.unlockedBadges || []);

        if (course) {
          course.modules.forEach((mod) => {
            const modLessonSlugs = mod.lessons.map((l) => l.slug);
            const allModLessonsDone = modLessonSlugs.every((s) =>
              updatedCompleted.includes(s)
            );
            if (allModLessonsDone && mod.badgeLabel) {
              currentBadges.add(mod.badgeLabel);
            }
          });

          // Badge mestre do curso
          const allCourseDone = Array.from(allLessonSlugs).every((s) =>
            updatedCompleted.includes(s)
          );
          if (allCourseDone && allLessonSlugs.size > 0) {
            currentBadges.add(`Mestre: ${course.meta.title}`);
          }
        }

        const newProgress: CourseProgress = {
          courseSlug: safeSlug,
          completedLessons: updatedCompleted,
          unlockedBadges: Array.from(currentBadges),
          lastAccessedLesson: lessonSlug,
          updatedAt: Date.now(),
        };

        try {
          localStorage.setItem(
            getStorageKey(safeSlug),
            JSON.stringify(newProgress)
          );
        } catch (e) {
          console.warn('Erro ao salvar progresso do curso:', e);
        }

        return newProgress;
      });
    },
    [course, safeSlug, allLessonSlugs]
  );

  const getCourseCompletionPercentage = useCallback(() => {
    if (!progress || totalCourseLessons === 0) return 0;
    const validCompleted = progress.completedLessons.filter((slug) =>
      allLessonSlugs.has(slug)
    ).length;
    return Math.min(100, Math.round((validCompleted / totalCourseLessons) * 100));
  }, [progress, totalCourseLessons, allLessonSlugs]);

  const getModuleCompletionPercentage = useCallback(
    (moduleSlug: string) => {
      if (!progress || !course) return 0;
      const mod = course.modules.find((m) => m.slug === moduleSlug);
      if (!mod || !mod.lessons.length) return 0;

      const modLessonSlugs = new Set(mod.lessons.map((l) => l.slug));
      const completedInMod = progress.completedLessons.filter((slug) =>
        modLessonSlugs.has(slug)
      ).length;

      return Math.min(
        100,
        Math.round((completedInMod / mod.lessons.length) * 100)
      );
    },
    [progress, course]
  );

  const isLessonCompleted = useCallback(
    (lessonSlug: string) => {
      return progress?.completedLessons.includes(lessonSlug) ?? false;
    },
    [progress]
  );

  const resetProgress = useCallback(() => {
    const emptyProgress: CourseProgress = {
      courseSlug: safeSlug,
      completedLessons: [],
      unlockedBadges: [],
    };
    try {
      localStorage.removeItem(getStorageKey(safeSlug));
    } catch (e) {
      console.warn('Erro ao resetar progresso:', e);
    }
    setProgress(emptyProgress);
  }, [safeSlug]);

  return {
    progress,
    isLoading,
    markLessonAsCompleted,
    getCourseCompletionPercentage,
    getModuleCompletionPercentage,
    isLessonCompleted,
    resetProgress,
  };
};

export default useCourseProgress;