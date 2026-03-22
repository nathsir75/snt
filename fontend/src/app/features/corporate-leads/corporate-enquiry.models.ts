export type CorporateEnquiryStatus = 'new' | 'contacted' | 'proposal_sent' | 'discussion' | 'converted' | 'rejected';
export type CorporateEnquiryMode   = 'onsite' | 'online' | 'hybrid';
export type CorporateEnquiryType   = 'training' | 'hiring' | 'both';

export interface CorporateEnquiry {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  industry: string | null;
  employeesCount: number | null;
  enquiryType: CorporateEnquiryType;
  trainingNeeds: string | null;
  mode: CorporateEnquiryMode;
  location: string | null;
  timeline: string;
  message: string | null;
  status: CorporateEnquiryStatus;
  notes: string | null;
  createdAt: string;
}

export interface CreateCorporateEnquiryPayload {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  industry?: string;
  employeesCount?: number;
  enquiryType: CorporateEnquiryType;
  trainingNeeds?: string;
  mode: CorporateEnquiryMode;
  location?: string;
  timeline: string;
  message?: string;
}

export interface UpdateCorporateEnquiryPayload {
  status?: CorporateEnquiryStatus;
  notes?: string;
}

export const CORPORATE_STATUS_LABELS: Record<CorporateEnquiryStatus, string> = {
  new:           'New',
  contacted:     'Contacted',
  proposal_sent: 'Proposal Sent',
  discussion:    'In Discussion',
  converted:     'Converted',
  rejected:      'Rejected',
};

export const CORPORATE_TRAINING_NEEDS = [
  'Java Full Stack',
  'Angular / React Frontend',
  'DevOps / CI-CD / Cloud',
  'AI / GenAI / ML',
  'Data Analytics / Power BI',
  'Python / Django',
  'Cybersecurity / VAPT',
  'Soft Skills / Communication',
  'Custom Enterprise Program',
];

export const CORPORATE_TIMELINE_OPTIONS = [
  'Immediate (within 2 weeks)',
  '1 Month',
  '1–3 Months',
  '3–6 Months',
  'Flexible / TBD',
];

export const CORPORATE_ENQUIRY_TYPES: { value: CorporateEnquiryType; label: string }[] = [
  { value: 'training', label: 'Corporate Training' },
  { value: 'hiring',   label: 'Hire Talent' },
  { value: 'both',     label: 'Both Training & Hiring' },
];

export const CORPORATE_TIMELINES = CORPORATE_TIMELINE_OPTIONS.map(
  (label) => ({ value: label, label })
);
