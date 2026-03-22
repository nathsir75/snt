import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  Page, PageWithSections,
  CreatePagePayload, UpdatePagePayload,
  AddSectionPayload, UpdateSectionPayload, PageSection,
} from './page.models';

@Injectable({ providedIn: 'root' })
export class PageService {
  private readonly api = inject(ApiService);

  list(): Observable<Page[]> {
    return this.api.get<Page[]>('/pages');
  }

  getById(id: number): Observable<PageWithSections> {
    return this.api.get<PageWithSections>(`/pages/${id}`);
  }

  create(payload: CreatePagePayload): Observable<Page> {
    return this.api.post<Page>('/pages', payload);
  }

  update(id: number, payload: UpdatePagePayload): Observable<Page> {
    return this.api.patch<Page>(`/pages/${id}`, payload);
  }

  addSection(pageId: number, payload: AddSectionPayload): Observable<PageSection> {
    return this.api.post<PageSection>(`/pages/${pageId}/sections`, payload);
  }

  updateSection(id: number, payload: UpdateSectionPayload): Observable<PageSection> {
    return this.api.patch<PageSection>(`/pages/sections/${id}`, payload);
  }

  deleteSection(id: number): Observable<{ deleted: boolean; id: number }> {
    return this.api.delete<{ deleted: boolean; id: number }>(`/pages/sections/${id}`);
  }
}
