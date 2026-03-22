import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { BranchCmsSettings } from './branch-cms.models';

@Injectable({ providedIn: 'root' })
export class BranchCmsService {
  private readonly api = inject(ApiService);

  get(branchId?: number): Observable<BranchCmsSettings> {
    const params = branchId ? `?branchId=${branchId}` : '';
    return this.api.get<BranchCmsSettings>(`/branch-cms${params}`);
  }

  update(payload: Partial<BranchCmsSettings>, branchId?: number): Observable<BranchCmsSettings> {
    const params = branchId ? `?branchId=${branchId}` : '';
    return this.api.patch<BranchCmsSettings>(`/branch-cms${params}`, payload);
  }
}
