import {
  Component, ChangeDetectionStrategy, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BatchService } from '../batches/batch.service';
import { Batch } from '../batches/batch.models';
import { BatchSchedule, DAYS_OF_WEEK } from './schedule.models';
import { ScheduleService } from './schedule.service';
import { ScheduleFormComponent } from './schedule-form.component';

type LoadState = 'idle' | 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-schedules',
  standalone: true,
  imports: [FormsModule, PageShellComponent, PageStateComponent, ScheduleFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Schedules"
      subtitle="View and manage batch session schedules and timings"
      icon="📅"
    >
      <ng-container slot="actions">
        <button
          class="btn btn-primary"
          [disabled]="!batches().length"
          (click)="openCreate()"
        >
          + Add Schedule
        </button>
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <select
            class="filter-select filter-select-wide"
            [(ngModel)]="selectedBatchId"
            (ngModelChange)="onBatchChange()"
          >
            <option [ngValue]="null">Select a batch...</option>
            @for (batch of batches(); track batch.id) {
              <option [ngValue]="batch.id">{{ batch.name }} - {{ batch.course.name }}</option>
            }
          </select>

          @if (selectedBatch()) {
            <span class="filter-meta">{{ selectedBatch()!.branch.name }}</span>
          }

          @if (schedules().length) {
            <span class="filter-count">{{ schedules().length }} slot{{ schedules().length !== 1 ? 's' : '' }}</span>
          }
        </div>
      </ng-container>

      @if (loadingBatches()) {
        <snt-page-state type="loading" />
      } @else if (batchLoadError()) {
        <snt-page-state
          type="error"
          [description]="batchLoadError() ?? undefined"
          actionLabel="Retry"
          (action)="loadBatches()"
        />
      } @else if (!batches().length) {
        <snt-page-state
          type="empty"
          title="No active batches"
          description="Create an active batch before adding schedule slots."
        />
      } @else {
        @switch (state()) {
          @case ('idle') {
            <snt-page-state
              type="empty"
              title="Select a batch"
              description="Choose a batch above to view or add schedule slots."
            />
          }
          @case ('loading') { <snt-page-state type="loading" /> }
          @case ('error') {
            <snt-page-state
              type="error"
              [description]="errorMsg() ?? undefined"
              actionLabel="Retry"
              (action)="loadSchedules()"
            />
          }
          @case ('ready') {
            @if (!schedules().length) {
              <snt-page-state
                type="empty"
                title="No schedules defined"
                description="Create a schedule for this batch to define session days and timings."
                actionLabel="+ Add Schedule"
                (action)="openCreate()"
              />
            } @else {
              <div class="schedule-grid">
                @for (day of scheduledDays(); track day.value) {
                  <section class="schedule-day">
                    <div class="schedule-day__header">
                      <h2>{{ day.label }}</h2>
                      <span>{{ slotsForDay(day.value).length }} slot{{ slotsForDay(day.value).length !== 1 ? 's' : '' }}</span>
                    </div>

                    <div class="schedule-day__slots">
                      @for (slot of slotsForDay(day.value); track slot.id) {
                        <article class="schedule-slot">
                          <div>
                            <strong>{{ slot.startTime }} - {{ slot.endTime }}</strong>
                            @if (slot.room) {
                              <p>Room: {{ slot.room }}</p>
                            } @else {
                              <p>No room specified</p>
                            }
                          </div>
                          <span>{{ slot.batch.name }}</span>
                        </article>
                      }
                    </div>
                  </section>
                }
              </div>
            }
          }
        }
      }
    </snt-page-shell>

    <snt-schedule-form
      [open]="formOpen()"
      [batches]="batches()"
      [selectedBatchId]="selectedBatchId()"
      (saved)="onSaved($event)"
      (cancel)="closeForm()"
    />
  `,
  styles: [`
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      width: 100%;
      padding: 12px 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }
    .filter-select {
      padding: 7px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      background: var(--color-bg);
      outline: none;
      cursor: pointer;
    }
    .filter-select-wide { min-width: 280px; }
    .filter-meta {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      padding: 4px 10px;
    }
    .filter-count {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin-left: auto;
      white-space: nowrap;
    }
    .schedule-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
    }
    .schedule-day {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 14px;
    }
    .schedule-day__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--color-border);
    }
    .schedule-day__header h2 {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: 800;
      color: var(--color-text);
    }
    .schedule-day__header span,
    .schedule-slot span,
    .schedule-slot p {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .schedule-day__slots {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .schedule-slot {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding: 10px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .schedule-slot strong {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }
    .schedule-slot p { margin-top: 3px; }
    .schedule-slot span {
      flex-shrink: 0;
      max-width: 110px;
      text-align: right;
    }
    @media (max-width: 560px) {
      .filter-select-wide { min-width: 100%; }
      .filter-count { margin-left: 0; }
      .schedule-slot { flex-direction: column; }
      .schedule-slot span { max-width: none; text-align: left; }
    }
  `],
})
export class SchedulesComponent implements OnInit {
  private readonly batchSvc = inject(BatchService);
  private readonly scheduleSvc = inject(ScheduleService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loadingBatches = signal(true);
  readonly batchLoadError = signal<string | null>(null);
  readonly state = signal<LoadState>('idle');
  readonly errorMsg = signal<string | null>(null);
  readonly batches = signal<Batch[]>([]);
  readonly schedules = signal<BatchSchedule[]>([]);
  readonly formOpen = signal(false);

  selectedBatchId = signal<number | null>(null);

  readonly selectedBatch = computed(() => {
    const id = this.selectedBatchId();
    return id ? (this.batches().find((batch) => batch.id === id) ?? null) : null;
  });

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    this.loadingBatches.set(true);
    this.batchLoadError.set(null);
    this.batchSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (batches) => {
          const active = batches.filter((batch) => batch.isActive);
          this.batches.set(active);
          this.loadingBatches.set(false);

          if (!this.selectedBatchId() && active.length === 1) {
            this.selectedBatchId.set(active[0].id);
            this.loadSchedules();
          }
        },
        error: (error: Error) => {
          this.batchLoadError.set(error.message || 'Could not load batches');
          this.loadingBatches.set(false);
        },
      });
  }

  onBatchChange(): void {
    if (!this.selectedBatchId()) {
      this.schedules.set([]);
      this.state.set('idle');
      return;
    }

    this.loadSchedules();
  }

  loadSchedules(): void {
    const batchId = this.selectedBatchId();
    if (!batchId) return;

    this.state.set('loading');
    this.errorMsg.set(null);
    this.scheduleSvc.getByBatch(batchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (schedules) => {
          this.schedules.set(schedules);
          this.state.set('ready');
        },
        error: (error: Error) => {
          this.errorMsg.set(error.message || 'Could not load schedules');
          this.state.set('error');
        },
      });
  }

  openCreate(): void {
    if (!this.selectedBatchId() && this.batches().length) {
      this.selectedBatchId.set(this.batches()[0].id);
      this.loadSchedules();
    }
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  onSaved(schedule: BatchSchedule): void {
    this.closeForm();
    this.selectedBatchId.set(schedule.batch.id);
    this.loadSchedules();
  }

  scheduledDays(): { value: number; label: string }[] {
    const scheduled = new Set(this.schedules().map((slot) => slot.dayOfWeek));
    return DAYS_OF_WEEK.filter((day) => scheduled.has(day.value));
  }

  slotsForDay(dayOfWeek: number): BatchSchedule[] {
    return this.schedules().filter((slot) => slot.dayOfWeek === dayOfWeek);
  }
}
