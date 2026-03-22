import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { EnquiryService } from './enquiry.service';
import {
  Enquiry, EnquiryStatus,
  ENQUIRY_STATUS_LABELS, ENQUIRY_STATUS_BADGE,
} from './enquiry.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { EnquiryFormComponent } from './enquiry-form.component';
import { AuthService } from '../../core/auth/auth.service';

type LoadState = 'loading' | 'error' | 'ready';

const PAGE_SIZE = 15;

@Component({
  selector: 'snt-enquiries',
  standalone: true,
  imports: [
    FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent,
    EnquiryFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Enquiries"
      subtitle="Track and manage incoming student enquiries"
      icon="📋"
    >
      <!-- Actions -->
      <ng-container slot="actions">
        <button class="btn btn-primary" (click)="openCreate()">+ New Enquiry</button>
        <button class="btn btn-secondary" (click)="exportCsv()">⬇ Export CSV</button>
      </ng-container>

      <!-- Filters -->
      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-box__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-box__input"
              type="search"
              placeholder="Search name, mobile, course…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange()"
            />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="follow_up">Follow Up</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
          @if (searchTerm || statusFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} result{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      <!-- Content -->
      @switch (state()) {
        @case ('loading') {
          <snt-page-state type="loading" />
        }
        @case ('error') {
          <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" />
        }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter ? 'No matching enquiries' : 'No enquiries yet'"
              [description]="searchTerm || statusFilter ? 'Try adjusting your search or filters.' : 'Enquiries will appear here once recorded.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Course Interest</th>
                    <th>Source</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of paginated(); track e.id) {
                    <tr>
                      <td>
                        <div class="cell-name">
                          <span class="cell-avatar">{{ e.fullName.charAt(0).toUpperCase() }}</span>
                          <div>
                            <p class="font-medium">{{ e.fullName }}</p>
                            @if (e.email) {
                              <p class="text-xs text-muted">{{ e.email }}</p>
                            }
                          </div>
                        </div>
                      </td>
                      <td>{{ e.mobile }}</td>
                      <td>{{ e.courseInterest }}</td>
                      <td>{{ e.source ?? '—' }}</td>
                      <td>{{ e.branch.name }}</td>
                      <td>
                        <snt-badge [label]="statusLabel(e.status)" [variant]="statusBadge(e.status)" />
                      </td>
                      <td class="text-muted">{{ e.createdAt | date:'dd MMM yyyy' }}</td>
                      <td>
                        <button class="btn btn-ghost btn-sm" (click)="viewEnquiry(e.id)">View →</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="btn btn-secondary btn-sm" [disabled]="page() === 1" (click)="setPage(page() - 1)">← Prev</button>
                <span class="pagination__info">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="btn btn-secondary btn-sm" [disabled]="page() === totalPages()" (click)="setPage(page() + 1)">Next →</button>
              </div>
            }
          }
        }
      }
    </snt-page-shell>

    <!-- Create drawer -->
    <snt-enquiry-form
      [open]="createOpen()"
      [enquiry]="null"
      (saved)="onCreated($event)"
      (cancel)="createOpen.set(false)"
    />
  `,
  styles: [`
    .filter-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%;
      padding: 12px 16px; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    }
    .search-box {
      position: relative; flex: 1; min-width: 200px;
    }
    .search-box__icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-box__input {
      width: 100%; padding: 7px 10px 7px 32px;
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      font-size: var(--font-size-sm); background: var(--color-bg); outline: none;
    }
    .search-box__input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .filter-select {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; cursor: pointer;
    }
    .filter-select:focus { border-color: var(--color-primary); }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .cell-name { display: flex; align-items: center; gap: 10px; }
    .cell-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: var(--color-primary-light); color: var(--color-primary-dark);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700;
    }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 8px 0;
    }
    .pagination__info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
  `],
})
export class EnquiriesComponent implements OnInit {
  private readonly svc        = inject(EnquiryService);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSuperAdmin = this.auth.isSuperAdmin;

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<Enquiry[]>([]);
  readonly page     = signal(1);
  readonly createOpen = signal(false);

  searchTerm   = '';
  statusFilter = '';

  readonly filtered = computed(() => {
    const term   = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter as EnquiryStatus | '';
    return this.all().filter((e) => {
      const matchSearch = !term ||
        e.fullName.toLowerCase().includes(term) ||
        e.mobile.includes(term) ||
        e.courseInterest.toLowerCase().includes(term) ||
        (e.email?.toLowerCase().includes(term) ?? false);
      const matchStatus = !status || e.status === status;
      return matchSearch && matchStatus;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  readonly paginated = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.all.set(data); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  onSearchChange(): void { this.page.set(1); }
  onFilterChange(): void { this.page.set(1); }
  setPage(p: number): void { this.page.set(p); }

  clearFilters(): void {
    this.searchTerm   = '';
    this.statusFilter = '';
    this.page.set(1);
  }

  openCreate(): void { this.createOpen.set(true); }

  onCreated(e: Enquiry): void {
    this.all.update((list) => [e, ...list]);
    this.createOpen.set(false);
  }

  exportCsv(): void {
    const rows = [
      ['Name', 'Mobile', 'Email', 'Course Interest', 'Source', 'Branch', 'Status', 'Date'],
      ...this.filtered().map((e) => [
        e.fullName, e.mobile, e.email ?? '', e.courseInterest,
        e.source ?? '', e.branch.name, e.status,
        new Date(e.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'enquiries.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  viewEnquiry(id: number): void {
    const base = this.auth.isSuperAdmin() ? '/ho' : '/branch';
    this.router.navigate([base, 'enquiries', id]);
  }

  statusLabel(s: EnquiryStatus): string { return ENQUIRY_STATUS_LABELS[s]; }
  statusBadge(s: EnquiryStatus): BadgeVariant { return ENQUIRY_STATUS_BADGE[s] as BadgeVariant; }
}
