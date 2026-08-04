import { NavItem } from './nav.model';

// ── /ho — Head Office (super_admin) ──────────────────────────────────────────
export const HO_NAV: NavItem[] = [
  { label: 'Dashboard',              icon: '🏠', route: '/ho/dashboard',              group: 'Core' },

  { label: 'Branches',               icon: '🏢', route: '/ho/branches',               group: 'Administration' },
  { label: 'Users',                  icon: '👥', route: '/ho/users',                  group: 'Administration' },
  { label: 'Partner Enquiries',      icon: '🤝', route: '/ho/partner-enquiries',       group: 'Administration' },
  { label: 'Settings',               icon: '⚙️', route: '/ho/settings',               group: 'Administration' },

  { label: 'Enquiries',              icon: '📋', route: '/ho/enquiries',              group: 'CRM',          badgeKey: 'newEnquiries',     badgeColor: 'info' },
  { label: 'Students',               icon: '🎓', route: '/ho/students',               group: 'CRM' },
  { label: 'Student Import',         icon: '📥', route: '/ho/student-import',         group: 'CRM' },

  { label: 'Courses',                icon: '📚', route: '/ho/courses',                group: 'Academic' },
  { label: 'LMS',                    icon: '🖥️', route: '/ho/lms',                    group: 'Academic' },
  { label: 'Batches',                icon: '👥', route: '/ho/batches',                group: 'Academic' },
  { label: 'Attendance',             icon: '✅', route: '/ho/attendance',             group: 'Academic' },
  { label: 'Trainers',               icon: '👨🏫', route: '/ho/trainers',               group: 'Academic' },
  { label: 'Schedules',              icon: '📅', route: '/ho/schedules',              group: 'Academic' },

  { label: 'Fee Structures',         icon: '🏷️', route: '/ho/fee-structures',         group: 'Finance' },
  { label: 'Fee Collection',         icon: '💰', route: '/ho/fees',                   group: 'Finance' },
  { label: 'Discounts',              icon: '🎟️', route: '/ho/discounts',              group: 'Finance',      badgeKey: 'pendingDiscounts', badgeColor: 'warning' },

  { label: 'Exam Eligibility',       icon: '📝', route: '/ho/exam-eligibility',       group: 'Examinations' },
  { label: 'Exam Registration',      icon: '📄', route: '/ho/exam-registrations',     group: 'Examinations' },
  { label: 'Results',                icon: '🏆', route: '/ho/results',                group: 'Examinations' },
  { label: 'Certificates',           icon: '🎖️', route: '/ho/certificates',           group: 'Examinations' },

  { label: 'Companies',              icon: '🏢', route: '/ho/companies',              group: 'Placement' },
  { label: 'Job Openings',           icon: '💼', route: '/ho/job-openings',           group: 'Placement' },
  { label: 'Placements',             icon: '🚀', route: '/ho/placements',             group: 'Placement' },

  { label: 'Reports',                icon: '📊', route: '/ho/reports',                group: 'Analytics' },
  { label: 'Branch Comparison',      icon: '🏆', route: '/ho/reports/branch-comparison', group: 'Analytics' },
  { label: 'Alerts',                 icon: '🔔', route: '/ho/alerts',                 group: 'Analytics',    badgeKey: 'unreadAlerts',     badgeColor: 'danger' },

  { label: 'Website CMS',            icon: '🖊️', route: '/ho/website-cms',                group: 'Content' },
  { label: 'Display Control',        icon: '🎨', route: '/ho/website-display-control',      group: 'Content' },
  { label: 'Page Builder',           icon: '🌐', route: '/ho/page-builder',                 group: 'Content',      badgeKey: 'draftPages',       badgeColor: 'info' },
  { label: 'Media Library',          icon: '🖼️', route: '/ho/media-library',                group: 'Content' },

  { label: 'Internship Applications',icon: '🎓', route: '/ho/internship-applications',group: 'Business Leads' },
  { label: 'College Partnerships',   icon: '🏫', route: '/ho/college-partnerships',   group: 'Business Leads' },
  { label: 'Corporate Leads',        icon: '🏢', route: '/ho/corporate-leads',        group: 'Business Leads' },
  { label: 'Career Applications',    icon: '💼', route: '/ho/career-applications',    group: 'Business Leads' },
];

// ── /branch — Branch Admin + Counselor ───────────────────────────────────────
export const BRANCH_NAV: NavItem[] = [
  { label: 'Dashboard',     icon: '🏠', route: '/branch/dashboard',     group: 'Core' },

  // CRM — both branch_admin and counselor
  { label: 'Enquiries',     icon: '📋', route: '/branch/enquiries',     roles: ['branch_admin', 'counselor'], group: 'Branch Operations', badgeKey: 'newEnquiries',     badgeColor: 'info' },
  { label: 'Students',      icon: '🎓', route: '/branch/students',      roles: ['branch_admin', 'counselor'], group: 'Branch Operations' },

  // Batches — counselor gets read-only view; write ops gated in component
  { label: 'Batches',       icon: '👥', route: '/branch/batches',       roles: ['branch_admin', 'counselor'], group: 'Branch Operations' },

  // Operations — branch_admin only
  { label: 'Attendance',    icon: '✅', route: '/branch/attendance',    roles: ['branch_admin'], group: 'Branch Operations' },
  { label: 'Fee Collection',icon: '💰', route: '/branch/fees',          roles: ['branch_admin'], group: 'Branch Operations' },

  { label: 'Trainers',      icon: '👨🏫',route: '/branch/trainers',     roles: ['branch_admin'], group: 'Academic' },
  // Schedules — counselor gets read-only view to advise students on batch timings
  { label: 'Schedules',     icon: '📅', route: '/branch/schedules',     roles: ['branch_admin', 'counselor'], group: 'Academic' },
  { label: 'LMS',           icon: '🖥️', route: '/branch/lms',           roles: ['branch_admin'], group: 'Academic' },

  { label: 'Discounts',     icon: '🎟️', route: '/branch/discounts',     roles: ['branch_admin'], group: 'Finance',           badgeKey: 'pendingDiscounts', badgeColor: 'warning' },

  { label: 'Exam Eligibility',  icon: '📝', route: '/branch/exam-eligibility',   roles: ['branch_admin'], group: 'Examinations' },
  { label: 'Exam Registration', icon: '📄', route: '/branch/exam-registrations', roles: ['branch_admin'], group: 'Examinations' },
  { label: 'Results',           icon: '🏆', route: '/branch/results',            roles: ['branch_admin'], group: 'Examinations' },
  { label: 'Certificates',      icon: '🎖️', route: '/branch/certificates',       roles: ['branch_admin'], group: 'Examinations' },

  { label: 'Job Openings',  icon: '💼', route: '/branch/job-openings',  roles: ['branch_admin'], group: 'Placement' },
  { label: 'Interviews',    icon: '🤝', route: '/branch/interviews',    roles: ['branch_admin'], group: 'Placement' },
  { label: 'Applications',  icon: '📨', route: '/branch/applications',  roles: ['branch_admin'], group: 'Placement' },
  { label: 'Placements',    icon: '🚀', route: '/branch/placements',    roles: ['branch_admin'], group: 'Placement' },
  { label: 'Companies',     icon: '🏢', route: '/branch/companies',     roles: ['branch_admin'], group: 'Placement' },

  { label: 'Reports',       icon: '📊', route: '/branch/reports',       roles: ['branch_admin'], group: 'Analytics' },
  { label: 'Alerts',        icon: '🔔', route: '/branch/alerts',        roles: ['branch_admin', 'counselor'], group: 'Analytics',         badgeKey: 'unreadAlerts',     badgeColor: 'danger' },

  { label: 'Page Builder',  icon: '🌐', route: '/branch/page-builder',  roles: ['branch_admin'], group: 'Content',           badgeKey: 'draftPages',       badgeColor: 'info' },
  { label: 'Website CMS',   icon: '🖊️', route: '/branch/website-cms',   roles: ['branch_admin'], group: 'Content' },
  { label: 'Media Library', icon: '🖼️', route: '/branch/media-library', roles: ['branch_admin'], group: 'Content' },

  { label: 'Settings',      icon: '⚙️', route: '/branch/settings',      roles: ['branch_admin'], group: 'Administration' },
];

// ── /teacher ──────────────────────────────────────────────────────────────────
export const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard',    icon: '🏠', route: '/teacher/dashboard',    group: 'Core' },
  { label: 'My Batches',   icon: '👥', route: '/teacher/my-batches',   group: 'Teaching' },
  { label: 'My Students',  icon: '🎓', route: '/teacher/my-students',  group: 'Teaching' },
  { label: 'Attendance',   icon: '✅', route: '/teacher/attendance',   group: 'Teaching' },
  { label: 'Schedule',     icon: '📅', route: '/teacher/schedule',     group: 'Teaching' },
  { label: 'Content',      icon: '🖥️', route: '/teacher/content',      group: 'Teaching' },
  { label: 'Daily Quiz',   icon: '?',  route: '/teacher/quizzes',      group: 'Teaching' },
  { label: 'Quiz Reports', icon: '%',  route: '/teacher/quiz-reports', group: 'Teaching' },
  { label: 'Alerts',       icon: '🔔', route: '/teacher/alerts',       group: 'Notifications' },
];

// ── /student ──────────────────────────────────────────────────────────────────
export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard',    icon: '🏠', route: '/student/dashboard',     group: 'Core' },
  { label: 'My Course',    icon: '📚', route: '/student/my-course',     group: 'Learning' },
  { label: 'Quiz History', icon: '%',  route: '/student/quiz-history',  group: 'Learning' },
  { label: 'Attendance',   icon: '✅', route: '/student/my-attendance', group: 'Learning' },
  { label: 'Schedule',     icon: '📅', route: '/student/schedule',      group: 'Learning' },
  { label: 'Fees',         icon: '💰', route: '/student/fees',          group: 'Finance' },
  { label: 'Results',      icon: '🏆', route: '/student/results',       group: 'Exams' },
  { label: 'Certificates', icon: '🎖️', route: '/student/certificates',  group: 'Exams' },
  { label: 'Placements',   icon: '🚀', route: '/student/placements',    group: 'Placement' },
  { label: 'Alerts',       icon: '🔔', route: '/student/alerts',        group: 'Notifications' },
  { label: 'Profile',      icon: '👤', route: '/student/profile',       group: 'Account' },
];

/** Legacy — kept so existing sidebar still compiles; prefer role-specific configs above */
export const NAV_CONFIG = HO_NAV;
