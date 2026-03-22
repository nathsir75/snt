// ── Enums ─────────────────────────────────────────────────────────────────────
export type EnquiryStatus = 'new' | 'contacted' | 'follow_up' | 'converted' | 'lost';
export type FollowUpActionType = 'call' | 'whatsapp' | 'email' | 'visit' | 'note';
export type FollowUpStatusAfter = 'contacted' | 'follow_up' | 'converted' | 'lost';

// ── Core models ───────────────────────────────────────────────────────────────
export interface EnquiryBranch {
  id: number;
  name: string;
  city: string;
}

export interface Enquiry {
  id: number;
  fullName: string;
  mobile: string;
  email: string | null;
  city: string;
  state: string | null;
  courseInterest: string;
  source: string | null;
  status: EnquiryStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  branch: EnquiryBranch;
}

// ── Follow-up models ──────────────────────────────────────────────────────────
export interface FollowUpEnquirySummary {
  id: number;
  fullName: string;
  mobile: string;
  courseInterest: string;
  status: EnquiryStatus;
}

export interface FollowUpCreatedBy {
  id: number;
  name: string;
}

export interface FollowUp {
  id: number;
  actionType: FollowUpActionType;
  remarks: string;
  nextFollowUpDate: string | null;
  statusAfterAction: FollowUpStatusAfter | null;
  createdAt: string;
  enquiry: FollowUpEnquirySummary;
  branch: EnquiryBranch;
  createdBy: FollowUpCreatedBy;
}

// ── Request payloads ──────────────────────────────────────────────────────────
export interface CreateEnquiryPayload {
  fullName: string;
  mobile: string;
  email?: string;
  city: string;
  state?: string;
  courseInterest: string;
  source?: string;
  branchId?: number;   // required for super_admin; omitted for branch_admin (derived server-side)
  remarks?: string;
}

export interface UpdateEnquiryStatusPayload {
  status: EnquiryStatus;
  remarks?: string;
}

export interface CreateFollowUpPayload {
  enquiryId: number;
  actionType: FollowUpActionType;
  remarks: string;
  nextFollowUpDate?: string;
  statusAfterAction?: FollowUpStatusAfter;
}

// ── UI filter state ───────────────────────────────────────────────────────────
export interface EnquiryFilters {
  search: string;
  status: EnquiryStatus | '';
}

// ── Status display helpers ────────────────────────────────────────────────────
export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new:        'New',
  contacted:  'Contacted',
  follow_up:  'Follow Up',
  converted:  'Converted',
  lost:       'Lost',
};

export const ENQUIRY_STATUS_BADGE: Record<EnquiryStatus, string> = {
  new:        'info',
  contacted:  'primary',
  follow_up:  'warning',
  converted:  'success',
  lost:       'danger',
};

export const FOLLOWUP_ACTION_LABELS: Record<FollowUpActionType, string> = {
  call:      '📞 Call',
  whatsapp:  '💬 WhatsApp',
  email:     '📧 Email',
  visit:     '🏢 Visit',
  note:      '📝 Note',
};
