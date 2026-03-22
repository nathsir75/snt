import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { PlacementService } from './placement.service';
import { Placement, PlacementSummary, PlacementStatus, PLACEMENT_STATUS_LABELS } from './placement.models';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyService } from '../companies/company.service';
import { JobOpeningService } from '../job-openings/job-opening.service';
import { StudentService } from '../students/student.service';
import { Company } from '../companies/company.models';
import { JobOpening } from '../companies/company.models';
import { Student } from '../students/student.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-placements',
  standalone: true,
  imports: [
    FormsModule, DatePipe, CurrencyPipe, DecimalPipe,
    PageShellComponent, PageStateComponent, BadgeComponent, DrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Placements"
      subtitle="Track student placements at hiring partner companies"
      icon="🏆"
    >
      <ng-container slot="actions">
        @if (auth.isSuperAdmin()) {
          <button class="btn btn-primary" (click)="formOpen.set(true)">+ Record Placement</button>
        }
      </ng-container>

      <!-- Summary stats -->
      @if (summary()) {
        <div class="summary-grid">
          <div class="summary-card">
            <span class="summary-value">{{ summary()!.totalPlaced }}</span>
            <span class="summary-label">Total Placed</span>
          </div>
          <div class="summary-card summary-card-green">
            <span class="summary-value">{{ summary()!.joined }}</span>
            <span class="summary-label">Joined</span>
          </div>
          <div class="summary-card summary-card-yellow">
            <span class="summary-value">{{ summary()!.offers }}</span>
            <span class="summary-label">Offers Pending</span>
          </div>
          <div class="summary-card">
            <span class="summary-value">
              @if (summary()!.avgSalary) {
                ₹{{ summary()!.avgSalary | number:'1.1-1' }} LPA
              } @else {
                —
              }
            </span>
            <span class="summary-label">Avg. Package</span>
          </div>
        </div>
      }

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search student, company…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="page.set(1)"
            />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Status</option>
            <option value="offered">Offered</option>
            <option value="joined">Joined</option>
            <option value="rejected">Rejected</option>
          </select>
          @if (searchTerm || statusFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} placement{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter ? 'No matching placements' : 'No placements recorded'"
              [description]="searchTerm || statusFilter ? 'Try adjusting your search.' : 'Record a student placement at a hiring company.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Company</th>
                    <th>Job Opening</th>
                    <th>Package</th>
                    <th>Joining Date</th>
                    <th>Status</th>
                    <th>Recorded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of paginated(); track p.id) {
                    <tr>
                      <td>
                        <p class="font-medium">{{ p.student.fullName }}</p>
                        <p class="text-xs text-muted">{{ p.student.course }}</p>
                      </td>
                      <td>
                        <p class="font-medium">{{ p.company.name }}</p>
                        @if (p.company.industry) {
                          <p class="text-xs text-muted">{{ p.company.industry }}</p>
                        }
                      </td>
                      <td class="text-muted">{{ p.jobOpening?.title || '—' }}</td>
                      <td>
                        @if (p.salaryPackage) {
                          <span class="salary-chip">₹{{ p.salaryPackage }} LPA</span>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
                      <td class="text-muted">{{ p.joiningDate ? (p.joiningDate | date:'dd MMM yyyy') : '—' }}</td>
                      <td>
                        <snt-badge [label]="statusLabel(p.status)" [variant]="statusBadge(p.status)" />
                      </td>
                      <td class="text-muted">{{ p.createdAt | date:'dd MMM yyyy' }}</td>
                      <td>
                        @if (auth.isSuperAdmin()) {
                          <select class="status-select" [value]="p.status" (change)="updateStatus(p.id, $any($event.target).value)">
                            <option value="offered">Offered</option>
                            <option value="joined">Joined</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        } @else {
                          <snt-badge [label]="statusLabel(p.status)" [variant]="statusBadge(p.status)" />
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

    <!-- Record Placement Drawer -->
    <snt-drawer
      [open]="formOpen()"
      title="Record Placement"
      subtitle="Log a student's placement at a company"
      (closed)="formOpen.set(false)"
    >
      <div class="form-body">
        <div class="field">
          <label class="field-label">Student Search <span class="req">*</span></label>
          <input
            class="field-input"
            type="search"
            placeholder="Type student name…"
            [(ngModel)]="studentSearch"
            (ngModelChange)="onStudentSearch()"
          />
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
          <label class="field-label">Company <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="companyId">
            <option [ngValue]="null">Select company…</option>
            @for (c of companies(); track c.id) {
              <option [ngValue]="c.id">{{ c.name }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label class="field-label">Job Opening</label>
          <select class="field-input" [(ngModel)]="jobOpeningId">
            <option [ngValue]="null">Select job opening (optional)…</option>
            @for (j of jobs(); track j.id) {
              <option [ngValue]="j.id">{{ j.title }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label class="field-label">Salary Package (₹ LPA)</label>
          <input class="field-input" type="number" placeholder="e.g. 6" [(ngModel)]="salaryPackage" min="0" />
        </div>
        <div class="field">
          <label class="field-label">Joining Date</label>
          <input class="field-input" type="date" [(ngModel)]="joiningDate" />
        </div>
        <div class="field">
          <label class="field-label">Status</label>
          <select class="field-input" [(ngModel)]="placementStatus">
            <option value="offered">Offered</option>
            <option value="joined">Joined</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        @if (formError()) {
          <p class="err-msg">{{ formError() }}</p>
        }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="formOpen.set(false)" [disabled]="saving()">Cancel</button>
          <button class="btn btn-primary" (click)="submitPlacement()" [disabled]="saving() || !selectedStudent() || !companyId">
            {{ saving() ? 'Saving…' : 'Record Placement' }}
          </button>
        </div>
      </div>
    </snt-drawer>
  `,
  styles: [`
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .summary-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 16px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .summary-card-green { border-color: #6ee7b7; background: #f0fdf4; }
    .summary-card-yellow { border-color: #fcd34d; background: #fffbeb; }
    .summary-value { font-size: 22px; font-weight: 800; color: var(--color-text); }
    .summary-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .filter-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%;
      padding: 12px 16px; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    }
    .search-box { position: relative; flex: 1; min-width: 200px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input {
      width: 100%; padding: 7px 10px 7px 32px;
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      font-size: var(--font-size-sm); background: var(--color-bg); outline: none;
    }
    .search-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .filter-select {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; cursor: pointer;
    }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .salary-chip { font-size: var(--font-size-xs); font-weight: 700; color: #059669; background: #d1fae5; padding: 2px 8px; border-radius: 999px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .font-medium { font-weight: 600; }
    /* Form */
    .status-select { padding: 5px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-xs); background: var(--color-bg); outline: none; cursor: pointer; }
    .status-select:focus { border-color: var(--color-primary); }
    .form-body { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; position: relative; }
    .field-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .req { color: var(--color-danger); }
    .field-input {
      padding: 8px 12px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none;
    }
    .field-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .student-dropdown {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
      max-height: 200px; overflow-y: auto;
    }
    .student-option {
      display: flex; flex-direction: column; gap: 2px;
      width: 100%; padding: 8px 12px; text-align: left;
      border-bottom: 1px solid var(--color-border);
    }
    .student-option:hover { background: var(--color-bg); }
    .student-name { font-size: var(--font-size-sm); font-weight: 600; }
    .student-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .selected-student {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 10px; background: #d1fae5; border-radius: var(--radius-md);
      font-size: var(--font-size-sm); color: #065f46; font-weight: 600;
    }
    .clear-btn { color: #065f46; font-size: 12px; }
    .err-msg { font-size: var(--font-size-sm); color: var(--color-danger); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
  `],
})
export class PlacementsComponent implements OnInit {
  private readonly svc        = inject(PlacementService);
  private readonly companySvc = inject(CompanyService);
  private readonly jobSvc     = inject(JobOpeningService);
  private readonly stuSvc     = inject(StudentService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<Placement[]>([]);
  readonly summary  = signal<PlacementSummary | null>(null);
  readonly page     = signal(1);
  readonly formOpen = signal(false);
  readonly saving   = signal(false);
  readonly formError = signal<string | null>(null);

  // Form fields
  readonly companies      = signal<Company[]>([]);
  readonly jobs           = signal<JobOpening[]>([]);
  readonly studentResults = signal<Student[]>([]);
  readonly selectedStudent = signal<Student | null>(null);

  studentSearch = '';
  companyId: number | null = null;
  jobOpeningId: number | null = null;
  salaryPackage: number | null = null;
  joiningDate = '';
  placementStatus: PlacementStatus = 'offered';
  searchTerm   = '';
  statusFilter = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly filtered = computed(() => {
    const term   = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter;
    return this.all().filter((p) => {
      const matchSearch = !term ||
        p.student.fullName.toLowerCase().includes(term) ||
        p.company.name.toLowerCase().includes(term);
      const matchStatus = !status || p.status === status;
      return matchSearch && matchStatus;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 15)));
  readonly paginated  = computed(() => {
    const start = (this.page() - 1) * 15;
    return this.filtered().slice(start, start + 15);
  });

  ngOnInit(): void {
    this.load();
    this.companySvc.list(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.companies.set(c), error: () => {} });
    this.jobSvc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (j) => this.jobs.set(j), error: () => {} });
  }

  load(): void {
    this.state.set('loading');
    this.svc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.all.set(data); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
    this.svc.getSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.summary.set(s), error: () => {} });
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

  selectStudent(s: Student): void {
    this.selectedStudent.set(s);
    this.studentSearch = '';
    this.studentResults.set([]);
  }

  submitPlacement(): void {
    const student = this.selectedStudent();
    if (!student || !this.companyId) return;
    this.saving.set(true);
    this.formError.set(null);
    this.svc.create({
      studentId:  student.id,
      companyId:  this.companyId,
      status:     this.placementStatus,
      ...(this.jobOpeningId  && { jobOpeningId:  this.jobOpeningId }),
      ...(this.salaryPackage && { salaryPackage: this.salaryPackage }),
      ...(this.joiningDate   && { joiningDate:   this.joiningDate }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.selectedStudent.set(null);
          this.companyId = null; this.jobOpeningId = null;
          this.salaryPackage = null; this.joiningDate = '';
          this.placementStatus = 'offered';
          this.load();
        },
        error: (e: Error) => { this.saving.set(false); this.formError.set(e.message); },
      });
  }

  updateStatus(id: number, status: string): void {
    this.svc.updateStatus(id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.all.update((list) => list.map((p) => p.id === id ? { ...p, status: updated.status } : p)),
        error: (e: Error) => alert(e.message),
      });
  }

  statusLabel(status: string): string {
    return PLACEMENT_STATUS_LABELS[status as PlacementStatus] ?? status;
  }

  statusBadge(status: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      offered: 'warning', joined: 'success', rejected: 'danger',
    };
    return map[status] ?? 'neutral';
  }

  clearFilters(): void { this.searchTerm = ''; this.statusFilter = ''; this.page.set(1); }
}
