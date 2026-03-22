import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PublicBranchMeta } from './public-site.models';

@Injectable({ providedIn: 'root' })
export class PublicBranchService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private readonly metaCache = new Map<string, Observable<PublicBranchMeta | null>>();

  /** Fetch branch meta by numeric branchId (legacy path-based flow). */
  getBranchMeta(branchId: number): Observable<PublicBranchMeta> {
    return this.http.get<PublicBranchMeta>(`${this.base}/branches/${branchId}/public`);
  }

  /**
   * Fetch branch meta directly by branchCode — single API call, no extra round-trip.
   * Result is cached per code.
   */
  getBranchMetaByCode(branchCode: string): Observable<PublicBranchMeta | null> {
    const code = branchCode.toLowerCase();
    if (this.metaCache.has(code)) return this.metaCache.get(code)!;

    const obs$ = this.http
      .get<PublicBranchMeta>(`${this.base}/branches/by-code/${code}/public`)
      .pipe(
        catchError(() => of(null)),
        shareReplay(1),
      );

    this.metaCache.set(code, obs$);
    return obs$;
  }
}
