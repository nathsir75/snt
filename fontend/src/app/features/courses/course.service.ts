import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Course, CreateCoursePayload, UpdateCoursePayload } from './course.models';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly api = inject(ApiService);

  getAll(): Observable<Course[]> {
    return this.api.get<Course[]>('/courses');
  }

  getById(id: number): Observable<Course> {
    return this.api.get<Course>(`/courses/${id}`);
  }

  create(payload: CreateCoursePayload): Observable<Course> {
    return this.api.post<Course>('/courses', payload);
  }

  update(id: number, payload: UpdateCoursePayload): Observable<Course> {
    return this.api.patch<Course>(`/courses/${id}`, payload);
  }
}
