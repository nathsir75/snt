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

export interface StudentBatchMaterial {
  id: number;
  batchId: number;
  title: string;
  description: string | null;
  materialType: string;
  contentCategory: 'recorded_lecture' | 'recommended_video' | 'study_resource';
  lectureDate: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  createdAt: string;
  mediaAsset: { id: number; title: string; mediaType: string; fileUrl: string; mimeType: string | null; fileSizeKb: number | null } | null;
  createdBy: { id: number; name: string };
  batch: { id: number; name: string; branch: { id: number; name: string }; course: { id: number; name: string; code: string } };
}

export interface StudentLecturePayload {
  material: StudentBatchMaterial & { youtubeEmbedUrl: string; youtubeVideoId: string };
  previousLectures: { id: number; title: string; lectureDate: string | null; createdAt: string; active: boolean }[];
  feedback: { id: number; rating: number; clarityStatus: string; comment: string | null; updatedAt: string } | null;
  latestProgress: { eventType: string; positionSeconds: number; durationSeconds: number | null; percentComplete: number; createdAt: string } | null;
}

export interface StudentDailyQuiz {
  id: number;
  title: string;
  topic: string | null;
  lectureDate: string | null;
  scheduledAt: string;
  closesAt: string;
  durationMinutes: number;
  serverNow: string;
  _count: { questions: number; attempts: number };
  attempt: { id: number; status: string; score: number; totalPoints: number; expiresAt: string; submittedAt: string | null } | null;
}

export interface StudentQuizHistory {
  summary: {
    totalAttempts: number;
    completedAttempts: number;
    averagePercentage: number | null;
    bestScore: number | null;
    latestResult: any | null;
  };
  history: {
    attemptId: number;
    quizId: number;
    title: string;
    topic: string | null;
    quizDate: string;
    scheduledAt: string | null;
    batch: { id: number; name: string; course: { id: number; name: string } } | null;
    score: number;
    totalPoints: number;
    percentage: number | null;
    status: string;
    startedAt: string;
    submittedAt: string | null;
    resultStatus: string;
  }[];
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
  getBatchMaterials(batchId: number): Observable<StudentBatchMaterial[]> {
    return this.api.get<StudentBatchMaterial[]>(`/batch-materials/batch/${batchId}`);
  }
  getLecture(materialId: number): Observable<StudentLecturePayload> {
    return this.api.get<StudentLecturePayload>(`/batch-materials/${materialId}/lecture`);
  }
  recordLectureProgress(materialId: number, data: { eventType: 'start' | 'checkpoint' | 'complete'; positionSeconds: number; durationSeconds?: number | null }): Observable<any> {
    return this.api.post(`/batch-materials/${materialId}/lecture/progress`, data);
  }
  submitLectureFeedback(materialId: number, data: { rating: number; clarityStatus: string; comment?: string }): Observable<any> {
    return this.api.patch(`/batch-materials/${materialId}/lecture/feedback`, data);
  }
  getDailyQuizzes(): Observable<StudentDailyQuiz[]> {
    return this.api.get<StudentDailyQuiz[]>('/daily-quizzes/student');
  }
  startDailyQuiz(id: number): Observable<any> {
    return this.api.post<any>(`/daily-quizzes/${id}/start`, {});
  }
  getDailyQuizAttempt(id: number): Observable<any> {
    return this.api.get<any>(`/daily-quizzes/attempts/${id}`);
  }
  submitDailyQuizAttempt(id: number, answers: Record<string, unknown>): Observable<any> {
    return this.api.post<any>(`/daily-quizzes/attempts/${id}/submit`, { answers });
  }
  getDailyQuizHistory(params: { from?: string; to?: string }): Observable<StudentQuizHistory> {
    const query: Record<string, string> = {};
    if (params.from) query['from'] = params.from;
    if (params.to) query['to'] = params.to;
    return this.api.get<StudentQuizHistory>('/daily-quizzes/student/history', query);
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
