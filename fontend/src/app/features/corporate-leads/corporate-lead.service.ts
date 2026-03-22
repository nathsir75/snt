import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import {
  CorporateEnquiry,
  CreateCorporateEnquiryPayload,
  UpdateCorporateEnquiryPayload,
} from './corporate-enquiry.models';

@Injectable({ providedIn: 'root' })
export class CorporateLeadService {
  private readonly api  = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params: Record<string, string> = {}): Observable<CorporateEnquiry[]> {
    return this.api.get<CorporateEnquiry[]>('/corporate-enquiries', params);
  }

  getById(id: number): Observable<CorporateEnquiry> {
    return this.api.get<CorporateEnquiry>(`/corporate-enquiries/${id}`);
  }

  update(id: number, payload: UpdateCorporateEnquiryPayload): Observable<CorporateEnquiry> {
    return this.api.patch<CorporateEnquiry>(`/corporate-enquiries/${id}`, payload);
  }

  submitPublic(payload: CreateCorporateEnquiryPayload): Observable<{ id: number }> {
    const body = {
      enquiryType: 'corporate',
      fullName:    payload.contactPerson,
      phone:       payload.phone,
      email:       payload.email,
      subject:     `Corporate Training — ${payload.companyName}`,
      message:     payload.message,
      companyName:    payload.companyName,
      enquiryType_:   payload.enquiryType,
      employeesCount: payload.employeesCount,
      trainingNeeds:  payload.trainingNeeds,
      mode:           payload.mode,
      timeline:       payload.timeline,
    };
    return this.http.post<{ id: number }>(`${this.base}/site-enquiries/public`, body);
  }
}
