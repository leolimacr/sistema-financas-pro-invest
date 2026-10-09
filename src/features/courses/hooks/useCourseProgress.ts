import { useState, useEffect, useCallback, useMemo } from 'react';
import { coursesRegistry, type CourseSlug } from '../registry';
import { useAuth } from '../../../contexts/AuthContext';
import { firestore } from '../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  const { user } = useAuth();
  const userId = user?.uid;

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

  // Sincroniza caso o courseSlug ou userId mude, e busca dados na nuvem (Firestore)
  useEffect(() => {
    let localData: CourseProgress = {
      courseSlug: safeSlug,
      completedLessons: [],
      unlockedBadges: [],
    };

    try {
      const stored = localStorage.getItem(getStorageKey(safeSlug));
      if (stored) {
        localData = JSON.parse(stored);
        setProgress(localData);
      } else {
        setProgress(localData);
      }
    } catch (e) {
      console.warn('Erro ao carregar progresso local do curso:', e);
    }

    // Sincronização em nuvem com Firestore (F5.2.1)
    if (userId && userId !== 'demo-sandbox-soberano') {
      let isMounted = true;
      const progressDocRef = doc(firestore, 'users', userId, 'courseProgress', safeSlug);

      getDoc(progressDocRef)
        .then((snapshot) => {
          if (!isMounted || !snapshot.exists()) return;
          const remoteData = snapshot.data() as Partial<CourseProgress>;
          const remoteCompleted = remoteData.completedLessons || [];
          const remoteBadges = remoteData.unlockedBadges || [];

          // Merge inteligente (união de conjuntos) para nunca perder aulas concluídas
          const mergedCompleted = Array.from(new Set([...localData.completedLessons, ...remoteCompleted]));
          const mergedBadges = Array.from(new Set([...localData.unlockedBadges, ...remoteBadges]));

          const mergedProgress: CourseProgress = {
            courseSlug: safeSlug,
            completedLessons: mergedCompleted,
            unlockedBadges: mergedBadges,
            lastAccessedLesson: remoteData.lastAccessedLesson || localData.lastAccessedLesson,
            lastAccessedModule: remoteData.lastAccessedModule || localData.lastAccessedModule,
            updatedAt: Math.max(remoteData.updatedAt || 0, localData.updatedAt || 0, Date.now()),
          };

          setProgress(mergedProgress);
          try {
            localStorage.setItem(getStorageKey(safeSlug), JSON.stringify(mergedProgress));
          } catch {}

          // Se o dispositivo local tinha aulas que não estavam no Firestore, sobe o consolidado
          const hasNewLocalLessons = localData.completedLessons.some((s) => !remoteCompleted.includes(s));
          if (hasNewLocalLessons) {
            setDoc(progressDocRef, mergedProgress, { merge: true }).catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('[useCourseProgress] Falha ao carregar progresso remoto:', err);
        });

      return () => {
        isMounted = false;
      };
    }

    setIsLoading(false);
  }, [safeSlug, userId]);

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

        // Persistência assíncrona no Firestore (F5.2.1)
        if (userId && userId !== 'demo-sandbox-soberano') {
          const progressDocRef = doc(firestore, 'users', userId, 'courseProgress', safeSlug);
          setDoc(progressDocRef, newProgress, { merge: true }).catch((err) => {
            console.warn('[useCourseProgress] Falha ao persistir progresso no Firestore:', err);
          });
        }

        return newProgress;
      });
    },
    [course, safeSlug, allLessonSlugs, userId]
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

    if (userId && userId !== 'demo-sandbox-soberano') {
      const progressDocRef = doc(firestore, 'users', userId, 'courseProgress', safeSlug);
      setDoc(progressDocRef, emptyProgress, { merge: true }).catch((err) => {
        console.warn('[useCourseProgress] Falha ao resetar progresso no Firestore:', err);
      });
    }

    setProgress(emptyProgress);
  }, [safeSlug, userId]);

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