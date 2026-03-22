// ── Core models ───────────────────────────────────────────────────────────────
export interface StudentBranch {
  id: number;
  name: string;
  city: string;
}

export interface StudentEnquirySummary {
  id: number;
  courseInterest: string;
  source: string | null;
  status: string;
}

export interface Student {
  id: number;
  fullName: string;
  mobile: string;
  email: string | null;
  city: string;
  course: string;
  admissionDate: string;
  totalFees: number;
  discount: number;
  finalFees: number;
  createdAt: string;
  branch: StudentBranch;
  enquiry: StudentEnquirySummary | null;
}

// ── Request payloads ──────────────────────────────────────────────────────────
export interface ConvertToStudentPayload {
  course: string;
  totalFees: number;
  discount: number;
}

export interface CreateStudentPayload {
  fullName: string;
  mobile: string;
  email?: string;
  city: string;
  course: string;
  totalFees: number;
  discount: number;
  branchId: number;
}

// ── UI filter state ───────────────────────────────────────────────────────────
export interface StudentFilters {
  search: string;
  course: string;
}
