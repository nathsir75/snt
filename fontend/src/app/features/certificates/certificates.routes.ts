import { Routes } from '@angular/router';

export const CERTIFICATE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./certificates.component').then((m) => m.CertificatesComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./certificate-detail.component').then((m) => m.CertificateDetailComponent),
  },
];
