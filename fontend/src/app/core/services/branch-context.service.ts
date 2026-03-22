import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, switchMap } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ResolvedBranch {
  id: number;
  name: string;
  code: string;
  city: string;
  status: string;
}

/**
 * Detects the branch context from two sources (in priority order):
 *
 * 1. SUBDOMAIN  — production: mumbai.snteducation.com  → code = "mumbai"
 * 2. PATH PARAM — dev/fallback: /b/mumbai              → code passed explicitly
 *
 * The resolved branch is cached per code so repeated calls are free.
 */
@Injectable({ providedIn: 'root' })
export class BranchContextService {
  private readonly http  = inject(HttpClient);
  private readonly base  = environment.apiUrl;

  /** Cache: branchCode → resolved branch observable */
  private readonly cache = new Map<string, Observable<ResolvedBranch | null>>();

  /**
   * Detects branchCode from the current hostname.
   * Returns null on localhost / main domain.
   *
   * Production pattern: {code}.snteducation.com
   */
  detectSubdomainCode(): string | null {
    const host = window.location.hostname;
    // localhost, 127.x, IP addresses → no subdomain
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;

    const mainDomain = environment.mainDomain ?? 'snteducation.com';
    // e.g. "mumbai.snteducation.com" → ["mumbai", "snteducation", "com"]
    const parts = host.split('.');
    if (parts.length >= 3 && host.endsWith(mainDomain)) {
      return parts[0].toLowerCase();
    }
    return null;
  }

  /**
   * Resolves a branchCode to a full branch record.
   * Result is cached — safe to call multiple times.
   */
  resolve(branchCode: string): Observable<ResolvedBranch | null> {
    const code = branchCode.toLowerCase();
    if (this.cache.has(code)) return this.cache.get(code)!;

    const obs$ = this.http
      .get<ResolvedBranch>(`${this.base}/branches/by-code/${code}`)
      .pipe(
        catchError(() => of(null)),
        shareReplay(1),
      );

    this.cache.set(code, obs$);
    return obs$;
  }

  /**
   * Resolves branchCode → branchId as a simple number observable.
   * Emits null if branch not found.
   */
  resolveToBranchId(branchCode: string): Observable<number | null> {
    return this.resolve(branchCode).pipe(map((b) => b?.id ?? null));
  }
}
