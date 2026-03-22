// ── Exam Eligibility ──────────────────────────────────────────────────────────

export type EligibilityStatus = 'pending' | 'approved' | 'rejected';

export interface EligibilityStudent {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
}

export interface EligibilityBranch {
  id: number;
  name: string;
  city: string;
}

export interface EligibilityUser {
  id: number;
  name: string;
}

export interface EligibilityRequest {
  id: number;
  status: EligibilityStatus;
  attendancePercentSnapshot: number;
  remainingDueSnapshot: number;
  internalRemarks: string | null;
  decisionRemarks: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student: EligibilityStudent;
  branch: EligibilityBranch;
  requestedBy: EligibilityUser;
  decidedBy: EligibilityUser | null;
}

export interface CreateEligibilityPayload {
  studentId: number;
  internalRemarks?: string;
}

export interface DecideEligibilityPayload {
  status: 'approved' | 'rejected';
  decisionRemarks?: string;
}

// ── Exam Registration ─────────────────────────────────────────────────────────

export type RegistrationStatus = 'registered' | 'scheduled' | 'completed' | 'absent';

export interface RegistrationStudent {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
}

export interface RegistrationBranch {
  id: number;
  name: string;
  city: string;
}

export interface RegistrationEligibility {
  id: number;
  status: string;
  attendancePercentSnapshot: number;
  remainingDueSnapshot: number;
  decisionRemarks: string | null;
  decidedAt: string | null;
}

export interface ExamRegistration {
  id: number;
  status: RegistrationStatus;
  examDate: string | null;
  hallTicketNo: string | null;
  createdAt: string;
  updatedAt: string;
  student: RegistrationStudent;
  branch: RegistrationBranch;
  eligibilityRequest: RegistrationEligibility;
}

export interface ScheduleRegistrationPayload {
  examDate?: string;
  hallTicketNo?: string;
  status?: RegistrationStatus;
}

export interface ExamRegistrationSummary {
  totalRegistrations: number;
  registered: number;
  scheduled: number;
  completed: number;
  absent: number;
}
