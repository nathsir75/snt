import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CompanyService } from './company.service';
import { Company } from './company.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { CompanyFormComponent } from './company-form.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-companies',
  standalone: true,
  imports: [
    FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent, CompanyFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Companies"
      subtitle="Manage hiring partner companies for placement drives"
      icon="🏢"
    >
      <ng-container slot="actions">
        @if (auth.isSuperAdmin()) {
          <button class="btn btn-primary" (click)="openForm()">+ Add Company</button>
        }
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search company, industry, location…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="page.set(1)"
            />
          </div>
          <select class="filter-select" [(ngModel)]="activeFilter" (ngModelChange)="page.set(1)">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          @if (searchTerm || activeFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} compan{{ filtered().length !== 1 ? 'ies' : 'y' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || activeFilter ? 'No matching companies' : 'No companies added'"
              [description]="searchTerm || activeFilter ? 'Try adjusting your search.' : 'Add hiring partner companies to create job openings.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Contact Person</th>
                    <th>Email / Phone</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of paginated(); track c.id) {
                    <tr>
                      <td>
                        <p class="font-medium">{{ c.name }}</p>
                      </td>
                      <td class="text-muted">{{ c.industry || '—' }}</td>
                      <td class="text-muted">{{ c.contactPerson || '—' }}</td>
                      <td>
                        @if (c.contactEmail) { <p class="text-sm">{{ c.contactEmail }}</p> }
                        @if (c.contactPhone) { <p class="text-xs text-muted">{{ c.contactPhone }}</p> }
                        @if (!c.contactEmail && !c.contactPhone) { <span class="text-muted">—</span> }
                      </td>
                      <td class="text-muted">{{ c.location || '—' }}</td>
                      <td>
                        <snt-badge [label]="c.isActive ? 'Active' : 'Inactive'" [variant]="c.isActive ? 'success' : 'neutral'" />
                      </td>
                      <td class="text-muted">{{ c.createdAt | date:'dd MMM yyyy' }}</td>
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

    <snt-company-form
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
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-sm { font-size: var(--font-size-sm); }
    .text-xs { font-size: var(--font-size-xs); }
    .font-medium { font-weight: 600; }
  `],
})
export class CompaniesComponent implements OnInit {
  private readonly svc        = inject(CompanyService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<Company[]>([]);
  readonly page     = signal(1);
  readonly formOpen = signal(false);

  searchTerm   = '';
  activeFilter = '';

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    const af   = this.activeFilter;
    return this.all().filter((c) => {
      const matchSearch = !term ||
        c.name.toLowerCase().includes(term) ||
        (c.industry ?? '').toLowerCase().includes(term) ||
        (c.location ?? '').toLowerCase().includes(term) ||
        (c.contactPerson ?? '').toLowerCase().includes(term);
      const matchActive = !af ||
        (af === 'active' && c.isActive) ||
        (af === 'inactive' && !c.isActive);
      return matchSearch && matchActive;
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

  openForm(): void { this.formOpen.set(true); }

  onSaved(): void {
    this.formOpen.set(false);
    this.load();
  }

  clearFilters(): void {
    this.searchTerm = ''; this.activeFilter = ''; this.page.set(1);
  }
}
