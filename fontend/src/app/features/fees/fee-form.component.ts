import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal, computed,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FeeService } from './fee.service';
import { CollectPaymentResult, PaymentMode, PAYMENT_MODE_LABELS } from './fee.models';
import { StudentLedger } from './fee.models';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'snt-fee-form',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Record Payment">

          <div class="modal-header">
            <div>
              <h3 class="modal-title">Record Payment</h3>
              @if (ledger) {
                <p class="modal-subtitle">{{ ledger.student.fullName }} · {{ ledger.student.course }}</p>
              }
            </div>
            <button class="modal-close" (click)="cancel.emit()" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="modal-body">

            @if (serverError()) {
              <div class="form-error-banner">{{ serverError() }}</div>
            }

            @if (ledger) {
              <div class="fee-summary-bar">
                <div class="fee-stat">
                  <span class="fee-stat-label">Total Fees</span>
                  <span class="fee-stat-value">{{ ledger.totalFees | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="fee-stat">
                  <span class="fee-stat-label">Paid</span>
                  <span class="fee-stat-value text-success">{{ ledger.totalPaid | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="fee-stat fee-stat-highlight">
                  <span class="fee-stat-label">Balance Due</span>
                  <span class="fee-stat-value">{{ ledger.remainingDue | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
              </div>
            }

            <div class="form-row">
              <div class="form-group">
                <label for="amount">Amount (₹) *</label>
                <input id="amount" type="number" formControlName="amount" placeholder="e.g. 5000" min="1" />
                @if (f['amount'].invalid && f['amount'].touched) {
                  <span class="field-error">Amount must be greater than 0</span>
                }
              </div>
              <div class="form-group">
                <label for="paymentMode">Payment Mode *</label>
                <select id="paymentMode" formControlName="paymentMode">
                  @for (mode of paymentModes; track mode.value) {
                    <option [value]="mode.value">{{ mode.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="referenceNo">Reference / Transaction No.</label>
              <input id="referenceNo" formControlName="referenceNo" placeholder="UPI ref, cheque no., etc." />
            </div>

            <div class="form-group">
              <label for="remarks">Remarks</label>
              <textarea id="remarks" formControlName="remarks" rows="2" placeholder="Optional notes…"></textarea>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="loading()">
                {{ loading() ? 'Recording…' : '💰 Record Payment' }}
              </button>
            </div>

          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 300; padding: 16px;
    }
    .modal {
      background: var(--color-surface); border-radius: var(--radius-lg);
      width: 100%; max-width: 520px; box-shadow: var(--shadow-lg);
      animation: modal-in .18s ease;
    }
    .modal-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 24px 16px; border-bottom: 1px solid var(--color-border);
    }
    .modal-title { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); }
    .modal-subtitle { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 2px; }
    .modal-close {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: var(--radius-md);
      color: var(--color-text-muted); flex-shrink: 0;
    }
    .modal-close:hover { background: var(--color-bg); }
    .modal-body { padding: 20px 24px; }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding-top: 16px; margin-top: 4px;
      border-top: 1px solid var(--color-border);
    }
    .fee-summary-bar {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
      margin-bottom: 20px;
    }
    .fee-stat {
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 10px 12px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .fee-stat-highlight { border-color: #fbbf24; background: #fffbeb; }
    .fee-stat-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .fee-stat-value { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
    .text-success { color: #059669; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    textarea { resize: vertical; min-height: 60px; }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class FeeFormComponent implements OnChanges {
  @Input() open = false;
  @Input() studentId: number | null = null;
  @Input() ledger: StudentLedger | null = null;

  @Output() collected = new EventEmitter<CollectPaymentResult>();
  @Output() cancel    = new EventEmitter<void>();

  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(FeeService);

  readonly loading     = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly paymentModes: { value: PaymentMode; label: string }[] = [
    { value: 'cash',          label: PAYMENT_MODE_LABELS.cash },
    { value: 'upi',           label: PAYMENT_MODE_LABELS.upi },
    { value: 'card',          label: PAYMENT_MODE_LABELS.card },
    { value: 'bank_transfer', label: PAYMENT_MODE_LABELS.bank_transfer },
  ];

  readonly form = this.fb.nonNullable.group({
    amount:      [0, [Validators.required, Validators.min(1)]],
    paymentMode: ['cash' as PaymentMode, Validators.required],
    referenceNo: [''],
    remarks:     [''],
  });

  get f() { return this.form.controls; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.form.reset({ paymentMode: 'cash', amount: 0 });
      this.serverError.set(null);
    }
  }

  submit(): void {
    if (this.form.invalid || !this.studentId) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    this.svc.collectPayment({
      studentId:   this.studentId,
      amount:      Number(v.amount),
      paymentMode: v.paymentMode,
      referenceNo: v.referenceNo || undefined,
      remarks:     v.remarks || undefined,
    }).subscribe({
      next: (result) => { this.loading.set(false); this.collected.emit(result); },
      error: (e: Error) => { this.serverError.set(e.message); this.loading.set(false); },
    });
  }
}
