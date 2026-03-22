import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Course } from '../courses/course.models';
import { DisplayControlResponse, DC_DEFAULTS, DisplayControlData } from '../website-display-control/display-control.models';
import { PublicBranch } from '../branches/branch.models';

export interface PublicPlacementStats {
  totalPlaced: number;
  companiesHired: number;
  avgSalaryLpa: number;
  placementRate: number;
}

@Injectable({ providedIn: 'root' })
export class WebsitePublicService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.base}/courses`);
  }

  getPlacementStats(): Observable<PublicPlacementStats | null> {
    return this.http.get<PublicPlacementStats>(`${this.base}/placements/public-summary`).pipe(
      catchError(() => of(null)),
    );
  }

  getDisplayControl(): Observable<DisplayControlResponse> {
    const fallback: DisplayControlResponse = { data: DC_DEFAULTS, updatedAt: null, updatedBy: null };
    return this.http.get<DisplayControlResponse>(`${this.base}/site-settings/display-control/public`).pipe(
      catchError(() => of(fallback)),
    );
  }

  getPublicBranches(): Observable<PublicBranch[]> {
    return this.http.get<PublicBranch[]>(`${this.base}/branches/public`).pipe(
      catchError(() => of([])),
    );
  }
}
