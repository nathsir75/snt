import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ExamEligibilityService } from './exam-eligibility.service';
import { EligibilityRequest, EligibilityStatus } from '../exam-registrations/exam.models';
import { StudentService } from '../students/student.service';
import { Student } from '../students/student.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-exam-eligibility',
  standalone: true,
  imports: [
    FormsModule, DatePipe, DecimalPipe,
    PageShellComponent, PageStateComponent, BadgeComponent,
    DrawerComponent, ConfirmDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Exam Eligibility"
      subtitle="Submit and review student eligibility requests for final examinations"
      icon="📝"
    >
      <ng-container slot="actions">
        <button class="btn btn-primary" (click)="requestDrawerOpen.set(true)">+ Submit Request</button>
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="search-input" type="search" placeholder="Search student, course…" [(ngModel)]="searchTerm" (ngModelChange)="page.set(1)" />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          @if (searchTerm || statusFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} request{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter ? 'No matching requests' : 'No eligibility requests'"
              [description]="searchTerm || statusFilter ? 'Try adjusting your search.' : 'Submit an eligibility request for a student who has completed required attendance.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Branch</th>
                    <th>Attendance %</th>
                    <th>Pending Dues</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Decided By</th>
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
                        <span [class.text-danger]="r.attendancePercentSnapshot < 75" [class.text-success]="r.attendancePercentSnapshot >= 75">
                          {{ r.attendancePercentSnapshot }}%
                        </span>
                      </td>
                      <td>
                        @if (r.remainingDueSnapshot > 0) {
                          <span class="text-danger">₹{{ r.remainingDueSnapshot | number:'1.0-0' }}</span>
                        } @else {
                          <span class="text-success">Cleared</span>
                        }
                      </td>
                      <td>
                        <snt-badge [label]="r.status" [variant]="statusBadge(r.status)" />
                      </td>
                      <td class="text-muted">{{ r.createdAt | date:'dd MMM yyyy' }}</td>
                      <td class="text-muted">{{ r.decidedBy?.name || '—' }}</td>
                      @if (auth.isSuperAdmin()) {
                        <td>
                          @if (r.status === 'pending') {
                            <div class="action-row">
                              <button class="btn btn-primary btn-sm" (click)="openDecision(r, 'approved')">Approve</button>
                              <button class="btn btn-danger btn-sm"  (click)="openDecision(r, 'rejected')">Reject</button>
                            </div>
                          } @else {
                            <span class="text-muted text-xs">{{ r.decidedAt | date:'dd MMM' }}</span>
                          }
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

    <!-- Submit Request Drawer -->
    <snt-drawer [open]="requestDrawerOpen()" title="Submit Eligibility Request" (closed)="requestDrawerOpen.set(false)">
      <div class="form-body">
        <div class="field">
          <label class="field-label">Student Search <span class="req">*</span></label>
          <input class="field-input" type="search" placeholder="Type student name…" [(ngModel)]="studentSearch" (ngModelChange)="onStudentSearch()" />
          @if (studentResults().length) {
            <div class="student-dropdown">
              @for (s of studentResults(); track s.id) {
                <button class="student-option" (click)="selectStudent(s)">
                  <span class="student-name">{{ s.fullName }}</span>
                  <span class="student-meta">{{ s.mobile }} · {{ s.course }}</span>
                </button>
              }
            </div>
          }
          @if (selectedStudent()) {
            <div class="selected-student">
              <span>{{ selectedStudent()!.fullName }}</span>
              <button class="clear-btn" (click)="selectedStudent.set(null)">✕</button>
            </div>
          }
        </div>
        <div class="field">
          <label class="field-label">Internal Remarks</label>
          <textarea class="field-input field-textarea" placeholder="Optional notes for HO review…" [(ngModel)]="internalRemarks" rows="3"></textarea>
        </div>
        @if (formError()) { <p class="err-msg">{{ formError() }}</p> }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="requestDrawerOpen.set(false)" [disabled]="saving()">Cancel</button>
          <button class="btn btn-primary" (click)="submitRequest()" [disabled]="saving() || !selectedStudent()">
            {{ saving() ? 'Submitting…' : 'Submit Request' }}
          </button>
        </div>
      </div>
    </snt-drawer>

    <!-- Decision Confirm -->
    <snt-confirm-dialog
      [open]="decisionDialogOpen()"
      [title]="decisionAction() === 'approved' ? 'Approve Eligibility' : 'Reject Eligibility'"
      [message]="decisionMessage()"
      [confirmLabel]="decisionAction() === 'approved' ? 'Approve' : 'Reject'"
      (confirm)="doDecision()"
      (cancel)="decisionDialogOpen.set(false)"
    />
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .search-box { position: relative; flex: 1; min-width: 200px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { width: 100%; padding: 7px 10px 7px 32px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; }
    .search-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .filter-select { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; cursor: pointer; }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .action-row { display: flex; gap: 6px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .text-success { color: #059669; font-weight: 600; }
    .text-danger  { color: #dc2626; font-weight: 600; }
    .font-medium { font-weight: 600; }
    /* Form */
    .form-body { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; position: relative; }
    .field-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .req { color: var(--color-danger); }
    .field-input { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; }
    .field-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .field-textarea { resize: vertical; min-height: 72px; }
    .student-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); max-height: 200px; overflow-y: auto; }
    .student-option { display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--color-border); }
    .student-option:hover { background: var(--color-bg); }
    .student-name { font-size: var(--font-size-sm); font-weight: 600; }
    .student-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .selected-student { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #d1fae5; border-radius: var(--radius-md); font-size: var(--font-size-sm); color: #065f46; font-weight: 600; }
    .clear-btn { color: #065f46; font-size: 12px; }
    .err-msg { font-size: var(--font-size-sm); color: var(--color-danger); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
  `],
})
export class ExamEligibilityComponent implements OnInit {
  private readonly svc        = inject(ExamEligibilityService);
  private readonly stuSvc     = inject(StudentService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);

  readonly state             = signal<LoadState>('loading');
  readonly all               = signal<EligibilityRequest[]>([]);
  readonly page              = signal(1);
  readonly requestDrawerOpen = signal(false);
  readonly saving            = signal(false);
  readonly formError         = signal<string | null>(null);
  readonly studentResults    = signal<Student[]>([]);
  readonly selectedStudent   = signal<Student | null>(null);
  readonly decisionDialogOpen = signal(false);
  readonly decisionTarget    = signal<EligibilityRequest | null>(null);
  readonly decisionAction    = signal<'approved' | 'rejected'>('approved');

  searchTerm = ''; statusFilter = '';
  studentSearch = ''; internalRemarks = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

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

  readonly decisionMessage = computed(() => {
    const t = this.decisionTarget();
    const a = this.decisionAction();
    return t
      ? `${a === 'approved' ? 'Approve' : 'Reject'} eligibility for ${t.student.fullName}? ${a === 'approved' ? 'This will auto-create an exam registration.' : ''}`
      : '';
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => { this.all.set(d); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }

  onStudentSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const term = this.studentSearch.trim();
    if (term.length < 2) { this.studentResults.set([]); return; }
    this.searchTimer = setTimeout(() => {
      this.stuSvc.list({ search: term })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (s) => this.studentResults.set(s.slice(0, 8)), error: () => {} });
    }, 300);
  }

  selectStudent(s: Student): void { this.selectedStudent.set(s); this.studentSearch = ''; this.studentResults.set([]); }

  submitRequest(): void {
    const s = this.selectedStudent();
    if (!s) return;
    this.saving.set(true); this.formError.set(null);
    this.svc.createRequest({ studentId: s.id, ...(this.internalRemarks && { internalRemarks: this.internalRemarks }) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false); this.requestDrawerOpen.set(false);
          this.selectedStudent.set(null); this.internalRemarks = '';
          this.load();
        },
        error: (e: Error) => {
          this.saving.set(false);
          this.formError.set(e.message.includes('DUPLICATE') ? 'A pending request already exists for this student.' : e.message);
        },
      });
  }

  openDecision(r: EligibilityRequest, action: 'approved' | 'rejected'): void {
    this.decisionTarget.set(r); this.decisionAction.set(action); this.decisionDialogOpen.set(true);
  }

  doDecision(): void {
    const r = this.decisionTarget();
    if (!r) return;
    this.decisionDialogOpen.set(false);
    this.svc.decide(r.id, { status: this.decisionAction() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.load(), error: (e: Error) => alert(e.message) });
  }

  statusBadge(s: EligibilityStatus): BadgeVariant {
    const m: Record<EligibilityStatus, BadgeVariant> = { pending: 'warning', approved: 'success', rejected: 'danger' };
    return m[s];
  }

  clearFilters(): void { this.searchTerm = ''; this.statusFilter = ''; this.page.set(1); }
}
