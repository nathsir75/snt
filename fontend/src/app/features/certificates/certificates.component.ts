import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CertificateService } from './certificate.service';
import { Certificate } from './certificate.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CertificateFormComponent } from './certificate-form.component';

type LoadState = 'loading' | 'error' | 'ready';
const PAGE_SIZE = 15;

@Component({
  selector: 'snt-certificates',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent,
    ConfirmDialogComponent, CertificateFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Certificates"
      subtitle="Issue and verify student course completion certificates"
      icon="🎖️"
    >
      <ng-container slot="actions">
        @if (auth.isSuperAdmin()) {
          <button class="btn btn-primary" (click)="openIssueModal()">+ Issue Certificate</button>
        }
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search student, course, cert no…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="page.set(1)"
            />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Status</option>
            <option value="issued">Issued</option>
            <option value="revoked">Revoked</option>
          </select>
          @if (searchTerm || statusFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} certificate{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm || statusFilter ? 'No matching certificates' : 'No certificates issued'"
              [description]="searchTerm || statusFilter ? 'Try adjusting your search or filters.' : 'Issue a certificate to a student who has passed their final exam.'"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Certificate No</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Branch</th>
                    <th>Issue Date</th>
                    <th>Status</th>
                    <th>Verification Code</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of paginated(); track c.id) {
                    <tr>
                      <td>
                        <a [routerLink]="certRoute(c.id)" class="cert-no-link">{{ c.certificateNo }}</a>
                      </td>
                      <td>
                        <p class="font-medium">{{ c.student.fullName }}</p>
                        <p class="text-xs text-muted">{{ c.student.mobile }}</p>
                      </td>
                      <td class="text-muted">{{ c.student.course }}</td>
                      <td class="text-muted">{{ c.branch.name }}</td>
                      <td class="text-muted">{{ c.issueDate | date:'dd MMM yyyy' }}</td>
                      <td>
                        <snt-badge [label]="c.status" [variant]="statusBadge(c.status)" />
                      </td>
                      <td>
                        <span class="verify-code">{{ c.verificationCode }}</span>
                      </td>
                      <td>
                        <div class="action-row">
                          <a [routerLink]="certRoute(c.id)" class="btn btn-ghost btn-sm">View</a>
                          @if (auth.isSuperAdmin() && c.status === 'issued') {
                            <button class="btn btn-danger btn-sm" (click)="confirmRevoke(c)">Revoke</button>
                          }
                        </div>
                      </td>
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

    <!-- Issue modal -->
    <snt-certificate-form
      [open]="issueModalOpen()"
      (issued)="onIssued()"
      (cancel)="issueModalOpen.set(false)"
    />

    <!-- Revoke confirm -->
    <snt-confirm-dialog
      [open]="revokeDialogOpen()"
      title="Revoke Certificate"
      [message]="revokeMessage()"
      confirmLabel="Revoke"
      (confirm)="doRevoke()"
      (cancel)="revokeDialogOpen.set(false)"
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
    .cert-no-link { font-weight: 700; color: var(--color-primary); font-family: monospace; font-size: var(--font-size-sm); }
    .cert-no-link:hover { text-decoration: underline; }
    .verify-code { font-family: monospace; font-size: var(--font-size-xs); color: var(--color-text-muted); letter-spacing: .5px; }
    .action-row { display: flex; gap: 6px; align-items: center; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .font-medium { font-weight: 600; }
  `],
})
export class CertificatesComponent implements OnInit {
  private readonly svc        = inject(CertificateService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);
  private readonly router     = inject(Router);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<Certificate[]>([]);
  readonly page     = signal(1);

  readonly issueModalOpen  = signal(false);
  readonly revokeDialogOpen = signal(false);
  readonly revokeTarget    = signal<Certificate | null>(null);

  searchTerm   = '';
  statusFilter = '';

  readonly filtered = computed(() => {
    const term   = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter;
    return this.all().filter((c) => {
      const matchSearch = !term ||
        c.student.fullName.toLowerCase().includes(term) ||
        c.student.course.toLowerCase().includes(term) ||
        c.certificateNo.toLowerCase().includes(term) ||
        c.verificationCode.toLowerCase().includes(term);
      const matchStatus = !status || c.status === status;
      return matchSearch && matchStatus;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly paginated  = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  readonly revokeMessage = computed(() => {
    const t = this.revokeTarget();
    return t
      ? `Revoke certificate ${t.certificateNo} for ${t.student.fullName}? This action cannot be undone.`
      : 'This action cannot be undone.';
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

  certRoute(id: number): string[] {
    const base = this.auth.isSuperAdmin() ? '/ho' : '/branch';
    return [base, 'certificates', String(id)];
  }

  openIssueModal(): void { this.issueModalOpen.set(true); }

  onIssued(): void {
    this.issueModalOpen.set(false);
    this.load();
  }

  confirmRevoke(cert: Certificate): void {
    this.revokeTarget.set(cert);
    this.revokeDialogOpen.set(true);
  }

  doRevoke(): void {
    const cert = this.revokeTarget();
    if (!cert) return;
    this.revokeDialogOpen.set(false);
    this.svc.revoke(cert.id, { reason: 'Revoked by administrator' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.load(),
        error: (e: Error) => alert(e.message),
      });
  }

  statusBadge(status: string): BadgeVariant {
    return status === 'issued' ? 'success' : 'danger';
  }

  clearFilters(): void {
    this.searchTerm   = '';
    this.statusFilter = '';
    this.page.set(1);
  }
}
