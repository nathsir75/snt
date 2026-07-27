import {
  Component, ChangeDetectionStrategy, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { AuthService } from '../../core/auth/auth.service';
import { BranchService } from '../branches/branch.service';
import { BranchOption, Trainer } from './trainer.models';
import { TrainerService } from './trainer.service';
import { TrainerFormComponent } from './trainer-form.component';

type LoadState = 'loading' | 'error' | 'ready';
const PAGE_SIZE = 15;

@Component({
  selector: 'snt-trainers',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    PageShellComponent, PageStateComponent, BadgeComponent, TrainerFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Trainers"
      subtitle="Manage trainers, their specializations, and branch assignments"
      icon="👨‍🏫"
    >
      <ng-container slot="actions">
        <button
          class="btn btn-primary"
          [disabled]="addDisabled()"
          (click)="openCreate()"
        >
          + Add Trainer
        </button>
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search name, email, specialization..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onFilterChange()"
            />
          </div>

          @if (auth.isSuperAdmin()) {
            <select class="filter-select" [(ngModel)]="branchFilter" (ngModelChange)="onFilterChange()">
              <option [ngValue]="null">All Branches</option>
              @for (branch of branches(); track branch.id) {
                <option [ngValue]="branch.id">{{ branch.name }}</option>
              }
            </select>
          }

          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          @if (searchTerm || branchFilter || statusFilter !== 'all') {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }

          <span class="filter-count">{{ filtered().length }} trainer{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @if (branchLoadError()) {
        <snt-page-state
          type="error"
          [description]="branchLoadError() ?? undefined"
          actionLabel="Retry"
          (action)="loadBranches()"
        />
      } @else {
        @switch (state()) {
          @case ('loading') { <snt-page-state type="loading" /> }
          @case ('error') {
            <snt-page-state
              type="error"
              [description]="errorMsg() ?? undefined"
              actionLabel="Retry"
              (action)="loadTrainers()"
            />
          }
          @case ('ready') {
            @if (!filtered().length) {
              <snt-page-state
                type="empty"
                [title]="hasFilters() ? 'No matching trainers' : 'No trainers added'"
                [description]="hasFilters() ? 'Try adjusting your search or filters.' : 'Add a trainer to assign them to batches and schedules.'"
                [actionLabel]="hasFilters() || addDisabled() ? '' : '+ Add Trainer'"
                (action)="openCreate()"
              />
            } @else {
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Trainer</th>
                      <th>Contact</th>
                      <th>Specialization</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (trainer of paginated(); track trainer.id) {
                      <tr>
                        <td>
                          <div class="trainer-cell">
                            <span class="trainer-avatar">{{ initials(trainer.fullName) }}</span>
                            <span class="font-medium">{{ trainer.fullName }}</span>
                          </div>
                        </td>
                        <td>
                          <p class="font-medium">{{ trainer.email || '-' }}</p>
                          <p class="text-muted text-xs">{{ trainer.mobile || 'No mobile' }}</p>
                        </td>
                        <td class="text-muted">{{ trainer.specialization || '-' }}</td>
                        <td>
                          <p class="font-medium">{{ trainer.branch.name }}</p>
                          <p class="text-muted text-xs">{{ trainer.branch.city }}</p>
                        </td>
                        <td>
                          <snt-badge
                            [label]="trainer.isActive ? 'Active' : 'Inactive'"
                            [variant]="statusBadge(trainer)"
                          />
                        </td>
                        <td class="text-muted">{{ trainer.createdAt | date:'dd MMM yyyy' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (totalPages() > 1) {
                <div class="pagination">
                  <button class="btn btn-secondary btn-sm" [disabled]="page() === 1" (click)="setPage(page() - 1)">Prev</button>
                  <span class="pagination-info">Page {{ page() }} of {{ totalPages() }}</span>
                  <button class="btn btn-secondary btn-sm" [disabled]="page() === totalPages()" (click)="setPage(page() + 1)">Next</button>
                </div>
              }
            }
          }
        }
      }
    </snt-page-shell>

    <snt-trainer-form
      [open]="formOpen()"
      [branches]="branches()"
      [lockedBranchId]="lockedBranchId()"
      [lockedBranchName]="lockedBranchName()"
      (saved)="onSaved($event)"
      (cancel)="closeForm()"
    />
  `,
  styles: [`
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      width: 100%;
      padding: 12px 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }
    .search-box { position: relative; flex: 1; min-width: 220px; }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-muted);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 7px 10px 7px 32px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      background: var(--color-bg);
      outline: none;
    }
    .search-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .filter-select {
      padding: 7px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      background: var(--color-bg);
      outline: none;
      cursor: pointer;
    }
    .filter-count {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin-left: auto;
      white-space: nowrap;
    }
    .trainer-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .trainer-avatar {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #dbeafe;
      color: #1e40af;
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 8px 0;
    }
    .pagination-info,
    .text-xs { font-size: var(--font-size-xs); }
    .font-medium { font-weight: 600; }
    .text-muted { color: var(--color-text-muted); }
    @media (max-width: 640px) {
      .filter-count { margin-left: 0; }
      .filter-select { width: 100%; }
    }
  `],
})
export class TrainersComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly trainerSvc = inject(TrainerService);
  private readonly branchSvc = inject(BranchService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly branchLoadError = signal<string | null>(null);
  readonly trainers = signal<Trainer[]>([]);
  readonly branches = signal<BranchOption[]>([]);
  readonly formOpen = signal(false);
  readonly page = signal(1);
  private readonly filterVersion = signal(0);

  searchTerm = '';
  branchFilter: number | null = null;
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  readonly lockedBranchId = computed(() => this.auth.isSuperAdmin() ? null : this.auth.branchId());
  readonly lockedBranchName = computed(() => {
    if (this.auth.isSuperAdmin()) return null;
    return this.auth.currentUser()?.branch?.name ?? 'Your branch';
  });

  readonly addDisabled = computed(() => {
    if (this.auth.isSuperAdmin()) return !this.branches().length;
    return !this.lockedBranchId();
  });

  readonly filtered = computed(() => {
    this.filterVersion();
    const term = this.searchTerm.toLowerCase().trim();
    const branchId = this.branchFilter;
    const status = this.statusFilter;

    return this.trainers().filter((trainer) => {
      const matchSearch = !term ||
        trainer.fullName.toLowerCase().includes(term) ||
        (trainer.email ?? '').toLowerCase().includes(term) ||
        (trainer.mobile ?? '').toLowerCase().includes(term) ||
        (trainer.specialization ?? '').toLowerCase().includes(term);
      const matchBranch = !branchId || trainer.branch.id === branchId;
      const matchStatus =
        status === 'all' ||
        (status === 'active' && trainer.isActive) ||
        (status === 'inactive' && !trainer.isActive);
      return matchSearch && matchBranch && matchStatus;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly paginated = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void {
    if (this.auth.isSuperAdmin()) {
      this.loadBranches();
    }
    this.loadTrainers();
  }

  loadBranches(): void {
    this.branchLoadError.set(null);
    this.branchSvc.listForDropdown()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branches) => this.branches.set(branches),
        error: (error: Error) => this.branchLoadError.set(error.message || 'Could not load branches'),
      });
  }

  loadTrainers(): void {
    this.state.set('loading');
    this.errorMsg.set(null);
    this.trainerSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (trainers) => {
          this.trainers.set(trainers);
          this.state.set('ready');
        },
        error: (error: Error) => {
          this.errorMsg.set(error.message || 'Could not load trainers');
          this.state.set('error');
        },
      });
  }

  openCreate(): void {
    if (this.addDisabled()) return;
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  onSaved(_trainer: Trainer): void {
    this.closeForm();
    this.loadTrainers();
  }

  hasFilters(): boolean {
    return !!this.searchTerm || !!this.branchFilter || this.statusFilter !== 'all';
  }

  onFilterChange(): void {
    this.filterVersion.update((value) => value + 1);
    this.page.set(1);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.branchFilter = null;
    this.statusFilter = 'all';
    this.filterVersion.update((value) => value + 1);
    this.page.set(1);
  }

  setPage(page: number): void {
    this.page.set(page);
  }

  statusBadge(trainer: Trainer): BadgeVariant {
    return trainer.isActive ? 'success' : 'neutral';
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }
}
