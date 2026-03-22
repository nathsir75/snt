import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageWithSections } from '../page-builder/page.models';

export type PageLoadStatus = 'ok' | 'no_content' | 'not_found' | 'branch_not_found';

export interface BranchPageResult {
  status: PageLoadStatus;
  page: PageWithSections | null;
  branch: { id: number; name: string; code: string; city: string } | null;
}

@Injectable({ providedIn: 'root' })
export class PublicPageService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Legacy: fetch by numeric branchId + slug. */
  getPage(branchId: number, slug: string): Observable<PageWithSections> {
    return this.http.get<PageWithSections>(`${this.base}/pages/public/${branchId}/${slug}`);
  }

  /**
   * Fetch by branchCode + slug.
   * slug = '' → sends 'home' to trigger home fallback chain on backend.
   * Always resolves (never throws) — caller reads result.status.
   */
  getPageByCode(branchCode: string, slug: string): Observable<BranchPageResult> {
    const resolvedSlug = slug && slug !== '' ? slug : 'home';
    return this.http.get<BranchPageResult>(
      `${this.base}/pages/public/by-code/${branchCode}/${resolvedSlug}`,
    );
  }
}
