import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

export interface TeacherBatch {
  id: number;
  name: string;
  teamsJoinUrl: string | null;
  schedule: string | null;
  capacity: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  course: { id: number; name: string; code: string };
  branch: { id: number; name: string; code: string; city: string };
  _count: { batchStudents: number };
  activeStudents?: number;
  batchSchedules: BatchSchedule[];
  batchStudents?: BatchStudent[];
}

export interface BatchStudent {
  id: number;
  joinedAt: string;
  status: string;
  student: {
    id: number;
    fullName: string;
    mobile: string;
    email: string | null;
    course: string;
    admissionDate: string;
    branch: { id: number; name: string; city: string };
  };
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
}

export interface TrainerPortalSummary {
  account: { id: number; name: string; email: string };
  trainer: {
    id: number;
    fullName: string;
    email: string | null;
    mobile: string | null;
    specialization: string | null;
    trainerType: 'global';
    isActive: boolean;
  };
  batches: TeacherBatch[];
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
  getSummary(): Observable<TrainerPortalSummary> {
    return this.api.get<TrainerPortalSummary>('/trainer-portal/summary');
  }

  getMyBatches(): Observable<TeacherBatch[]> {
    return this.getSummary().pipe(map((summary) => summary.batches));
  }

  // ── Students ───────────────────────────────────────────────────────────────
  getStudentsByBatch(batchId: number): Observable<BatchStudent[]> {
    return this.api.get<BatchStudent[]>(`/trainer-portal/batches/${batchId}/students`);
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
    return this.getMyBatches().pipe(
      map((batches) => batches.find((batch) => batch.id === batchId)?.batchSchedules ?? [])
    );
  }

  // ── LMS / Content ──────────────────────────────────────────────────────────
  getCourseContent(courseId: number): Observable<{ courseContent: CourseContent; sessions: Session[] }> {
    return this.api.get<{ courseContent: CourseContent; sessions: Session[] }>(`/lms/course-content/${courseId}`);
  }

  getSession(sessionId: number): Observable<Session> {
    return this.api.get<Session>(`/lms/session/${sessionId}`);
  }
}
