import type { Course } from '~types';
import { debtRescueCourseMeta } from './course.meta';
import { module01 } from './modules/module-01';
import { module02 } from './modules/module-02';
import { module03 } from './modules/module-03';
import { module04 } from './modules/module-04';
import { module05 } from './modules/module-05';
import { module06 } from './modules/module-06';

export const debtRescueCourse: Course = {
  meta: debtRescueCourseMeta,
  isPublished: true,
  modules: [
    module01,
    module02,
    module03,
    module04,
    module05,
    module06,
  ],
};
