import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { JobOpeningService } from './job-opening.service';
import { JobOpening } from '../companies/company.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { JobFormComponent } from './job-form.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-job-openings',
  standalone: true,
  imports: [
    FormsModule, DatePipe, CurrencyPipe,
    PageShellComponent, PageStateComponent, BadgeComponent, JobFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Job Openings"
      subtitle="View and manage active job openings from hiring partner companies"
      icon="💼"
    >
      <ng-container slot="actions">
        @if (auth.isSuperAdmin()) {
          <button class="btn btn-primary" (click)="formOpen.set(true)">+ Post Opening</button>
        }
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search title, company, location…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="page.set(1)"
            />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          @if (searchTerm || statusFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} opening{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter ? 'No matching openings' : 'No job openings'"
              [description]="searchTerm || statusFilter ? 'Try adjusting your search.' : 'Post a job opening from a partner company.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Package</th>
                    <th>Skills</th>
                    <th>Status</th>
                    <th>Posted</th>
                    @if (auth.isSuperAdmin()) { <th>Actions</th> }
                  </tr>
                </thead>
                <tbody>
                  @for (j of paginated(); track j.id) {
                    <tr>
                      <td>
                        <p class="font-medium">{{ j.title }}</p>
                        @if (j.description) {
                          <p class="text-xs text-muted desc-clip">{{ j.description }}</p>
                        }
                      </td>
                      <td>
                        <p class="font-medium">{{ j.company.name }}</p>
                        @if (j.company.industry) {
                          <p class="text-xs text-muted">{{ j.company.industry }}</p>
                        }
                      </td>
                      <td class="text-muted">{{ j.location || j.company.location || '—' }}</td>
                      <td>
                        @if (j.salaryPackage) {
                          <span class="salary-chip">₹{{ j.salaryPackage }} LPA</span>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
                      <td class="text-muted skills-cell">{{ j.requiredSkills || '—' }}</td>
                      <td>
                        <snt-badge [label]="j.status" [variant]="j.status === 'open' ? 'success' : 'neutral'" />
                      </td>
                      <td class="text-muted">{{ j.createdAt | date:'dd MMM yyyy' }}</td>
                      @if (auth.isSuperAdmin()) {
                        <td>
                          @if (j.status === 'open') {
                            <button class="btn btn-ghost btn-sm" (click)="toggleStatus(j)">Close</button>
                          } @else {
                            <button class="btn btn-ghost btn-sm" (click)="toggleStatus(j)">Reopen</button>
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

    <snt-job-form
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
    .salary-chip { font-size: var(--font-size-xs); font-weight: 700; color: #059669; background: #d1fae5; padding: 2px 8px; border-radius: 999px; }
    .skills-cell { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .desc-clip { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .font-medium { font-weight: 600; }
  `],
})
export class JobOpeningsComponent implements OnInit {
  private readonly svc        = inject(JobOpeningService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<JobOpening[]>([]);
  readonly page     = signal(1);
  readonly formOpen = signal(false);

  searchTerm   = '';
  statusFilter = '';

  readonly filtered = computed(() => {
    const term   = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter;
    return this.all().filter((j) => {
      const matchSearch = !term ||
        j.title.toLowerCase().includes(term) ||
        j.company.name.toLowerCase().includes(term) ||
        (j.location ?? '').toLowerCase().includes(term) ||
        (j.requiredSkills ?? '').toLowerCase().includes(term);
      const matchStatus = !status || j.status === status;
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

  toggleStatus(job: JobOpening): void {
    const newStatus = job.status === 'open' ? 'closed' : 'open';
    this.svc.updateStatus(job.id, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.load(), error: (e: Error) => alert(e.message) });
  }

  onSaved(): void {
    this.formOpen.set(false);
    this.load();
  }

  clearFilters(): void {
    this.searchTerm = ''; this.statusFilter = ''; this.page.set(1);
  }
}
