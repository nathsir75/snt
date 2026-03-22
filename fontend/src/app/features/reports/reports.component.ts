import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ReportService } from './report.service';
import { BranchDashboard, OverallDashboard } from './report.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

type LoadState = 'loading' | 'error' | 'ready';

interface ReportCard {
  icon: string;
  title: string;
  description: string;
  route: string;
  color: string;
}

@Component({
  selector: 'snt-reports',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Reports & Analytics"
      subtitle="Operational reports and performance analytics across all modules"
      icon="📊"
    >
      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {

          <!-- KPI summary strip -->
          @if (branchData(); as b) {
            <div class="kpi-strip">
              <div class="kpi-card">
                <span class="kpi-value">{{ b.totalStudents }}</span>
                <span class="kpi-label">Total Students</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ b.activeBatches }}</span>
                <span class="kpi-label">Active Batches</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ b.totalEnquiries }}</span>
                <span class="kpi-label">Total Enquiries</span>
              </div>
              <div class="kpi-card kpi-card-green">
                <span class="kpi-value">{{ b.totalCollectedFees | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="kpi-label">Fees Collected</span>
              </div>
              <div class="kpi-card kpi-card-amber">
                <span class="kpi-value">{{ b.pendingFees | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="kpi-label">Pending Dues</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ b.attendanceToday.present }}</span>
                <span class="kpi-label">Present Today</span>
              </div>
            </div>
          }

          @if (overallData(); as o) {
            <div class="kpi-strip">
              <div class="kpi-card">
                <span class="kpi-value">{{ o.totalBranches }}</span>
                <span class="kpi-label">Branches</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ o.totalStudents }}</span>
                <span class="kpi-label">Total Students</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ o.totalEnquiries }}</span>
                <span class="kpi-label">Total Enquiries</span>
              </div>
              <div class="kpi-card kpi-card-green">
                <span class="kpi-value">{{ o.totalCollectedFees | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="kpi-label">Total Collected</span>
              </div>
              <div class="kpi-card kpi-card-amber">
                <span class="kpi-value">{{ o.pendingFees | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="kpi-label">Pending Dues</span>
              </div>
            </div>

            <!-- Branch-wise table for super_admin -->
            @if (o.branchWiseStats.length) {
              <div class="section-block">
                <p class="section-heading">Branch-wise Overview</p>
                <div class="table-wrapper">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>Students</th>
                        <th>Collections</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (b of o.branchWiseStats; track b.branchId) {
                        <tr>
                          <td class="font-medium">{{ b.branchName }}</td>
                          <td>{{ b.students }}</td>
                          <td>{{ b.collections | currency:'INR':'symbol':'1.0-0' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          }

          <!-- Report navigation cards -->
          <p class="section-heading">Drill-down Reports</p>
          <div class="report-grid">
            @for (card of reportCards(); track card.route) {
              <a [routerLink]="card.route" class="report-card">
                <div class="report-card-icon" [style.background]="card.color + '18'" [style.color]="card.color">
                  {{ card.icon }}
                </div>
                <div class="report-card-body">
                  <p class="report-card-title">{{ card.title }}</p>
                  <p class="report-card-desc">{{ card.description }}</p>
                </div>
                <span class="report-card-arrow">→</span>
              </a>
            }
          </div>
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .kpi-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 16px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .kpi-card-green { border-color: #6ee7b7; background: #f0fdf4; }
    .kpi-card-amber { border-color: #fcd34d; background: #fffbeb; }
    .kpi-value { font-size: 22px; font-weight: 800; color: var(--color-text); }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .section-block { display: flex; flex-direction: column; gap: 10px; }
    .section-heading { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .5px; }
    .report-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .report-card {
      display: flex; align-items: center; gap: 14px;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 16px 20px;
      transition: border-color .15s, box-shadow .15s; text-decoration: none;
    }
    .report-card:hover { border-color: var(--color-primary); box-shadow: 0 2px 12px rgba(0,0,0,.06); }
    .report-card-icon {
      width: 44px; height: 44px; border-radius: var(--radius-md); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 20px;
    }
    .report-card-body { flex: 1; min-width: 0; }
    .report-card-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
    .report-card-desc  { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; line-height: 1.5; }
    .report-card-arrow { font-size: 16px; color: var(--color-text-muted); flex-shrink: 0; }
    .font-medium { font-weight: 600; }
  `],
})
export class ReportsComponent implements OnInit {
  private readonly svc        = inject(ReportService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state       = signal<LoadState>('loading');
  readonly branchData  = signal<BranchDashboard | null>(null);
  readonly overallData = signal<OverallDashboard | null>(null);

  readonly reportCards = computed<ReportCard[]>(() => {
    const base = this.auth.isSuperAdmin() ? '/ho/reports' : '/branch/reports';
    return [
      { icon: '💰', title: 'Fee Collection',  description: 'Daily collections, totals, pending dues and transaction history', route: `${base}/fees`,       color: '#059669' },
      { icon: '🎓', title: 'Students',        description: 'Enrolment trends, course distribution and student lifecycle',    route: `${base}/students`,   color: '#3b82f6' },
      { icon: '🏆', title: 'Placements',      description: 'Placement outcomes, company-wise stats and salary packages',     route: `${base}/placements`, color: '#8b5cf6' },
      { icon: '✅', title: 'Attendance',      description: 'Batch-wise attendance rates and student-level breakdown',         route: `${base}/attendance`, color: '#f59e0b' },
      { icon: '📋', title: 'Enquiries',       description: 'Enquiry funnel, conversion rates and source analysis',           route: `${base}/enquiries`,  color: '#ef4444' },
      { icon: '📝', title: 'Exams & Results', description: 'Eligibility, registrations, pass/fail rates and certificates',   route: `${base}/exams`,      color: '#06b6d4' },
    ];
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    if (this.auth.isSuperAdmin()) {
      this.svc.getOverallDashboard()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (d) => { this.overallData.set(d); this.state.set('ready'); },
          error: () => this.state.set('error'),
        });
    } else {
      this.svc.getBranchDashboard()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (d) => { this.branchData.set(d); this.state.set('ready'); },
          error: () => this.state.set('error'),
        });
    }
  }
}
