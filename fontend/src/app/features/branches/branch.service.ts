import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Branch, UpdateBranchPayload, UpdatePublicSettingsPayload, CreateBranchPayload } from './branch.models';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly api = inject(ApiService);

  list(): Observable<Branch[]> {
    return this.api.get<Branch[]>('/branches');
  }

  listForDropdown(): Observable<{ id: number; name: string; city: string }[]> {
    return this.api.get<{ id: number; name: string; city: string }[]>('/branches');
  }

  getById(id: number): Observable<Branch> {
    return this.api.get<Branch>(`/branches/${id}`);
  }

  getMyBranch(): Observable<{ id: number; name: string; city: string }> {
    return this.api.get<{ id: number; name: string; city: string }>('/branches/me');
  }

  create(payload: CreateBranchPayload): Observable<Branch> {
    return this.api.post<Branch>('/branches', payload);
  }

  update(id: number, payload: UpdateBranchPayload): Observable<Branch> {
    return this.api.patch<Branch>(`/branches/${id}`, payload);
  }

  updatePublicSettings(id: number, payload: UpdatePublicSettingsPayload): Observable<Branch> {
    return this.api.patch<Branch>(`/branches/${id}/public-settings`, payload);
  }
}
