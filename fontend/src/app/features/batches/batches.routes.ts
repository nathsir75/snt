import { Routes } from '@angular/router';

export const BATCH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./batches.component').then((m) => m.BatchesComponent),
  },
];
