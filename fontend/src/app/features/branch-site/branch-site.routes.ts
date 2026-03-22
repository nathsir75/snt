import { Routes } from '@angular/router';

export const BRANCH_SITE_ROUTES: Routes = [
  // Branch home — /b/mumbai
  {
    path: ':branchCode',
    loadComponent: () =>
      import('./branch-site-page.component').then((m) => m.BranchSitePageComponent),
  },
  // Branch page with slug — /b/mumbai/about
  {
    path: ':branchCode/:slug',
    loadComponent: () =>
      import('./branch-site-page.component').then((m) => m.BranchSitePageComponent),
  },
];
