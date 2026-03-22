export type PartnerEnquiryStatus = 'new' | 'contacted' | 'site_visit' | 'approved' | 'rejected' | 'on_hold';

export interface PartnerEnquiry {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  investmentBudget: string;
  spaceAvailable: string;
  currentOccupation: string;
  message: string | null;
  status: PartnerEnquiryStatus;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerEnquiryPayload {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  investmentBudget: string;
  spaceAvailable: string;
  currentOccupation: string;
  message?: string;
}

export interface UpdatePartnerEnquiryPayload {
  status?: PartnerEnquiryStatus;
  assignedTo?: string;
  notes?: string;
}

export const PARTNER_ENQUIRY_STATUS_LABELS: Record<PartnerEnquiryStatus, string> = {
  new:        'New',
  contacted:  'Contacted',
  site_visit: 'Site Visit',
  approved:   'Approved',
  rejected:   'Rejected',
  on_hold:    'On Hold',
};

export const INVESTMENT_BUDGET_OPTIONS = [
  '₹5–8 Lakhs (Starter)',
  '₹10–15 Lakhs (Growth)',
  '₹20–30 Lakhs (Premium)',
  '₹30+ Lakhs (Multi-Centre)',
];

export const SPACE_OPTIONS = [
  'Less than 500 sq ft',
  '500–1000 sq ft',
  '1000–2000 sq ft',
  '2000+ sq ft',
  'Looking for space',
];
