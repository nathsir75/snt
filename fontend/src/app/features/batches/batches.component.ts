import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import { BatchService } from './batch.service';
import { Batch, BatchStatusFilter } from './batch.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { BatchFormComponent } from './batch-form.component';
import { BatchTrainerAssignmentComponent } from './batch-trainer-assignment.component';
import { BatchTrainerAssignment } from './batch-trainer.models';
import { BatchTrainerService } from './batch-trainer.service';
import { Trainer } from '../trainers/trainer.models';
import { TrainerService } from '../trainers/trainer.service';
import { BatchSchedule, DAYS_OF_WEEK } from '../schedules/schedule.models';
import { ScheduleService } from '../schedules/schedule.service';

type LoadState = 'loading' | 'error' | 'ready';
const PAGE_SIZE = 15;

@Component({
  selector: 'snt-batches',
  standalone: true,
  imports: [
    FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent, BatchFormComponent,
    BatchTrainerAssignmentComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Batches"
      [subtitle]="canWrite() ? 'Create and manage training batches, assign students and trainers' : 'View available training batches and their schedules'"
      icon="👥"
    >
      @if (canWrite()) {
        <ng-container slot="actions">
          <button class="btn btn-primary" (click)="openCreate()">+ Create Batch</button>
        </ng-container>
      }

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search batch name, course…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange()"
            />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          @if (searchTerm || statusFilter !== 'all') {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} batch{{ filtered().length !== 1 ? 'es' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter !== 'all' ? 'No matching batches' : 'No batches created'"
              [description]="searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Batches will appear here once created by the branch admin.'"
              [actionLabel]="canWrite() && !searchTerm && statusFilter === 'all' ? '+ Create Batch' : ''"
              (action)="openCreate()"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Course</th>
                    <th>Trainers</th>
                    <th>Schedule</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Students</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    @if (canWrite()) { <th></th> }
                  </tr>
                </thead>
                <tbody>
                  @for (b of paginated(); track b.id) {
                    <tr>
                      <td>
                        <p class="font-medium">{{ b.name }}</p>
                        <p class="text-xs text-muted">{{ b.branch.name }}</p>
                      </td>
                      <td>
                        <p class="font-medium">{{ b.course.name }}</p>
                        <p class="text-xs text-muted">{{ b.course.code }}</p>
                      </td>
                      <td>
                        @if (trainersForBatch(b.id).length) {
                          <div class="trainer-list">
                            @for (assignment of trainersForBatch(b.id); track assignment.id) {
                              <span class="trainer-pill" [class.trainer-pill--primary]="assignment.isPrimary">
                                {{ assignment.trainer.fullName }}
                              </span>
                            }
                          </div>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
                      <td class="text-muted">
                        <span class="schedule-summary">{{ scheduleDisplayForBatch(b.id) }}</span>
                      </td>
                      <td class="text-muted">{{ b.startDate | date:'dd MMM yyyy' }}</td>
                      <td class="text-muted">{{ b.endDate ? (b.endDate | date:'dd MMM yyyy') : '—' }}</td>
                      <td>{{ b._count.batchStudents }}</td>
                      <td class="text-muted">{{ b.capacity ?? '∞' }}</td>
                      <td>
                        <snt-badge [label]="b.isActive ? 'Active' : 'Inactive'" [variant]="statusBadge(b)" />
                      </td>
                      @if (canWrite()) {
                        <td>
                          <div class="row-actions">
                            <button class="btn btn-ghost btn-sm" (click)="openAssignTrainer(b)">Assign Trainer</button>
                            <button class="btn btn-ghost btn-sm" (click)="openEdit(b)">Edit</button>
                          </div>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="btn btn-secondary btn-sm" [disabled]="page() === 1" (click)="setPage(page() - 1)">← Prev</button>
                <span class="pagination-info">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="btn btn-secondary btn-sm" [disabled]="page() === totalPages()" (click)="setPage(page() + 1)">Next →</button>
              </div>
            }
          }
        }
      }
    </snt-page-shell>

    @if (canWrite()) {
      <snt-batch-form
        [open]="drawerOpen()"
        [batch]="editingBatch()"
        (saved)="onSaved($event)"
        (cancel)="closeDrawer()"
      />
      <snt-batch-trainer-assignment
        [open]="assignmentDrawerOpen()"
        [batch]="assigningBatch()"
        [trainers]="trainerChoices()"
        [assignments]="assigningBatchAssignments()"
        (assigned)="onTrainerAssigned($event)"
        (cancel)="closeAssignmentDrawer()"
      />
    }
  `,
  styles: [`
    .filter-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%;
      padding: 12px 16px; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    }
    .search-box { position: relative; flex: 1; min-width: 200px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input {
      width: 100%; padding: 7px 10px 7px 32px;
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      font-size: var(--font-size-sm); background: var(--color-bg); outline: none;
    }
    .search-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .filter-select {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; cursor: pointer;
    }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .row-actions { display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
    .trainer-list { display: flex; flex-wrap: wrap; gap: 4px; max-width: 180px; }
    .trainer-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 2px 7px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      font-weight: 600;
      max-width: 170px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .trainer-pill--primary {
      background: #dbeafe;
      border-color: #bfdbfe;
      color: #1e40af;
    }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
  `],
})
export class BatchesComponent implements OnInit {
  private readonly svc        = inject(BatchService);
  private readonly auth       = inject(AuthService);
  private readonly batchTrainerSvc = inject(BatchTrainerService);
  private readonly trainerSvc = inject(TrainerService);
  private readonly scheduleSvc = inject(ScheduleService);
  private readonly destroyRef = inject(DestroyRef);

  // counselor gets read-only view; super_admin and branch_admin can write
  readonly canWrite = computed(() => !this.auth.isCounselor());

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<Batch[]>([]);
  readonly page     = signal(1);
  readonly drawerOpen   = signal(false);
  readonly editingBatch = signal<Batch | null>(null);
  readonly assignmentDrawerOpen = signal(false);
  readonly assigningBatch = signal<Batch | null>(null);
  readonly trainerChoices = signal<Trainer[]>([]);
  readonly assignedTrainers = signal<Record<number, BatchTrainerAssignment[]>>({});
  readonly schedulesByBatch = signal<Record<number, BatchSchedule[]>>({});
  readonly scheduleLoadErrors = signal<Record<number, boolean>>({});

  searchTerm   = '';
  statusFilter: BatchStatusFilter = 'all';

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter;
    return this.all().filter((b) => {
      const matchSearch = !term ||
        b.name.toLowerCase().includes(term) ||
        b.course.name.toLowerCase().includes(term) ||
        b.course.code.toLowerCase().includes(term);
      const matchStatus =
        status === 'all' ||
        (status === 'active' && b.isActive) ||
        (status === 'inactive' && !b.isActive);
      return matchSearch && matchStatus;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly paginated  = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.all.set(data);
          this.state.set('ready');
          this.loadAssignmentsFor(data);
          this.loadSchedulesFor(data);
        },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  private loadAssignmentsFor(batches: Batch[]): void {
    if (!batches.length) {
      this.assignedTrainers.set({});
      return;
    }

    const requests = batches.map((batch) =>
      this.batchTrainerSvc.getByBatch(batch.id).pipe(catchError(() => of([] as BatchTrainerAssignment[])))
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        const map: Record<number, BatchTrainerAssignment[]> = {};
        batches.forEach((batch, index) => {
          map[batch.id] = results[index] ?? [];
        });
        this.assignedTrainers.set(map);
      });
  }

  private loadTrainerChoices(): void {
    this.trainerSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (trainers) => this.trainerChoices.set(trainers.filter((trainer) => trainer.isActive)),
        error: () => this.trainerChoices.set([]),
      });
  }

  private loadSchedulesFor(batches: Batch[]): void {
    if (!batches.length) {
      this.schedulesByBatch.set({});
      this.scheduleLoadErrors.set({});
      return;
    }

    const requests = batches.map((batch) =>
      this.scheduleSvc.getByBatch(batch.id).pipe(
        catchError(() => of(null as BatchSchedule[] | null))
      )
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        const schedules: Record<number, BatchSchedule[]> = {};
        const errors: Record<number, boolean> = {};
        batches.forEach((batch, index) => {
          const result = results[index];
          if (result === null) {
            schedules[batch.id] = [];
            errors[batch.id] = true;
          } else {
            schedules[batch.id] = result;
          }
        });
        this.schedulesByBatch.set(schedules);
        this.scheduleLoadErrors.set(errors);
      });
  }

  statusBadge(b: Batch): BadgeVariant {
    return b.isActive ? 'success' : 'neutral';
  }

  openCreate(): void { this.editingBatch.set(null); this.drawerOpen.set(true); }
  openEdit(b: Batch): void { this.editingBatch.set(b); this.drawerOpen.set(true); }
  closeDrawer(): void { this.drawerOpen.set(false); }
  openAssignTrainer(batch: Batch): void {
    this.assigningBatch.set(batch);
    this.assignmentDrawerOpen.set(true);
    this.loadTrainerChoices();
    this.refreshBatchAssignments(batch.id);
  }
  closeAssignmentDrawer(): void {
    this.assignmentDrawerOpen.set(false);
    this.assigningBatch.set(null);
  }

  onSaved(batch: Batch): void {
    this.closeDrawer();
    const existing = this.all().findIndex((b) => b.id === batch.id);
    if (existing >= 0) {
      this.all.update((list) => list.map((b) => b.id === batch.id ? batch : b));
    } else {
      this.all.update((list) => [batch, ...list]);
    }
    this.refreshBatchSchedules(batch.id);
  }

  onTrainerAssigned(assignment: BatchTrainerAssignment): void {
    const batchId = assignment.batch.id;
    this.assignedTrainers.update((map) => ({
      ...map,
      [batchId]: [...(map[batchId] ?? []), assignment],
    }));
    this.refreshBatchAssignments(batchId);
    this.closeAssignmentDrawer();
  }

  trainersForBatch(batchId: number): BatchTrainerAssignment[] {
    return this.assignedTrainers()[batchId] ?? [];
  }

  scheduleDisplayForBatch(batchId: number): string {
    const map = this.schedulesByBatch();
    if (!(batchId in map)) return 'Loading...';
    if (this.scheduleLoadErrors()[batchId]) return 'Schedule unavailable';

    const schedules = map[batchId];
    if (!schedules.length) return 'No schedule set';

    return schedules.map((slot) => this.formatScheduleSlot(slot)).join('; ');
  }

  assigningBatchAssignments(): BatchTrainerAssignment[] {
    const batch = this.assigningBatch();
    return batch ? this.trainersForBatch(batch.id) : [];
  }

  private refreshBatchAssignments(batchId: number): void {
    this.batchTrainerSvc.getByBatch(batchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (assignments) => {
          this.assignedTrainers.update((map) => ({ ...map, [batchId]: assignments }));
        },
        error: () => {},
      });
  }

  private refreshBatchSchedules(batchId: number): void {
    this.scheduleSvc.getByBatch(batchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (schedules) => {
          this.schedulesByBatch.update((map) => ({ ...map, [batchId]: schedules }));
          this.scheduleLoadErrors.update((map) => {
            const { [batchId]: _ignored, ...rest } = map;
            return rest;
          });
        },
        error: () => {
          this.schedulesByBatch.update((map) => ({ ...map, [batchId]: [] }));
          this.scheduleLoadErrors.update((map) => ({ ...map, [batchId]: true }));
        },
      });
  }

  private formatScheduleSlot(slot: BatchSchedule): string {
    const day = slot.dayName || DAYS_OF_WEEK.find((d) => d.value === slot.dayOfWeek)?.label || 'Day';
    const start = this.formatTime(slot.startTime);
    const end = this.formatTime(slot.endTime);
    const compactStart = start.period === end.period ? start.time : `${start.time} ${start.period}`;
    return `${day} ${compactStart}–${end.time} ${end.period}`;
  }

  private formatTime(value: string): { time: string; period: 'AM' | 'PM' } {
    const [hourRaw, minuteRaw = '00'] = value.split(':');
    const hour24 = Number(hourRaw);
    const minute = Number(minuteRaw);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    const minuteText = Number.isFinite(minute) ? String(minute).padStart(2, '0') : '00';
    return { time: `${hour12}:${minuteText}`, period };
  }

  onSearchChange(): void { this.page.set(1); }
  onFilterChange(): void { this.page.set(1); }
  setPage(p: number): void { this.page.set(p); }

  clearFilters(): void {
    this.searchTerm   = '';
    this.statusFilter = 'all';
    this.page.set(1);
  }
}
