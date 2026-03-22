import { Routes } from '@angular/router';

export const DISPLAY_CONTROL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./display-control.component').then((m) => m.DisplayControlComponent),
  },
];
