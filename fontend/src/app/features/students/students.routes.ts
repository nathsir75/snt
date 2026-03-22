import { Routes } from '@angular/router';

export const STUDENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./students.component').then((m) => m.StudentsComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./student-detail.component').then((m) => m.StudentDetailComponent),
  },
];
