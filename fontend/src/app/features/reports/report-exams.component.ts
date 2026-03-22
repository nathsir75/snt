import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ExamRegistrationService } from '../exam-registrations/exam-registration.service';
import { ResultService } from '../results/result.service';
import { ExamRegistrationSummary } from '../exam-registrations/exam.models';
import { ResultSummary } from '../results/result.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-report-exams',
  standalone: true,
  imports: [RouterLink, PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell title="Exams & Results Report" subtitle="Eligibility, registrations, pass/fail rates and certificates" icon="📝">
      <ng-container slot="actions">
        <a routerLink="/reports" class="btn btn-ghost">← Reports</a>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (regSummary(); as rs) {
            <div class="section-block">
              <p class="section-heading">Exam Registrations</p>
              <div class="kpi-strip">
                <div class="kpi-card">
                  <span class="kpi-value">{{ rs.totalRegistrations }}</span>
                  <span class="kpi-label">Total Registered</span>
                </div>
                <div class="kpi-card kpi-card-blue">
                  <span class="kpi-value">{{ rs.registered }}</span>
                  <span class="kpi-label">Pending Schedule</span>
                </div>
                <div class="kpi-card kpi-card-amber">
                  <span class="kpi-value">{{ rs.scheduled }}</span>
                  <span class="kpi-label">Scheduled</span>
                </div>
                <div class="kpi-card kpi-card-green">
                  <span class="kpi-value">{{ rs.completed }}</span>
                  <span class="kpi-label">Completed</span>
                </div>
                <div class="kpi-card kpi-card-red">
                  <span class="kpi-value">{{ rs.absent }}</span>
                  <span class="kpi-label">Absent</span>
                </div>
              </div>
              <div class="quick-links">
                <a routerLink="/exam-eligibility" class="quick-link">Manage Eligibility →</a>
                <a routerLink="/exam-registrations" class="quick-link">Manage Registrations →</a>
              </div>
            </div>
          }

          @if (resultSummary(); as rs) {
            <div class="section-block">
              <p class="section-heading">Exam Results</p>
              <div class="kpi-strip">
                <div class="kpi-card">
                  <span class="kpi-value">{{ rs.totalResults }}</span>
                  <span class="kpi-label">Results Published</span>
                </div>
                <div class="kpi-card kpi-card-green">
                  <span class="kpi-value">{{ rs.pass }}</span>
                  <span class="kpi-label">Passed</span>
                </div>
                <div class="kpi-card kpi-card-red">
                  <span class="kpi-value">{{ rs.fail }}</span>
                  <span class="kpi-label">Failed</span>
                </div>
                <div class="kpi-card kpi-card-amber">
                  <span class="kpi-value">{{ rs.absent }}</span>
                  <span class="kpi-label">Absent</span>
                </div>
                @if (rs.totalResults > 0) {
                  <div class="kpi-card">
                    <span class="kpi-value">{{ passRate(rs) }}%</span>
                    <span class="kpi-label">Pass Rate</span>
                  </div>
                }
              </div>
              <div class="quick-links">
                <a routerLink="/results" class="quick-link">Manage Results →</a>
                <a routerLink="/certificates" class="quick-link">View Certificates →</a>
              </div>
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
    .kpi-card-amber { border-color: #fcd34d; background: #fffbeb; }
    .kpi-card-red   { border-color: #fca5a5; background: #fef2f2; }
    .kpi-value { font-size: 22px; font-weight: 800; color: var(--color-text); }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .quick-links { display: flex; gap: 16px; flex-wrap: wrap; }
    .quick-link { font-size: var(--font-size-sm); color: var(--color-primary); font-weight: 600; }
    .quick-link:hover { text-decoration: underline; }
  `],
})
export class ReportExamsComponent implements OnInit {
  private readonly regSvc     = inject(ExamRegistrationService);
  private readonly resultSvc  = inject(ResultService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state         = signal<LoadState>('loading');
  readonly regSummary    = signal<ExamRegistrationSummary | null>(null);
  readonly resultSummary = signal<ResultSummary | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    forkJoin({
      reg:    this.regSvc.getSummary(),
      result: this.resultSvc.getSummary(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ reg, result }) => {
          this.regSummary.set(reg);
          this.resultSummary.set(result);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }

  passRate(rs: ResultSummary): number {
    return rs.totalResults > 0 ? Math.round((rs.pass / rs.totalResults) * 100) : 0;
  }
}
