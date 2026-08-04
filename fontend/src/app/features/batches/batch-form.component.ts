import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal, OnInit,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { BatchService } from './batch.service';
import { Batch } from './batch.models';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';

interface CourseOption { id: number; name: string; code: string; }

@Component({
  selector: 'snt-batch-form',
  standalone: true,
  imports: [ReactiveFormsModule, DrawerComponent],
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
            <input id="startDate" type="date" formControlName="startDate" [attr.disabled]="batch ? true : null" />
            @if (f['startDate'].invalid && f['startDate'].touched) {
              <span class="field-error">Start date is required</span>
            }
          </div>
          <div class="form-group">
            <label for="endDate">End Date</label>
            <input id="endDate" type="date" formControlName="endDate" />
          </div>
        </div>

        <div class="form-group">
          <label for="schedule">Schedule</label>
          <input id="schedule" formControlName="schedule" placeholder="e.g. Mon/Wed/Fri 10am–12pm" />
        </div>

        <div class="form-group">
          <label for="capacity">Capacity</label>
          <input id="capacity" type="number" formControlName="capacity" placeholder="Leave blank for unlimited" min="1" />
        </div>

        <div class="form-group form-group-inline">
          <label class="toggle-label">
            <input type="checkbox" formControlName="isCentralProgramme" />
            <span>Head Office central programme</span>
          </label>
        </div>

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
  private readonly auth = inject(AuthService);
  private readonly api  = inject(ApiService);

  readonly loading     = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly courses     = signal<CourseOption[]>([]);

  readonly form = this.fb.nonNullable.group({
    name:      ['', Validators.required],
    courseId:  [0, [Validators.required, Validators.min(1)]],
    startDate: ['', Validators.required],
    endDate:   [''],
    schedule:  [''],
    capacity:  [null as number | null],
    isActive:  [true],
    isCentralProgramme: [false],
  });

  get f() { return this.form.controls; }

  ngOnInit(): void {
    this.api.get<CourseOption[]>('/courses').subscribe({
      next: (c) => this.courses.set(c),
      error: () => {},
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['batch'] && this.batch) {
      this.form.patchValue({
        name:      this.batch.name,
        schedule:  this.batch.schedule ?? '',
        capacity:  this.batch.capacity,
        endDate:   this.batch.endDate ? this.batch.endDate.substring(0, 10) : '',
        isActive:  this.batch.isActive,
        isCentralProgramme: this.batch.isCentralProgramme,
        startDate: this.batch.startDate.substring(0, 10),
      });
    }
    if (changes['open'] && this.open && !this.batch) {
      this.form.reset({ isActive: true, isCentralProgramme: false, courseId: 0 });
      this.serverError.set(null);
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
          schedule:  v.schedule || undefined,
          capacity:  v.capacity ?? undefined,
          endDate:   v.endDate || undefined,
          isActive:  v.isActive,
          isCentralProgramme: v.isCentralProgramme,
        })
      : (() => {
          const branchId = Number(this.auth.branchId());
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
            capacity:  v.capacity ?? undefined,
            isCentralProgramme: v.isCentralProgramme,
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
}
