import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: { name: string } | string;
  isActive: boolean;
  createdAt: string;
  branch: { id: number; name: string } | null;
}

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-users',
  standalone: true,
  imports: [FormsModule, DatePipe, PageShellComponent, PageStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Users"
      subtitle="View all staff accounts across branches"
      icon="👥"
    >
      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="search-input" type="search" placeholder="Search name, email…" [(ngModel)]="searchTerm" (ngModelChange)="page.set(1)" />
          </div>
          <select class="filter-select" [(ngModel)]="roleFilter" (ngModelChange)="page.set(1)">
            <option value="">All Roles</option>
            <option value="branch_admin">Branch Admin</option>
            <option value="counselor">Counselor</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          @if (searchTerm || roleFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} user{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || roleFilter ? 'No matching users' : 'No users found'"
              description="Users are created when branches are onboarded."
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of paginated(); track u.id) {
                    <tr>
                      <td class="font-medium">{{ u.name }}</td>
                      <td class="text-muted">{{ u.email }}</td>
                      <td>
                        <snt-badge [label]="roleLabel(u.role)" [variant]="roleBadge(u.role)" />
                      </td>
                      <td class="text-muted">{{ u.branch?.name || '—' }}</td>
                      <td>
                        <snt-badge [label]="u.isActive ? 'Active' : 'Inactive'" [variant]="u.isActive ? 'success' : 'neutral'" />
                      </td>
                      <td class="text-muted">{{ u.createdAt | date:'dd MMM yyyy' }}</td>
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
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .search-box { position: relative; flex: 1; min-width: 200px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { width: 100%; padding: 7px 10px 7px 32px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; }
    .search-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .filter-select { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; cursor: pointer; }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .font-medium { font-weight: 600; }
    .text-muted { color: var(--color-text-muted); }
  `],
})
export class UsersComponent implements OnInit {
  private readonly api        = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<LoadState>('loading');
  readonly all   = signal<UserRow[]>([]);
  readonly page  = signal(1);

  searchTerm = '';
  roleFilter = '';

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    const role = this.roleFilter;
    return this.all().filter((u) => {
      const matchSearch = !term ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);
      const matchRole = !role || this.roleName(u.role) === role;
      return matchSearch && matchRole;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 20)));
  readonly paginated  = computed(() => this.filtered().slice((this.page() - 1) * 20, this.page() * 20));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.api.get<UserRow[]>('/users')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (data) => { this.all.set(data); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }

  roleName(role: { name: string } | string): string {
    return typeof role === 'object' && role !== null ? role.name : (role ?? '');
  }

  roleLabel(role: { name: string } | string): string {
    const key = this.roleName(role);
    const map: Record<string, string> = {
      super_admin: 'Super Admin', branch_admin: 'Branch Admin',
      counselor: 'Counselor', teacher: 'Teacher', student: 'Student',
    };
    return map[key] ?? key;
  }

  roleBadge(role: { name: string } | string): BadgeVariant {
    const key = this.roleName(role);
    const map: Record<string, BadgeVariant> = {
      super_admin: 'danger', branch_admin: 'info',
      counselor: 'warning', teacher: 'success', student: 'neutral',
    };
    return map[key] ?? 'neutral';
  }

  clearFilters(): void { this.searchTerm = ''; this.roleFilter = ''; this.page.set(1); }
}
