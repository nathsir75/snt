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
  capacity: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  isCentralProgramme: boolean;
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
  capacity?: number;
  isCentralProgramme?: boolean;
}

export interface UpdateBatchPayload {
  name?: string;
  schedule?: string;
  capacity?: number;
  endDate?: string;
  isActive?: boolean;
  isCentralProgramme?: boolean;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
export type BatchStatusFilter = 'all' | 'active' | 'inactive';
