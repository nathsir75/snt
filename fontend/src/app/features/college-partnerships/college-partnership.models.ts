export type CollegePartnershipStatus   = 'new' | 'contacted' | 'proposal_sent' | 'discussion' | 'converted' | 'rejected';
export type CollegePartnershipMode     = 'onsite' | 'online' | 'hybrid';
export type CollegePartnershipTimeline = 'immediate' | '1_3_months' | '3_6_months' | '6_plus_months';

export interface CollegePartnershipEnquiry {
  id: number;
  collegeName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  numberOfStudents: number | null;
  departments: string | null;
  programsInterested: string;
  mode: CollegePartnershipMode;
  timeline: CollegePartnershipTimeline;
  message: string | null;
  status: CollegePartnershipStatus;
  notes: string | null;
  createdAt: string;
}

export interface CreateCollegePartnershipPayload {
  collegeName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  numberOfStudents?: number;
  departments?: string;
  programsInterested: string;
  mode: CollegePartnershipMode;
  timeline: CollegePartnershipTimeline;
  message?: string;
}

export interface UpdateCollegePartnershipPayload {
  status?: CollegePartnershipStatus;
  notes?: string;
}

export const COLLEGE_PARTNERSHIP_STATUS_LABELS: Record<CollegePartnershipStatus, string> = {
  new:           'New',
  contacted:     'Contacted',
  proposal_sent: 'Proposal Sent',
  discussion:    'In Discussion',
  converted:     'Converted',
  rejected:      'Rejected',
};

export const COLLEGE_PROGRAMS = [
  'Internship Program',
  'Live Project Support',
  'Placement Training (CRT)',
  'Campus Training',
  'Faculty Development',
  'Full Stack Web Dev',
  'Java / Spring Boot',
  'Angular / React',
  'AI / ML / Data Science',
  'DevOps / Cloud',
  'Cybersecurity',
];

export const COLLEGE_TIMELINE_LABELS: Record<CollegePartnershipTimeline, string> = {
  immediate:     'Immediate (within 1 month)',
  '1_3_months':  '1–3 Months',
  '3_6_months':  '3–6 Months',
  '6_plus_months': '6+ Months',
};

export const PARTNERSHIP_MODES: { value: CollegePartnershipMode; label: string }[] = [
  { value: 'onsite',  label: 'On-Site' },
  { value: 'online',  label: 'Online' },
  { value: 'hybrid',  label: 'Hybrid' },
];

export const PARTNERSHIP_TIMELINES = Object.entries(COLLEGE_TIMELINE_LABELS).map(
  ([value, label]) => ({ value: value as CollegePartnershipTimeline, label })
);
