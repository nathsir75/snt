import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { CreateTrainerPayload, Trainer } from './trainer.models';

@Injectable({ providedIn: 'root' })
export class TrainerService {
  private readonly api = inject(ApiService);

  getAll(): Observable<Trainer[]> {
    return this.api.get<Trainer[]>('/trainers');
  }

  create(payload: CreateTrainerPayload): Observable<Trainer> {
    return this.api.post<Trainer>('/trainers', payload);
  }
}
