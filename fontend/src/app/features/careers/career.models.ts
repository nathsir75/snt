// ── Status ────────────────────────────────────────────────────────────────────
export type CareerApplicationStatus =
  | 'new'
  | 'screening'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'selected'
  | 'rejected'
  | 'on_hold';

export const CAREER_STATUS_LABELS: Record<CareerApplicationStatus, string> = {
  new:                  'New',
  screening:            'Screening',
  shortlisted:          'Shortlisted',
  interview_scheduled:  'Interview Scheduled',
  selected:             'Selected',
  rejected:             'Rejected',
  on_hold:              'On Hold',
};

// ── Department / Role ─────────────────────────────────────────────────────────
export type CareerDepartment =
  | 'training'
  | 'operations'
  | 'hr'
  | 'sales'
  | 'marketing'
  | 'technology'
  | 'finance'
  | 'content';

export const CAREER_DEPARTMENT_LABELS: Record<CareerDepartment, string> = {
  training:   'Training & Education',
  operations: 'Operations',
  hr:         'Human Resources',
  sales:      'Sales & Business Dev',
  marketing:  'Marketing',
  technology: 'Technology',
  finance:    'Finance & Accounts',
  content:    'Content & Curriculum',
};

export type ExperienceRange =
  | 'fresher'
  | '1_2_years'
  | '2_5_years'
  | '5_10_years'
  | '10_plus_years';

export const EXPERIENCE_RANGE_LABELS: Record<ExperienceRange, string> = {
  fresher:       'Fresher (0–1 yr)',
  '1_2_years':   '1–2 Years',
  '2_5_years':   '2–5 Years',
  '5_10_years':  '5–10 Years',
  '10_plus_years': '10+ Years',
};

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'remote';

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract:  'Contract',
  remote:    'Remote',
};

// ── Open Roles ────────────────────────────────────────────────────────────────
export interface CareerRole {
  id: string;
  title: string;
  department: CareerDepartment;
  location: string;
  type: EmploymentType;
  experience: ExperienceRange;
  description: string;
  skills: string[];
}

export const OPEN_ROLES: CareerRole[] = [
  {
    id: 'trainer-java',
    title: 'Java Full Stack Trainer',
    department: 'training',
    location: 'Pune / Remote',
    type: 'full_time',
    experience: '2_5_years',
    description: 'Deliver hands-on Java, Spring Boot, and Angular training to batches of 20–30 students. Create course content and assessments.',
    skills: ['Java', 'Spring Boot', 'Angular', 'REST APIs', 'MySQL'],
  },
  {
    id: 'trainer-ai',
    title: 'AI / ML Trainer',
    department: 'training',
    location: 'Pune / Remote',
    type: 'full_time',
    experience: '2_5_years',
    description: 'Teach Python, Machine Learning, Deep Learning, and GenAI concepts with real-world project-based curriculum.',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'LLMs'],
  },
  {
    id: 'trainer-devops',
    title: 'DevOps / Cloud Trainer',
    department: 'training',
    location: 'Pune / Hybrid',
    type: 'full_time',
    experience: '2_5_years',
    description: 'Conduct training on AWS, Azure, Docker, Kubernetes, CI/CD pipelines, and infrastructure automation.',
    skills: ['AWS', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform'],
  },
  {
    id: 'branch-manager',
    title: 'Branch Manager',
    department: 'operations',
    location: 'Multiple Locations',
    type: 'full_time',
    experience: '5_10_years',
    description: 'Oversee day-to-day branch operations, student admissions, trainer management, and revenue targets.',
    skills: ['Team Management', 'P&L', 'Student Relations', 'Reporting'],
  },
  {
    id: 'hr-executive',
    title: 'HR Executive',
    department: 'hr',
    location: 'Pune',
    type: 'full_time',
    experience: '1_2_years',
    description: 'Handle recruitment, onboarding, employee engagement, and HR operations for the growing team.',
    skills: ['Recruitment', 'HRMS', 'Payroll', 'Compliance'],
  },
  {
    id: 'sales-executive',
    title: 'Admissions & Sales Executive',
    department: 'sales',
    location: 'Multiple Locations',
    type: 'full_time',
    experience: '1_2_years',
    description: 'Convert student enquiries into admissions, conduct counselling sessions, and achieve monthly targets.',
    skills: ['Counselling', 'CRM', 'Target Achievement', 'Communication'],
  },
  {
    id: 'content-developer',
    title: 'Technical Content Developer',
    department: 'content',
    location: 'Remote',
    type: 'remote',
    experience: '2_5_years',
    description: 'Create structured course content, video scripts, assessments, and LMS materials for tech programs.',
    skills: ['Technical Writing', 'LMS', 'Instructional Design', 'Video Scripting'],
  },
  {
    id: 'frontend-dev',
    title: 'Frontend Developer (Angular)',
    department: 'technology',
    location: 'Pune / Remote',
    type: 'full_time',
    experience: '2_5_years',
    description: 'Build and maintain the SNT SaaS platform frontend using Angular 18, TypeScript, and modern UI patterns.',
    skills: ['Angular', 'TypeScript', 'RxJS', 'SCSS', 'REST APIs'],
  },
];

// ── Application Model ─────────────────────────────────────────────────────────
export interface CareerApplication {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  currentRole: string | null;
  currentCompany: string | null;
  experienceRange: ExperienceRange;
  department: CareerDepartment;
  roleAppliedFor: string;
  employmentTypePreference: EmploymentType;
  skills: string;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string;
  coverNote: string | null;
  expectedCtc: string | null;
  noticePeriod: string | null;
  status: CareerApplicationStatus;
  notes: string | null;
  createdAt: string;
}

export interface CreateCareerApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  currentRole?: string;
  currentCompany?: string;
  experienceRange: ExperienceRange;
  department: CareerDepartment;
  roleAppliedFor: string;
  employmentTypePreference: EmploymentType;
  skills: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl: string;
  coverNote?: string;
  expectedCtc?: string;
  noticePeriod?: string;
}

export interface UpdateCareerApplicationPayload {
  status?: CareerApplicationStatus;
  notes?: string;
}

// ── Select option helpers ─────────────────────────────────────────────────────
export const CAREER_STATUS_OPTIONS = Object.entries(CAREER_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as CareerApplicationStatus, label })
);

export const CAREER_DEPARTMENT_OPTIONS = Object.entries(CAREER_DEPARTMENT_LABELS).map(
  ([value, label]) => ({ value: value as CareerDepartment, label })
);

export const EXPERIENCE_RANGE_OPTIONS = Object.entries(EXPERIENCE_RANGE_LABELS).map(
  ([value, label]) => ({ value: value as ExperienceRange, label })
);

export const EMPLOYMENT_TYPE_OPTIONS = Object.entries(EMPLOYMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as EmploymentType, label })
);

export const NOTICE_PERIOD_OPTIONS = [
  'Immediate',
  '15 Days',
  '30 Days',
  '45 Days',
  '60 Days',
  '90 Days',
];
