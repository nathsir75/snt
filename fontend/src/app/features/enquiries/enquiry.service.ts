import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import {
  Enquiry,
  FollowUp,
  CreateEnquiryPayload,
  UpdateEnquiryStatusPayload,
  CreateFollowUpPayload,
} from './enquiry.models';

@Injectable({ providedIn: 'root' })
export class EnquiryService {
  private readonly api  = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── Enquiries ──────────────────────────────────────────────────────────────
  getAll(): Observable<Enquiry[]> {
    return this.api.get<Enquiry[]>('/enquiries');
  }

  getById(id: number): Observable<Enquiry> {
    return this.api.get<Enquiry>(`/enquiries/${id}`);
  }

  create(payload: CreateEnquiryPayload): Observable<Enquiry> {
    return this.api.post<Enquiry>('/enquiries', payload);
  }

  submitPublic(branchCode: string, payload: { fullName: string; mobile: string; email?: string; courseInterest: string; message?: string }): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/enquiries/public`, { branchCode, ...payload });
  }

  updateStatus(id: number, payload: UpdateEnquiryStatusPayload): Observable<Enquiry> {
    return this.api.patch<Enquiry>(`/enquiries/${id}/status`, payload);
  }

  // ── Follow-ups ─────────────────────────────────────────────────────────────
  getFollowUpsByEnquiry(enquiryId: number): Observable<FollowUp[]> {
    return this.api.get<FollowUp[]>(`/enquiry-followups/enquiry/${enquiryId}`);
  }

  createFollowUp(payload: CreateFollowUpPayload): Observable<FollowUp> {
    return this.api.post<FollowUp>('/enquiry-followups', payload);
  }
}
