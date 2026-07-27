import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { Batch } from '../batches/batch.models';
import { DAYS_OF_WEEK, BatchSchedule } from './schedule.models';
import { ScheduleService } from './schedule.service';

@Component({
  selector: 'snt-schedule-form',
  standalone: true,
  imports: [FormsModule, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      title="Add Schedule"
      [subtitle]="selectedBatchName() || 'Create a weekly slot for a batch'"
      (closed)="cancel.emit()"
    >
      @if (serverError()) {
        <div class="form-error-banner">{{ serverError() }}</div>
      }

      <div class="form-stack">
        <div class="form-group">
          <label for="scheduleBatch">Batch *</label>
          <select
            id="scheduleBatch"
            class="form-control"
            [(ngModel)]="batchId"
            [disabled]="loading()"
          >
            <option [ngValue]="null">Select a batch...</option>
            @for (batch of batches; track batch.id) {
              <option [ngValue]="batch.id">{{ batch.name }} - {{ batch.course.name }}</option>
            }
          </select>
          @if (submitted() && !batchId) {
            <span class="field-error">Batch is required</span>
          }
        </div>

        <div class="form-group">
          <label for="dayOfWeek">Day *</label>
          <select
            id="dayOfWeek"
            class="form-control"
            [(ngModel)]="dayOfWeek"
            [disabled]="loading()"
          >
            @for (day of days; track day.value) {
              <option [ngValue]="day.value">{{ day.label }}</option>
            }
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="startTime">Start Time *</label>
            <input
              id="startTime"
              class="form-control"
              type="time"
              [(ngModel)]="startTime"
              [disabled]="loading()"
            />
            @if (submitted() && !startTime) {
              <span class="field-error">Start time is required</span>
            }
          </div>

          <div class="form-group">
            <label for="endTime">End Time *</label>
            <input
              id="endTime"
              class="form-control"
              type="time"
              [(ngModel)]="endTime"
              [disabled]="loading()"
            />
            @if (submitted() && !endTime) {
              <span class="field-error">End time is required</span>
            }
          </div>
        </div>

        @if (submitted() && timeRangeInvalid()) {
          <div class="field-error field-error-block">End time must be after start time.</div>
        }

        <div class="form-group">
          <label for="room">Room</label>
          <input
            id="room"
            class="form-control"
            type="text"
            [(ngModel)]="room"
            placeholder="e.g. Lab 2 or Online"
            [disabled]="loading()"
          />
        </div>
      </div>

      <div class="drawer-footer">
        <button type="button" class="btn btn-secondary" (click)="cancel.emit()" [disabled]="loading()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="submit()" [disabled]="loading()">
          {{ loading() ? 'Saving...' : 'Save Schedule' }}
        </button>
      </div>
    </snt-drawer>
  `,
  styles: [`
    .form-stack { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .form-control {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-text);
      font-size: var(--font-size-sm);
      outline: none;
    }
    .form-control:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .form-control:disabled { opacity: .65; cursor: not-allowed; }
    .field-error { color: #dc2626; font-size: var(--font-size-xs); }
    .field-error-block { margin-top: -6px; }
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
      padding-top: 18px;
      margin-top: 20px;
      border-top: 1px solid var(--color-border);
    }
    @media (max-width: 520px) { .form-row { grid-template-columns: 1fr; } }
  `],
})
export class ScheduleFormComponent implements OnChanges {
  @Input() open = false;
  @Input() batches: Batch[] = [];
  @Input() selectedBatchId: number | null = null;

  @Output() saved = new EventEmitter<BatchSchedule>();
  @Output() cancel = new EventEmitter<void>();

  private readonly scheduleSvc = inject(ScheduleService);

  readonly days = DAYS_OF_WEEK;
  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal<string | null>(null);

  batchId: number | null = null;
  dayOfWeek = 1;
  startTime = '';
  endTime = '';
  room = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }

    if (changes['selectedBatchId'] && this.open && !this.batchId) {
      this.batchId = this.selectedBatchId;
    }
  }

  selectedBatchName(): string | null {
    const id = this.batchId ?? this.selectedBatchId;
    const batch = id ? this.batches.find((item) => item.id === id) : null;
    return batch ? batch.name : null;
  }

  timeRangeInvalid(): boolean {
    return !!this.startTime && !!this.endTime && this.startTime >= this.endTime;
  }

  submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);

    if (!this.batchId || !this.startTime || !this.endTime || this.timeRangeInvalid()) return;

    this.loading.set(true);
    this.scheduleSvc.create({
      batchId: this.batchId,
      dayOfWeek: Number(this.dayOfWeek),
      startTime: this.startTime,
      endTime: this.endTime,
      room: this.room.trim() || undefined,
    }).subscribe({
      next: (schedule) => {
        this.loading.set(false);
        this.saved.emit(schedule);
      },
      error: (error: Error) => {
        this.serverError.set(error.message || 'Could not save schedule');
        this.loading.set(false);
      },
    });
  }

  private reset(): void {
    this.batchId = this.selectedBatchId;
    this.dayOfWeek = 1;
    this.startTime = '';
    this.endTime = '';
    this.room = '';
    this.submitted.set(false);
    this.serverError.set(null);
    this.loading.set(false);
  }
}
