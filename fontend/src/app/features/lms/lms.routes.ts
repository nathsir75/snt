import { Routes } from '@angular/router';

export const LMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./lms.component').then((m) => m.LmsComponent),
  },
];
