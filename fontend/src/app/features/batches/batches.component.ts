import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BatchService } from './batch.service';
import { Batch, BatchStatusFilter } from './batch.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { BatchFormComponent } from './batch-form.component';

type LoadState = 'loading' | 'error' | 'ready';
const PAGE_SIZE = 15;

@Component({
  selector: 'snt-batches',
  standalone: true,
  imports: [
    FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent, BatchFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Batches"
      [subtitle]="canWrite() ? 'Create and manage training batches, assign students and trainers' : 'View available training batches and their schedules'"
      icon="👥"
    >
      @if (canWrite()) {
        <ng-container slot="actions">
          <button class="btn btn-primary" (click)="openCreate()">+ Create Batch</button>
        </ng-container>
      }

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search batch name, course…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange()"
            />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          @if (searchTerm || statusFilter !== 'all') {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} batch{{ filtered().length !== 1 ? 'es' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter !== 'all' ? 'No matching batches' : 'No batches created'"
              [description]="searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Batches will appear here once created by the branch admin.'"
              [actionLabel]="canWrite() && !searchTerm && statusFilter === 'all' ? '+ Create Batch' : ''"
              (action)="openCreate()"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Course</th>
                    <th>Schedule</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Students</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    @if (canWrite()) { <th></th> }
                  </tr>
                </thead>
                <tbody>
                  @for (b of paginated(); track b.id) {
                    <tr>
                      <td>
                        <p class="font-medium">{{ b.name }}</p>
                        <p class="text-xs text-muted">{{ b.branch.name }}</p>
                      </td>
                      <td>
                        <p class="font-medium">{{ b.course.name }}</p>
                        <p class="text-xs text-muted">{{ b.course.code }}</p>
                      </td>
                      <td class="text-muted">{{ b.schedule || '—' }}</td>
                      <td class="text-muted">{{ b.startDate | date:'dd MMM yyyy' }}</td>
                      <td class="text-muted">{{ b.endDate ? (b.endDate | date:'dd MMM yyyy') : '—' }}</td>
                      <td>{{ b._count.batchStudents }}</td>
                      <td class="text-muted">{{ b.capacity ?? '∞' }}</td>
                      <td>
                        <snt-badge [label]="b.isActive ? 'Active' : 'Inactive'" [variant]="statusBadge(b)" />
                      </td>
                      @if (canWrite()) {
                        <td>
                          <button class="btn btn-ghost btn-sm" (click)="openEdit(b)">Edit</button>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="btn btn-secondary btn-sm" [disabled]="page() === 1" (click)="setPage(page() - 1)">← Prev</button>
                <span class="pagination-info">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="btn btn-secondary btn-sm" [disabled]="page() === totalPages()" (click)="setPage(page() + 1)">Next →</button>
              </div>
            }
          }
        }
      }
    </snt-page-shell>

    @if (canWrite()) {
      <snt-batch-form
        [open]="drawerOpen()"
        [batch]="editingBatch()"
        (saved)="onSaved($event)"
        (cancel)="closeDrawer()"
      />
    }
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
    .text-xs { font-size: var(--font-size-xs); }
  `],
})
export class BatchesComponent implements OnInit {
  private readonly svc        = inject(BatchService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // counselor gets read-only view; super_admin and branch_admin can write
  readonly canWrite = computed(() => !this.auth.isCounselor());

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<Batch[]>([]);
  readonly page     = signal(1);
  readonly drawerOpen   = signal(false);
  readonly editingBatch = signal<Batch | null>(null);

  searchTerm   = '';
  statusFilter: BatchStatusFilter = 'all';

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter;
    return this.all().filter((b) => {
      const matchSearch = !term ||
        b.name.toLowerCase().includes(term) ||
        b.course.name.toLowerCase().includes(term) ||
        b.course.code.toLowerCase().includes(term);
      const matchStatus =
        status === 'all' ||
        (status === 'active' && b.isActive) ||
        (status === 'inactive' && !b.isActive);
      return matchSearch && matchStatus;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly paginated  = computed(() => {
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

  statusBadge(b: Batch): BadgeVariant {
    return b.isActive ? 'success' : 'neutral';
  }

  openCreate(): void { this.editingBatch.set(null); this.drawerOpen.set(true); }
  openEdit(b: Batch): void { this.editingBatch.set(b); this.drawerOpen.set(true); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  onSaved(batch: Batch): void {
    this.closeDrawer();
    const existing = this.all().findIndex((b) => b.id === batch.id);
    if (existing >= 0) {
      this.all.update((list) => list.map((b) => b.id === batch.id ? batch : b));
    } else {
      this.all.update((list) => [batch, ...list]);
    }
  }

  onSearchChange(): void { this.page.set(1); }
  onFilterChange(): void { this.page.set(1); }
  setPage(p: number): void { this.page.set(p); }

  clearFilters(): void {
    this.searchTerm   = '';
    this.statusFilter = 'all';
    this.page.set(1);
  }
}
