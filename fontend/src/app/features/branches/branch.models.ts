export type BranchStatus = 'active' | 'inactive' | 'suspended';

export interface Branch {
  id:               number;
  name:             string;
  code:             string;
  city:             string;
  state:            string;
  status:           BranchStatus;
  // public website controls
  isPublic:         boolean;
  websiteEnabled:   boolean;
  publicPriority:   number;
  publicPhone:      string | null;
  publicEmail:      string | null;
  publicMapLink:    string | null;
  shortDescription: string | null;
  createdAt:        string;
}

/** Shape returned by GET /branches/public — no auth required. */
export interface PublicBranch {
  id:               number;
  name:             string;
  code:             string;
  city:             string;
  state:            string;
  websiteEnabled:   boolean;
  publicPriority:   number;
  phone:            string | null;
  email:            string | null;
  mapLink:          string | null;
  shortDescription: string | null;
}

export interface UpdateBranchPayload {
  name?:   string;
  city?:   string;
  state?:  string;
  status?: BranchStatus;
}

export interface UpdatePublicSettingsPayload {
  isPublic?:         boolean;
  websiteEnabled?:   boolean;
  publicPriority?:   number;
  publicPhone?:      string | null;
  publicEmail?:      string | null;
  publicMapLink?:    string | null;
  shortDescription?: string | null;
}

export interface CreateBranchPayload {
  name:              string;
  code:              string;
  city:              string;
  state?:            string;
  partnerEnquiryId?: number;
}

export type OnboardingStepStatus = 'pending' | 'in_progress' | 'completed';

export interface OnboardingStep {
  id:          number;
  stepKey:     string;
  title:       string;
  description: string;
  status:      OnboardingStepStatus;
  completedAt: string | null;
  notes:       string | null;
  order:       number;
}

export interface BranchOnboarding {
  branchId:        number;
  branchName:      string;
  overallProgress: number;
  steps:           OnboardingStep[];
}
