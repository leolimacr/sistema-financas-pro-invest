import React from 'react';
import { Route } from 'react-router-dom';
import { CourseTrackPage } from '../features/courses/pages/CourseTrackPage';
import { ModuleOverviewPage } from '../features/courses/pages/ModuleOverviewPage';
import { LessonPage } from '../features/courses/pages/LessonPage';

export const courseRoutes = (
  <>
    <Route index element={<CourseTrackPage />} />
    <Route path=":courseSlug" element={<CourseTrackPage />} />
    <Route path=":courseSlug/modulo/:moduleSlug" element={<ModuleOverviewPage />} />
    <Route path=":courseSlug/modulo/:moduleSlug/aula/:lessonSlug" element={<LessonPage />} />
    <Route path="*" element={<CourseTrackPage />} />
  </>
);

export const CourseRoutesShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50 w-full relative z-0 flex flex-col">
    {children}
  </div>
);
