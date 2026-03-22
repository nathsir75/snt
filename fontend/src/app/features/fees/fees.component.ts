import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FeeService } from './fee.service';
import { FeePayment, PAYMENT_MODE_LABELS } from './fee.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';

type LoadState = 'loading' | 'error' | 'ready';
const PAGE_SIZE = 15;

@Component({
  selector: 'snt-fees',
  standalone: true,
  imports: [
    FormsModule, DatePipe, CurrencyPipe,
    PageShellComponent, PageStateComponent, BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Fee Collection"
      subtitle="View all payment records. To record a payment, open the student profile."
      icon="💰"
    >
      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search student name, course…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange()"
            />
          </div>
          <select class="filter-select" [(ngModel)]="modeFilter" (ngModelChange)="onFilterChange()">
            <option value="">All Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
          @if (searchTerm || modeFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} payment{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || modeFilter ? 'No matching payments' : 'No payments recorded'"
              [description]="searchTerm || modeFilter ? 'Try adjusting your search or filters.' : 'Open a student profile to record the first payment.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Collected By</th>
                    <th>Remarks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of paginated(); track p.id) {
                    <tr>
                      <td>
                        <p class="font-medium">{{ p.student.fullName }}</p>
                        <p class="text-xs text-muted">{{ p.student.mobile }}</p>
                      </td>
                      <td class="text-muted">{{ p.student.course }}</td>
                      <td>
                        <span class="amount-cell">{{ p.amount | currency:'INR':'symbol':'1.0-0' }}</span>
                      </td>
                      <td>
                        <snt-badge [label]="modeLabel(p.paymentMode)" [variant]="modeBadge(p.paymentMode)" />
                      </td>
                      <td class="text-muted">{{ p.referenceNo || '—' }}</td>
                      <td class="text-muted">{{ p.paymentDate | date:'dd MMM yyyy' }}</td>
                      <td class="text-muted">{{ p.collectedBy.name }}</td>
                      <td class="text-muted">{{ p.remarks || '—' }}</td>
                      <td>
                        <button class="btn btn-ghost btn-sm" (click)="viewStudent(p.student.id)">View →</button>
                      </td>
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
    .amount-cell { font-weight: 700; color: #059669; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
  `],
})
export class FeesComponent implements OnInit {
  private readonly svc        = inject(FeeService);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<FeePayment[]>([]);
  readonly page     = signal(1);

  searchTerm = '';
  modeFilter = '';

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    const mode = this.modeFilter;
    return this.all().filter((p) => {
      const matchSearch = !term ||
        p.student.fullName.toLowerCase().includes(term) ||
        p.student.course.toLowerCase().includes(term) ||
        p.student.mobile.includes(term);
      const matchMode = !mode || p.paymentMode === mode;
      return matchSearch && matchMode;
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
    this.svc.getAllPayments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.all.set(data); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  modeLabel(mode: string): string {
    return PAYMENT_MODE_LABELS[mode as keyof typeof PAYMENT_MODE_LABELS] ?? mode;
  }

  modeBadge(mode: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      cash: 'success', upi: 'primary', card: 'info', bank_transfer: 'neutral',
    };
    return map[mode] ?? 'neutral';
  }

  onSearchChange(): void { this.page.set(1); }
  onFilterChange(): void { this.page.set(1); }
  setPage(p: number): void { this.page.set(p); }

  clearFilters(): void {
    this.searchTerm = '';
    this.modeFilter = '';
    this.page.set(1);
  }

  viewStudent(id: number): void {
    const base = this.auth.isSuperAdmin() ? '/ho' : '/branch';
    this.router.navigate([base, 'students', id]);
  }
}
