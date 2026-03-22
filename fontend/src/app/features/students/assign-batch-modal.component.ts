import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BatchStudentService } from '../batches/batch-student.service';
import { BatchService } from '../batches/batch.service';
import { BatchAssignment } from '../batches/batch-student.models';
import { Batch } from '../batches/batch.models';
import { DatePipe } from '@angular/common';

const ERROR_LABELS: Record<string, string> = {
  ALREADY_ASSIGNED:  'This student is already assigned to that batch.',
  CAPACITY_EXCEEDED: 'That batch has reached its maximum capacity.',
  BRANCH_MISMATCH:   'Student and batch must belong to the same branch.',
  BATCH_NOT_FOUND:   'Batch not found.',
};

@Component({
  selector: 'snt-assign-batch-modal',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Assign to Batch">

          <div class="modal-header">
            <div>
              <h3 class="modal-title">Assign to Batch</h3>
              @if (studentName) {
                <p class="modal-subtitle">{{ studentName }}</p>
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

            @if (loadingBatches()) {
              <p class="loading-text">Loading available batches…</p>
            } @else if (!batches().length) {
              <p class="empty-text">No active batches available for assignment.</p>
            } @else {
              <div class="form-group">
                <label for="batchId">Select Batch *</label>
                <select id="batchId" formControlName="batchId">
                  <option value="">Choose a batch</option>
                  @for (b of batches(); track b.id) {
                    <option [value]="b.id">
                      {{ b.name }} — {{ b.course.name }}
                      @if (b.capacity) { ({{ b._count.batchStudents }}/{{ b.capacity }}) }
                    </option>
                  }
                </select>
                @if (f['batchId'].invalid && f['batchId'].touched) {
                  <span class="field-error">Please select a batch</span>
                }
              </div>

              @if (selectedBatch()) {
                <div class="batch-preview">
                  <div class="preview-row">
                    <span class="preview-key">Course</span>
                    <span>{{ selectedBatch()!.course.name }}</span>
                  </div>
                  @if (selectedBatch()!.schedule) {
                    <div class="preview-row">
                      <span class="preview-key">Schedule</span>
                      <span>{{ selectedBatch()!.schedule }}</span>
                    </div>
                  }
                  <div class="preview-row">
                    <span class="preview-key">Start Date</span>
                    <span>{{ selectedBatch()!.startDate | date:'dd MMM yyyy' }}</span>
                  </div>
                  @if (selectedBatch()!.capacity) {
                    <div class="preview-row">
                      <span class="preview-key">Seats</span>
                      <span>{{ selectedBatch()!._count.batchStudents }} / {{ selectedBatch()!.capacity }}</span>
                    </div>
                  }
                </div>
              }
            }

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="loading() || loadingBatches() || !batches().length"
              >
                {{ loading() ? 'Assigning…' : 'Assign to Batch' }}
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
      width: 100%; max-width: 480px; box-shadow: var(--shadow-lg);
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
    .batch-preview {
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px;
    }
    .preview-row { display: grid; grid-template-columns: 100px 1fr; gap: 4px 8px; font-size: var(--font-size-sm); margin-bottom: 4px; }
    .preview-key { color: var(--color-text-muted); font-weight: 500; }
    .loading-text, .empty-text { font-size: var(--font-size-sm); color: var(--color-text-muted); padding: 8px 0 16px; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class AssignBatchModalComponent implements OnChanges {
  @Input() open = false;
  @Input() studentId: number | null = null;
  @Input() studentName: string | null = null;

  @Output() assigned = new EventEmitter<BatchAssignment>();
  @Output() cancel   = new EventEmitter<void>();

  private readonly fb         = inject(FormBuilder);
  private readonly batchSvc   = inject(BatchService);
  private readonly assignSvc  = inject(BatchStudentService);

  readonly loading       = signal(false);
  readonly loadingBatches = signal(false);
  readonly serverError   = signal<string | null>(null);
  readonly batches       = signal<Batch[]>([]);

  readonly form = this.fb.nonNullable.group({
    batchId: [0, [Validators.required, Validators.min(1)]],
  });

  get f() { return this.form.controls; }

  selectedBatch() {
    const id = Number(this.form.value.batchId);
    return id ? this.batches().find((b) => b.id === id) ?? null : null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.form.reset({ batchId: 0 });
      this.serverError.set(null);
      this.loadBatches();
    }
  }

  private loadBatches(): void {
    this.loadingBatches.set(true);
    this.batchSvc.getAll().subscribe({
      next: (list) => {
        this.batches.set(list.filter((b) => b.isActive));
        this.loadingBatches.set(false);
      },
      error: () => { this.loadingBatches.set(false); },
    });
  }

  submit(): void {
    if (this.form.invalid || !this.studentId) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    this.assignSvc.assign(Number(this.form.value.batchId), this.studentId).subscribe({
      next: (result) => { this.loading.set(false); this.assigned.emit(result); },
      error: (e: Error) => {
        this.serverError.set(ERROR_LABELS[e.message] ?? e.message);
        this.loading.set(false);
      },
    });
  }
}
