import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AppSettings, UpdateSettingsPayload } from './settings.models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ApiService);

  get(): Observable<AppSettings> {
    return this.api.get<AppSettings>('/settings');
  }

  update(payload: UpdateSettingsPayload): Observable<AppSettings> {
    return this.api.patch<AppSettings>('/settings', payload);
  }
}
