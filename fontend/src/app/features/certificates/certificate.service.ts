import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import {
  Certificate,
  IssueCertificatePayload,
  RevokeCertificatePayload,
  CertVerifyResult,
} from './certificate.models';

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private readonly api  = inject(ApiService);
  private readonly http = inject(HttpClient);

  list(filters: { status?: string } = {}): Observable<Certificate[]> {
    const params: Record<string, string> = {};
    if (filters.status) params['status'] = filters.status;
    return this.api.get<Certificate[]>('/certificates', params);
  }

  getById(id: number): Observable<Certificate> {
    return this.api.get<Certificate>(`/certificates/${id}`);
  }

  issue(payload: IssueCertificatePayload): Observable<Certificate> {
    return this.api.post<Certificate>('/certificates/issue', payload);
  }

  revoke(id: number, payload: RevokeCertificatePayload): Observable<Certificate> {
    return this.api.patch<Certificate>(`/certificates/${id}/revoke`, payload);
  }

  // Public — no auth header needed
  verify(verificationCode: string): Observable<CertVerifyResult> {
    return this.http.get<CertVerifyResult>(
      `${environment.apiUrl}/certificates/verify/${verificationCode}`
    );
  }
}
