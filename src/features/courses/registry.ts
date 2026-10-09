import { debtRescueCourse } from './debt-rescue';
import { beginnerInvestorCourse } from './beginner-investor';
import type { Course } from '~types';

// Define a lista canônica de todos os cursos
export const allCourses: Course[] = [debtRescueCourse, beginnerInvestorCourse];

// Cria um registro para fácil acesso por slug ou ID
export const coursesRegistry = allCourses.reduce((acc, course) => {
  // Chaves primárias
  acc[course.meta.slug] = course;
  acc[course.meta.id] = course;

  // Aliases para o curso de Dívidas
  if (
    course.meta.id === 'plano-realista-para-sair-das-dividas' ||
    course.meta.slug === 'plano-realista-para-sair-das-dividas'
  ) {
    acc['dividas'] = course;
    acc['divida'] = course;
    acc['plano-realista-para-sair-das-dividas'] = course;
  }

  // Aliases para o curso de Investimentos
  if (
    course.meta.id === 'investidor-iniciante' ||
    course.meta.slug === 'investidor-iniciante-seus-primeiros-passos'
  ) {
    acc['investidor-iniciante'] = course;
    acc['investimentos'] = course;
    acc['investidor'] = course;
    acc['investidor-iniciante-seus-primeiros-passos'] = course;
  }

  return acc;
}, {} as Record<string, Course>);

export type CourseSlug = keyof typeof coursesRegistry;
