import { Routes } from '@angular/router';

export const HO_PAGE_BUILDER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ho-page-builder.component').then((m) => m.HoPageBuilderComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./ho-page-editor.component').then((m) => m.HoPageEditorComponent),
  },
];
