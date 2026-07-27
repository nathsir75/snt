// ── Core models ───────────────────────────────────────────────────────────────
export interface BatchCourse {
  id: number;
  name: string;
  code: string;
}

export interface BatchBranch {
  id: number;
  name: string;
  city: string;
}

export interface Batch {
  id: number;
  name: string;
  schedule: string | null;
  teamsJoinUrl: string | null;
  isCentralProgramme: boolean;
  capacity: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  course: BatchCourse;
  branch: BatchBranch;
  _count: { batchStudents: number };
}

// ── Request payloads ──────────────────────────────────────────────────────────
export interface CreateBatchPayload {
  name: string;
  courseId: number;
  branchId: number;
  startDate: string;
  endDate?: string;
  schedule?: string;
  teamsJoinUrl?: string;
  isCentralProgramme?: boolean;
  capacity?: number;
}

export interface UpdateBatchPayload {
  name?: string;
  schedule?: string;
  teamsJoinUrl?: string | null;
  isCentralProgramme?: boolean;
  capacity?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
export type BatchStatusFilter = 'all' | 'active' | 'inactive';
