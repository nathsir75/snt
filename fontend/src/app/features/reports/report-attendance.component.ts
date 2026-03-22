import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReportService } from './report.service';
import { AttendanceReport, AttendanceStat } from './report.models';
import { BatchService } from '../batches/batch.service';
import { Batch } from '../batches/batch.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';

type LoadState = 'idle' | 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-report-attendance',
  standalone: true,
  imports: [RouterLink, FormsModule, PageShellComponent, PageStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell title="Attendance Report" subtitle="Batch-wise attendance rates and student-level breakdown" icon="✅">
      <ng-container slot="actions">
        <a routerLink="/reports" class="btn btn-ghost">← Reports</a>
        @if (state() === 'ready') {
          <button class="btn btn-secondary" (click)="exportCsv()">⬇ Export CSV</button>
        }
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <select class="filter-select" [(ngModel)]="selectedBatchId" (ngModelChange)="onBatchChange()">
            <option [ngValue]="null">Select a batch…</option>
            @for (b of batches(); track b.id) {
              <option [ngValue]="b.id">{{ b.name }}</option>
            }
          </select>
          @if (searchTerm || minPct !== null) {
            <button class="btn btn-ghost btn-sm" (click)="clearFilters()">Clear filters</button>
          }
        </div>
      </ng-container>

      @switch (state()) {
        @case ('idle') {
          <snt-page-state type="empty" title="Select a batch" description="Choose a batch above to view its attendance report." />
        }
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="loadReport()" /> }
        @case ('ready') {
          @if (report(); as r) {
            <div class="kpi-strip">
              <div class="kpi-card">
                <span class="kpi-value">{{ r.batchName }}</span>
                <span class="kpi-label">Batch</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ r.attendanceStats.length }}</span>
                <span class="kpi-label">Students with Records</span>
              </div>
              <div class="kpi-card kpi-card-green">
                <span class="kpi-value">{{ avgAttendance(r) }}%</span>
                <span class="kpi-label">Avg Attendance</span>
              </div>
              <div class="kpi-card kpi-card-red">
                <span class="kpi-value">{{ belowThreshold(r) }}</span>
                <span class="kpi-label">Below 75%</span>
              </div>
            </div>

            <!-- Inline search -->
            <div class="inline-filter">
              <input class="search-input" type="search" placeholder="Search student…" [(ngModel)]="searchTerm" />
            </div>

            @if (!filteredStats().length) {
              <snt-page-state type="empty" title="No matching students" [compact]="true" />
            } @else {
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Leave</th>
                      <th>Attendance %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of filteredStats(); track s.studentId) {
                      <tr>
                        <td class="font-medium">{{ s.fullName }}</td>
                        <td class="text-success">{{ s.present }}</td>
                        <td class="text-danger">{{ s.absent }}</td>
                        <td class="text-warning">{{ s.leave }}</td>
                        <td>
                          <div class="pct-bar-wrap">
                            <div class="pct-bar" [style.width.%]="s.percentage" [class.pct-bar-low]="s.percentage < 75"></div>
                            <span class="pct-label">{{ s.percentage }}%</span>
                          </div>
                        </td>
                        <td>
                          <snt-badge
                            [label]="s.percentage >= 75 ? 'Good' : 'Low'"
                            [variant]="s.percentage >= 75 ? 'success' : 'danger'"
                          />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .filter-select { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; cursor: pointer; min-width: 220px; }
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .kpi-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .kpi-card-green { border-color: #6ee7b7; background: #f0fdf4; }
    .kpi-card-red   { border-color: #fca5a5; background: #fef2f2; }
    .kpi-value { font-size: 20px; font-weight: 800; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .inline-filter { display: flex; }
    .search-input { padding: 7px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; width: 260px; }
    .search-input:focus { border-color: var(--color-primary); }
    .pct-bar-wrap { display: flex; align-items: center; gap: 8px; }
    .pct-bar { height: 8px; border-radius: 999px; background: #10b981; min-width: 4px; max-width: 80px; }
    .pct-bar-low { background: #ef4444; }
    .pct-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text); white-space: nowrap; }
    .text-success { color: #059669; font-weight: 600; }
    .text-danger  { color: #dc2626; font-weight: 600; }
    .text-warning { color: #d97706; font-weight: 600; }
    .font-medium { font-weight: 600; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
  `],
})
export class ReportAttendanceComponent implements OnInit {
  private readonly svc        = inject(ReportService);
  private readonly batchSvc   = inject(BatchService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state   = signal<LoadState>('idle');
  readonly batches = signal<Batch[]>([]);
  readonly report  = signal<AttendanceReport | null>(null);

  selectedBatchId: number | null = null;
  searchTerm = '';
  minPct: number | null = null;

  readonly filteredStats = computed(() => {
    const r = this.report();
    if (!r) return [];
    const term = this.searchTerm.toLowerCase().trim();
    return r.attendanceStats.filter((s) =>
      !term || s.fullName.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.batchSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (b) => this.batches.set(b), error: () => {} });
  }

  onBatchChange(): void {
    if (this.selectedBatchId) this.loadReport();
    else { this.report.set(null); this.state.set('idle'); }
  }

  loadReport(): void {
    if (!this.selectedBatchId) return;
    this.state.set('loading');
    this.svc.getAttendanceReport(this.selectedBatchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => { this.report.set(r); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }

  avgAttendance(r: AttendanceReport): number {
    if (!r.attendanceStats.length) return 0;
    return Math.round(r.attendanceStats.reduce((s, a) => s + a.percentage, 0) / r.attendanceStats.length);
  }

  belowThreshold(r: AttendanceReport): number {
    return r.attendanceStats.filter((s) => s.percentage < 75).length;
  }

  clearFilters(): void { this.searchTerm = ''; this.minPct = null; }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;
    const rows = [
      ['Student', 'Present', 'Absent', 'Leave', 'Attendance %'],
      ...r.attendanceStats.map((s) => [s.fullName, s.present, s.absent, s.leave, s.percentage + '%']),
    ];
    const csv = rows.map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `attendance-${r.batchName}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
}
