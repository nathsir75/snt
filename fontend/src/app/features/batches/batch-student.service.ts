import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { BatchAssignment } from './batch-student.models';

@Injectable({ providedIn: 'root' })
export class BatchStudentService {
  private readonly api = inject(ApiService);

  assign(batchId: number, studentId: number): Observable<BatchAssignment> {
    return this.api.post<BatchAssignment>('/batch-students/assign', { batchId, studentId });
  }

  getByStudent(studentId: number): Observable<BatchAssignment[]> {
    return this.api.get<BatchAssignment[]>(`/batch-students/student/${studentId}`);
  }

  getByBatch(batchId: number): Observable<BatchAssignment[]> {
    return this.api.get<BatchAssignment[]>(`/batch-students/batch/${batchId}`);
  }

  updateStatus(id: number, status: string): Observable<BatchAssignment> {
    return this.api.patch<BatchAssignment>(`/batch-students/${id}/status`, { status });
  }
}
