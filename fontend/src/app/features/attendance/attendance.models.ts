export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface AttendanceStudent {
  id: number;
  fullName: string;
  mobile: string;
}

export interface AttendanceBatch {
  id: number;
  name: string;
}

export interface AttendanceMarkedBy {
  id: number;
  name: string;
}

export interface AttendanceRecord {
  id: number;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  student: AttendanceStudent;
  batch: AttendanceBatch;
  markedBy: AttendanceMarkedBy;
}

// POST /attendance/mark response
export interface MarkAttendanceResult {
  batchId: number;
  attendanceDate: string;
  totalMarked: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
}

// GET /attendance/summary/batch/:batchId
export interface StudentAttendanceStat {
  studentId: number;
  fullName: string;
  totalClasses: number;
  present: number;
  attendancePercent: number;
}

export interface BatchAttendanceSummary {
  batchId: number;
  batchName: string;
  totalStudents: number;
  totalAttendanceRecords: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  attendancePerStudent: StudentAttendanceStat[];
}

// GET /attendance/student/:studentId
export interface StudentAttendanceResult {
  studentId: number;
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
  records: AttendanceRecord[];
}

// Request entry
export interface AttendanceEntry {
  studentId: number;
  status: AttendanceStatus;
  remarks?: string;
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent:  'Absent',
  leave:   'Leave',
};
