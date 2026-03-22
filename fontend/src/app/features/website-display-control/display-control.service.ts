import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DisplayControlData, DisplayControlResponse, DC_DEFAULTS, DcGroupKey,
} from './display-control.models';

@Injectable({ providedIn: 'root' })
export class DisplayControlService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/site-settings`;

  readonly data      = signal<DisplayControlData>(deepMerge(DC_DEFAULTS, {}));
  readonly updatedAt = signal<string | null>(null);
  readonly updatedBy = signal<string | null>(null);

  load(): Observable<DisplayControlResponse> {
    return this.http.get<DisplayControlResponse>(`${this.base}/display-control`).pipe(
      tap((res) => {
        this.data.set(deepMerge(DC_DEFAULTS, res.data ?? {}));
        this.updatedAt.set(res.updatedAt);
        this.updatedBy.set(res.updatedBy);
      }),
      catchError(() => of({ data: DC_DEFAULTS, updatedAt: null, updatedBy: null })),
    );
  }

  saveGroup(key: DcGroupKey, value: unknown): Observable<DisplayControlResponse> {
    return this.http.patch<DisplayControlResponse>(`${this.base}/display-control`, { [key]: value }).pipe(
      tap((res) => {
        this.data.set(deepMerge(DC_DEFAULTS, res.data ?? {}));
        this.updatedAt.set(res.updatedAt);
        this.updatedBy.set(res.updatedBy);
      }),
    );
  }
}

// Deep-merge stored data over defaults so new fields are never undefined.
// Only merges plain objects one level deep — arrays are replaced wholesale.
function deepMerge(defaults: DisplayControlData, stored: Partial<DisplayControlData>): DisplayControlData {
  const result = { ...defaults } as Record<string, unknown>;
  for (const key of Object.keys(defaults) as DcGroupKey[]) {
    const d = defaults[key];
    const s = (stored as Record<string, unknown>)[key];
    if (s !== undefined && s !== null && typeof s === 'object' && !Array.isArray(s) &&
        typeof d === 'object' && d !== null && !Array.isArray(d)) {
      result[key] = { ...(d as object), ...(s as object) };
    } else if (s !== undefined) {
      result[key] = s;
    }
  }
  return result as unknown as DisplayControlData;
}
