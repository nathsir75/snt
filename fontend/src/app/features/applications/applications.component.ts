import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../placements/placement.service';
import { Application, ApplicationStatus, APPLICATION_STATUS_LABELS } from '../placements/placement.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { ApplicationFormComponent } from './application-form.component';

type LoadState = 'loading' | 'error' | 'ready';

const STATUS_ORDER: ApplicationStatus[] = ['applied', 'shortlisted', 'selected', 'rejected'];

@Component({
  selector: 'snt-applications',
  standalone: true,
  imports: [
    FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent, ApplicationFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Applications"
      subtitle="Track student applications to job openings and their current status"
      icon="📨"
    >
      <ng-container slot="actions">
        <button class="btn btn-primary" (click)="formOpen.set(true)">+ Add Application</button>
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search student, company, job…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="page.set(1)"
            />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Status</option>
            @for (s of statusOptions; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
          @if (searchTerm || statusFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} application{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      <!-- Pipeline summary bar -->
      @if (state() === 'ready' && all().length) {
        <div class="pipeline-bar">
          @for (s of statusOptions; track s.value) {
            <div class="pipeline-stage" [class.pipeline-stage-active]="statusFilter === s.value" (click)="setStatusFilter(s.value)">
              <span class="pipeline-count">{{ countByStatus(s.value) }}</span>
              <span class="pipeline-label">{{ s.label }}</span>
            </div>
          }
        </div>
      }

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter ? 'No matching applications' : 'No applications found'"
              [description]="searchTerm || statusFilter ? 'Try adjusting your search or filters.' : 'Add a student application to a job interview.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Job Opening</th>
                    <th>Company</th>
                    <th>Interview Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Applied</th>
                    @if (auth.isSuperAdmin()) { <th>Actions</th> }
                  </tr>
                </thead>
                <tbody>
                  @for (a of paginated(); track a.id) {
                    <tr>
                      <td>
                        <p class="font-medium">{{ a.student.fullName }}</p>
                        <p class="text-xs text-muted">{{ a.student.course }}</p>
                      </td>
                      <td class="font-medium">{{ a.interview.jobOpening.title }}</td>
                      <td class="text-muted">{{ a.interview.jobOpening.company.name }}</td>
                      <td class="text-muted">{{ a.interview.interviewDate | date:'dd MMM yyyy' }}</td>
                      <td>
                        <snt-badge [label]="statusLabel(a.status)" [variant]="statusBadge(a.status)" />
                      </td>
                      <td class="text-muted">{{ a.remarks || '—' }}</td>
                      <td class="text-muted">{{ a.createdAt | date:'dd MMM yyyy' }}</td>
                      @if (auth.isSuperAdmin()) {
                        <td>
                          <select
                            class="status-select"
                            [value]="a.status"
                            (change)="updateStatus(a, $event)"
                          >
                            @for (s of statusOptions; track s.value) {
                              <option [value]="s.value">{{ s.label }}</option>
                            }
                          </select>
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

    <snt-application-form
      [open]="formOpen()"
      (saved)="onSaved()"
      (cancel)="formOpen.set(false)"
    />
  `,
  styles: [`
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
    /* Pipeline bar */
    .pipeline-bar {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    }
    .pipeline-stage {
      background: var(--color-surface); border: 2px solid var(--color-border);
      border-radius: var(--radius-md); padding: 12px 16px;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      cursor: pointer; transition: border-color .15s, background .15s;
    }
    .pipeline-stage:hover { border-color: var(--color-primary); }
    .pipeline-stage-active { border-color: var(--color-primary); background: var(--color-primary-light); }
    .pipeline-count { font-size: 22px; font-weight: 800; color: var(--color-text); }
    .pipeline-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    /* Status select */
    .status-select {
      padding: 4px 8px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-xs);
      background: var(--color-bg); outline: none; cursor: pointer;
    }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .font-medium { font-weight: 600; }
  `],
})
export class ApplicationsComponent implements OnInit {
  private readonly svc        = inject(ApplicationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<Application[]>([]);
  readonly page     = signal(1);
  readonly formOpen = signal(false);

  searchTerm   = '';
  statusFilter = '';

  readonly statusOptions = STATUS_ORDER.map((v) => ({
    value: v,
    label: APPLICATION_STATUS_LABELS[v],
  }));

  readonly filtered = computed(() => {
    const term   = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter;
    return this.all().filter((a) => {
      const matchSearch = !term ||
        a.student.fullName.toLowerCase().includes(term) ||
        a.interview.jobOpening.title.toLowerCase().includes(term) ||
        a.interview.jobOpening.company.name.toLowerCase().includes(term);
      const matchStatus = !status || a.status === status;
      return matchSearch && matchStatus;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 15)));
  readonly paginated  = computed(() => {
    const start = (this.page() - 1) * 15;
    return this.filtered().slice(start, start + 15);
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.all.set(data); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  countByStatus(status: string): number {
    return this.all().filter((a) => a.status === status).length;
  }

  setStatusFilter(status: string): void {
    this.statusFilter = this.statusFilter === status ? '' : status;
    this.page.set(1);
  }

  updateStatus(app: Application, event: Event): void {
    const newStatus = (event.target as HTMLSelectElement).value as ApplicationStatus;
    if (newStatus === app.status) return;
    this.svc.updateStatus(app.id, { status: newStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.load(), error: (e: Error) => alert(e.message) });
  }

  statusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus] ?? status;
  }

  statusBadge(status: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      applied: 'info', shortlisted: 'warning', selected: 'success', rejected: 'danger',
    };
    return map[status] ?? 'neutral';
  }

  onSaved(): void { this.formOpen.set(false); this.load(); }

  clearFilters(): void { this.searchTerm = ''; this.statusFilter = ''; this.page.set(1); }
}
