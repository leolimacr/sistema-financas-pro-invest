import { beginnerInvestorCourse } from './index';

export const coursesRegistry = {
  investidorIniciante: beginnerInvestorCourse,
  [beginnerInvestorCourse.meta.slug]: beginnerInvestorCourse,
};
