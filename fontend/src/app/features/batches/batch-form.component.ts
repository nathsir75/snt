import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal, OnInit, DestroyRef,
} from '@angular/core';
import { AbstractControl, ReactiveFormsModule, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { BatchService } from './batch.service';
import { Batch } from './batch.models';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { BatchSchedule, DAYS_OF_WEEK } from '../schedules/schedule.models';
import { ScheduleService } from '../schedules/schedule.service';

interface CourseOption { id: number; name: string; code: string; }
interface BranchOption { id: number; name: string; city: string; }

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;
  if (!startDate || !endDate) return null;
  return endDate < startDate ? { dateRange: true } : null;
}

@Component({
  selector: 'snt-batch-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      [title]="batch ? 'Edit Batch' : 'Create Batch'"
      [subtitle]="batch ? 'Update batch details or toggle active status' : 'Set up a new training batch'"
      (closed)="cancel.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()">

        @if (serverError()) {
          <div class="form-error-banner">{{ serverError() }}</div>
        }

        <div class="form-group">
          <label for="name">Batch Name *</label>
          <input id="name" formControlName="name" placeholder="e.g. Batch A — Jan 2025" />
          @if (f['name'].invalid && f['name'].touched) {
            <span class="field-error">Batch name is required</span>
          }
        </div>

        @if (!batch) {
          @if (auth.isSuperAdmin()) {
            <div class="form-group">
              <label for="branchId">Host Branch *</label>
              <select id="branchId" formControlName="branchId">
                <option value="">Select host branch</option>
                @for (branch of branches(); track branch.id) {
                  <option [value]="branch.id">{{ branch.name }} — {{ branch.city }}</option>
                }
              </select>
              <small class="text-muted">Central programme students may still be explicitly enrolled from any branch.</small>
            </div>
          }
          <div class="form-group">
            <label for="courseId">Course *</label>
            <select id="courseId" formControlName="courseId">
              <option value="">Select course</option>
              @for (c of courses(); track c.id) {
                <option [value]="c.id">{{ c.name }} ({{ c.code }})</option>
              }
            </select>
            @if (f['courseId'].invalid && f['courseId'].touched) {
              <span class="field-error">Course is required</span>
            }
          </div>
        } @else {
          <div class="form-group">
            <label>Course</label>
            <input [value]="batch.course.name" disabled />
          </div>
        }

        <div class="form-row">
          <div class="form-group">
            <label for="startDate">Start Date *</label>
            <input id="startDate" type="date" formControlName="startDate" />
            @if (f['startDate'].invalid && f['startDate'].touched) {
              <span class="field-error">Start date is required</span>
            }
          </div>
          <div class="form-group">
            <label for="endDate">End Date</label>
            <input id="endDate" type="date" formControlName="endDate" />
          </div>
        </div>
        @if (form.hasError('dateRange') && (f['startDate'].touched || f['endDate'].touched)) {
          <div class="field-error field-error-block">End date cannot be before start date</div>
        }

        @if (!batch) {
          <div class="form-group">
            <label for="schedule">Schedule</label>
            <input id="schedule" formControlName="schedule" placeholder="e.g. Mon/Wed/Fri 10am–12pm" />
          </div>
        } @else {
          <div class="form-group">
            <div class="field-label-row">
              <label>Schedule</label>
              <a class="schedule-link" [routerLink]="scheduleRoute()">Manage schedules</a>
            </div>
            <div class="schedule-readonly" [class.schedule-readonly--muted]="!structuredSchedules().length || scheduleLoading() || scheduleError()">
              {{ scheduleSummary() }}
            </div>
          </div>
        }

        <div class="form-group">
          <label for="capacity">Capacity</label>
          <input id="capacity" type="number" formControlName="capacity" placeholder="Leave blank for unlimited" min="1" />
        </div>

        @if (auth.isSuperAdmin()) {
          <div class="form-group form-group-inline">
            <label class="toggle-label">
              <input type="checkbox" formControlName="isCentralProgramme" />
              <span>Head Office central programme</span>
            </label>
            <small class="text-muted">Only explicitly enrolled students may join, including students from other branches.</small>
          </div>
        }

        @if (batch) {
          <div class="form-group">
            <label for="teamsJoinUrl">Microsoft Teams recurring join link</label>
            <input id="teamsJoinUrl" type="url" formControlName="teamsJoinUrl" placeholder="https://teams.microsoft.com/l/meetup-join/..." />
            <small class="text-muted">Only students assigned to this batch can receive this link through Live Class.</small>
          </div>
        }

        @if (batch) {
          <div class="form-group form-group-inline">
            <label class="toggle-label">
              <input type="checkbox" formControlName="isActive" />
              <span>Active</span>
            </label>
          </div>
        }

        <div class="drawer-footer">
          <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="loading()">
            {{ loading() ? 'Saving…' : (batch ? 'Update Batch' : 'Create Batch') }}
          </button>
        </div>

      </form>
    </snt-drawer>
  `,
  styles: [`
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group-inline { display: flex; align-items: center; }
    .field-error-block { margin-top: -4px; margin-bottom: 8px; }
    .field-label-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .schedule-link { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-primary); text-decoration: none; white-space: nowrap; }
    .schedule-link:hover { text-decoration: underline; }
    .schedule-readonly {
      min-height: 38px;
      display: flex;
      align-items: center;
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-text);
      font-size: var(--font-size-sm);
      line-height: 1.4;
    }
    .schedule-readonly--muted { color: var(--color-text-muted); }
    .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; }
    .toggle-label input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    .drawer-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding-top: 16px; margin-top: 8px;
      border-top: 1px solid var(--color-border);
    }
    input:disabled { background: var(--color-bg); color: var(--color-text-muted); cursor: not-allowed; }
  `],
})
export class BatchFormComponent implements OnChanges, OnInit {
  @Input() open = false;
  @Input() batch: Batch | null = null;

  @Output() saved  = new EventEmitter<Batch>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb   = inject(FormBuilder);
  private readonly svc  = inject(BatchService);
  readonly auth = inject(AuthService);
  private readonly api  = inject(ApiService);
  private readonly scheduleSvc = inject(ScheduleService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading     = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly courses     = signal<CourseOption[]>([]);
  readonly branches    = signal<BranchOption[]>([]);
  readonly structuredSchedules = signal<BatchSchedule[]>([]);
  readonly scheduleLoading = signal(false);
  readonly scheduleError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name:      ['', Validators.required],
    courseId:  [0, [Validators.required, Validators.min(1)]],
    branchId:  [0, [Validators.required, Validators.min(1)]],
    startDate: ['', Validators.required],
    endDate:   [''],
    schedule:  [''],
    teamsJoinUrl: [''],
    isCentralProgramme: [false],
    capacity:  [null as number | null],
    isActive:  [true],
  }, { validators: dateRangeValidator });

  get f() { return this.form.controls; }

  ngOnInit(): void {
    this.api.get<CourseOption[]>('/courses').subscribe({
      next: (c) => this.courses.set(c),
      error: () => {},
    });
    if (this.auth.isSuperAdmin()) {
      this.api.get<BranchOption[]>('/branches').subscribe({
        next: (branches) => this.branches.set(branches),
        error: () => {},
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['batch'] && this.batch) {
      this.form.patchValue({
        name:      this.batch.name,
        courseId:  this.batch.course.id,
        schedule:  this.batch.schedule ?? '',
        teamsJoinUrl: this.batch.teamsJoinUrl ?? '',
        isCentralProgramme: this.batch.isCentralProgramme,
        capacity:  this.batch.capacity,
        endDate:   this.batch.endDate ? this.batch.endDate.substring(0, 10) : '',
        isActive:  this.batch.isActive,
        startDate: this.batch.startDate.substring(0, 10),
      });
      this.serverError.set(null);
      this.loadStructuredSchedules(this.batch.id);
    }
    if (changes['open'] && this.open && !this.batch) {
      this.form.reset({ isActive: true, courseId: 0, branchId: 0 });
      this.serverError.set(null);
      this.structuredSchedules.set([]);
      this.scheduleError.set(null);
      this.scheduleLoading.set(false);
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    const call$ = this.batch
      ? this.svc.update(this.batch.id, {
          name:      v.name,
          teamsJoinUrl: v.teamsJoinUrl || null,
          isCentralProgramme: v.isCentralProgramme,
          capacity:  v.capacity ?? undefined,
          startDate: v.startDate,
          endDate:   v.endDate || undefined,
          isActive:  v.isActive,
        })
      : (() => {
          const branchId = this.auth.isSuperAdmin() ? Number(v.branchId) : Number(this.auth.branchId());
          if (!branchId) {
            this.serverError.set('Branch context is missing. Please re-login.');
            this.loading.set(false);
            return null;
          }
          const payload = {
            name:      v.name,
            courseId:  Number(v.courseId),
            branchId,
            startDate: v.startDate,
            endDate:   v.endDate || undefined,
            schedule:  v.schedule || undefined,
            isCentralProgramme: v.isCentralProgramme,
            capacity:  v.capacity ?? undefined,
          };
          console.log('REQUEST PAYLOAD (batch create):', payload);
          return this.svc.create(payload);
        })();

    if (!call$) return;
    call$.subscribe({
      next: (result) => { this.loading.set(false); this.saved.emit(result); },
      error: (e: Error) => { this.serverError.set(e.message || 'Something went wrong'); this.loading.set(false); },
    });
  }

  scheduleRoute(): string {
    return this.auth.isHoUser() ? '/ho/schedules' : '/branch/schedules';
  }

  scheduleSummary(): string {
    if (this.scheduleLoading()) return 'Loading schedules...';
    if (this.scheduleError()) return this.scheduleError() ?? 'Could not load schedules';

    const schedules = this.structuredSchedules();
    if (!schedules.length) return 'No structured schedule set';

    return schedules.map((slot) => this.formatScheduleSlot(slot)).join('; ');
  }

  private loadStructuredSchedules(batchId: number): void {
    this.scheduleLoading.set(true);
    this.scheduleError.set(null);
    this.structuredSchedules.set([]);

    this.scheduleSvc.getByBatch(batchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (schedules) => {
          this.structuredSchedules.set(schedules);
          this.scheduleLoading.set(false);
        },
        error: (error: Error) => {
          this.scheduleError.set(error.message || 'Could not load schedules');
          this.scheduleLoading.set(false);
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
}
