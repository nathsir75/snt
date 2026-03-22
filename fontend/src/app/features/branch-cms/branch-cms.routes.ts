import { Routes } from '@angular/router';

export const BRANCH_CMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./branch-cms.component').then((m) => m.BranchCmsComponent),
  },
];
