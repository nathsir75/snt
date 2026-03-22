import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { JobOpening, CreateJobPayload } from '../companies/company.models';

@Injectable({ providedIn: 'root' })
export class JobOpeningService {
  private readonly api = inject(ApiService);

  list(filters: { companyId?: number; status?: string } = {}): Observable<JobOpening[]> {
    const params: Record<string, string | number> = {};
    if (filters.companyId) params['companyId'] = filters.companyId;
    if (filters.status)    params['status']    = filters.status;
    return this.api.get<JobOpening[]>('/job-openings', params);
  }

  getById(id: number): Observable<JobOpening> {
    return this.api.get<JobOpening>(`/job-openings/${id}`);
  }

  create(payload: CreateJobPayload): Observable<JobOpening> {
    return this.api.post<JobOpening>('/job-openings', payload);
  }

  updateStatus(id: number, status: string): Observable<JobOpening> {
    return this.api.patch<JobOpening>(`/job-openings/${id}/status`, { status });
  }
}
