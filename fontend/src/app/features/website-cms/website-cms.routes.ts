import { Routes } from '@angular/router';

export const WEBSITE_CMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./website-cms.component').then((m) => m.WebsiteCmsComponent),
  },
];
