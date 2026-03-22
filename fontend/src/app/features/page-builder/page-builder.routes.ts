import { Routes } from '@angular/router';

export const PAGE_BUILDER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./page-builder.component').then((m) => m.PageBuilderComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./page-editor.component').then((m) => m.PageEditorComponent),
  },
];
