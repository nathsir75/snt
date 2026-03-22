import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { SuperAdminDashboard, BranchDashboard, DashboardResult } from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api  = inject(ApiService);
  private readonly auth = inject(AuthService);

  /**
   * Unified entry point — resolves the correct endpoint based on the
   * authenticated user's role. Components should call this instead of
   * calling role-specific methods directly.
   */
  load(): Observable<DashboardResult> {
    if (this.auth.isSuperAdmin()) {
      return this.api.get<SuperAdminDashboard>('/kpi-dashboard/super-admin') as Observable<DashboardResult>;
    }

    const branchId = this.auth.branchId();
    if (!branchId) {
      return throwError(() => new Error('NO_BRANCH'));
    }

    return this.api.get<BranchDashboard>(`/kpi-dashboard/branch/${branchId}`) as Observable<DashboardResult>;
  }

  /** Kept for direct use if needed elsewhere */
  getSuperAdminDashboard(): Observable<SuperAdminDashboard> {
    return this.api.get<SuperAdminDashboard>('/kpi-dashboard/super-admin');
  }

  getBranchDashboard(branchId: string): Observable<BranchDashboard> {
    return this.api.get<BranchDashboard>(`/kpi-dashboard/branch/${branchId}`);
  }
}
