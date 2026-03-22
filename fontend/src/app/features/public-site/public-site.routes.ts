import { Routes } from '@angular/router';

export const PUBLIC_SITE_ROUTES: Routes = [
  // Branch home (no slug — loads 'home' page or shows branch landing)
  {
    path: ':branchId',
    loadComponent: () =>
      import('./public-site-page.component').then((m) => m.PublicSitePageComponent),
  },
  // Branch page with slug
  {
    path: ':branchId/:slug',
    loadComponent: () =>
      import('./public-site-page.component').then((m) => m.PublicSitePageComponent),
  },
];
