import { debtRescueCourse } from './index';

export const coursesRegistry = {
  dividas: debtRescueCourse,
  [debtRescueCourse.meta.slug]: debtRescueCourse,
};

export type CourseSlug = keyof typeof coursesRegistry;
