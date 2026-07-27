import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AssignTrainerPayload, BatchTrainerAssignment } from './batch-trainer.models';

@Injectable({ providedIn: 'root' })
export class BatchTrainerService {
  private readonly api = inject(ApiService);

  getByBatch(batchId: number): Observable<BatchTrainerAssignment[]> {
    return this.api.get<BatchTrainerAssignment[]>(`/batch-trainers/batch/${batchId}`);
  }

  assign(payload: AssignTrainerPayload): Observable<BatchTrainerAssignment> {
    return this.api.post<BatchTrainerAssignment>('/batch-trainers/assign', payload);
  }
}
