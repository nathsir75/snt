import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicEnquiryPayload {
  fullName: string;
  mobile: string;
  email?: string;
  city: string;
  state?: string;
  courseInterest: string;
  source?: string;
  remarks?: string;
  branchCode: string;
}

@Injectable({ providedIn: 'root' })
export class PublicEnquiryService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  submit(payload: PublicEnquiryPayload): Observable<{ success: boolean; id: number }> {
    return this.http.post<{ success: boolean; id: number }>(
      `${this.base}/enquiries/public`,
      payload,
    );
  }
}
