import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Alert, AlertSummary, UnreadCountResult } from './alert.models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly api = inject(ApiService);

  list(filters: { isRead?: boolean; type?: string } = {}): Observable<Alert[]> {
    const params: Record<string, string | boolean> = {};
    if (filters.isRead !== undefined) params['isRead'] = filters.isRead;
    if (filters.type)                 params['type']   = filters.type;
    return this.api.get<Alert[]>('/alerts', params);
  }

  getUnreadCount(): Observable<UnreadCountResult> {
    return this.api.get<UnreadCountResult>('/alerts/unread-count');
  }

  getSummary(): Observable<AlertSummary> {
    return this.api.get<AlertSummary>('/alerts/summary');
  }

  markRead(id: number): Observable<Alert> {
    return this.api.patch<Alert>(`/alerts/${id}/read`, {});
  }
}
