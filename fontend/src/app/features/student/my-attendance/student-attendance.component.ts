import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import { StudentService, MyAttendance } from '../student.service';

@Component({
  selector: 'snt-student-attendance',
  standalone: true,
  imports: [SlicePipe, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Attendance</h1><p>Your attendance record across all classes</p></div>
    </div>

    @if (loading()) {
      <div class="page-state">Loading attendance…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (data()) {

      <!-- Summary cards -->
      <div class="summary-row">
        <div class="summary-card summary-card--present">
          <span class="summary-card__value">{{ data()!.totalPresent }}</span>
          <span class="summary-card__label">Present</span>
        </div>
        <div class="summary-card summary-card--absent">
          <span class="summary-card__value">{{ data()!.totalAbsent }}</span>
          <span class="summary-card__label">Absent</span>
        </div>
        <div class="summary-card summary-card--leave">
          <span class="summary-card__value">{{ data()!.totalLeave }}</span>
          <span class="summary-card__label">Leave</span>
        </div>
        <div class="summary-card">
          <span class="summary-card__value">{{ attendancePercent() }}%</span>
          <span class="summary-card__label">Attendance</span>
        </div>
      </div>

      <!-- Records table -->
      @if (data()!.records.length === 0) {
        <div class="page-state">No attendance records yet.</div>
      } @else {
        <div class="table-wrapper card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Batch</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              @for (r of data()!.records; track r.id) {
                <tr>
                  <td>{{ r.attendanceDate | slice:0:10 }}</td>
                  <td>{{ r.batch.name }}</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="r.status === 'present'"
                      [class.badge-danger]="r.status === 'absent'"
                      [class.badge-neutral]="r.status === 'leave'"
                    >{{ r.status | uppercase }}</span>
                  </td>
                  <td class="text-muted text-sm">{{ r.remarks ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 4px; }
    .summary-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex; flex-direction: column; gap: 4px;
      box-shadow: var(--shadow-sm);
    }
    .summary-card__value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--layout-accent, #16a34a); }
    .summary-card__label { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .summary-card--present .summary-card__value { color: #16a34a; }
    .summary-card--absent  .summary-card__value { color: #dc2626; }
    .summary-card--leave   .summary-card__value { color: #d97706; }
    .table-wrapper { overflow-x: auto; }
  `],
})
export class StudentAttendanceComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly data    = signal<MyAttendance | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly attendancePercent = () => {
    const d = this.data();
    if (!d) return 0;
    const total = d.totalPresent + d.totalAbsent + d.totalLeave;
    return total > 0 ? Math.round((d.totalPresent / total) * 100) : 0;
  };

  ngOnInit(): void {
    this.studentSvc.getMyAttendance().subscribe({
      next:  (d) => { this.data.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(e.error?.error ?? 'Failed to load attendance'); this.loading.set(false); },
    });
  }
}
