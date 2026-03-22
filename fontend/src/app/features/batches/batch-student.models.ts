export type BatchStudentStatus = 'active' | 'completed' | 'dropped';

export interface BatchStudentBatch {
  id: number;
  name: string;
  schedule: string | null;
  branch: { id: number; name: string };
}

export interface BatchStudentStudent {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
  branch: { id: number; name: string };
}

export interface BatchAssignment {
  id: number;
  joinedAt: string;
  status: BatchStudentStatus;
  createdAt: string;
  updatedAt: string;
  student: BatchStudentStudent;
  batch: BatchStudentBatch;
}
