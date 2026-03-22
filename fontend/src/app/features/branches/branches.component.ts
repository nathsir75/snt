import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BranchService } from './branch.service';
import { Branch } from './branch.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { AuthService } from '../../core/auth/auth.service';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-branches',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, PageShellComponent, PageStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Branches"
      subtitle="Manage all franchise branches and their profiles"
      icon="🏢"
    >
      <ng-container slot="actions">
        @if (auth.isSuperAdmin()) {
          <a routerLink="/ho/branches/create" class="btn btn-primary">+ Create Branch</a>
        }
      </ng-container>

      <ng-container slot="filters">
        <input
          class="filter-input"
          type="search"
          placeholder="Search by name, city or code…"
          [(ngModel)]="searchTerm"
        />
        <select class="filter-select" [(ngModel)]="statusFilter">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state type="empty" title="No branches found" description="No branches match your current filters." />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Code</th>
                    <th>City / State</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of filtered(); track b.id) {
                    <tr>
                      <td>
                        <div class="branch-name">
                          <div class="branch-logo-placeholder">{{ b.name[0] }}</div>
                          <span class="font-medium">{{ b.name }}</span>
                        </div>
                      </td>
                      <td><code class="code-badge">{{ b.code }}</code></td>
                      <td>{{ b.city }}@if (b.state) {, {{ b.state }}}</td>
                      <td>
                        <snt-badge [label]="b.status" [variant]="statusColor(b.status)" />
                      </td>
                      <td class="text-muted">{{ b.createdAt | date:'dd MMM yyyy' }}</td>
                      <td>
                        <a [routerLink]="['/ho/branches', b.id]" class="btn btn-secondary btn-sm">
                          View →
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="result-count">{{ filtered().length }} of {{ branches().length }} branches</p>
          }
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .filter-input {
      padding: 7px 12px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-surface); outline: none; min-width: 240px;
    }
    .filter-input:focus { border-color: var(--color-primary); }
    .filter-select {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-surface); outline: none; cursor: pointer;
    }
    .branch-name { display: flex; align-items: center; gap: 10px; }
    .branch-logo { width: 32px; height: 32px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
    .branch-logo-placeholder {
      width: 32px; height: 32px; border-radius: var(--radius-sm);
      background: var(--color-primary-light); color: var(--color-primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; flex-shrink: 0;
    }
    .code-badge {
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); padding: 2px 6px;
      font-size: var(--font-size-xs); font-family: monospace; letter-spacing: .5px;
    }
    .contact-cell { display: flex; flex-direction: column; gap: 2px; font-size: var(--font-size-sm); }
    .font-medium { font-weight: 600; }
    .text-muted { color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .result-count { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .btn-sm { padding: 4px 10px; font-size: var(--font-size-xs); }
  `],
})
export class BranchesComponent implements OnInit {
  private readonly svc        = inject(BranchService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);

  readonly state    = signal<LoadState>('loading');
  readonly branches = signal<Branch[]>([]);

  searchTerm   = '';
  statusFilter = '';

  readonly filtered = computed(() => {
    const term   = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter;
    return this.branches().filter((b) => {
      const matchSearch = !term ||
        b.name.toLowerCase().includes(term) ||
        b.city.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term);
      const matchStatus = !status || b.status === status;
      return matchSearch && matchStatus;
    });
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (data) => { this.branches.set(data); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }

  statusColor(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
    if (status === 'active')    return 'success';
    if (status === 'suspended') return 'danger';
    return 'warning';
  }
}
