import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CourseService } from './course.service';
import { Course } from './course.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { CourseFormComponent } from './course-form.component';

type LoadState = 'loading' | 'error' | 'ready';
const PAGE_SIZE = 15;

@Component({
  selector: 'snt-courses',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent, CourseFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Courses"
      subtitle="Define and manage courses offered across all franchise branches"
      icon="📚"
    >
      <ng-container slot="actions">
        @if (isSuperAdmin()) {
          <button class="btn btn-primary" (click)="openCreate()">+ Create Course</button>
        }
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search name or code…"
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
          <span class="filter-count">{{ filtered().length }} course{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter !== 'all' ? 'No matching courses' : 'No courses defined'"
              [description]="searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Create a course to make it available to branches for enrollment.'"
              [actionLabel]="isSuperAdmin() && !searchTerm && statusFilter === 'all' ? '+ Create Course' : ''"
              (action)="openCreate()"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Code</th>
                    <th>Duration</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Created</th>
                    @if (isSuperAdmin()) { <th></th> }
                  </tr>
                </thead>
                <tbody>
                  @for (c of paginated(); track c.id) {
                    <tr>
                      <td>
                        <a [routerLink]="['/courses', c.id]" class="course-name-link">{{ c.name }}</a>
                      </td>
                      <td><span class="code-pill">{{ c.code }}</span></td>
                      <td class="text-muted">{{ c.durationMonths }} month{{ c.durationMonths !== 1 ? 's' : '' }}</td>
                      <td class="text-muted desc-cell">{{ c.description || '—' }}</td>
                      <td>
                        <snt-badge [label]="c.isActive ? 'Active' : 'Inactive'" [variant]="statusBadge(c)" />
                      </td>
                      <td class="text-muted">{{ c.createdAt | date:'dd MMM yyyy' }}</td>
                      @if (isSuperAdmin()) {
                        <td>
                          <div class="row-actions">
                            <button class="btn btn-ghost btn-sm" (click)="openEdit(c)">Edit</button>
                            <a [routerLink]="['/courses', c.id]" class="btn btn-ghost btn-sm">View →</a>
                          </div>
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

    @if (isSuperAdmin()) {
      <snt-course-form
        [open]="drawerOpen()"
        [course]="editingCourse()"
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
    .course-name-link { font-weight: 600; color: var(--color-primary); text-decoration: none; }
    .course-name-link:hover { text-decoration: underline; }
    .code-pill {
      display: inline-block; padding: 2px 8px;
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-xs);
      font-family: monospace; font-weight: 600; color: var(--color-text-muted);
    }
    .desc-cell { max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row-actions { display: flex; gap: 4px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
  `],
})
export class CoursesComponent implements OnInit {
  private readonly svc        = inject(CourseService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSuperAdmin = this.auth.isSuperAdmin;
  readonly state        = signal<LoadState>('loading');
  readonly errorMsg     = signal<string | null>(null);
  readonly all          = signal<Course[]>([]);
  readonly page         = signal(1);
  readonly drawerOpen   = signal(false);
  readonly editingCourse = signal<Course | null>(null);

  searchTerm   = '';
  statusFilter = 'all';

  readonly filtered = computed(() => {
    const term   = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter;
    return this.all().filter((c) => {
      const matchSearch = !term ||
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term);
      const matchStatus =
        status === 'all' ||
        (status === 'active'   && c.isActive) ||
        (status === 'inactive' && !c.isActive);
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
        next:  (data) => { this.all.set(data); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  statusBadge(c: Course): BadgeVariant { return c.isActive ? 'success' : 'neutral'; }

  openCreate(): void { this.editingCourse.set(null); this.drawerOpen.set(true); }
  openEdit(c: Course): void { this.editingCourse.set(c); this.drawerOpen.set(true); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  onSaved(course: Course): void {
    this.closeDrawer();
    const idx = this.all().findIndex((c) => c.id === course.id);
    if (idx >= 0) {
      this.all.update((list) => list.map((c) => c.id === course.id ? course : c));
    } else {
      this.all.update((list) => [course, ...list]);
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
