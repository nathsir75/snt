import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  BranchDashboard, OverallDashboard, StudentLifecycle,
  EnquiryFunnel, FeeCollectionReport, AttendanceReport,
} from './report.models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);

  getBranchDashboard(): Observable<BranchDashboard> {
    return this.api.get<BranchDashboard>('/reports/branch-dashboard');
  }

  getOverallDashboard(): Observable<OverallDashboard> {
    return this.api.get<OverallDashboard>('/reports/overall-dashboard');
  }

  getStudentLifecycle(): Observable<StudentLifecycle> {
    return this.api.get<StudentLifecycle>('/reports/student-lifecycle');
  }

  getEnquiryFunnel(): Observable<EnquiryFunnel> {
    return this.api.get<EnquiryFunnel>('/reports/enquiries/funnel');
  }

  getFeeCollectionReport(fromDate?: string, toDate?: string): Observable<FeeCollectionReport> {
    const params: Record<string, string> = {};
    if (fromDate) params['fromDate'] = fromDate;
    if (toDate)   params['toDate']   = toDate;
    return this.api.get<FeeCollectionReport>('/reports/fees/collection', params);
  }

  getAttendanceReport(batchId: number): Observable<AttendanceReport> {
    return this.api.get<AttendanceReport>(`/reports/attendance/batch/${batchId}`);
  }
}
