import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Company, CreateCompanyPayload } from './company.models';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api = inject(ApiService);

  list(activeOnly = false): Observable<Company[]> {
    const params: Record<string, string | boolean> = {};
    if (activeOnly) params['activeOnly'] = true;
    return this.api.get<Company[]>('/companies', params);
  }

  getById(id: number): Observable<Company> {
    return this.api.get<Company>(`/companies/${id}`);
  }

  create(payload: CreateCompanyPayload): Observable<Company> {
    return this.api.post<Company>('/companies', payload);
  }
}
