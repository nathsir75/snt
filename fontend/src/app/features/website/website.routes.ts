import { Routes } from '@angular/router';
import { WebsiteShellComponent } from './website-shell.component';

export const WEBSITE_ROUTES: Routes = [
  {
    path: '',
    component: WebsiteShellComponent,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/home.component').then((m) => m.WebHomeComponent),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./pages/about.component').then((m) => m.WebAboutComponent),
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./pages/courses.component').then((m) => m.WebCoursesComponent),
      },
      {
        path: 'placements',
        loadComponent: () =>
          import('./pages/placements.component').then((m) => m.WebPlacementsComponent),
      },
      {
        path: 'corporate-training',
        loadComponent: () =>
          import('./pages/corporate-training.component').then((m) => m.CorporateTrainingComponent),
      },
      {
        path: 'internships',
        loadComponent: () =>
          import('./pages/internships.component').then((m) => m.InternshipsComponent),
      },
      {
        path: 'college-partnerships',
        loadComponent: () =>
          import('./pages/college-partnerships.component').then((m) => m.CollegePartnershipsComponent),
      },
      {
        path: 'hire-talent',
        loadComponent: () =>
          import('./pages/hire-talent.component').then((m) => m.HireTalentComponent),
      },
      {
        path: 'why-partner',
        loadComponent: () =>
          import('./pages/why-partner.component').then((m) => m.WebWhyPartnerComponent),
      },
      {
        path: 'franchise-model',
        loadComponent: () =>
          import('./pages/franchise-model.component').then((m) => m.WebFranchiseModelComponent),
      },
      {
        path: 'branch-locations',
        loadComponent: () =>
          import('./pages/locations-stories.component').then((m) => m.WebBranchLocationsComponent),
      },
      {
        path: 'success-stories',
        loadComponent: () =>
          import('./pages/locations-stories.component').then((m) => m.WebSuccessStoriesComponent),
      },
      {
        path: 'become-a-partner',
        loadComponent: () =>
          import('./pages/become-partner.component').then((m) => m.WebBecomePartnerComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./pages/contact.component').then((m) => m.WebContactComponent),
      },
      {
        path: 'careers',
        loadComponent: () =>
          import('./pages/careers.component').then((m) => m.CareersComponent),
      },
      {
        path: 'verify-certificate',
        loadComponent: () =>
          import('../certificates/certificate-verify.component').then((m) => m.CertificateVerifyComponent),
      },
      {
        path: 'verify-certificate/:code',
        loadComponent: () =>
          import('../certificates/certificate-verify.component').then((m) => m.CertificateVerifyComponent),
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
