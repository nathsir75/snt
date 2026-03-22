import { Routes } from '@angular/router';

export const COURSE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./courses.component').then((m) => m.CoursesComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./course-detail.component').then((m) => m.CourseDetailComponent),
  },
];
