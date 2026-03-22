import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  AttendanceRecord, MarkAttendanceResult, BatchAttendanceSummary,
  StudentAttendanceResult, AttendanceEntry,
} from './attendance.models';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly api = inject(ApiService);

  markAttendance(
    batchId: number,
    attendanceDate: string,
    entries: AttendanceEntry[],
  ): Observable<MarkAttendanceResult> {
    return this.api.post<MarkAttendanceResult>('/attendance/mark', {
      batchId, attendanceDate, entries,
    });
  }

  getByBatch(batchId: number, date?: string): Observable<AttendanceRecord[]> {
    const url = date
      ? `/attendance/batch/${batchId}?date=${date}`
      : `/attendance/batch/${batchId}`;
    return this.api.get<AttendanceRecord[]>(url);
  }

  getByStudent(studentId: number): Observable<StudentAttendanceResult> {
    return this.api.get<StudentAttendanceResult>(`/attendance/student/${studentId}`);
  }

  getBatchSummary(batchId: number): Observable<BatchAttendanceSummary> {
    return this.api.get<BatchAttendanceSummary>(`/attendance/summary/batch/${batchId}`);
  }
}
