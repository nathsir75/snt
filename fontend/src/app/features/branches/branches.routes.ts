import { Routes } from '@angular/router';

export const BRANCH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./branches.component').then((m) => m.BranchesComponent),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./branch-create.component').then((m) => m.BranchCreateComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./branch-detail.component').then((m) => m.BranchDetailComponent),
  },
  {
    path: ':id/onboarding',
    loadComponent: () =>
      import('./branch-onboarding.component').then((m) => m.BranchOnboardingComponent),
  },
];
