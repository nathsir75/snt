import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SiteEnquiryPayload {
  enquiryType: string;
  fullName: string;
  phone: string;
  email?: string;
  subject?: string;
  message?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class SiteEnquiryService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  submit(payload: SiteEnquiryPayload): Observable<unknown> {
    const { enquiryType, fullName, phone, email, subject, message, ...rest } = payload;
    return this.http.post(`${this.base}/site-enquiries/public`, {
      enquiryType, fullName, phone, email, subject, message,
      ...rest,
    });
  }
}
