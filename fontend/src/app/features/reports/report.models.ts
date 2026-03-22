// ── Branch Dashboard ──────────────────────────────────────────────────────────
export interface BranchDashboard {
  branchId: number;
  totalStudents: number;
  activeBatches: number;
  totalEnquiries: number;
  convertedEnquiries: number;
  totalCollectedFees: number;
  pendingFees: number;
  attendanceToday: { present: number; absent: number; leave: number };
}

// ── Overall Dashboard (super_admin) ───────────────────────────────────────────
export interface BranchWiseStat {
  branchId: number;
  branchName: string;
  students: number;
  collections: number;
}

export interface OverallDashboard {
  totalBranches: number;
  totalStudents: number;
  totalEnquiries: number;
  totalCollectedFees: number;
  pendingFees: number;
  branchWiseStats: BranchWiseStat[];
}

// ── Student Lifecycle ─────────────────────────────────────────────────────────
export interface StudentLifecycle {
  newEnquiries: number;
  convertedToStudents: number;
  activeStudents: number;
  completedStudents: number;
  droppedStudents: number;
}

// ── Enquiry Funnel ────────────────────────────────────────────────────────────
export interface EnquiryFunnel {
  totalEnquiries: number;
  contacted: number;
  converted: number;
  lost: number;
}

// ── Fee Collection Report ─────────────────────────────────────────────────────
export interface DailyCollection {
  date: string;
  amount: number;
}

export interface FeeCollectionReport {
  totalCollected: number;
  totalTransactions: number;
  dailyCollection: DailyCollection[];
}

// ── Attendance Report ─────────────────────────────────────────────────────────
export interface AttendanceStat {
  studentId: number;
  fullName: string;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

export interface AttendanceReport {
  batchId: number;
  batchName: string;
  totalStudents: number;
  attendanceStats: AttendanceStat[];
}
