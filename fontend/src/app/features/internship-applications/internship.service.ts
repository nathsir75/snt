import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import {
  InternshipApplication,
  CreateInternshipApplicationPayload,
  UpdateInternshipApplicationPayload,
} from './internship.models';

@Injectable({ providedIn: 'root' })
export class InternshipApplicationService {
  private readonly api  = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params: Record<string, string> = {}): Observable<InternshipApplication[]> {
    return this.api.get<InternshipApplication[]>('/internship-applications', params);
  }

  getById(id: number): Observable<InternshipApplication> {
    return this.api.get<InternshipApplication>(`/internship-applications/${id}`);
  }

  update(id: number, payload: UpdateInternshipApplicationPayload): Observable<InternshipApplication> {
    return this.api.patch<InternshipApplication>(`/internship-applications/${id}`, payload);
  }

  submitPublic(payload: CreateInternshipApplicationPayload): Observable<InternshipApplication> {
    return this.http.post<InternshipApplication>(
      `${this.base}/internship-applications/public`,
      payload,
    );
  }
}
