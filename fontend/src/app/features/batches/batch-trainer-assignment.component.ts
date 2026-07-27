import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { Trainer } from '../trainers/trainer.models';
import { Batch } from './batch.models';
import { BatchTrainerAssignment } from './batch-trainer.models';
import { BatchTrainerService } from './batch-trainer.service';

@Component({
  selector: 'snt-batch-trainer-assignment',
  standalone: true,
  imports: [FormsModule, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      title="Assign Trainer"
      [subtitle]="batch ? batch.name : undefined"
      (closed)="cancel.emit()"
    >
      @if (serverError()) {
        <div class="form-error-banner">{{ serverError() }}</div>
      }

      @if (batch) {
        <div class="batch-summary">
          <div>
            <span class="summary-label">Branch</span>
            <strong>{{ batch.branch.name }}</strong>
          </div>
          <div>
            <span class="summary-label">Course</span>
            <strong>{{ batch.course.name }}</strong>
          </div>
        </div>
      }

      <section class="section">
        <h3>Current Trainers</h3>
        @if (!assignments.length) {
          <p class="empty-text">No trainers assigned yet.</p>
        } @else {
          <div class="assignment-list">
            @for (assignment of assignments; track assignment.id) {
              <div class="assignment-row">
                <div>
                  <strong>{{ assignment.trainer.fullName }}</strong>
                  <span>{{ assignment.trainer.specialization || 'No specialization' }}</span>
                </div>
                @if (assignment.isPrimary) {
                  <span class="primary-pill">Primary</span>
                }
              </div>
            }
          </div>
        }
      </section>

      <section class="section">
        <h3>Add Trainer</h3>
        <div class="form-group">
          <label for="trainerId">Trainer *</label>
          <select id="trainerId" [(ngModel)]="trainerId" [disabled]="loading() || !availableTrainers().length">
            <option [ngValue]="null">Select trainer...</option>
            @for (trainer of availableTrainers(); track trainer.id) {
              <option [ngValue]="trainer.id">
                {{ trainer.fullName }}{{ trainer.trainerType === 'global' ? ' - Global' : '' }}{{ trainer.specialization ? ' - ' + trainer.specialization : '' }}
              </option>
            }
          </select>
          @if (submitted() && !trainerId) {
            <span class="field-error">Trainer is required</span>
          }
          @if (!availableTrainers().length) {
            <span class="field-hint">No unassigned active local trainers for this branch or global trainers are available.</span>
          }
        </div>

        <label class="toggle-label">
          <input type="checkbox" [(ngModel)]="isPrimary" [disabled]="loading()" />
          <span>Primary trainer</span>
        </label>
      </section>

      <div class="drawer-footer">
        <button type="button" class="btn btn-secondary" (click)="cancel.emit()" [disabled]="loading()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="submit()" [disabled]="loading() || !availableTrainers().length">
          {{ loading() ? 'Assigning...' : 'Assign Trainer' }}
        </button>
      </div>
    </snt-drawer>
  `,
  styles: [`
    .batch-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding: 12px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-bottom: 18px;
    }
    .batch-summary div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .batch-summary strong { font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .summary-label, .assignment-row span, .field-hint, .empty-text {
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
    }
    .section { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
    .section h3 { margin: 0; font-size: var(--font-size-md); font-weight: 800; }
    .assignment-list { display: flex; flex-direction: column; gap: 8px; }
    .assignment-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .assignment-row div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .assignment-row strong { font-size: var(--font-size-sm); }
    .primary-pill {
      border-radius: 999px;
      padding: 3px 8px;
      background: #dbeafe;
      color: #1e40af;
      font-weight: 700;
      flex-shrink: 0;
    }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: var(--font-size-sm); font-weight: 600; }
    .form-group select {
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-text);
      font-size: var(--font-size-sm);
      outline: none;
    }
    .form-group select:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .field-error { color: #dc2626; font-size: var(--font-size-xs); }
    .toggle-label { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); cursor: pointer; }
    .toggle-label input { width: 16px; height: 16px; }
    .form-error-banner {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-size: var(--font-size-sm);
      margin-bottom: 16px;
    }
    .drawer-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
    }
  `],
})
export class BatchTrainerAssignmentComponent implements OnChanges {
  @Input() open = false;
  @Input() batch: Batch | null = null;
  @Input() trainers: Trainer[] = [];
  @Input() assignments: BatchTrainerAssignment[] = [];

  @Output() assigned = new EventEmitter<BatchTrainerAssignment>();
  @Output() cancel = new EventEmitter<void>();

  private readonly batchTrainerSvc = inject(BatchTrainerService);

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal<string | null>(null);

  trainerId: number | null = null;
  isPrimary = true;

  availableTrainers(): Trainer[] {
    const branchId = this.batch?.branch.id;
    const assignedIds = new Set(this.assignments.map((assignment) => assignment.trainer.id));
    return this.trainers.filter((trainer) =>
      trainer.isActive &&
      (trainer.trainerType === 'global' || trainer.branch.id === branchId) &&
      !assignedIds.has(trainer.id)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);

    if (!this.batch || !this.trainerId) return;

    this.loading.set(true);
    this.batchTrainerSvc.assign({
      batchId: this.batch.id,
      trainerId: this.trainerId,
      isPrimary: this.isPrimary,
    }).subscribe({
      next: (assignment) => {
        this.loading.set(false);
        this.assigned.emit(assignment);
      },
      error: (error: Error) => {
        this.serverError.set(error.message || 'Could not assign trainer');
        this.loading.set(false);
      },
    });
  }

  private reset(): void {
    this.trainerId = null;
    this.isPrimary = true;
    this.loading.set(false);
    this.submitted.set(false);
    this.serverError.set(null);
  }
}
