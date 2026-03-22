import {
  Component, Input, Output, EventEmitter,
  inject, signal, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, DestroyRef, OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApplicationService, InterviewService } from '../placements/placement.service';
import { Interview } from '../placements/placement.models';
import { StudentService } from '../students/student.service';
import { Student } from '../students/student.models';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';

@Component({
  selector: 'snt-application-form',
  standalone: true,
  imports: [FormsModule, SlicePipe, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      title="Add Application"
      subtitle="Link a student to an interview round"
      (closed)="cancel.emit()"
    >
      <div class="form-body">
        <div class="field">
          <label class="field-label">Interview <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="interviewId">
            <option [ngValue]="null">Select interview…</option>
            @for (i of interviews(); track i.id) {
              <option [ngValue]="i.id">{{ i.jobOpening.company.name }} — {{ i.jobOpening.title }} ({{ i.interviewDate | slice:0:10 }})</option>
            }
          </select>
        </div>

        <div class="field">
          <label class="field-label">Student Search <span class="req">*</span></label>
          <input
            class="field-input"
            type="search"
            placeholder="Type student name…"
            [(ngModel)]="studentSearch"
            (ngModelChange)="onStudentSearch()"
          />
          @if (studentResults().length) {
            <div class="student-dropdown">
              @for (s of studentResults(); track s.id) {
                <button class="student-option" (click)="selectStudent(s)">
                  <span class="student-name">{{ s.fullName }}</span>
                  <span class="student-meta">{{ s.mobile }} · {{ s.course }}</span>
                </button>
              }
            </div>
          }
          @if (selectedStudent()) {
            <div class="selected-student">
              <span class="selected-label">Selected:</span>
              <span class="selected-name">{{ selectedStudent()!.fullName }}</span>
              <button class="clear-btn" (click)="clearStudent()">✕</button>
            </div>
          }
        </div>

        <div class="field">
          <label class="field-label">Remarks</label>
          <input class="field-input" type="text" placeholder="Optional notes" [(ngModel)]="remarks" />
        </div>

        @if (error()) {
          <p class="err-msg">{{ error() }}</p>
        }

        <div class="form-actions">
          <button class="btn btn-secondary" (click)="cancel.emit()" [disabled]="saving()">Cancel</button>
          <button class="btn btn-primary" (click)="submit()" [disabled]="saving() || !interviewId || !selectedStudent()">
            {{ saving() ? 'Applying…' : 'Add Application' }}
          </button>
        </div>
      </div>
    </snt-drawer>
  `,
  styles: [`
    .form-body { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; position: relative; }
    .field-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .req { color: var(--color-danger); }
    .field-input {
      padding: 8px 12px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none;
    }
    .field-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .student-dropdown {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
      max-height: 200px; overflow-y: auto;
    }
    .student-option {
      display: flex; flex-direction: column; gap: 2px;
      width: 100%; padding: 8px 12px; text-align: left;
      border-bottom: 1px solid var(--color-border);
    }
    .student-option:hover { background: var(--color-bg); }
    .student-name { font-size: var(--font-size-sm); font-weight: 600; }
    .student-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .selected-student {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; background: #d1fae5; border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }
    .selected-label { color: #065f46; font-weight: 600; }
    .selected-name  { color: #065f46; flex: 1; }
    .clear-btn { color: #065f46; font-size: 12px; }
    .err-msg { font-size: var(--font-size-sm); color: var(--color-danger); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
  `],
})
export class ApplicationFormComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Output() saved  = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private readonly appSvc     = inject(ApplicationService);
  private readonly intSvc     = inject(InterviewService);
  private readonly stuSvc     = inject(StudentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving          = signal(false);
  readonly error           = signal<string | null>(null);
  readonly interviews      = signal<Interview[]>([]);
  readonly studentResults  = signal<Student[]>([]);
  readonly selectedStudent = signal<Student | null>(null);

  interviewId: number | null = null;
  studentSearch = '';
  remarks = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.intSvc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (i) => this.interviews.set(i), error: () => {} });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.error.set(null);
      this.interviewId = null; this.studentSearch = ''; this.remarks = '';
      this.selectedStudent.set(null); this.studentResults.set([]);
    }
  }

  onStudentSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const term = this.studentSearch.trim();
    if (term.length < 2) { this.studentResults.set([]); return; }
    this.searchTimer = setTimeout(() => {
      this.stuSvc.list({ search: term })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (s) => this.studentResults.set(s.slice(0, 8)), error: () => {} });
    }, 300);
  }

  selectStudent(s: Student): void {
    this.selectedStudent.set(s);
    this.studentSearch = '';
    this.studentResults.set([]);
  }

  clearStudent(): void {
    this.selectedStudent.set(null);
  }

  submit(): void {
    const student = this.selectedStudent();
    if (!this.interviewId || !student) return;
    this.saving.set(true);
    this.error.set(null);
    this.appSvc.apply({
      interviewId: this.interviewId,
      studentId:   student.id,
      ...(this.remarks && { remarks: this.remarks.trim() }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.saving.set(false); this.saved.emit(); },
        error: (e: Error) => {
          this.saving.set(false);
          this.error.set(e.message.includes('DUPLICATE') ? 'Student already applied to this interview.' : e.message);
        },
      });
  }
}
