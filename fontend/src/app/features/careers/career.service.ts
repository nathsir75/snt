import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import {
  CareerApplication,
  CreateCareerApplicationPayload,
  UpdateCareerApplicationPayload,
} from './career.models';

@Injectable({ providedIn: 'root' })
export class CareerService {
  private readonly api  = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── Admin (authenticated) ─────────────────────────────────────────────────

  list(params: Record<string, string> = {}): Observable<CareerApplication[]> {
    return this.api.get<CareerApplication[]>('/career-applications', params);
  }

  getById(id: number): Observable<CareerApplication> {
    return this.api.get<CareerApplication>(`/career-applications/${id}`);
  }

  update(id: number, payload: UpdateCareerApplicationPayload): Observable<CareerApplication> {
    return this.api.patch<CareerApplication>(`/career-applications/${id}`, payload);
  }

  // ── Public (no auth) ──────────────────────────────────────────────────────

  submitPublic(payload: CreateCareerApplicationPayload): Observable<CareerApplication> {
    return this.http.post<CareerApplication>(
      `${this.base}/career-applications/public`,
      payload,
    );
  }
}
