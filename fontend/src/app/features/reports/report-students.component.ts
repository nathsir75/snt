import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ReportService } from './report.service';
import { StudentLifecycle, EnquiryFunnel } from './report.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-report-students',
  standalone: true,
  imports: [RouterLink, PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell title="Students Report" subtitle="Enrolment trends, lifecycle stages and conversion rates" icon="🎓">
      <ng-container slot="actions">
        <a routerLink="/reports" class="btn btn-ghost">← Reports</a>
        <a routerLink="/students" class="btn btn-secondary">View Students →</a>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {

          @if (lifecycle(); as lc) {
            <div class="section-block">
              <p class="section-heading">Student Lifecycle</p>
              <div class="kpi-strip">
                <div class="kpi-card">
                  <span class="kpi-value">{{ lc.newEnquiries }}</span>
                  <span class="kpi-label">New Enquiries</span>
                </div>
                <div class="kpi-card kpi-card-blue">
                  <span class="kpi-value">{{ lc.convertedToStudents }}</span>
                  <span class="kpi-label">Converted to Students</span>
                </div>
                <div class="kpi-card kpi-card-green">
                  <span class="kpi-value">{{ lc.activeStudents }}</span>
                  <span class="kpi-label">Active Students</span>
                </div>
                <div class="kpi-card">
                  <span class="kpi-value">{{ conversionRate(lc) }}%</span>
                  <span class="kpi-label">Conversion Rate</span>
                </div>
              </div>

              <!-- Funnel visual -->
              <div class="funnel">
                <div class="funnel-stage funnel-stage-1">
                  <span class="funnel-count">{{ lc.newEnquiries }}</span>
                  <span class="funnel-label">Enquiries</span>
                </div>
                <div class="funnel-arrow">▼</div>
                <div class="funnel-stage funnel-stage-2">
                  <span class="funnel-count">{{ lc.convertedToStudents }}</span>
                  <span class="funnel-label">Students</span>
                </div>
                <div class="funnel-arrow">▼</div>
                <div class="funnel-stage funnel-stage-3">
                  <span class="funnel-count">{{ lc.activeStudents }}</span>
                  <span class="funnel-label">Active</span>
                </div>
              </div>
            </div>
          }

          @if (funnel(); as f) {
            <div class="section-block">
              <p class="section-heading">Enquiry Status Breakdown</p>
              <div class="kpi-strip">
                <div class="kpi-card">
                  <span class="kpi-value">{{ f.totalEnquiries }}</span>
                  <span class="kpi-label">Total Enquiries</span>
                </div>
                <div class="kpi-card">
                  <span class="kpi-value">{{ f.contacted }}</span>
                  <span class="kpi-label">Contacted</span>
                </div>
                <div class="kpi-card kpi-card-green">
                  <span class="kpi-value">{{ f.converted }}</span>
                  <span class="kpi-label">Converted</span>
                </div>
                <div class="kpi-card kpi-card-red">
                  <span class="kpi-value">{{ f.lost }}</span>
                  <span class="kpi-label">Lost</span>
                </div>
              </div>

              <!-- Status bar -->
              @if (f.totalEnquiries > 0) {
                <div class="status-bar-wrap">
                  <div class="status-bar">
                    <div class="status-bar-seg seg-converted" [style.width.%]="pct(f.converted, f.totalEnquiries)" title="Converted"></div>
                    <div class="status-bar-seg seg-contacted" [style.width.%]="pct(f.contacted, f.totalEnquiries)" title="Contacted"></div>
                    <div class="status-bar-seg seg-lost"      [style.width.%]="pct(f.lost, f.totalEnquiries)"      title="Lost"></div>
                  </div>
                  <div class="status-bar-legend">
                    <span class="legend-item"><span class="legend-dot dot-converted"></span>Converted {{ pct(f.converted, f.totalEnquiries) }}%</span>
                    <span class="legend-item"><span class="legend-dot dot-contacted"></span>Contacted {{ pct(f.contacted, f.totalEnquiries) }}%</span>
                    <span class="legend-item"><span class="legend-dot dot-lost"></span>Lost {{ pct(f.lost, f.totalEnquiries) }}%</span>
                  </div>
                </div>
              }
            </div>
          }
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .section-block { display: flex; flex-direction: column; gap: 14px; }
    .section-heading { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .5px; }
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .kpi-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .kpi-card-green { border-color: #6ee7b7; background: #f0fdf4; }
    .kpi-card-blue  { border-color: #93c5fd; background: #eff6ff; }
    .kpi-card-red   { border-color: #fca5a5; background: #fef2f2; }
    .kpi-value { font-size: 22px; font-weight: 800; color: var(--color-text); }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    /* Funnel */
    .funnel { display: flex; flex-direction: column; align-items: center; gap: 0; max-width: 320px; }
    .funnel-stage { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 24px; border-radius: var(--radius-md); width: 100%; text-align: center; }
    .funnel-stage-1 { background: #dbeafe; width: 100%; }
    .funnel-stage-2 { background: #d1fae5; width: 80%; }
    .funnel-stage-3 { background: #bbf7d0; width: 60%; }
    .funnel-count { font-size: 20px; font-weight: 800; color: var(--color-text); }
    .funnel-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; }
    .funnel-arrow { font-size: 12px; color: var(--color-text-muted); padding: 2px 0; }
    /* Status bar */
    .status-bar-wrap { display: flex; flex-direction: column; gap: 8px; }
    .status-bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--color-border); }
    .status-bar-seg { height: 100%; transition: width .3s; }
    .seg-converted { background: #10b981; }
    .seg-contacted { background: #3b82f6; }
    .seg-lost      { background: #ef4444; }
    .status-bar-legend { display: flex; gap: 16px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dot-converted { background: #10b981; }
    .dot-contacted { background: #3b82f6; }
    .dot-lost      { background: #ef4444; }
  `],
})
export class ReportStudentsComponent implements OnInit {
  private readonly svc        = inject(ReportService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state    = signal<LoadState>('loading');
  readonly lifecycle = signal<StudentLifecycle | null>(null);
  readonly funnel    = signal<EnquiryFunnel | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    if (this.auth.isSuperAdmin()) {
      forkJoin({
        lc: this.svc.getStudentLifecycle(),
        fn: this.svc.getEnquiryFunnel(),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ lc, fn }) => { this.lifecycle.set(lc); this.funnel.set(fn); this.state.set('ready'); },
          error: () => this.state.set('error'),
        });
    } else {
      this.svc.getStudentLifecycle()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (lc) => { this.lifecycle.set(lc); this.state.set('ready'); },
          error: () => this.state.set('error'),
        });
    }
  }

  conversionRate(lc: StudentLifecycle): number {
    return lc.newEnquiries > 0 ? Math.round((lc.convertedToStudents / lc.newEnquiries) * 100) : 0;
  }

  pct(val: number, total: number): number {
    return total > 0 ? Math.round((val / total) * 100) : 0;
  }
}
