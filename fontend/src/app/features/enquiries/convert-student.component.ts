import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { StudentService } from '../students/student.service';
import { Student } from '../students/student.models';
import { Enquiry } from './enquiry.models';

@Component({
  selector: 'snt-convert-student',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Convert to Student">

          <div class="modal-header">
            <div>
              <h3 class="modal-title">Convert to Student</h3>
              @if (enquiry) {
                <p class="modal-subtitle">{{ enquiry.fullName }} · {{ enquiry.mobile }}</p>
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

            <div class="info-block">
              <p class="info-block-label">Enquiry Details</p>
              <div class="info-grid">
                <span class="info-key">Name</span>
                <span>{{ enquiry?.fullName }}</span>
                <span class="info-key">Mobile</span>
                <span>{{ enquiry?.mobile }}</span>
                <span class="info-key">Course Interest</span>
                <span>{{ enquiry?.courseInterest }}</span>
              </div>
            </div>

            <div class="form-group">
              <label for="course">Enrolled Course *</label>
              <input id="course" formControlName="course" placeholder="Confirm or update course name" />
              @if (f['course'].invalid && f['course'].touched) {
                <span class="field-error">Course is required</span>
              }
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="totalFees">Total Fees (₹) *</label>
                <input id="totalFees" type="number" formControlName="totalFees" placeholder="e.g. 25000" min="1" />
                @if (f['totalFees'].invalid && f['totalFees'].touched) {
                  <span class="field-error">Total fees must be greater than 0</span>
                }
              </div>
              <div class="form-group">
                <label for="discount">Discount (₹)</label>
                <input id="discount" type="number" formControlName="discount" placeholder="0" min="0" />
              </div>
            </div>

            @if (finalFees() > 0) {
              <div class="fees-summary">
                <span>Final Fees</span>
                <strong>₹{{ finalFees() | number }}</strong>
              </div>
            }

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="loading()">
                {{ loading() ? 'Converting…' : '🎓 Confirm Admission' }}
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
    .info-block {
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px;
    }
    .info-block-label { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--color-text-muted); margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 120px 1fr; gap: 4px 8px; font-size: var(--font-size-sm); }
    .info-key { color: var(--color-text-muted); font-weight: 500; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .fees-summary {
      display: flex; justify-content: space-between; align-items: center;
      background: #d1fae5; border: 1px solid #6ee7b7; border-radius: var(--radius-md);
      padding: 10px 16px; margin-bottom: 16px; font-size: var(--font-size-sm);
    }
    .fees-summary strong { font-size: var(--font-size-md); color: #065f46; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class ConvertStudentComponent implements OnChanges {
  @Input() open = false;
  @Input() enquiry: Enquiry | null = null;

  @Output() converted = new EventEmitter<Student>();
  @Output() cancel    = new EventEmitter<void>();

  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(StudentService);

  readonly loading     = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    course:    ['', Validators.required],
    totalFees: [0, [Validators.required, Validators.min(1)]],
    discount:  [0, Validators.min(0)],
  });

  get f() { return this.form.controls; }

  finalFees(): number {
    const total    = Number(this.form.value.totalFees ?? 0);
    const discount = Number(this.form.value.discount ?? 0);
    return Math.max(0, total - discount);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enquiry'] && this.enquiry) {
      this.form.patchValue({ course: this.enquiry.courseInterest });
    }
    if (changes['open'] && this.open) {
      this.serverError.set(null);
      this.form.patchValue({ totalFees: 0, discount: 0 });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.enquiry) return;

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    this.svc.convertFromEnquiry(this.enquiry.id, {
      course:    v.course,
      totalFees: Number(v.totalFees),
      discount:  Number(v.discount),
    }).subscribe({
      next: (student) => { this.loading.set(false); this.converted.emit(student); },
      error: (e: Error) => { this.serverError.set(e.message); this.loading.set(false); },
    });
  }
}
