import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { ShellComponent } from './layout/shell/shell.component';
import { BranchShellComponent } from './layout/branch-shell/branch-shell.component';
import { TeacherShellComponent } from './layout/teacher-shell/teacher-shell.component';
import { StudentShellComponent } from './layout/student-shell/student-shell.component';

export const APP_ROUTES: Routes = [

  // ── Public marketing website ──────────────────────────────────────────────
  {
    path: '',
    loadChildren: () =>
      import('./features/website/website.routes').then((m) => m.WEBSITE_ROUTES),
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./features/forbidden/forbidden.component').then((m) => m.ForbiddenComponent),
  },

  // ── Public routes (no auth) ───────────────────────────────────────────────
  {
    path: 'page/:branchId/:slug',
    loadComponent: () =>
      import('./features/page-renderer/page-renderer.component').then((m) => m.PageRendererComponent),
  },
  // /b/:branchCode — path-based branch website (dev + prod fallback)
  // In production, subdomain detection inside BranchSitePageComponent takes over
  {
    path: 'b',
    loadChildren: () =>
      import('./features/branch-site/branch-site.routes').then((m) => m.BRANCH_SITE_ROUTES),
  },
  {
    path: 'site',
    loadChildren: () =>
      import('./features/public-site/public-site.routes').then((m) => m.PUBLIC_SITE_ROUTES),
  },
  // HO public page preview — /ho-site/:slug → GET /site-pages/public/:slug
  {
    path: 'ho-site',
    loadChildren: () =>
      import('./features/website-cms/ho-public-site.routes').then((m) => m.HO_PUBLIC_SITE_ROUTES),
  },
  {
    path: 'verify-certificate',
    loadComponent: () =>
      import('./features/certificates/certificate-verify.component').then((m) => m.CertificateVerifyComponent),
  },
  {
    path: 'verify-certificate/:code',
    loadComponent: () =>
      import('./features/certificates/certificate-verify.component').then((m) => m.CertificateVerifyComponent),
  },

  // ── /ho — Head Office (super_admin only) ──────────────────────────────────
  {
    path: 'ho',
    component: ShellComponent,
    canActivate: [authGuard, roleGuard(['super_admin'])],
    children: [
      { path: 'dashboard',               loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES) },
      { path: 'branches',                loadChildren: () => import('./features/branches/branches.routes').then((m) => m.BRANCH_ROUTES) },
      { path: 'enquiries',               loadChildren: () => import('./features/enquiries/enquiries.routes').then((m) => m.ENQUIRY_ROUTES) },
      { path: 'students',                loadChildren: () => import('./features/students/students.routes').then((m) => m.STUDENT_ROUTES) },
      { path: 'batches',                 loadChildren: () => import('./features/batches/batches.routes').then((m) => m.BATCH_ROUTES) },
      { path: 'attendance',              loadChildren: () => import('./features/attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES) },
      { path: 'trainers',                loadComponent: () => import('./features/trainers/trainers.component').then((m) => m.TrainersComponent) },
      { path: 'schedules',               loadComponent: () => import('./features/schedules/schedules.component').then((m) => m.SchedulesComponent) },
      { path: 'fees',                    loadChildren: () => import('./features/fees/fees.routes').then((m) => m.FEE_ROUTES) },
      { path: 'users',                   loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent) },
      { path: 'partner-enquiries',       loadComponent: () => import('./features/branch-partner-enquiries/partner-enquiries.component').then((m) => m.PartnerEnquiriesComponent) },
      { path: 'internship-applications', loadComponent: () => import('./features/internship-applications/internship-applications.component').then((m) => m.InternshipApplicationsComponent) },
      { path: 'college-partnerships',    loadComponent: () => import('./features/college-partnerships/college-partnerships-admin.component').then((m) => m.CollegePartnershipsAdminComponent) },
      { path: 'corporate-leads',         loadComponent: () => import('./features/corporate-leads/corporate-leads.component').then((m) => m.CorporateLeadsComponent) },
      { path: 'career-applications',     loadComponent: () => import('./features/careers/career-applications.component').then((m) => m.CareerApplicationsComponent) },
      { path: 'settings',                loadChildren: () => import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES) },
      { path: 'courses',                 loadChildren: () => import('./features/courses/courses.routes').then((m) => m.COURSE_ROUTES) },
      { path: 'lms',                     loadChildren: () => import('./features/lms/lms.routes').then((m) => m.LMS_ROUTES) },
      { path: 'fee-structures',          loadComponent: () => import('./features/fee-structures/fee-structures.component').then((m) => m.FeeStructuresComponent) },
      { path: 'discounts',               loadComponent: () => import('./features/discounts/discounts.component').then((m) => m.DiscountsComponent) },
      { path: 'exam-eligibility',        loadComponent: () => import('./features/exam-eligibility/exam-eligibility.component').then((m) => m.ExamEligibilityComponent) },
      { path: 'exam-registrations',      loadComponent: () => import('./features/exam-registrations/exam-registrations.component').then((m) => m.ExamRegistrationsComponent) },
      { path: 'results',                 loadComponent: () => import('./features/results/results.component').then((m) => m.ResultsComponent) },
      { path: 'certificates',            loadChildren: () => import('./features/certificates/certificates.routes').then((m) => m.CERTIFICATE_ROUTES) },
      { path: 'companies',               loadComponent: () => import('./features/companies/companies.component').then((m) => m.CompaniesComponent) },
      { path: 'job-openings',            loadComponent: () => import('./features/job-openings/job-openings.component').then((m) => m.JobOpeningsComponent) },
      { path: 'placements',              loadComponent: () => import('./features/placements/placements.component').then((m) => m.PlacementsComponent) },
      { path: 'reports',                 loadChildren: () => import('./features/reports/reports.routes').then((m) => m.REPORT_ROUTES) },
      { path: 'alerts',                  loadComponent: () => import('./features/alerts/alerts.component').then((m) => m.AlertsComponent) },
      { path: 'website-cms',             loadChildren: () => import('./features/website-cms/website-cms.routes').then((m) => m.WEBSITE_CMS_ROUTES) },
      { path: 'page-builder',            loadChildren: () => import('./features/website-cms/ho-page-builder.routes').then((m) => m.HO_PAGE_BUILDER_ROUTES) },
      { path: 'media-library',           loadChildren: () => import('./features/media-library/media-library.routes').then((m) => m.MEDIA_LIBRARY_ROUTES) },
      { path: 'website-display-control', loadChildren: () => import('./features/website-display-control/display-control.routes').then((m) => m.DISPLAY_CONTROL_ROUTES) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── /branch — Branch Admin + Counselor ────────────────────────────────────
  {
    path: 'branch',
    component: BranchShellComponent,
    canActivate: [authGuard, roleGuard(['branch_admin', 'counselor'])],
    children: [
      { path: 'dashboard',          loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES) },
      { path: 'enquiries',          loadChildren: () => import('./features/enquiries/enquiries.routes').then((m) => m.ENQUIRY_ROUTES) },
      { path: 'students',           loadChildren: () => import('./features/students/students.routes').then((m) => m.STUDENT_ROUTES) },
      { path: 'batches',            canActivate: [roleGuard(['branch_admin', 'counselor'])], loadChildren: () => import('./features/batches/batches.routes').then((m) => m.BATCH_ROUTES) },
      { path: 'attendance',         canActivate: [roleGuard(['branch_admin'])], loadChildren: () => import('./features/attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES) },
      { path: 'fees',               canActivate: [roleGuard(['branch_admin'])], loadChildren: () => import('./features/fees/fees.routes').then((m) => m.FEE_ROUTES) },
      { path: 'trainers',           canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/trainers/trainers.component').then((m) => m.TrainersComponent) },
      { path: 'schedules',          canActivate: [roleGuard(['branch_admin', 'counselor'])], loadComponent: () => import('./features/schedules/schedules.component').then((m) => m.SchedulesComponent) },
      { path: 'lms',                canActivate: [roleGuard(['branch_admin'])], loadChildren: () => import('./features/lms/lms.routes').then((m) => m.LMS_ROUTES) },
      { path: 'discounts',          canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/discounts/discounts.component').then((m) => m.DiscountsComponent) },
      { path: 'exam-eligibility',   canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/exam-eligibility/exam-eligibility.component').then((m) => m.ExamEligibilityComponent) },
      { path: 'exam-registrations', canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/exam-registrations/exam-registrations.component').then((m) => m.ExamRegistrationsComponent) },
      { path: 'results',            canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/results/results.component').then((m) => m.ResultsComponent) },
      { path: 'certificates',       canActivate: [roleGuard(['branch_admin'])], loadChildren: () => import('./features/certificates/certificates.routes').then((m) => m.CERTIFICATE_ROUTES) },
      { path: 'companies',          canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/companies/companies.component').then((m) => m.CompaniesComponent) },
      { path: 'job-openings',       canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/job-openings/job-openings.component').then((m) => m.JobOpeningsComponent) },
      { path: 'interviews',         canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/interviews/interviews.component').then((m) => m.InterviewsComponent) },
      { path: 'applications',       canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/applications/applications.component').then((m) => m.ApplicationsComponent) },
      { path: 'placements',         canActivate: [roleGuard(['branch_admin'])], loadComponent: () => import('./features/placements/placements.component').then((m) => m.PlacementsComponent) },
      { path: 'reports',            canActivate: [roleGuard(['branch_admin'])], loadChildren: () => import('./features/reports/reports.routes').then((m) => m.REPORT_ROUTES) },
      { path: 'alerts',             loadComponent: () => import('./features/alerts/alerts.component').then((m) => m.AlertsComponent) },
      { path: 'page-builder',       canActivate: [roleGuard(['branch_admin'])], loadChildren: () => import('./features/page-builder/page-builder.routes').then((m) => m.PAGE_BUILDER_ROUTES) },
      { path: 'website-cms',        canActivate: [roleGuard(['branch_admin'])], loadChildren: () => import('./features/branch-cms/branch-cms.routes').then((m) => m.BRANCH_CMS_ROUTES) },
      { path: 'media-library',      canActivate: [roleGuard(['branch_admin'])], loadChildren: () => import('./features/media-library/media-library.routes').then((m) => m.MEDIA_LIBRARY_ROUTES) },
      { path: 'settings',           canActivate: [roleGuard(['branch_admin'])], loadChildren: () => import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── /teacher ──────────────────────────────────────────────────────────────
  {
    path: 'teacher',
    component: TeacherShellComponent,
    canActivate: [authGuard, roleGuard(['teacher'])],
    children: [
      { path: 'dashboard',   loadComponent: () => import('./features/teacher/dashboard/teacher-dashboard.component').then((m) => m.TeacherDashboardComponent) },
      { path: 'my-batches',  loadComponent: () => import('./features/teacher/my-batches/teacher-batches.component').then((m) => m.TeacherBatchesComponent) },
      { path: 'my-students', loadComponent: () => import('./features/teacher/my-students/teacher-students.component').then((m) => m.TeacherStudentsComponent) },
      { path: 'attendance',  loadComponent: () => import('./features/teacher/attendance/teacher-attendance.component').then((m) => m.TeacherAttendanceComponent) },
      { path: 'schedule',    loadComponent: () => import('./features/teacher/schedule/teacher-schedule.component').then((m) => m.TeacherScheduleComponent) },
      { path: 'content',     loadComponent: () => import('./features/teacher/content/teacher-content.component').then((m) => m.TeacherContentComponent) },
      { path: 'quizzes',     loadComponent: () => import('./features/teacher/quizzes/teacher-quizzes.component').then((m) => m.TeacherQuizzesComponent) },
      { path: 'quiz-reports',loadComponent: () => import('./features/teacher/quiz-reports/teacher-quiz-reports.component').then((m) => m.TeacherQuizReportsComponent) },
      { path: 'alerts',      loadComponent: () => import('./features/alerts/alerts.component').then((m) => m.AlertsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── /student ──────────────────────────────────────────────────────────────
  {
    path: 'student',
    component: StudentShellComponent,
    canActivate: [authGuard, roleGuard(['student'])],
    children: [
      { path: 'dashboard',    loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then((m) => m.StudentDashboardComponent) },
      { path: 'my-course',    loadComponent: () => import('./features/student/my-course/student-my-course.component').then((m) => m.StudentMyCourseComponent) },
      { path: 'lectures/:id',  loadComponent: () => import('./features/student/lecture-player/student-lecture-player.component').then((m) => m.StudentLecturePlayerComponent) },
      { path: 'quizzes',      loadComponent: () => import('./features/student/quizzes/student-quizzes.component').then((m) => m.StudentQuizzesComponent) },
      { path: 'quiz-history', loadComponent: () => import('./features/student/quiz-history/student-quiz-history.component').then((m) => m.StudentQuizHistoryComponent) },
      { path: 'my-attendance',loadComponent: () => import('./features/student/my-attendance/student-attendance.component').then((m) => m.StudentAttendanceComponent) },
      { path: 'profile',      loadComponent: () => import('./features/student/profile/student-profile.component').then((m) => m.StudentProfileComponent) },
      { path: 'fees',         loadComponent: () => import('./features/student/fees/student-fees.component').then((m) => m.StudentFeesComponent) },
      { path: 'results',      loadComponent: () => import('./features/student/results/student-results.component').then((m) => m.StudentResultsComponent) },
      { path: 'certificates', loadComponent: () => import('./features/student/certificates/student-certificates.component').then((m) => m.StudentCertificatesComponent) },
      { path: 'placements',   loadComponent: () => import('./features/student/placements/student-placements.component').then((m) => m.StudentPlacementsComponent) },
      { path: 'live-class',   loadComponent: () => import('./features/student/schedule/student-schedule.component').then((m) => m.StudentScheduleComponent) },
      { path: 'schedule',     loadComponent: () => import('./features/student/schedule/student-schedule.component').then((m) => m.StudentScheduleComponent) },
      { path: 'alerts',       loadComponent: () => import('./features/student/alerts/student-alerts.component').then((m) => m.StudentAlertsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── Legacy /admin redirects — keeps old bookmarks working ─────────────────
  { path: 'admin',                  redirectTo: '/ho',                    pathMatch: 'full' },
  { path: 'admin/dashboard',        redirectTo: '/ho/dashboard',          pathMatch: 'full' },
  { path: 'admin/branches',         redirectTo: '/ho/branches',           pathMatch: 'full' },
  { path: 'admin/partner-enquiries',redirectTo: '/ho/partner-enquiries',  pathMatch: 'full' },
  { path: 'admin/settings',         redirectTo: '/ho/settings',           pathMatch: 'full' },
  { path: 'admin/reports',          redirectTo: '/ho/reports',            pathMatch: 'full' },
  { path: 'admin/courses',          redirectTo: '/ho/courses',            pathMatch: 'full' },
  { path: 'admin/lms',              redirectTo: '/ho/lms',                pathMatch: 'full' },
  { path: 'admin/certificates',     redirectTo: '/ho/certificates',       pathMatch: 'full' },
  { path: 'admin/placements',       redirectTo: '/ho/placements',         pathMatch: 'full' },
  { path: 'admin/alerts',           redirectTo: '/ho/alerts',             pathMatch: 'full' },
  { path: 'admin/media-library',    redirectTo: '/ho/media-library',      pathMatch: 'full' },
  { path: 'admin/page-builder',     redirectTo: '/ho/page-builder',       pathMatch: 'full' },
  { path: 'admin/students',         redirectTo: '/branch/students',       pathMatch: 'full' },
  { path: 'admin/enquiries',        redirectTo: '/branch/enquiries',      pathMatch: 'full' },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '/home' },
];
