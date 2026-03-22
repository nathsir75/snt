export interface Course {
  id: number;
  name: string;
  code: string;
  description: string | null;
  durationMonths: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCoursePayload {
  name: string;
  code: string;
  description?: string;
  durationMonths: number;
}

export interface UpdateCoursePayload {
  name?: string;
  code?: string;
  description?: string;
  durationMonths?: number;
  isActive?: boolean;
}
