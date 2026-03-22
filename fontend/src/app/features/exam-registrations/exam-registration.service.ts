import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  ExamRegistration,
  ScheduleRegistrationPayload,
  ExamRegistrationSummary,
} from './exam.models';

@Injectable({ providedIn: 'root' })
export class ExamRegistrationService {
  private readonly api = inject(ApiService);

  list(filters: { status?: string } = {}): Observable<ExamRegistration[]> {
    const params: Record<string, string> = {};
    if (filters.status) params['status'] = filters.status;
    return this.api.get<ExamRegistration[]>('/final-exam-registrations', params);
  }

  getById(id: number): Observable<ExamRegistration> {
    return this.api.get<ExamRegistration>(`/final-exam-registrations/${id}`);
  }

  getSummary(): Observable<ExamRegistrationSummary> {
    return this.api.get<ExamRegistrationSummary>('/final-exam-registrations/summary');
  }

  schedule(id: number, payload: ScheduleRegistrationPayload): Observable<ExamRegistration> {
    return this.api.patch<ExamRegistration>(`/final-exam-registrations/${id}/schedule`, payload);
  }
}
