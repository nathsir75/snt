import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  EligibilityRequest,
  CreateEligibilityPayload,
  DecideEligibilityPayload,
} from '../exam-registrations/exam.models';

@Injectable({ providedIn: 'root' })
export class ExamEligibilityService {
  private readonly api = inject(ApiService);

  list(filters: { status?: string } = {}): Observable<EligibilityRequest[]> {
    const params: Record<string, string> = {};
    if (filters.status) params['status'] = filters.status;
    return this.api.get<EligibilityRequest[]>('/exam-eligibility', params);
  }

  getById(id: number): Observable<EligibilityRequest> {
    return this.api.get<EligibilityRequest>(`/exam-eligibility/${id}`);
  }

  createRequest(payload: CreateEligibilityPayload): Observable<EligibilityRequest> {
    return this.api.post<EligibilityRequest>('/exam-eligibility', payload);
  }

  decide(id: number, payload: DecideEligibilityPayload): Observable<{ updated: EligibilityRequest; registration: unknown }> {
    return this.api.patch<{ updated: EligibilityRequest; registration: unknown }>(`/exam-eligibility/${id}/decision`, payload);
  }
}
