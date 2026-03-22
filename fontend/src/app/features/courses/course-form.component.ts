import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { CourseService } from './course.service';
import { Course } from './course.models';

@Component({
  selector: 'snt-course-form',
  standalone: true,
  imports: [ReactiveFormsModule, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      [title]="course ? 'Edit Course' : 'Create Course'"
      [subtitle]="course ? 'Update course details or toggle availability' : 'Define a new course for all branches'"
      (closed)="cancel.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()">

        @if (serverError()) {
          <div class="form-error-banner">{{ serverError() }}</div>
        }

        <div class="form-row">
          <div class="form-group">
            <label for="name">Course Name *</label>
            <input id="name" formControlName="name" placeholder="e.g. Full Stack Development" />
            @if (f['name'].invalid && f['name'].touched) {
              <span class="field-error">Course name is required</span>
            }
          </div>
          <div class="form-group">
            <label for="code">Course Code *</label>
            <input id="code" formControlName="code" placeholder="e.g. FSD-101" />
            @if (f['code'].invalid && f['code'].touched) {
              <span class="field-error">Course code is required</span>
            }
          </div>
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" formControlName="description" rows="3"
            placeholder="Brief overview of what this course covers…"></textarea>
        </div>

        <div class="form-group">
          <label for="durationMonths">Duration (months) *</label>
          <input id="durationMonths" type="number" formControlName="durationMonths"
            placeholder="e.g. 6" min="1" />
          @if (f['durationMonths'].invalid && f['durationMonths'].touched) {
            <span class="field-error">Duration must be at least 1 month</span>
          }
        </div>

        @if (course) {
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" formControlName="isActive" />
              <span>Active (visible to branches)</span>
            </label>
          </div>
        }

        <div class="drawer-footer">
          <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="loading()">
            {{ loading() ? 'Saving…' : (course ? 'Update Course' : 'Create Course') }}
          </button>
        </div>

      </form>
    </snt-drawer>
  `,
  styles: [`
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
    textarea { resize: vertical; min-height: 80px; }
  `],
})
export class CourseFormComponent implements OnChanges {
  @Input() open = false;
  @Input() course: Course | null = null;

  @Output() saved  = new EventEmitter<Course>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(CourseService);

  readonly loading     = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name:           ['', Validators.required],
    code:           ['', Validators.required],
    description:    [''],
    durationMonths: [1, [Validators.required, Validators.min(1)]],
    isActive:       [true],
  });

  get f() { return this.form.controls; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['course'] && this.course) {
      this.form.patchValue({
        name:           this.course.name,
        code:           this.course.code,
        description:    this.course.description ?? '',
        durationMonths: this.course.durationMonths,
        isActive:       this.course.isActive,
      });
    }
    if (changes['open'] && this.open && !this.course) {
      this.form.reset({ durationMonths: 1, isActive: true });
      this.serverError.set(null);
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    const call$ = this.course
      ? this.svc.update(this.course.id, {
          name:           v.name,
          code:           v.code,
          description:    v.description || undefined,
          durationMonths: Number(v.durationMonths),
          isActive:       v.isActive,
        })
      : this.svc.create({
          name:           v.name,
          code:           v.code,
          description:    v.description || undefined,
          durationMonths: Number(v.durationMonths),
        });

    call$.subscribe({
      next:  (c) => { this.loading.set(false); this.saved.emit(c); },
      error: (e: Error) => { this.serverError.set(e.message); this.loading.set(false); },
    });
  }
}
