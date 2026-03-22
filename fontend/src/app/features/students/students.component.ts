import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { StudentService } from './student.service';
import { Student } from './student.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

type LoadState = 'loading' | 'error' | 'ready';

const PAGE_SIZE = 15;

@Component({
  selector: 'snt-students',
  standalone: true,
  imports: [
    FormsModule, DatePipe, CurrencyPipe,
    PageShellComponent, PageStateComponent, BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Students"
      subtitle="Manage enrolled students, their batches, and academic progress"
      icon="🎓"
    >
      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search name, mobile, course…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange()"
            />
          </div>
          <select class="filter-select" [(ngModel)]="courseFilter" (ngModelChange)="onFilterChange()">
            <option value="">All Courses</option>
            @for (c of courseOptions(); track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
          @if (searchTerm || courseFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} student{{ filtered().length !== 1 ? 's' : '' }}</span>
          <button class="btn btn-secondary btn-sm" (click)="exportCsv()">⬇ Export CSV</button>
        </div>
      </ng-container>

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
              [title]="searchTerm || courseFilter ? 'No matching students' : 'No students enrolled'"
              [description]="searchTerm || courseFilter ? 'Try adjusting your search or filters.' : 'Students will appear here after admission or enquiry conversion.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Mobile</th>
                    <th>Course</th>
                    <th>Branch</th>
                    <th>Final Fees</th>
                    <th>Admission Date</th>
                    <th>Source</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of paginated(); track s.id) {
                    <tr>
                      <td>
                        <div class="cell-name">
                          <span class="cell-avatar">{{ s.fullName.charAt(0).toUpperCase() }}</span>
                          <div>
                            <p class="font-medium">{{ s.fullName }}</p>
                            @if (s.email) {
                              <p class="text-xs text-muted">{{ s.email }}</p>
                            }
                          </div>
                        </div>
                      </td>
                      <td>{{ s.mobile }}</td>
                      <td>{{ s.course }}</td>
                      <td>{{ s.branch.name }}</td>
                      <td>{{ s.finalFees | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td class="text-muted">{{ s.admissionDate | date:'dd MMM yyyy' }}</td>
                      <td>
                        @if (s.enquiry) {
                          <snt-badge label="Via Enquiry" variant="info" />
                        } @else {
                          <snt-badge label="Direct" variant="neutral" />
                        }
                      </td>
                      <td>
                        <button class="btn btn-ghost btn-sm" (click)="viewStudent(s.id)">View →</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

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
    .cell-name { display: flex; align-items: center; gap: 10px; }
    .cell-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: #d1fae5; color: #065f46;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700;
    }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
  `],
})
export class StudentsComponent implements OnInit {
  private readonly svc        = inject(StudentService);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<Student[]>([]);
  readonly page     = signal(1);

  searchTerm   = '';
  courseFilter = '';

  readonly courseOptions = computed(() =>
    [...new Set(this.all().map((s) => s.course))].sort()
  );

  readonly filtered = computed(() => {
    const term   = this.searchTerm.toLowerCase().trim();
    const course = this.courseFilter;
    return this.all().filter((s) => {
      const matchSearch = !term ||
        s.fullName.toLowerCase().includes(term) ||
        s.mobile.includes(term) ||
        s.course.toLowerCase().includes(term) ||
        (s.email?.toLowerCase().includes(term) ?? false);
      const matchCourse = !course || s.course === course;
      return matchSearch && matchCourse;
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

  viewStudent(id: number): void {
    const base = this.auth.isSuperAdmin() ? '/ho' : '/branch';
    this.router.navigate([base, 'students', id]);
  }

  onSearchChange(): void { this.page.set(1); }
  onFilterChange(): void { this.page.set(1); }
  setPage(p: number): void { this.page.set(p); }

  clearFilters(): void {
    this.searchTerm   = '';
    this.courseFilter = '';
    this.page.set(1);
  }

  exportCsv(): void {
    const rows = [
      ['Name', 'Mobile', 'Email', 'City', 'Course', 'Branch', 'Final Fees', 'Admission Date'],
      ...this.filtered().map((s) => [
        s.fullName, s.mobile, s.email ?? '', s.city, s.course,
        s.branch.name, s.finalFees,
        new Date(s.admissionDate).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'students.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}
