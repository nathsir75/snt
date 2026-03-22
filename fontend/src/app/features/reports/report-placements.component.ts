import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { PlacementService } from '../placements/placement.service';
import { Placement, PlacementSummary, PLACEMENT_STATUS_LABELS, PlacementStatus } from '../placements/placement.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-report-placements',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, CurrencyPipe, DecimalPipe, PageShellComponent, PageStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell title="Placements Report" subtitle="Placement outcomes, company-wise stats and salary packages" icon="🏆">
      <ng-container slot="actions">
        <a routerLink="/reports" class="btn btn-ghost">← Reports</a>
        <button class="btn btn-secondary" (click)="exportCsv()">⬇ Export CSV</button>
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Status</option>
            <option value="offered">Offered</option>
            <option value="joined">Joined</option>
            <option value="rejected">Rejected</option>
          </select>
          @if (statusFilter) {
            <button class="btn btn-ghost btn-sm" (click)="statusFilter = ''; page.set(1)">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} record{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (summary(); as s) {
            <div class="kpi-strip">
              <div class="kpi-card">
                <span class="kpi-value">{{ s.totalPlaced }}</span>
                <span class="kpi-label">Total Placed</span>
              </div>
              <div class="kpi-card kpi-card-green">
                <span class="kpi-value">{{ s.joined }}</span>
                <span class="kpi-label">Joined</span>
              </div>
              <div class="kpi-card kpi-card-amber">
                <span class="kpi-value">{{ s.offers }}</span>
                <span class="kpi-label">Offers Pending</span>
              </div>
              <div class="kpi-card kpi-card-red">
                <span class="kpi-value">{{ s.rejected }}</span>
                <span class="kpi-label">Rejected</span>
              </div>
              @if (s.avgSalary) {
                <div class="kpi-card">
                  <span class="kpi-value">₹{{ s.avgSalary | number:'1.1-1' }} LPA</span>
                  <span class="kpi-label">Avg Package</span>
                </div>
              }
            </div>
          }

          @if (!filtered().length) {
            <snt-page-state type="empty" title="No placement records" description="Placement data will appear here once recorded." />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Company</th>
                    <th>Job Title</th>
                    <th>Package</th>
                    <th>Joining Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of paginated(); track p.id) {
                    <tr>
                      <td class="font-medium">{{ p.student.fullName }}</td>
                      <td class="text-muted">{{ p.student.course }}</td>
                      <td class="font-medium">{{ p.company.name }}</td>
                      <td class="text-muted">{{ p.jobOpening?.title || '—' }}</td>
                      <td>
                        @if (p.salaryPackage) {
                          <span class="salary-chip">₹{{ p.salaryPackage }} LPA</span>
                        } @else { <span class="text-muted">—</span> }
                      </td>
                      <td class="text-muted">{{ p.joiningDate ? (p.joiningDate | date:'dd MMM yyyy') : '—' }}</td>
                      <td>
                        <snt-badge [label]="statusLabel(p.status)" [variant]="statusBadge(p.status)" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="btn btn-secondary btn-sm" [disabled]="page() === 1" (click)="page.set(page() - 1)">← Prev</button>
                <span class="pagination-info">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="btn btn-secondary btn-sm" [disabled]="page() === totalPages()" (click)="page.set(page() + 1)">Next →</button>
              </div>
            }
          }
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .filter-select { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; cursor: pointer; }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; }
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .kpi-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .kpi-card-green { border-color: #6ee7b7; background: #f0fdf4; }
    .kpi-card-amber { border-color: #fcd34d; background: #fffbeb; }
    .kpi-card-red   { border-color: #fca5a5; background: #fef2f2; }
    .kpi-value { font-size: 22px; font-weight: 800; color: var(--color-text); }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .salary-chip { font-size: var(--font-size-xs); font-weight: 700; color: #059669; background: #d1fae5; padding: 2px 8px; border-radius: 999px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .font-medium { font-weight: 600; }
  `],
})
export class ReportPlacementsComponent implements OnInit {
  private readonly svc        = inject(PlacementService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state   = signal<LoadState>('loading');
  readonly all     = signal<Placement[]>([]);
  readonly summary = signal<PlacementSummary | null>(null);
  readonly page    = signal(1);
  statusFilter = '';

  readonly filtered = computed(() => {
    const s = this.statusFilter;
    return this.all().filter((p) => !s || p.status === s);
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 15)));
  readonly paginated  = computed(() => this.filtered().slice((this.page() - 1) * 15, this.page() * 15));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => { this.all.set(d); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
    this.svc.getSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.summary.set(s), error: () => {} });
  }

  statusLabel(s: string): string { return PLACEMENT_STATUS_LABELS[s as PlacementStatus] ?? s; }
  statusBadge(s: string): BadgeVariant {
    const m: Record<string, BadgeVariant> = { offered: 'warning', joined: 'success', rejected: 'danger' };
    return m[s] ?? 'neutral';
  }

  exportCsv(): void {
    const rows = [
      ['Student', 'Course', 'Company', 'Job Title', 'Package (LPA)', 'Joining Date', 'Status'],
      ...this.all().map((p) => [
        p.student.fullName, p.student.course, p.company.name,
        p.jobOpening?.title ?? '', p.salaryPackage ?? '',
        p.joiningDate ?? '', p.status,
      ]),
    ];
    downloadCsv(rows, 'placements-report.csv');
  }
}

function downloadCsv(rows: (string | number)[][], filename: string): void {
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
