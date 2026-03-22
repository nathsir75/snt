export type InternshipDomain       = 'java' | 'frontend' | 'fullstack' | 'ai' | 'devops' | 'data' | 'cybersecurity' | 'mobile';
export type InternshipExperience   = 'beginner' | 'intermediate' | 'advanced';
export type InternshipAvailability = 'fulltime' | 'parttime';
export type InternshipDuration     = '1_month' | '3_months' | '6_months';
export type InternshipStatus       = 'new' | 'screening' | 'shortlisted' | 'assigned' | 'completed' | 'rejected';

export interface InternshipApplication {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  college: string | null;
  degree: string | null;
  branch: string | null;
  graduationYear: number | null;
  skills: string | null;
  preferredDomain: InternshipDomain;
  experienceLevel: InternshipExperience;
  availability: InternshipAvailability;
  duration: InternshipDuration;
  resumeUrl: string | null;
  portfolioUrl: string | null;
  message: string | null;
  status: InternshipStatus;
  notes: string | null;
  createdAt: string;
}

export interface CreateInternshipApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  college?: string;
  degree?: string;
  branch?: string;
  graduationYear?: number;
  skills?: string;
  preferredDomain: InternshipDomain;
  experienceLevel: InternshipExperience;
  availability: InternshipAvailability;
  duration: InternshipDuration;
  resumeUrl?: string;
  portfolioUrl?: string;
  message?: string;
}

export interface UpdateInternshipApplicationPayload {
  status?: InternshipStatus;
  notes?: string;
}

export const INTERNSHIP_STATUS_LABELS: Record<InternshipStatus, string> = {
  new:         'New',
  screening:   'Screening',
  shortlisted: 'Shortlisted',
  assigned:    'Assigned',
  completed:   'Completed',
  rejected:    'Rejected',
};

export const INTERNSHIP_DOMAIN_LABELS: Record<InternshipDomain, string> = {
  java:         'Java / Spring Boot',
  frontend:     'Frontend (Angular/React)',
  fullstack:    'Full Stack Web Dev',
  ai:           'AI / Machine Learning',
  devops:       'DevOps / Cloud',
  data:         'Data Science / Analytics',
  cybersecurity:'Cybersecurity',
  mobile:       'Mobile App Development',
};

export const INTERNSHIP_DURATION_LABELS: Record<InternshipDuration, string> = {
  '1_month':   '1 Month',
  '3_months':  '3 Months',
  '6_months':  '6 Months',
};

export const INTERNSHIP_DOMAINS = Object.entries(INTERNSHIP_DOMAIN_LABELS).map(
  ([value, label]) => ({ value: value as InternshipDomain, label })
);

export const EXPERIENCE_LEVELS: { value: InternshipExperience; label: string }[] = [
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
];

export const AVAILABILITY_OPTIONS: { value: InternshipAvailability; label: string }[] = [
  { value: 'fulltime',  label: 'Full Time' },
  { value: 'parttime',  label: 'Part Time' },
];

export const DURATION_OPTIONS = Object.entries(INTERNSHIP_DURATION_LABELS).map(
  ([value, label]) => ({ value: value as InternshipDuration, label })
);
