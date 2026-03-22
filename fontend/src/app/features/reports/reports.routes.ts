import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role.guard';

export const REPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./reports.component').then((m) => m.ReportsComponent),
  },
  {
    path: 'fees',
    loadComponent: () =>
      import('./report-fees.component').then((m) => m.ReportFeesComponent),
  },
  {
    path: 'students',
    loadComponent: () =>
      import('./report-students.component').then((m) => m.ReportStudentsComponent),
  },
  {
    path: 'placements',
    loadComponent: () =>
      import('./report-placements.component').then((m) => m.ReportPlacementsComponent),
  },
  {
    path: 'attendance',
    loadComponent: () =>
      import('./report-attendance.component').then((m) => m.ReportAttendanceComponent),
  },
  {
    path: 'exams',
    loadComponent: () =>
      import('./report-exams.component').then((m) => m.ReportExamsComponent),
  },
  {
    path: 'branch-comparison',
    canActivate: [roleGuard(['super_admin'])],
    loadComponent: () =>
      import('./report-branch-comparison.component').then((m) => m.ReportBranchComparisonComponent),
  },
];
