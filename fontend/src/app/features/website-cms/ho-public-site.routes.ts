import { Routes } from '@angular/router';

export const HO_PUBLIC_SITE_ROUTES: Routes = [
  {
    path: ':slug',
    loadComponent: () =>
      import('./ho-public-page.component').then((m) => m.HoPublicPageComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./ho-public-page.component').then((m) => m.HoPublicPageComponent),
  },
];
