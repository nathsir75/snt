import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ExamRegistrationService } from './exam-registration.service';
import { ExamRegistration, ExamRegistrationSummary, RegistrationStatus } from './exam.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-exam-registrations',
  standalone: true,
  imports: [
    FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent, DrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Exam Registrations"
      subtitle="View and schedule registered students for their final examinations"
      icon="📄"
    >
      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="search-input" type="search" placeholder="Search student, course…" [(ngModel)]="searchTerm" (ngModelChange)="page.set(1)" />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Status</option>
            <option value="registered">Registered</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="absent">Absent</option>
          </select>
          @if (searchTerm || statusFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} registration{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      <!-- Summary strip -->
      @if (summary(); as s) {
        <div class="kpi-strip">
          <div class="kpi-card"><span class="kpi-value">{{ s.totalRegistrations }}</span><span class="kpi-label">Total</span></div>
          <div class="kpi-card kpi-card-blue"><span class="kpi-value">{{ s.registered }}</span><span class="kpi-label">Pending Schedule</span></div>
          <div class="kpi-card kpi-card-amber"><span class="kpi-value">{{ s.scheduled }}</span><span class="kpi-label">Scheduled</span></div>
          <div class="kpi-card kpi-card-green"><span class="kpi-value">{{ s.completed }}</span><span class="kpi-label">Completed</span></div>
          <div class="kpi-card kpi-card-red"><span class="kpi-value">{{ s.absent }}</span><span class="kpi-label">Absent</span></div>
        </div>
      }

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter ? 'No matching registrations' : 'No exam registrations'"
              [description]="searchTerm || statusFilter ? 'Try adjusting your search.' : 'Registrations are auto-created when eligibility is approved.'"
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
                    <th>Exam Date</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                    <th>Registered</th>
                    @if (auth.isSuperAdmin()) { <th>Actions</th> }
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
                        @if (r.hallTicketNo) {
                          <span class="hall-ticket">{{ r.hallTicketNo }}</span>
                        } @else { <span class="text-muted">—</span> }
                      </td>
                      <td class="text-muted">{{ r.examDate ? (r.examDate | date:'dd MMM yyyy') : '—' }}</td>
                      <td>
                        <span [class.text-danger]="r.eligibilityRequest.attendancePercentSnapshot < 75" [class.text-success]="r.eligibilityRequest.attendancePercentSnapshot >= 75">
                          {{ r.eligibilityRequest.attendancePercentSnapshot }}%
                        </span>
                      </td>
                      <td>
                        <snt-badge [label]="r.status" [variant]="statusBadge(r.status)" />
                      </td>
                      <td class="text-muted">{{ r.createdAt | date:'dd MMM yyyy' }}</td>
                      @if (auth.isSuperAdmin()) {
                        <td>
                          <button class="btn btn-ghost btn-sm" (click)="openSchedule(r)">Schedule</button>
                        </td>
                      }
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

    <!-- Schedule Drawer -->
    <snt-drawer [open]="scheduleDrawerOpen()" title="Schedule Exam" [subtitle]="scheduleTarget()?.student?.fullName ?? ''" (closed)="scheduleDrawerOpen.set(false)">
      <div class="form-body">
        <div class="field">
          <label class="field-label">Exam Date</label>
          <input class="field-input" type="datetime-local" [(ngModel)]="schedExamDate" />
        </div>
        <div class="field">
          <label class="field-label">Hall Ticket No</label>
          <input class="field-input" type="text" placeholder="e.g. HT-2024-001" [(ngModel)]="schedHallTicket" />
        </div>
        <div class="field">
          <label class="field-label">Status</label>
          <select class="field-input" [(ngModel)]="schedStatus">
            <option value="registered">Registered</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="absent">Absent</option>
          </select>
        </div>
        @if (schedError()) { <p class="err-msg">{{ schedError() }}</p> }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="scheduleDrawerOpen.set(false)" [disabled]="saving()">Cancel</button>
          <button class="btn btn-primary" (click)="submitSchedule()" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save' }}
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
    .kpi-card-blue  { border-color: #93c5fd; background: #eff6ff; }
    .kpi-card-amber { border-color: #fcd34d; background: #fffbeb; }
    .kpi-card-red   { border-color: #fca5a5; background: #fef2f2; }
    .kpi-value { font-size: 20px; font-weight: 800; color: var(--color-text); }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .hall-ticket { font-family: monospace; font-size: var(--font-size-xs); font-weight: 700; color: var(--color-primary); }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .text-success { color: #059669; font-weight: 600; }
    .text-danger  { color: #dc2626; font-weight: 600; }
    .font-medium { font-weight: 600; }
    .form-body { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .field-input { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; }
    .field-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .err-msg { font-size: var(--font-size-sm); color: var(--color-danger); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
  `],
})
export class ExamRegistrationsComponent implements OnInit {
  private readonly svc        = inject(ExamRegistrationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);

  readonly state              = signal<LoadState>('loading');
  readonly all                = signal<ExamRegistration[]>([]);
  readonly summary            = signal<ExamRegistrationSummary | null>(null);
  readonly page               = signal(1);
  readonly scheduleDrawerOpen = signal(false);
  readonly scheduleTarget     = signal<ExamRegistration | null>(null);
  readonly saving             = signal(false);
  readonly schedError         = signal<string | null>(null);

  searchTerm = ''; statusFilter = '';
  schedExamDate = ''; schedHallTicket = '';
  schedStatus: RegistrationStatus = 'scheduled';

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    const st   = this.statusFilter;
    return this.all().filter((r) => {
      const matchSearch = !term || r.student.fullName.toLowerCase().includes(term) || r.student.course.toLowerCase().includes(term);
      const matchStatus = !st || r.status === st;
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

  openSchedule(r: ExamRegistration): void {
    this.scheduleTarget.set(r);
    this.schedExamDate   = r.examDate   ? r.examDate.slice(0, 16) : '';
    this.schedHallTicket = r.hallTicketNo ?? '';
    this.schedStatus     = r.status;
    this.schedError.set(null);
    this.scheduleDrawerOpen.set(true);
  }

  submitSchedule(): void {
    const t = this.scheduleTarget();
    if (!t) return;
    this.saving.set(true); this.schedError.set(null);
    this.svc.schedule(t.id, {
      ...(this.schedExamDate   && { examDate:    this.schedExamDate }),
      ...(this.schedHallTicket && { hallTicketNo: this.schedHallTicket }),
      status: this.schedStatus,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.saving.set(false); this.scheduleDrawerOpen.set(false); this.load(); },
        error: (e: Error) => {
          this.saving.set(false);
          this.schedError.set(e.message.includes('DUPLICATE') ? 'Hall ticket number already in use.' : e.message);
        },
      });
  }

  statusBadge(s: RegistrationStatus): BadgeVariant {
    const m: Record<RegistrationStatus, BadgeVariant> = { registered: 'info', scheduled: 'warning', completed: 'success', absent: 'danger' };
    return m[s] ?? 'neutral';
  }

  clearFilters(): void { this.searchTerm = ''; this.statusFilter = ''; this.page.set(1); }
}
