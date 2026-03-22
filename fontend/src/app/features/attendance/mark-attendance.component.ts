import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from './attendance.service';
import { BatchStudentService } from '../batches/batch-student.service';
import { AttendanceStatus, MarkAttendanceResult } from './attendance.models';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { DatePipe } from '@angular/common';

interface AttendanceRow {
  studentId: number;
  fullName: string;
  status: AttendanceStatus;
  remarks: string;
}

@Component({
  selector: 'snt-mark-attendance',
  standalone: true,
  imports: [FormsModule, DrawerComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      title="Mark Attendance"
      [subtitle]="batchName ? batchName + ' · ' + (attendanceDate | date:'dd MMM yyyy') : ''"
      [wide]="true"
      (closed)="cancel.emit()"
    >
      @if (serverError()) {
        <div class="form-error-banner">{{ serverError() }}</div>
      }

      @if (loadingStudents()) {
        <p class="loading-text">Loading students…</p>
      } @else if (!rows().length) {
        <p class="empty-text">No students assigned to this batch yet.</p>
      } @else {
        <div class="date-row">
          <label for="attDate">Attendance Date *</label>
          <input id="attDate" type="date" [(ngModel)]="attendanceDate" class="date-input" />
        </div>

        <div class="quick-actions">
          <button type="button" class="btn btn-ghost btn-sm" (click)="markAll('present')">✅ All Present</button>
          <button type="button" class="btn btn-ghost btn-sm" (click)="markAll('absent')">❌ All Absent</button>
          <span class="summary-pill">
            {{ presentCount() }} present · {{ absentCount() }} absent · {{ leaveCount() }} leave
          </span>
        </div>

        <div class="attendance-list">
          @for (row of rows(); track row.studentId) {
            <div class="att-row">
              <div class="att-student">
                <span class="att-avatar">{{ row.fullName.charAt(0).toUpperCase() }}</span>
                <span class="att-name">{{ row.fullName }}</span>
              </div>
              <div class="att-status-group">
                <label class="status-btn" [class.status-btn-present]="row.status === 'present'">
                  <input type="radio" [name]="'status_' + row.studentId" value="present" [(ngModel)]="row.status" />
                  Present
                </label>
                <label class="status-btn" [class.status-btn-absent]="row.status === 'absent'">
                  <input type="radio" [name]="'status_' + row.studentId" value="absent" [(ngModel)]="row.status" />
                  Absent
                </label>
                <label class="status-btn" [class.status-btn-leave]="row.status === 'leave'">
                  <input type="radio" [name]="'status_' + row.studentId" value="leave" [(ngModel)]="row.status" />
                  Leave
                </label>
              </div>
              <input
                class="remarks-input"
                type="text"
                [(ngModel)]="row.remarks"
                placeholder="Remarks (optional)"
              />
            </div>
          }
        </div>

        <div class="drawer-footer">
          <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="btn btn-primary" [disabled]="loading() || !attendanceDate" (click)="submit()">
            {{ loading() ? 'Saving…' : 'Save Attendance' }}
          </button>
        </div>
      }
    </snt-drawer>
  `,
  styles: [`
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    .loading-text, .empty-text { font-size: var(--font-size-sm); color: var(--color-text-muted); padding: 8px 0; }
    .date-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .date-row label { font-size: var(--font-size-sm); font-weight: 600; white-space: nowrap; }
    .date-input {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none;
    }
    .date-input:focus { border-color: var(--color-primary); }
    .quick-actions { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .summary-pill {
      margin-left: auto; font-size: var(--font-size-xs); color: var(--color-text-muted);
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: 999px; padding: 3px 10px;
    }
    .attendance-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .att-row {
      display: grid; grid-template-columns: 1fr auto 180px; gap: 12px; align-items: center;
      padding: 10px 14px; background: var(--color-bg);
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
    }
    .att-student { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .att-avatar {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      background: #dbeafe; color: #1e40af;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .att-name { font-size: var(--font-size-sm); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .att-status-group { display: flex; gap: 4px; }
    .status-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: var(--radius-md);
      font-size: var(--font-size-xs); font-weight: 500; cursor: pointer;
      border: 1px solid var(--color-border); background: var(--color-surface);
      transition: all .12s;
    }
    .status-btn input[type=radio] { display: none; }
    .status-btn-present { background: #d1fae5; border-color: #6ee7b7; color: #065f46; }
    .status-btn-absent  { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
    .status-btn-leave   { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
    .remarks-input {
      padding: 5px 8px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-xs);
      background: var(--color-surface); outline: none; width: 100%;
    }
    .remarks-input:focus { border-color: var(--color-primary); }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .drawer-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding-top: 16px; border-top: 1px solid var(--color-border);
    }
  `],
})
export class MarkAttendanceComponent implements OnChanges {
  @Input() open = false;
  @Input() batchId: number | null = null;
  @Input() batchName: string | null = null;

  @Output() marked = new EventEmitter<MarkAttendanceResult>();
  @Output() cancel = new EventEmitter<void>();

  private readonly svc        = inject(AttendanceService);
  private readonly batchStuSvc = inject(BatchStudentService);

  readonly loading        = signal(false);
  readonly loadingStudents = signal(false);
  readonly serverError    = signal<string | null>(null);
  readonly rows           = signal<AttendanceRow[]>([]);

  attendanceDate = new Date().toISOString().substring(0, 10);

  presentCount() { return this.rows().filter((r) => r.status === 'present').length; }
  absentCount()  { return this.rows().filter((r) => r.status === 'absent').length; }
  leaveCount()   { return this.rows().filter((r) => r.status === 'leave').length; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.batchId) {
      this.serverError.set(null);
      this.attendanceDate = new Date().toISOString().substring(0, 10);
      this.loadStudents();
    }
  }

  private loadStudents(): void {
    if (!this.batchId) return;
    this.loadingStudents.set(true);
    this.batchStuSvc.getByBatch(this.batchId).subscribe({
      next: (assignments) => {
        this.rows.set(
          assignments
            .filter((a) => a.status === 'active')
            .map((a) => ({
              studentId: a.student.id,
              fullName:  a.student.fullName,
              status:    'present' as AttendanceStatus,
              remarks:   '',
            }))
        );
        this.loadingStudents.set(false);
      },
      error: () => { this.loadingStudents.set(false); },
    });
  }

  markAll(status: AttendanceStatus): void {
    this.rows.update((list) => list.map((r) => ({ ...r, status })));
  }

  submit(): void {
    if (!this.batchId || !this.attendanceDate) return;

    this.loading.set(true);
    this.serverError.set(null);

    const entries = this.rows().map((r) => ({
      studentId: r.studentId,
      status:    r.status,
      remarks:   r.remarks || undefined,
    }));

    this.svc.markAttendance(this.batchId, this.attendanceDate, entries).subscribe({
      next: (result) => { this.loading.set(false); this.marked.emit(result); },
      error: (e: Error) => { this.serverError.set(e.message); this.loading.set(false); },
    });
  }
}
