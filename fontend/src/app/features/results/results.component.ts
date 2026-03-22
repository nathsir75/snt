import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ResultService } from './result.service';
import { FinalResult, ResultStatus, ResultSummary } from './result.models';
import { ExamRegistrationService } from '../exam-registrations/exam-registration.service';
import { ExamRegistration } from '../exam-registrations/exam.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-results',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent, DrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Exam Results"
      subtitle="Publish and manage final examination results for registered students"
      icon="🏆"
    >
      <ng-container slot="actions">
        @if (auth.isSuperAdmin()) {
          <button class="btn btn-primary" (click)="openPublishDrawer()">+ Publish Result</button>
        }
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="search-input" type="search" placeholder="Search student, course…" [(ngModel)]="searchTerm" (ngModelChange)="page.set(1)" />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Results</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="absent">Absent</option>
          </select>
          @if (searchTerm || statusFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} result{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      <!-- Summary strip -->
      @if (summary(); as s) {
        <div class="kpi-strip">
          <div class="kpi-card"><span class="kpi-value">{{ s.totalResults }}</span><span class="kpi-label">Total Published</span></div>
          <div class="kpi-card kpi-card-green"><span class="kpi-value">{{ s.pass }}</span><span class="kpi-label">Passed</span></div>
          <div class="kpi-card kpi-card-red"><span class="kpi-value">{{ s.fail }}</span><span class="kpi-label">Failed</span></div>
          <div class="kpi-card kpi-card-amber"><span class="kpi-value">{{ s.absent }}</span><span class="kpi-label">Absent</span></div>
          @if (s.totalResults > 0) {
            <div class="kpi-card">
              <span class="kpi-value">{{ passRate(s) }}%</span>
              <span class="kpi-label">Pass Rate</span>
            </div>
          }
        </div>
      }

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter ? 'No matching results' : 'No results published'"
              [description]="searchTerm || statusFilter ? 'Try adjusting your search.' : 'Publish exam results for students who have appeared in their final examination.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Branch</th>
                    <th>Hall Ticket</th>
                    <th>Marks</th>
                    <th>Result</th>
                    <th>Published</th>
                    <th>Published By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of paginated(); track r.id) {
                    <tr>
                      <td>
                        <p class="font-medium">{{ r.student.fullName }}</p>
                        <p class="text-xs text-muted">{{ r.student.mobile }}</p>
                      </td>
                      <td class="text-muted">{{ r.student.course }}</td>
                      <td class="text-muted">{{ r.branch.name }}</td>
                      <td>
                        @if (r.registration?.hallTicketNo) {
                          <span class="hall-ticket">{{ r.registration!.hallTicketNo }}</span>
                        } @else { <span class="text-muted">—</span> }
                      </td>
                      <td>
                        <span class="marks-cell">{{ r.marksObtained }} / {{ r.maxMarks }}</span>
                        <span class="marks-pct">({{ marksPct(r) }}%)</span>
                      </td>
                      <td>
                        <snt-badge [label]="r.resultStatus.toUpperCase()" [variant]="resultBadge(r.resultStatus)" />
                      </td>
                      <td class="text-muted">{{ r.publishedAt | date:'dd MMM yyyy' }}</td>
                      <td class="text-muted">{{ r.publishedBy?.name || '—' }}</td>
                      <td>
                        @if (r.resultStatus === 'pass') {
                          <button class="btn btn-ghost btn-sm" (click)="goToCertificates()">Issue Cert →</button>
                        }
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

    <!-- Publish Result Drawer -->
    <snt-drawer [open]="publishDrawerOpen()" title="Publish Result" subtitle="Enter marks for a completed exam registration" (closed)="publishDrawerOpen.set(false)">
      <div class="form-body">
        <div class="field">
          <label class="field-label">Registration <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="regId">
            <option [ngValue]="null">Select registration…</option>
            @for (r of completedRegs(); track r.id) {
              <option [ngValue]="r.id">{{ r.student.fullName }} — {{ r.student.course }} ({{ r.hallTicketNo || 'No ticket' }})</option>
            }
          </select>
          @if (!completedRegs().length) {
            <p class="field-hint">No scheduled/completed registrations without results found.</p>
          }
        </div>
        <div class="field">
          <label class="field-label">Marks Obtained <span class="req">*</span></label>
          <input class="field-input" type="number" placeholder="e.g. 75" [(ngModel)]="marksObtained" min="0" />
        </div>
        <div class="field">
          <label class="field-label">Max Marks <span class="req">*</span></label>
          <input class="field-input" type="number" placeholder="e.g. 100" [(ngModel)]="maxMarks" min="1" />
        </div>
        <div class="field">
          <label class="field-label">Remarks</label>
          <input class="field-input" type="text" placeholder="Optional remarks" [(ngModel)]="remarks" />
        </div>
        @if (marksObtained !== null && maxMarks !== null && maxMarks > 0) {
          <div class="result-preview" [class.result-preview-pass]="marksObtained >= maxMarks * 0.4" [class.result-preview-fail]="marksObtained < maxMarks * 0.4">
            Predicted result: <strong>{{ marksObtained >= maxMarks * 0.4 ? 'PASS' : 'FAIL' }}</strong>
            ({{ Math.round((marksObtained / maxMarks) * 100) }}%)
          </div>
        }
        @if (formError()) { <p class="err-msg">{{ formError() }}</p> }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="publishDrawerOpen.set(false)" [disabled]="saving()">Cancel</button>
          <button class="btn btn-primary" (click)="submitPublish()" [disabled]="saving() || !regId || marksObtained === null || !maxMarks">
            {{ saving() ? 'Publishing…' : 'Publish Result' }}
          </button>
        </div>
      </div>
    </snt-drawer>
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .search-box { position: relative; flex: 1; min-width: 200px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { width: 100%; padding: 7px 10px 7px 32px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; }
    .search-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .filter-select { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; cursor: pointer; }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .kpi-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 4px; }
    .kpi-card-green { border-color: #6ee7b7; background: #f0fdf4; }
    .kpi-card-red   { border-color: #fca5a5; background: #fef2f2; }
    .kpi-card-amber { border-color: #fcd34d; background: #fffbeb; }
    .kpi-value { font-size: 20px; font-weight: 800; color: var(--color-text); }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .hall-ticket { font-family: monospace; font-size: var(--font-size-xs); font-weight: 700; color: var(--color-primary); }
    .marks-cell { font-weight: 700; }
    .marks-pct  { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: 4px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .font-medium { font-weight: 600; }
    /* Form */
    .form-body { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .req { color: var(--color-danger); }
    .field-input { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; }
    .field-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .field-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .result-preview { padding: 10px 14px; border-radius: var(--radius-md); font-size: var(--font-size-sm); }
    .result-preview-pass { background: #d1fae5; color: #065f46; }
    .result-preview-fail { background: #fee2e2; color: #991b1b; }
    .err-msg { font-size: var(--font-size-sm); color: var(--color-danger); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
  `],
})
export class ResultsComponent implements OnInit {
  private readonly svc        = inject(ResultService);
  private readonly regSvc     = inject(ExamRegistrationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);
  readonly router             = inject(Router);
  readonly Math               = Math;

  readonly state              = signal<LoadState>('loading');
  readonly all                = signal<FinalResult[]>([]);
  readonly summary            = signal<ResultSummary | null>(null);
  readonly completedRegs      = signal<ExamRegistration[]>([]);
  readonly page               = signal(1);
  readonly publishDrawerOpen  = signal(false);
  readonly saving             = signal(false);
  readonly formError          = signal<string | null>(null);

  searchTerm = ''; statusFilter = '';
  regId: number | null = null;
  marksObtained: number | null = null;
  maxMarks: number | null = null;
  remarks = '';

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    const st   = this.statusFilter;
    return this.all().filter((r) => {
      const matchSearch = !term || r.student.fullName.toLowerCase().includes(term) || r.student.course.toLowerCase().includes(term);
      const matchStatus = !st || r.resultStatus === st;
      return matchSearch && matchStatus;
    });
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

  openPublishDrawer(): void {
    this.regId = null; this.marksObtained = null; this.maxMarks = null; this.remarks = '';
    this.formError.set(null);
    // Load scheduled/completed registrations that don't have results yet
    this.regSvc.list({ status: 'scheduled' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => this.completedRegs.set(r), error: () => {} });
    this.publishDrawerOpen.set(true);
  }

  submitPublish(): void {
    if (!this.regId || this.marksObtained === null || !this.maxMarks) return;
    this.saving.set(true); this.formError.set(null);
    this.svc.publish({
      registrationId: this.regId,
      marksObtained:  this.marksObtained,
      maxMarks:       this.maxMarks,
      ...(this.remarks && { remarks: this.remarks }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.saving.set(false); this.publishDrawerOpen.set(false); this.load(); },
        error: (e: Error) => {
          this.saving.set(false);
          this.formError.set(e.message.includes('DUPLICATE') ? 'A result has already been published for this registration.' : e.message);
        },
      });
  }

  goToCertificates(): void {
    const base = this.auth.isSuperAdmin() ? '/ho' : '/branch';
    this.router.navigate([base, 'certificates']);
  }

  passRate(s: ResultSummary): number {
    return s.totalResults > 0 ? Math.round((s.pass / s.totalResults) * 100) : 0;
  }

  marksPct(r: FinalResult): number {
    return r.maxMarks > 0 ? Math.round((r.marksObtained / r.maxMarks) * 100) : 0;
  }

  resultBadge(s: ResultStatus): BadgeVariant {
    const m: Record<ResultStatus, BadgeVariant> = { pass: 'success', fail: 'danger', absent: 'warning' };
    return m[s];
  }

  clearFilters(): void { this.searchTerm = ''; this.statusFilter = ''; this.page.set(1); }
}
