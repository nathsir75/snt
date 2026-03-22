import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  Interview, ScheduleInterviewPayload,
  Application, ApplyPayload, UpdateApplicationStatusPayload,
  Placement, CreatePlacementPayload, PlacementSummary,
} from './placement.models';

@Injectable({ providedIn: 'root' })
export class InterviewService {
  private readonly api = inject(ApiService);

  list(filters: { jobOpeningId?: number; branchId?: number } = {}): Observable<Interview[]> {
    const params: Record<string, number> = {};
    if (filters.jobOpeningId) params['jobOpeningId'] = filters.jobOpeningId;
    if (filters.branchId)     params['branchId']     = filters.branchId;
    return this.api.get<Interview[]>('/interviews', params);
  }

  getById(id: number): Observable<Interview> {
    return this.api.get<Interview>(`/interviews/${id}`);
  }

  schedule(payload: ScheduleInterviewPayload): Observable<Interview> {
    return this.api.post<Interview>('/interviews', payload);
  }
}

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly api = inject(ApiService);

  list(filters: { interviewId?: number; status?: string } = {}): Observable<Application[]> {
    const params: Record<string, string | number> = {};
    if (filters.interviewId) params['interviewId'] = filters.interviewId;
    if (filters.status)      params['status']      = filters.status;
    return this.api.get<Application[]>('/interview-applications', params);
  }

  apply(payload: ApplyPayload): Observable<Application> {
    return this.api.post<Application>('/interview-applications', payload);
  }

  updateStatus(id: number, payload: UpdateApplicationStatusPayload): Observable<Application> {
    return this.api.patch<Application>(`/interview-applications/${id}/status`, payload);
  }
}

@Injectable({ providedIn: 'root' })
export class PlacementService {
  private readonly api = inject(ApiService);

  list(filters: { status?: string } = {}): Observable<Placement[]> {
    const params: Record<string, string> = {};
    if (filters.status) params['status'] = filters.status;
    return this.api.get<Placement[]>('/placements', params);
  }

  getById(id: number): Observable<Placement> {
    return this.api.get<Placement>(`/placements/${id}`);
  }

  create(payload: CreatePlacementPayload): Observable<Placement> {
    return this.api.post<Placement>('/placements', payload);
  }

  updateStatus(id: number, status: string): Observable<Placement> {
    return this.api.patch<Placement>(`/placements/${id}/status`, { status });
  }

  getSummary(): Observable<PlacementSummary> {
    return this.api.get<PlacementSummary>('/placements/summary');
  }
}
