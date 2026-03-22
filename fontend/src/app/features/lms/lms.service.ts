import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  CourseContentResponse, CourseContentMeta, Session, ContentItem,
  CreateCourseContentPayload, AddSessionPayload,
  AddContentItemPayload, UpdateContentItemPayload,
} from './lms.models';

@Injectable({ providedIn: 'root' })
export class LmsService {
  private readonly api = inject(ApiService);

  // ── Read ──────────────────────────────────────────────────────────────────
  getCourseContent(courseId: number): Observable<CourseContentResponse> {
    return this.api.get<CourseContentResponse>(`/lms/course-content/${courseId}`);
  }

  getSession(id: number): Observable<Session> {
    return this.api.get<Session>(`/lms/session/${id}`);
  }

  // ── Write (super_admin only) ──────────────────────────────────────────────
  createCourseContent(payload: CreateCourseContentPayload): Observable<CourseContentMeta> {
    return this.api.post<CourseContentMeta>('/lms/course-content', payload);
  }

  addSession(payload: AddSessionPayload): Observable<Session> {
    return this.api.post<Session>('/lms/session', payload);
  }

  addContentItem(payload: AddContentItemPayload): Observable<ContentItem> {
    return this.api.post<ContentItem>('/lms/content-item', payload);
  }

  publishCourseContent(id: number): Observable<CourseContentMeta> {
    return this.api.patch<CourseContentMeta>(`/lms/course-content/${id}/publish`, {});
  }

  updateContentItem(id: number, payload: UpdateContentItemPayload): Observable<ContentItem> {
    return this.api.patch<ContentItem>(`/lms/content-item/${id}`, payload);
  }

  deleteContentItem(id: number): Observable<{ deleted: boolean; id: number }> {
    return this.api.delete<{ deleted: boolean; id: number }>(`/lms/content-item/${id}`);
  }
}
