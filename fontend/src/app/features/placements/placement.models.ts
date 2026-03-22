// ── Interview ─────────────────────────────────────────────────────────────────

export type InterviewMode = 'online' | 'offline';

export interface InterviewJobOpening {
  id: number;
  title: string;
  company: { id: number; name: string };
}

export interface InterviewBranch {
  id: number;
  name: string;
  city: string;
}

export interface Interview {
  id: number;
  interviewDate: string;
  mode: InterviewMode;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  jobOpening: InterviewJobOpening;
  branch: InterviewBranch | null;
  _count: { applications: number };
}

export interface ScheduleInterviewPayload {
  jobOpeningId: number;
  interviewDate: string;
  mode: InterviewMode;
  location?: string;
  branchId?: number;
}

// ── Application ───────────────────────────────────────────────────────────────

export type ApplicationStatus = 'applied' | 'shortlisted' | 'rejected' | 'selected';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied:     'Applied',
  shortlisted: 'Shortlisted',
  rejected:    'Rejected',
  selected:    'Selected',
};

export interface AppInterview {
  id: number;
  interviewDate: string;
  mode: string;
  jobOpening: { id: number; title: string; company: { id: number; name: string } };
}

export interface AppStudent {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
  branchId: number;
}

export interface Application {
  id: number;
  status: ApplicationStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  interview: AppInterview;
  student: AppStudent;
}

export interface ApplyPayload {
  interviewId: number;
  studentId: number;
  remarks?: string;
}

export interface UpdateApplicationStatusPayload {
  status: ApplicationStatus;
  remarks?: string;
}

// ── Placement ─────────────────────────────────────────────────────────────────

export type PlacementStatus = 'offered' | 'joined' | 'rejected';

export const PLACEMENT_STATUS_LABELS: Record<PlacementStatus, string> = {
  offered:  'Offered',
  joined:   'Joined',
  rejected: 'Rejected',
};

export interface PlacementStudent {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
  branchId: number;
}

export interface PlacementCompany {
  id: number;
  name: string;
  industry: string | null;
  location: string | null;
}

export interface Placement {
  id: number;
  salaryPackage: number | null;
  joiningDate: string | null;
  status: PlacementStatus;
  createdAt: string;
  updatedAt: string;
  student: PlacementStudent;
  company: PlacementCompany;
  jobOpening: { id: number; title: string } | null;
}

export interface CreatePlacementPayload {
  studentId: number;
  companyId: number;
  jobOpeningId?: number;
  salaryPackage?: number;
  joiningDate?: string;
  status?: PlacementStatus;
}

export interface PlacementSummary {
  totalPlaced: number;
  offers: number;
  joined: number;
  rejected: number;
  avgSalary: number;
}
