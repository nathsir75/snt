import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FinalResult, PublishResultPayload, ResultSummary } from './result.models';

@Injectable({ providedIn: 'root' })
export class ResultService {
  private readonly api = inject(ApiService);

  list(filters: { resultStatus?: string } = {}): Observable<FinalResult[]> {
    const params: Record<string, string> = {};
    if (filters.resultStatus) params['resultStatus'] = filters.resultStatus;
    return this.api.get<FinalResult[]>('/final-results', params);
  }

  getById(id: number): Observable<FinalResult> {
    return this.api.get<FinalResult>(`/final-results/${id}`);
  }

  getSummary(): Observable<ResultSummary> {
    return this.api.get<ResultSummary>('/final-results/summary');
  }

  publish(payload: PublishResultPayload): Observable<FinalResult> {
    return this.api.post<FinalResult>('/final-results/publish', payload);
  }
}
