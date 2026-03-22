import {
  Component, inject, signal, computed, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { StudentService } from './student.service';
import { Student } from './student.models';
import { AuthService } from '../../core/auth/auth.service';
import { FeeService } from '../fees/fee.service';
import { StudentLedger, PAYMENT_MODE_LABELS } from '../fees/fee.models';
import { BatchStudentService } from '../batches/batch-student.service';
import { AttendanceService } from '../attendance/attendance.service';
import { BatchAssignment } from '../batches/batch-student.models';
import { StudentAttendanceResult } from '../attendance/attendance.models';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { FeeFormComponent } from '../fees/fee-form.component';
import { AssignBatchModalComponent } from './assign-batch-modal.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-student-detail',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe,
    PageStateComponent, BadgeComponent,
    FeeFormComponent, AssignBatchModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') { <snt-page-state type="loading" /> }
      @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
      @case ('ready') {
        @if (student(); as s) {
          <div class="profile-layout">

            <div class="profile-header">
              <button class="back-link" (click)="goBack()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                Students
              </button>
            </div>

            <div class="card profile-card">
              <div class="profile-card-left">
                <div class="profile-avatar">{{ s.fullName.charAt(0).toUpperCase() }}</div>
                <div>
                  <h2 class="profile-name">{{ s.fullName }}</h2>
                  <p class="profile-sub">{{ s.mobile }}{{ s.email ? ' · ' + s.email : '' }}</p>
                  <p class="profile-sub">{{ s.city }} · {{ s.branch.name }}</p>
                </div>
              </div>
              <div class="profile-card-right">
                <snt-badge label="Active" variant="success" />
                @if (s.enquiry) {
                  <button class="btn btn-ghost btn-sm" (click)="viewEnquiry(s.enquiry.id)">View Enquiry →</button>
                }
              </div>
            </div>

            <div class="stats-row">
              <div class="stat-mini">
                <span class="stat-label">Course</span>
                <span class="stat-value">{{ s.course }}</span>
              </div>
              <div class="stat-mini">
                <span class="stat-label">Total Fees</span>
                <span class="stat-value">{{ s.totalFees | currency:'INR':'symbol':'1.0-0' }}</span>
              </div>
              <div class="stat-mini">
                <span class="stat-label">Discount</span>
                <span class="stat-value">{{ s.discount | currency:'INR':'symbol':'1.0-0' }}</span>
              </div>
              <div class="stat-mini stat-mini-highlight">
                <span class="stat-label">Final Fees</span>
                <span class="stat-value">{{ s.finalFees | currency:'INR':'symbol':'1.0-0' }}</span>
              </div>
              <div class="stat-mini">
                <span class="stat-label">Admission Date</span>
                <span class="stat-value">{{ s.admissionDate | date:'dd MMM yyyy' }}</span>
              </div>
            </div>

            <div class="sections-grid">

              <!-- Fee Summary -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-icon">💰</span>
                  <h3 class="section-title">Fee Summary</h3>
                  @if (canCollectFee()) {
                    <button class="btn btn-ghost btn-xs section-action" (click)="openFeeModal()">+ Record Payment</button>
                  }
                </div>
                @if (ledgerState() === 'loading') {
                  <snt-page-state type="loading" [compact]="true" />
                } @else if (ledger()) {
                  <div class="section-body">
                    <div class="fee-stats">
                      <div class="fee-stat">
                        <span class="fee-stat-label">Total Fees</span>
                        <span class="fee-stat-value">{{ ledger()!.totalFees | currency:'INR':'symbol':'1.0-0' }}</span>
                      </div>
                      <div class="fee-stat">
                        <span class="fee-stat-label">Paid</span>
                        <span class="fee-stat-value text-success">{{ ledger()!.totalPaid | currency:'INR':'symbol':'1.0-0' }}</span>
                      </div>
                      <div class="fee-stat fee-stat-due">
                        <span class="fee-stat-label">Balance Due</span>
                        <span class="fee-stat-value">{{ ledger()!.remainingDue | currency:'INR':'symbol':'1.0-0' }}</span>
                      </div>
                    </div>
                    @if (ledger()!.payments.length) {
                      <div class="payment-list">
                        @for (p of ledger()!.payments.slice(0, 5); track p.id) {
                          <div class="payment-row">
                            <span class="payment-date">{{ p.paymentDate | date:'dd MMM yyyy' }}</span>
                            <span class="payment-mode">{{ modeLabel(p.paymentMode) }}</span>
                            <span class="payment-amount">{{ p.amount | currency:'INR':'symbol':'1.0-0' }}</span>
                          </div>
                        }
                        @if (ledger()!.payments.length > 5) {
                          <p class="more-hint">+{{ ledger()!.payments.length - 5 }} more payments</p>
                        }
                      </div>
                    } @else {
                      <snt-page-state type="empty" [compact]="true" title="No payments yet" description="Record the first payment above." />
                    }
                  </div>
                } @else {
                  <snt-page-state type="empty" [compact]="true" title="No fee data" description="Fee records will appear here." />
                }
              </div>

              <!-- Batch Info -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-icon">👥</span>
                  <h3 class="section-title">Batch Info</h3>
                  @if (canAssignBatch()) {
                    <button class="btn btn-ghost btn-xs section-action" (click)="openAssignModal()">+ Assign Batch</button>
                  }
                </div>
                @if (batchState() === 'loading') {
                  <snt-page-state type="loading" [compact]="true" />
                } @else if (assignments().length) {
                  <div class="section-body">
                    @for (a of assignments(); track a.id) {
                      <div class="batch-row">
                        <div class="batch-row-left">
                          <p class="batch-name">{{ a.batch.name }}</p>
                          @if (a.batch.schedule) {
                            <p class="batch-schedule">{{ a.batch.schedule }}</p>
                          }
                          <p class="batch-joined">Joined {{ a.joinedAt | date:'dd MMM yyyy' }}</p>
                        </div>
                        <snt-badge [label]="a.status" [variant]="batchStatusBadge(a.status)" />
                      </div>
                    }
                  </div>
                } @else {
                  <snt-page-state type="empty" [compact]="true" title="No batch assigned" description="Assign this student to a batch above." />
                }
              </div>

              <!-- Attendance -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-icon">✅</span>
                  <h3 class="section-title">Attendance</h3>
                </div>
                @if (attendanceState() === 'loading') {
                  <snt-page-state type="loading" [compact]="true" />
                } @else if (attendance()) {
                  <div class="section-body">
                    <div class="att-stats">
                      <div class="att-stat att-stat-present">
                        <span class="att-stat-value">{{ attendance()!.totalPresent }}</span>
                        <span class="att-stat-label">Present</span>
                      </div>
                      <div class="att-stat att-stat-absent">
                        <span class="att-stat-value">{{ attendance()!.totalAbsent }}</span>
                        <span class="att-stat-label">Absent</span>
                      </div>
                      <div class="att-stat att-stat-leave">
                        <span class="att-stat-value">{{ attendance()!.totalLeave }}</span>
                        <span class="att-stat-label">Leave</span>
                      </div>
                      <div class="att-stat">
                        <span class="att-stat-value">{{ attendancePercent(attendance()!) }}%</span>
                        <span class="att-stat-label">Attendance</span>
                      </div>
                    </div>
                    @if (attendance()!.records.length) {
                      <div class="att-recent">
                        <p class="att-recent-label">Recent</p>
                        @for (r of attendance()!.records.slice(0, 5); track r.id) {
                          <div class="att-row">
                            <span class="att-date">{{ r.attendanceDate | date:'dd MMM' }}</span>
                            <snt-badge [label]="r.status" [variant]="attBadge(r.status)" />
                          </div>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <snt-page-state type="empty" [compact]="true" title="No attendance records" description="Attendance will appear after batch sessions are marked." />
                }
              </div>

              <!-- Exam & Results -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-icon">📝</span>
                  <h3 class="section-title">Exam & Results</h3>
                </div>
                <snt-page-state type="empty" [compact]="true" title="Exam records coming soon" description="Eligibility, registration, and results will appear here." />
              </div>

            </div>
          </div>
        }
      }
    }

    @if (canCollectFee()) {
      <snt-fee-form
        [open]="feeModalOpen()"
        [studentId]="student()?.id ?? null"
        [ledger]="ledger()"
        (collected)="onPaymentCollected()"
        (cancel)="closeFeeModal()"
      />
    }

    @if (canAssignBatch()) {
      <snt-assign-batch-modal
        [open]="assignModalOpen()"
        [studentId]="student()?.id ?? null"
        [studentName]="student()?.fullName ?? null"
        (assigned)="onBatchAssigned()"
        (cancel)="closeAssignModal()"
      />
    }
  `,
  styles: [`
    .profile-layout { display: flex; flex-direction: column; gap: 20px; }
    .profile-header { margin-bottom: -4px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); color: var(--color-text-muted); background: none; border: none; cursor: pointer; padding: 0; }
    .back-link:hover { color: var(--color-primary); }
    .profile-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .profile-card-left { display: flex; align-items: center; gap: 16px; }
    .profile-card-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .profile-avatar {
      width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0;
      background: #d1fae5; color: #065f46;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700;
    }
    .profile-name { font-size: var(--font-size-lg); font-weight: 700; }
    .profile-sub  { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 2px; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .stat-mini {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 14px 16px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .stat-mini-highlight { border-color: #6ee7b7; background: #f0fdf4; }
    .stat-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .stat-value { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); }
    .sections-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .section-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .section-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-bg); }
    .section-icon { font-size: 18px; }
    .section-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); flex: 1; }
    .section-action { margin-left: auto; }
    .section-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
    .fee-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .fee-stat { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
    .fee-stat-due { border-color: #fbbf24; background: #fffbeb; }
    .fee-stat-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .fee-stat-value { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
    .text-success { color: #059669; }
    .payment-list { display: flex; flex-direction: column; gap: 4px; }
    .payment-row { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; font-size: var(--font-size-xs); padding: 4px 0; border-bottom: 1px solid var(--color-border); }
    .payment-date { color: var(--color-text-muted); }
    .payment-mode { color: var(--color-text-muted); }
    .payment-amount { font-weight: 700; color: #059669; }
    .more-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); text-align: center; padding-top: 4px; }
    .batch-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--color-border); }
    .batch-row:last-child { border-bottom: none; }
    .batch-name { font-size: var(--font-size-sm); font-weight: 600; }
    .batch-schedule, .batch-joined { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; }
    .att-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .att-stat { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 8px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
    .att-stat-present { border-color: #6ee7b7; background: #f0fdf4; }
    .att-stat-absent  { border-color: #fca5a5; background: #fef2f2; }
    .att-stat-leave   { border-color: #fcd34d; background: #fffbeb; }
    .att-stat-value { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); }
    .att-stat-label { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .att-recent { display: flex; flex-direction: column; gap: 4px; }
    .att-recent-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); margin-bottom: 2px; }
    .att-row { display: flex; align-items: center; justify-content: space-between; font-size: var(--font-size-xs); padding: 3px 0; }
    .att-date { color: var(--color-text-muted); }
    .btn-sm  { padding: 5px 10px; font-size: var(--font-size-xs); }
    .btn-xs  { padding: 3px 8px; font-size: var(--font-size-xs); }
  `],
})
export class StudentDetailComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly auth        = inject(AuthService);
  private readonly svc         = inject(StudentService);
  private readonly feeSvc      = inject(FeeService);
  private readonly batchStuSvc = inject(BatchStudentService);
  private readonly attSvc      = inject(AttendanceService);
  private readonly destroyRef  = inject(DestroyRef);

  // counselor cannot collect fees or assign batches
  readonly canCollectFee  = computed(() => !this.auth.isCounselor());
  readonly canAssignBatch = computed(() => !this.auth.isCounselor());

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly student  = signal<Student | null>(null);

  readonly ledgerState     = signal<'loading' | 'ready'>('loading');
  readonly batchState      = signal<'loading' | 'ready'>('loading');
  readonly attendanceState = signal<'loading' | 'ready'>('loading');

  readonly ledger      = signal<StudentLedger | null>(null);
  readonly assignments = signal<BatchAssignment[]>([]);
  readonly attendance  = signal<StudentAttendanceResult | null>(null);

  readonly feeModalOpen    = signal(false);
  readonly assignModalOpen = signal(false);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.load(Number(params.get('id')));
      });
  }

  load(id = Number(this.route.snapshot.paramMap.get('id'))): void {
    this.state.set('loading');
    this.svc.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.student.set(s);
          this.state.set('ready');
          this.loadSections(s.id);
        },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  private loadSections(studentId: number): void {
    if (this.canCollectFee()) {
      this.loadLedger(studentId);
    } else {
      this.ledgerState.set('ready');
    }
    this.loadBatchAssignments(studentId);
    this.loadAttendance(studentId);
  }

  private loadLedger(studentId: number): void {
    this.ledgerState.set('loading');
    this.feeSvc.getStudentLedger(studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (l) => { this.ledger.set(l); this.ledgerState.set('ready'); },
        error: () => { this.ledger.set(null); this.ledgerState.set('ready'); },
      });
  }

  private loadBatchAssignments(studentId: number): void {
    this.batchState.set('loading');
    this.batchStuSvc.getByStudent(studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => { this.assignments.set(a); this.batchState.set('ready'); },
        error: () => { this.assignments.set([]); this.batchState.set('ready'); },
      });
  }

  private loadAttendance(studentId: number): void {
    this.attendanceState.set('loading');
    this.attSvc.getByStudent(studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => { this.attendance.set(a); this.attendanceState.set('ready'); },
        error: () => { this.attendance.set(null); this.attendanceState.set('ready'); },
      });
  }

  goBack(): void {
    const base = this.auth.isSuperAdmin() ? '/ho' : '/branch';
    this.router.navigate([base, 'students']);
  }

  viewEnquiry(id: number): void {
    const base = this.auth.isSuperAdmin() ? '/ho' : '/branch';
    this.router.navigate([base, 'enquiries', id]);
  }

  attendancePercent(att: StudentAttendanceResult): number {
    const total = att.totalPresent + att.totalAbsent + att.totalLeave;
    return total > 0 ? Math.round((att.totalPresent / total) * 100) : 0;
  }

  modeLabel(mode: string): string {
    return PAYMENT_MODE_LABELS[mode as keyof typeof PAYMENT_MODE_LABELS] ?? mode;
  }

  batchStatusBadge(status: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      active: 'success', completed: 'info', dropped: 'danger',
    };
    return map[status] ?? 'neutral';
  }

  attBadge(status: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      present: 'success', absent: 'danger', leave: 'warning',
    };
    return map[status] ?? 'neutral';
  }

  openFeeModal(): void    { this.feeModalOpen.set(true); }
  closeFeeModal(): void   { this.feeModalOpen.set(false); }
  openAssignModal(): void  { this.assignModalOpen.set(true); }
  closeAssignModal(): void { this.assignModalOpen.set(false); }

  onPaymentCollected(): void {
    this.closeFeeModal();
    const id = this.student()?.id;
    if (id) this.loadLedger(id);
  }

  onBatchAssigned(): void {
    this.closeAssignModal();
    const id = this.student()?.id;
    if (id) this.loadBatchAssignments(id);
  }
}
