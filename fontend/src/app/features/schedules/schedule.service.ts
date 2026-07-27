import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { BatchSchedule, CreateSchedulePayload } from './schedule.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly api = inject(ApiService);

  getByBatch(batchId: number): Observable<BatchSchedule[]> {
    return this.api.get<BatchSchedule[]>(`/schedules/batch/${batchId}`);
  }

  create(payload: CreateSchedulePayload): Observable<BatchSchedule> {
    return this.api.post<BatchSchedule>('/schedules', payload);
  }
}
