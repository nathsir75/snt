import { Routes } from '@angular/router';

export const MEDIA_LIBRARY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./media-library.component').then((m) => m.MediaLibraryComponent),
  },
];
