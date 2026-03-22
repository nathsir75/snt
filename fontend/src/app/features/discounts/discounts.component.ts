import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { StudentService } from '../students/student.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

interface DiscountRequest {
  id: number;
  requestedDiscountAmount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decisionRemarks: string | null;
  decidedAt: string | null;
  createdAt: string;
  branch: { id: number; name: string };
  requestedBy: { id: number; name: string };
  decidedBy: { id: number; name: string } | null;
  enquiry: { id: number; fullName: string; courseInterest: string } | null;
  student: { id: number; fullName: string; course: string } | null;
  course: { id: number; name: string; code: string } | null;
}

interface StudentOption { id: number; fullName: string; course: string; mobile: string; }

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-discounts',
  standalone: true,
  imports: [
    FormsModule, ReactiveFormsModule, DatePipe, CurrencyPipe,
    PageShellComponent, PageStateComponent, BadgeComponent,
    ConfirmDialogComponent, DrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Discount Requests"
      subtitle="Review and manage student discount requests across branches"
      icon="🎟️"
    >
      <ng-container slot="actions">
        @if (auth.isBranchAdmin()) {
          <button class="btn btn-primary" (click)="openRaiseDrawer()">+ Raise Discount Request</button>
        }
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          @if (statusFilter) {
            <button class="btn btn-ghost" (click)="statusFilter = ''; page.set(1)">Clear</button>
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
              [title]="statusFilter ? 'No matching requests' : 'No discount requests'"
              description="Discount requests submitted by branches will appear here for review and approval."
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student / Enquiry</th>
                    <th>Branch</th>
                    <th>Course</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Requested By</th>
                    <th>Status</th>
                    <th>Date</th>
                    @if (auth.isSuperAdmin()) { <th>Actions</th> }
                  </tr>
                </thead>
                <tbody>
                  @for (r of paginated(); track r.id) {
                    <tr>
                      <td class="font-medium">
                        {{ r.student?.fullName || r.enquiry?.fullName || '—' }}
                      </td>
                      <td class="text-muted">{{ r.branch.name }}</td>
                      <td class="text-muted">{{ r.course?.name || r.student?.course || r.enquiry?.courseInterest || '—' }}</td>
                      <td>
                        <span class="amount-chip">{{ r.requestedDiscountAmount | currency:'INR':'symbol':'1.0-0' }}</span>
                      </td>
                      <td class="text-muted reason-cell">{{ r.reason }}</td>
                      <td class="text-muted">{{ r.requestedBy.name }}</td>
                      <td>
                        <snt-badge [label]="r.status" [variant]="statusBadge(r.status)" />
                      </td>
                      <td class="text-muted">{{ r.createdAt | date:'dd MMM yyyy' }}</td>
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

    <!-- Raise Request Drawer (branch_admin) -->
    <snt-drawer
      [open]="raiseDrawerOpen()"
      title="Raise Discount Request"
      subtitle="Submit a discount request for HO approval"
      (closed)="raiseDrawerOpen.set(false)"
    >
      <form [formGroup]="raiseForm" (ngSubmit)="submitRaise()" class="form-body">
        <div class="field">
          <label class="field-label">Student Search <span class="req">*</span></label>
          <input class="field-input" type="search" placeholder="Type student name…"
            formControlName="studentSearch" (input)="onRaiseStudentSearch()" />
          @if (raiseStudentResults().length) {
            <div class="student-dropdown">
              @for (s of raiseStudentResults(); track s.id) {
                <button type="button" class="student-option" (click)="selectRaiseStudent(s)">
                  <span class="student-name">{{ s.fullName }}</span>
                  <span class="student-meta">{{ s.mobile }} · {{ s.course }}</span>
                </button>
              }
            </div>
          }
          @if (raiseSelectedStudent()) {
            <div class="selected-student">
              <span>{{ raiseSelectedStudent()!.fullName }} — {{ raiseSelectedStudent()!.course }}</span>
              <button type="button" class="clear-btn" (click)="raiseSelectedStudent.set(null)">✕</button>
            </div>
          }
        </div>
        <div class="field">
          <label class="field-label">Discount Amount (₹) <span class="req">*</span></label>
          <input class="field-input" type="number" placeholder="e.g. 2000" formControlName="amount" min="1" />
          @if (raiseForm.controls['amount'].invalid && raiseForm.controls['amount'].touched) {
            <span class="field-error">Amount must be greater than 0</span>
          }
        </div>
        <div class="field">
          <label class="field-label">Reason <span class="req">*</span></label>
          <textarea class="field-input field-textarea" rows="3" placeholder="Reason for discount…" formControlName="reason"></textarea>
          @if (raiseForm.controls['reason'].invalid && raiseForm.controls['reason'].touched) {
            <span class="field-error">Reason is required</span>
          }
        </div>
        @if (raiseError()) { <p class="err-msg">{{ raiseError() }}</p> }
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="raiseDrawerOpen.set(false)" [disabled]="raiseSaving()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="raiseSaving() || !raiseSelectedStudent()">
            {{ raiseSaving() ? 'Submitting…' : 'Submit Request' }}
          </button>
        </div>
      </form>
    </snt-drawer>

    <!-- Decision Drawer -->
    <snt-drawer
      [open]="decisionDrawerOpen()"
      [title]="decisionAction() === 'approved' ? 'Approve Discount' : 'Reject Discount'"
      [subtitle]="decisionTarget() ? 'Request #' + decisionTarget()!.id + ' — ' + (decisionTarget()!.requestedDiscountAmount | currency:'INR':'symbol':'1.0-0') : ''"
      (closed)="decisionDrawerOpen.set(false)"
    >
      <div class="form-body">
        <div class="field">
          <label class="field-label">Decision Remarks</label>
          <textarea class="field-input field-textarea" [(ngModel)]="decisionRemarks" rows="3"
            [placeholder]="decisionAction() === 'approved' ? 'Optional approval notes…' : 'Reason for rejection…'">
          </textarea>
        </div>
        @if (decisionError()) { <p class="err-msg">{{ decisionError() }}</p> }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="decisionDrawerOpen.set(false)" [disabled]="saving()">Cancel</button>
          <button
            [class]="decisionAction() === 'approved' ? 'btn btn-primary' : 'btn btn-danger'"
            (click)="submitDecision()"
            [disabled]="saving()"
          >
            {{ saving() ? 'Saving…' : (decisionAction() === 'approved' ? 'Approve' : 'Reject') }}
          </button>
        </div>
      </div>
    </snt-drawer>
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .filter-select { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; cursor: pointer; }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .amount-chip { font-size: var(--font-size-xs); font-weight: 700; color: #059669; background: #d1fae5; padding: 2px 8px; border-radius: 999px; }
    .reason-cell { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .action-row { display: flex; gap: 6px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .font-medium { font-weight: 600; }
    .form-body { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .field-input { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; }
    .field-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .student-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); max-height: 200px; overflow-y: auto; }
    .student-option { display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--color-border); }
    .student-option:hover { background: var(--color-bg); }
    .student-name { font-size: var(--font-size-sm); font-weight: 600; }
    .student-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .selected-student { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #d1fae5; border-radius: var(--radius-md); font-size: var(--font-size-sm); color: #065f46; font-weight: 600; }
    .clear-btn { color: #065f46; font-size: 12px; }
    .field-textarea { resize: vertical; min-height: 72px; }
    .field-error { font-size: var(--font-size-xs); color: var(--color-danger); }
    .req { color: var(--color-danger); }
    .err-msg { font-size: var(--font-size-sm); color: var(--color-danger); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
  `],
})
export class DiscountsComponent implements OnInit {
  private readonly api        = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);
  private readonly fb         = inject(FormBuilder);
  private readonly stuSvc     = inject(StudentService);

  readonly state   = signal<LoadState>('loading');
  readonly all     = signal<DiscountRequest[]>([]);
  readonly page    = signal(1);
  readonly saving  = signal(false);

  // Decision drawer
  readonly decisionDrawerOpen = signal(false);
  readonly decisionTarget     = signal<DiscountRequest | null>(null);
  readonly decisionAction     = signal<'approved' | 'rejected'>('approved');
  readonly decisionError      = signal<string | null>(null);

  // Raise request drawer (branch_admin)
  readonly raiseDrawerOpen      = signal(false);
  readonly raiseStudentResults  = signal<StudentOption[]>([]);
  readonly raiseSelectedStudent = signal<StudentOption | null>(null);
  readonly raiseSaving          = signal(false);
  readonly raiseError           = signal<string | null>(null);

  readonly raiseForm = this.fb.nonNullable.group({
    studentSearch: [''],
    amount:        [0, [Validators.required, Validators.min(1)]],
    reason:        ['', Validators.required],
  });

  private raiseSearchTimer: ReturnType<typeof setTimeout> | null = null;

  statusFilter = '';
  decisionRemarks = '';

  readonly filtered = computed(() => {
    const st = this.statusFilter;
    return this.all().filter((r) => !st || r.status === st);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 15)));
  readonly paginated  = computed(() => this.filtered().slice((this.page() - 1) * 15, this.page() * 15));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.api.get<DiscountRequest[]>('/discount-requests')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (data) => { this.all.set(data); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }

  openDecision(r: DiscountRequest, action: 'approved' | 'rejected'): void {
    this.decisionTarget.set(r);
    this.decisionAction.set(action);
    this.decisionRemarks = '';
    this.decisionError.set(null);
    this.decisionDrawerOpen.set(true);
  }

  submitDecision(): void {
    const r = this.decisionTarget();
    if (!r) return;
    this.saving.set(true);
    this.decisionError.set(null);
    this.api.patch<DiscountRequest>(`/discount-requests/${r.id}/decision`, {
      status: this.decisionAction(),
      ...(this.decisionRemarks.trim() && { decisionRemarks: this.decisionRemarks.trim() }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.decisionDrawerOpen.set(false);
          this.load();
        },
        error: (e: Error) => {
          this.saving.set(false);
          this.decisionError.set(e.message.includes('ALREADY_DECIDED') ? 'This request has already been decided.' : e.message);
        },
      });
  }

  statusBadge(status: string): BadgeVariant {
    const m: Record<string, BadgeVariant> = { pending: 'warning', approved: 'success', rejected: 'danger' };
    return m[status] ?? 'neutral';
  }

  openRaiseDrawer(): void {
    this.raiseForm.reset({ studentSearch: '', amount: 0, reason: '' });
    this.raiseSelectedStudent.set(null);
    this.raiseStudentResults.set([]);
    this.raiseError.set(null);
    this.raiseDrawerOpen.set(true);
  }

  onRaiseStudentSearch(): void {
    if (this.raiseSearchTimer) clearTimeout(this.raiseSearchTimer);
    const term = this.raiseForm.value.studentSearch?.trim() ?? '';
    if (term.length < 2) { this.raiseStudentResults.set([]); return; }
    this.raiseSearchTimer = setTimeout(() => {
      this.stuSvc.list({ search: term })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (s) => this.raiseStudentResults.set(s.slice(0, 8) as StudentOption[]), error: () => {} });
    }, 300);
  }

  selectRaiseStudent(s: StudentOption): void {
    this.raiseSelectedStudent.set(s);
    this.raiseForm.patchValue({ studentSearch: '' });
    this.raiseStudentResults.set([]);
  }

  submitRaise(): void {
    if (this.raiseForm.invalid || !this.raiseSelectedStudent()) {
      this.raiseForm.markAllAsTouched();
      return;
    }
    const v = this.raiseForm.getRawValue();
    this.raiseSaving.set(true);
    this.raiseError.set(null);
    this.api.post<DiscountRequest>('/discount-requests', {
      studentId: this.raiseSelectedStudent()!.id,
      requestedDiscountAmount: Number(v.amount),
      reason: v.reason,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.raiseSaving.set(false);
          this.raiseDrawerOpen.set(false);
          this.load();
        },
        error: (e: Error) => {
          this.raiseSaving.set(false);
          this.raiseError.set(e.message);
        },
      });
  }
}
