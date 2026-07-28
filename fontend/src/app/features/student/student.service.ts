import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

// ─── Shared interfaces ────────────────────────────────────────────────────────

export interface StudentCourse {
  id: number;
  name: string;
  code: string;
}

export interface StudentActiveBatch {
  batchStudentId: number;
  batchId: number;
  batchName: string;
  isActive: boolean;
  isCentralProgramme: boolean;
  joinedAt: string;
  course: StudentCourse;
}

// Discriminated union — backend always returns one of these two shapes
export type StudentProfileResponse =
  | { linked: true;  studentId: number; fullName: string; email: string | null; mobile: string; city: string; course: string; admissionDate: string; totalFees: number; discount: number; finalFees: number; branch: { id: number; name: string; city: string }; activeBatch: StudentActiveBatch | null; enrolledCourseIds: number[] }
  | { linked: false; studentId: null; profile: null };

// Convenience alias for the linked shape used by dashboard/profile components
export type StudentProfile = Extract<StudentProfileResponse, { linked: true }>;

// ─── LMS ─────────────────────────────────────────────────────────────────────

export interface ContentItem {
  id: number;
  type: string;
  title: string;
  fileUrl: string;
  isPreview: boolean;
  thumbnailUrl: string | null;
}

export interface StudentSession {
  id: number;
  title: string;
  order: number;
  durationMinutes: number | null;
  contentItems: ContentItem[];
}

export interface StudentCourseContent {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  isPublished: boolean;
  course: StudentCourse;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: number;
  attendanceDate: string;
  status: string;
  remarks: string | null;
  batch: { id: number; name: string };
}

export interface MyAttendance {
  studentId: number;
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
  records: AttendanceRecord[];
}

// ─── Fees ─────────────────────────────────────────────────────────────────────

export interface FeePayment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNo: string | null;
  remarks: string | null;
}

export interface MyFees {
  student: {
    id: number;
    fullName: string;
    course: string;
    totalFees: number;
    discount: number;
    finalFees: number;
    branch: { id: number; name: string };
  };
  payments: FeePayment[];
  totalFees: number;
  totalPaid: number;
  remainingDue: number;
}

// ─── Results ─────────────────────────────────────────────────────────────────

export interface MyResult {
  id: number;
  marksObtained: number;
  maxMarks: number;
  resultStatus: string;
  remarks: string | null;
  publishedAt: string;
  registration: {
    id: number;
    examDate: string | null;
    hallTicketNo: string | null;
    status: string;
  };
}

// ─── Certificates ─────────────────────────────────────────────────────────────

export interface MyCertificate {
  id: number;
  certificateNo: string;
  verificationCode: string;
  issueDate: string;
  status: string;
  result: {
    marksObtained: number;
    maxMarks: number;
    resultStatus: string;
  };
}

// ─── Placements ───────────────────────────────────────────────────────────────

export interface MyPlacement {
  id: number;
  salaryPackage: number | null;
  joiningDate: string | null;
  status: string;
  createdAt: string;
  company: { id: number; name: string; industry: string | null; location: string | null };
  jobOpening: { id: number; title: string } | null;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export interface MyScheduleSlot {
  id: number;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  room: string | null;
}

export interface MySchedule {
  batch: { id: number; name: string; course: { name: string } } | null;
  schedules: MyScheduleSlot[];
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface MyAlert {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  entityType: string | null;
  entityId: number | null;
}

export interface MyAlerts {
  alerts: MyAlert[];
  unreadCount: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly api = inject(ApiService);

  // Profile
  getMyProfile(): Observable<StudentProfileResponse> {
    return this.api.get<StudentProfileResponse>('/student/me');
  }
  updateMyProfile(data: { mobile?: string; city?: string }): Observable<{ id: number; fullName: string; mobile: string; city: string; email: string | null }> {
    return this.api.patch('/student/me', data);
  }

  // LMS
  getCourseContent(courseId: number): Observable<{ courseContent: StudentCourseContent; sessions: StudentSession[] }> {
    return this.api.get(`/lms/course-content/${courseId}`);
  }
  getSession(sessionId: number): Observable<StudentSession> {
    return this.api.get(`/lms/session/${sessionId}`);
  }

  // Attendance
  getMyAttendance(): Observable<MyAttendance> {
    return this.api.get<MyAttendance>('/attendance/my');
  }

  // Fees
  getMyFees(): Observable<MyFees> {
    return this.api.get<MyFees>('/student/me/fees');
  }

  // Results
  getMyResults(): Observable<MyResult[]> {
    return this.api.get<MyResult[]>('/student/me/results');
  }

  // Certificates
  getMyCertificates(): Observable<MyCertificate[]> {
    return this.api.get<MyCertificate[]>('/student/me/certificates');
  }

  // Placements
  getMyPlacements(): Observable<MyPlacement[]> {
    return this.api.get<MyPlacement[]>('/student/me/placements');
  }

  // Schedule
  getMySchedule(): Observable<MySchedule> {
    return this.api.get<MySchedule>('/student/me/schedule');
  }

  // Alerts
  getMyAlerts(): Observable<MyAlerts> {
    return this.api.get<MyAlerts>('/student/me/alerts');
  }
  markAlertRead(id: number): Observable<{ id: number; isRead: boolean }> {
    return this.api.patch(`/student/me/alerts/${id}/read`, {});
  }
}
