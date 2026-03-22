import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Batch, CreateBatchPayload, UpdateBatchPayload } from './batch.models';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly api = inject(ApiService);

  getAll(): Observable<Batch[]> {
    return this.api.get<Batch[]>('/batches');
  }

  getById(id: number): Observable<Batch> {
    return this.api.get<Batch>(`/batches/${id}`);
  }

  create(payload: CreateBatchPayload): Observable<Batch> {
    return this.api.post<Batch>('/batches', payload);
  }

  update(id: number, payload: UpdateBatchPayload): Observable<Batch> {
    return this.api.patch<Batch>(`/batches/${id}`, payload);
  }
}
