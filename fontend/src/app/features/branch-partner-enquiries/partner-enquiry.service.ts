import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import {
  PartnerEnquiry,
  CreatePartnerEnquiryPayload,
  UpdatePartnerEnquiryPayload,
} from './partner-enquiry.models';

@Injectable({ providedIn: 'root' })
export class PartnerEnquiryService {
  private readonly api  = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // Admin — authenticated
  list(status?: string): Observable<PartnerEnquiry[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.api.get<PartnerEnquiry[]>('/branch-partner-enquiries', params);
  }

  getById(id: number): Observable<PartnerEnquiry> {
    return this.api.get<PartnerEnquiry>(`/branch-partner-enquiries/${id}`);
  }

  update(id: number, payload: UpdatePartnerEnquiryPayload): Observable<PartnerEnquiry> {
    return this.api.patch<PartnerEnquiry>(`/branch-partner-enquiries/${id}`, payload);
  }

  // Public — no auth token
  submitPublic(payload: CreatePartnerEnquiryPayload): Observable<PartnerEnquiry> {
    return this.http.post<PartnerEnquiry>(
      `${this.base}/branch-partner-enquiries/public`,
      payload,
    );
  }
}
