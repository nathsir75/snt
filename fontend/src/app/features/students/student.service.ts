import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Student, ConvertToStudentPayload, CreateStudentPayload } from './student.models';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly api = inject(ApiService);

  getAll(): Observable<Student[]> {
    return this.api.get<Student[]>('/students');
  }

  list(filters: { search?: string; course?: string } = {}): Observable<Student[]> {
    const params: Record<string, string> = {};
    if (filters.search) params['search'] = filters.search;
    if (filters.course) params['course'] = filters.course;
    return this.api.get<Student[]>('/students', params);
  }

  getById(id: number): Observable<Student> {
    return this.api.get<Student>(`/students/${id}`);
  }

  create(payload: CreateStudentPayload): Observable<Student> {
    return this.api.post<Student>('/students', payload);
  }

  convertFromEnquiry(enquiryId: number, payload: ConvertToStudentPayload): Observable<Student> {
    return this.api.post<Student>(`/students/from-enquiry/${enquiryId}`, payload);
  }
}
