import { Routes } from '@angular/router';

export const FEE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./fees.component').then((m) => m.FeesComponent),
  },
];
