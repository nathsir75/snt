import { Routes } from '@angular/router';

export const ENQUIRY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./enquiries.component').then((m) => m.EnquiriesComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./enquiry-detail.component').then((m) => m.EnquiryDetailComponent),
  },
];
