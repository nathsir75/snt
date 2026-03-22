import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TeacherService, TeacherBatch, AttendanceEntry } from '../teacher.service';

interface StudentRow {
  studentId: number;
  fullName: string;
  status: 'present' | 'absent' | 'leave';
  remarks: string;
}

@Component({
  selector: 'snt-teacher-attendance',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>Attendance</h1><p>Mark attendance for your batches</p></div>
    </div>

    <!-- Controls -->
    <div class="attendance-controls card">
      <div class="form-group" style="margin:0; flex:1">
        <label>Batch</label>
        <select [(ngModel)]="selectedBatchId" (ngModelChange)="onBatchChange($event)">
          <option [value]="null" disabled>Select a batch</option>
          @for (b of batches(); track b.id) {
            <option [value]="b.id">{{ b.name }}</option>
          }
        </select>
      </div>
      <div class="form-group" style="margin:0; flex:1">
        <label>Date</label>
        <input type="date" [(ngModel)]="selectedDate" (ngModelChange)="loadAttendance()" [max]="today" />
      </div>
      <div class="attendance-controls__bulk">
        <button class="btn btn-secondary" (click)="markAll('present')">All Present</button>
        <button class="btn btn-secondary" (click)="markAll('absent')">All Absent</button>
      </div>
    </div>

    @if (loadingStudents()) {
      <div class="page-state">Loading students…</div>
    } @else if (rows().length === 0 && selectedBatchId) {
      <div class="page-state">No students in this batch.</div>
    } @else if (rows().length > 0) {
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>#</th><th>Student</th><th>Status</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.studentId; let i = $index) {
              <tr [class.row--present]="row.status === 'present'" [class.row--absent]="row.status === 'absent'">
                <td>{{ i + 1 }}</td>
                <td>{{ row.fullName }}</td>
                <td>
                  <div class="status-toggle">
                    @for (s of statuses; track s) {
                      <button
                        class="status-btn"
                        [class.status-btn--active]="row.status === s"
                        [attr.data-status]="s"
                        (click)="setStatus(row, s)"
                      >{{ s }}</button>
                    }
                  </div>
                </td>
                <td>
                  <input class="remarks-input" type="text" [(ngModel)]="row.remarks" placeholder="Optional" />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="attendance-footer">
        <div class="attendance-footer__summary">
          <span class="badge badge-success">Present: {{ countStatus('present') }}</span>
          <span class="badge badge-danger">Absent: {{ countStatus('absent') }}</span>
          <span class="badge badge-warning">Leave: {{ countStatus('leave') }}</span>
        </div>
        <button class="btn btn-primary" [disabled]="submitting()" (click)="submit()">
          {{ submitting() ? 'Saving…' : 'Save Attendance' }}
        </button>
      </div>

      @if (submitSuccess()) {
        <div class="alert-success">Attendance saved successfully.</div>
      }
      @if (submitError()) {
        <div class="alert-error">{{ submitError() }}</div>
      }
    }
  `,
  styles: [`
    .attendance-controls {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .attendance-controls__bulk { display: flex; gap: 8px; align-items: flex-end; padding-bottom: 2px; }
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .status-toggle { display: flex; gap: 4px; }
    .status-btn {
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      font-size: var(--font-size-xs);
      font-weight: 600;
      text-transform: capitalize;
      cursor: pointer;
      background: var(--color-bg);
      transition: all .12s;
      &[data-status="present"].status-btn--active { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
      &[data-status="absent"].status-btn--active  { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
      &[data-status="leave"].status-btn--active   { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    }
    .remarks-input { width: 100%; padding: 4px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .row--present td:first-child { border-left: 3px solid #10b981; }
    .row--absent  td:first-child { border-left: 3px solid #ef4444; }
    .attendance-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; flex-wrap: wrap; gap: 12px; }
    .attendance-footer__summary { display: flex; gap: 8px; }
    .alert-success { margin-top: 12px; padding: 10px 16px; background: #d1fae5; color: #065f46; border-radius: var(--radius-md); font-size: var(--font-size-sm); }
    .alert-error   { margin-top: 12px; padding: 10px 16px; background: #fee2e2; color: #991b1b; border-radius: var(--radius-md); font-size: var(--font-size-sm); }
  `],
})
export class TeacherAttendanceComponent implements OnInit {
  private readonly teacherSvc = inject(TeacherService);
  private readonly route      = inject(ActivatedRoute);

  readonly statuses = ['present', 'absent', 'leave'] as const;
  readonly today    = new Date().toISOString().split('T')[0];

  readonly batches        = signal<TeacherBatch[]>([]);
  readonly rows           = signal<StudentRow[]>([]);
  readonly loadingStudents = signal(false);
  readonly submitting     = signal(false);
  readonly submitSuccess  = signal(false);
  readonly submitError    = signal<string | null>(null);

  selectedBatchId: number | null = null;
  selectedDate = this.today;

  ngOnInit(): void {
    this.teacherSvc.getMyBatches().subscribe({
      next: (data) => {
        this.batches.set(data);
        const qBatchId = this.route.snapshot.queryParamMap.get('batchId');
        if (qBatchId) {
          this.selectedBatchId = parseInt(qBatchId);
          this.loadStudents(this.selectedBatchId);
        }
      },
    });
  }

  onBatchChange(batchId: number): void {
    this.selectedBatchId = batchId;
    this.loadStudents(batchId);
  }

  loadAttendance(): void {
    if (this.selectedBatchId) this.loadStudents(this.selectedBatchId);
  }

  private loadStudents(batchId: number): void {
    this.loadingStudents.set(true);
    this.rows.set([]);
    this.teacherSvc.getStudentsByBatch(batchId).subscribe({
      next: (students) => {
        // Pre-fill with today's existing attendance if available
        this.teacherSvc.getAttendanceByBatch(batchId, this.selectedDate).subscribe({
          next: (existing) => {
            const existingMap = new Map(existing.map((e: any) => [e.student.id, e]));
            this.rows.set(students.map((s) => {
              const ex = existingMap.get(s.student.id) as any;
              return {
                studentId: s.student.id,
                fullName:  s.student.fullName,
                status:    ex?.status ?? 'present',
                remarks:   ex?.remarks ?? '',
              };
            }));
            this.loadingStudents.set(false);
          },
          error: () => {
            this.rows.set(students.map((s) => ({ studentId: s.student.id, fullName: s.student.fullName, status: 'present' as const, remarks: '' })));
            this.loadingStudents.set(false);
          },
        });
      },
      error: () => this.loadingStudents.set(false),
    });
  }

  markAll(status: 'present' | 'absent' | 'leave'): void {
    this.rows.update((rows) => rows.map((r) => ({ ...r, status })));
  }

  setStatus(row: StudentRow, status: 'present' | 'absent' | 'leave'): void {
    this.rows.update((rows) => rows.map((r) => r.studentId === row.studentId ? { ...r, status } : r));
  }

  countStatus(status: string): number {
    return this.rows().filter((r) => r.status === status).length;
  }

  submit(): void {
    if (!this.selectedBatchId) return;
    this.submitting.set(true);
    this.submitSuccess.set(false);
    this.submitError.set(null);

    const entries: AttendanceEntry[] = this.rows().map((r) => ({
      studentId: r.studentId,
      status:    r.status,
      remarks:   r.remarks || undefined,
    }));

    this.teacherSvc.markAttendance(this.selectedBatchId, this.selectedDate, entries).subscribe({
      next:  () => { this.submitting.set(false); this.submitSuccess.set(true); },
      error: (err) => { this.submitting.set(false); this.submitError.set(err.message); },
    });
  }
}
