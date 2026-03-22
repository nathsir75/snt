import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface TeacherBatch {
  id: number;
  name: string;
  schedule: string | null;
  capacity: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  course: { id: number; name: string; code: string };
  branch: { id: number; name: string; city: string };
  _count: { batchStudents: number };
  activeStudents?: number;
  batchSchedules?: { id: number; dayOfWeek: number; startTime: string; endTime: string }[];
}

export interface BatchStudent {
  id: number;
  joinedAt: string;
  status: string;
  student: { id: number; fullName: string; mobile: string; course: string };
  batch: { id: number; name: string };
}

export interface AttendanceEntry {
  studentId: number;
  status: 'present' | 'absent' | 'leave';
  remarks?: string;
}

export interface BatchSchedule {
  id: number;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  room: string | null;
  batch: { id: number; name: string; branch: { id: number; name: string } };
}

export interface CourseContent {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  isPublished: boolean;
  course: { id: number; name: string; code: string };
}

export interface Session {
  id: number;
  title: string;
  order: number;
  durationMinutes: number | null;
  contentItems: { id: number; type: string; title: string; fileUrl: string; isPreview: boolean }[];
}

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly api = inject(ApiService);

  // ── Batches ────────────────────────────────────────────────────────────────
  // All teacher batch fetches use /teacher-summary — assignment-scoped with student/schedule counts
  getMyBatches(): Observable<TeacherBatch[]> {
    return this.api.get<TeacherBatch[]>('/batches/teacher-summary');
  }

  // ── Students ───────────────────────────────────────────────────────────────
  getStudentsByBatch(batchId: number): Observable<BatchStudent[]> {
    return this.api.get<BatchStudent[]>(`/batch-students/batch/${batchId}`);
  }

  // ── Attendance ─────────────────────────────────────────────────────────────
  getAttendanceByBatch(batchId: number, date?: string): Observable<any[]> {
    const params: Record<string, string> = date ? { date } : {};
    return this.api.get<any[]>(`/attendance/batch/${batchId}`, params);
  }

  getAttendanceSummary(batchId: number): Observable<any> {
    return this.api.get<any>(`/attendance/summary/batch/${batchId}`);
  }

  markAttendance(batchId: number, attendanceDate: string, entries: AttendanceEntry[]): Observable<any> {
    return this.api.post<any>('/attendance/mark', { batchId, attendanceDate, entries });
  }

  // ── Schedule ───────────────────────────────────────────────────────────────
  getScheduleByBatch(batchId: number): Observable<BatchSchedule[]> {
    return this.api.get<BatchSchedule[]>(`/schedules/batch/${batchId}`);
  }

  // ── LMS / Content ──────────────────────────────────────────────────────────
  getCourseContent(courseId: number): Observable<{ courseContent: CourseContent; sessions: Session[] }> {
    return this.api.get<{ courseContent: CourseContent; sessions: Session[] }>(`/lms/course-content/${courseId}`);
  }

  getSession(sessionId: number): Observable<Session> {
    return this.api.get<Session>(`/lms/session/${sessionId}`);
  }
}
