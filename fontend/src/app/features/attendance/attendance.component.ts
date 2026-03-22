import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AttendanceService } from './attendance.service';
import { BatchService } from '../batches/batch.service';
import { AttendanceRecord, ATTENDANCE_STATUS_LABELS } from './attendance.models';
import { Batch } from '../batches/batch.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { MarkAttendanceComponent } from './mark-attendance.component';

type LoadState = 'loading' | 'error' | 'ready' | 'idle';

@Component({
  selector: 'snt-attendance',
  standalone: true,
  imports: [
    FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent, MarkAttendanceComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Attendance"
      subtitle="Record and review daily student attendance by batch"
      icon="✅"
    >
      <ng-container slot="actions">
        <button
          class="btn btn-primary"
          [disabled]="!selectedBatchId()"
          (click)="openMarkDrawer()"
        >
          Mark Attendance
        </button>
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <select class="filter-select filter-select-wide" [(ngModel)]="selectedBatchId" (ngModelChange)="onBatchChange()">
            <option [value]="null">Select a batch…</option>
            @for (b of batches(); track b.id) {
              <option [value]="b.id">{{ b.name }} — {{ b.course.name }}</option>
            }
          </select>
          <input
            class="date-input"
            type="date"
            [(ngModel)]="dateFilter"
            (ngModelChange)="onDateChange()"
            [disabled]="!selectedBatchId()"
          />
          @if (dateFilter) {
            <button class="btn btn-ghost" (click)="clearDate()">Clear Date</button>
          }
          @if (records().length) {
            <span class="filter-count">{{ records().length }} record{{ records().length !== 1 ? 's' : '' }}</span>
          }
        </div>
      </ng-container>

      @switch (state()) {
        @case ('idle') {
          <snt-page-state
            type="empty"
            title="Select a batch to view attendance"
            description="Choose a batch from the filter above to load attendance records."
          />
        }
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="loadRecords()" /> }
        @case ('ready') {
          @if (!records().length) {
            <snt-page-state
              type="empty"
              [title]="dateFilter ? 'No attendance for this date' : 'No attendance records yet'"
              [description]="dateFilter ? 'No records found for the selected date.' : 'Mark attendance for this batch to start tracking.'"
              actionLabel="Mark Attendance"
              (action)="openMarkDrawer()"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Batch</th>
                    <th>Marked By</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of records(); track r.id) {
                    <tr>
                      <td>
                        <div class="cell-student">
                          <span class="cell-avatar">{{ r.student.fullName.charAt(0).toUpperCase() }}</span>
                          <span class="font-medium">{{ r.student.fullName }}</span>
                        </div>
                      </td>
                      <td class="text-muted">{{ r.attendanceDate | date:'dd MMM yyyy' }}</td>
                      <td>
                        <snt-badge [label]="statusLabel(r.status)" [variant]="statusBadge(r.status)" />
                      </td>
                      <td class="text-muted">{{ r.batch.name }}</td>
                      <td class="text-muted">{{ r.markedBy.name }}</td>
                      <td class="text-muted">{{ r.remarks || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </snt-page-shell>

    <snt-mark-attendance
      [open]="markDrawerOpen()"
      [batchId]="selectedBatchId()"
      [batchName]="selectedBatchName()"
      (marked)="onMarked()"
      (cancel)="closeMarkDrawer()"
    />
  `,
  styles: [`
    .filter-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%;
      padding: 12px 16px; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    }
    .filter-select {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; cursor: pointer;
    }
    .filter-select-wide { min-width: 240px; }
    .date-input {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none;
    }
    .date-input:focus { border-color: var(--color-primary); }
    .date-input:disabled { opacity: .5; cursor: not-allowed; }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .cell-student { display: flex; align-items: center; gap: 10px; }
    .cell-avatar {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      background: #dbeafe; color: #1e40af;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .text-muted { color: var(--color-text-muted); }
  `],
})
export class AttendanceComponent implements OnInit {
  private readonly svc        = inject(AttendanceService);
  private readonly batchSvc   = inject(BatchService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state    = signal<LoadState>('idle');
  readonly errorMsg = signal<string | null>(null);
  readonly records  = signal<AttendanceRecord[]>([]);
  readonly batches  = signal<Batch[]>([]);
  readonly markDrawerOpen = signal(false);

  selectedBatchId = signal<number | null>(null);
  dateFilter = '';

  readonly selectedBatchName = computed(() => {
    const id = this.selectedBatchId();
    return id ? (this.batches().find((b) => b.id === id)?.name ?? null) : null;
  });

  ngOnInit(): void {
    this.batchSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.batches.set(list.filter((b) => b.isActive)),
        error: () => {},
      });
  }

  onBatchChange(): void {
    this.dateFilter = '';
    if (this.selectedBatchId()) {
      this.loadRecords();
    } else {
      this.state.set('idle');
      this.records.set([]);
    }
  }

  onDateChange(): void {
    if (this.selectedBatchId()) this.loadRecords();
  }

  clearDate(): void {
    this.dateFilter = '';
    if (this.selectedBatchId()) this.loadRecords();
  }

  loadRecords(): void {
    const id = this.selectedBatchId();
    if (!id) return;

    this.state.set('loading');
    this.svc.getByBatch(id, this.dateFilter || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.records.set(data); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  statusLabel(status: string): string {
    return ATTENDANCE_STATUS_LABELS[status as keyof typeof ATTENDANCE_STATUS_LABELS] ?? status;
  }

  statusBadge(status: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      present: 'success', absent: 'danger', leave: 'warning',
    };
    return map[status] ?? 'neutral';
  }

  openMarkDrawer(): void  { this.markDrawerOpen.set(true); }
  closeMarkDrawer(): void { this.markDrawerOpen.set(false); }

  onMarked(): void {
    this.closeMarkDrawer();
    this.loadRecords();
  }
}
