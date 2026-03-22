import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  FeePayment, StudentLedger, CollectPaymentResult, CollectPaymentPayload,
} from './fee.models';

@Injectable({ providedIn: 'root' })
export class FeeService {
  private readonly api = inject(ApiService);

  collectPayment(payload: CollectPaymentPayload): Observable<CollectPaymentResult> {
    return this.api.post<CollectPaymentResult>('/fees/collect', payload);
  }

  getAllPayments(): Observable<FeePayment[]> {
    return this.api.get<FeePayment[]>('/fees/payments');
  }

  getStudentLedger(studentId: number): Observable<StudentLedger> {
    return this.api.get<StudentLedger>(`/fees/student/${studentId}`);
  }
}
