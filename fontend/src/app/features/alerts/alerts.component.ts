import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AlertService } from './alert.service';
import { Alert, AlertType, ALERT_TYPE_CONFIG, alertActionRoute } from './alert.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';

type LoadState = 'loading' | 'error' | 'ready';
const PAGE_SIZE = 20;

@Component({
  selector: 'snt-alerts',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Alerts"
      subtitle="View system alerts and branch-level notifications"
      icon="🔔"
    >
      <ng-container slot="actions">
        @if (unreadCount() > 0) {
          <button class="btn btn-secondary" (click)="markAllRead()">Mark all read</button>
        }
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <select class="filter-select" [(ngModel)]="typeFilter" (ngModelChange)="page.set(1)">
            <option value="">All Types</option>
            @for (t of typeOptions; track t.value) {
              <option [value]="t.value">{{ t.icon }} {{ t.label }}</option>
            }
          </select>
          <select class="filter-select" [(ngModel)]="readFilter" (ngModelChange)="page.set(1)">
            <option value="">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          @if (typeFilter || readFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          @if (unreadCount() > 0) {
            <span class="unread-badge">{{ unreadCount() }} unread</span>
          }
          <span class="filter-count">{{ filtered().length }} alert{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="typeFilter || readFilter ? 'No matching alerts' : 'No alerts'"
              [description]="typeFilter || readFilter ? 'Try adjusting your filters.' : 'System and branch notifications will appear here.'"
            />
          } @else {
            <div class="alerts-list">
              @for (a of paginated(); track a.id) {
                <div class="alert-row" [class.alert-row-unread]="!a.isRead">
                  <div class="alert-icon-col">
                    <span class="alert-type-icon">{{ typeIcon(a.type) }}</span>
                  </div>
                  <div class="alert-content">
                    <div class="alert-header-row">
                      <span class="alert-title">{{ a.title }}</span>
                      <snt-badge [label]="typeLabel(a.type)" [variant]="typeBadge(a.type)" />
                      @if (!a.isRead) {
                        <span class="unread-dot"></span>
                      }
                    </div>
                    <p class="alert-message">{{ a.message }}</p>
                    <div class="alert-footer-row">
                      @if (a.branch) {
                        <span class="alert-meta">{{ a.branch.name }}</span>
                      }
                      <span class="alert-meta">{{ a.createdAt | date:'dd MMM yyyy, hh:mm a' }}</span>
                      @if (actionRoute(a)) {
                        <a [routerLink]="actionRoute(a)" class="alert-action-link">View →</a>
                      }
                    </div>
                  </div>
                  <div class="alert-actions-col">
                    @if (!a.isRead) {
                      <button class="btn btn-ghost btn-xs" (click)="markRead(a)" title="Mark as read">✓</button>
                    }
                  </div>
                </div>
              }
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
    .filter-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%;
      padding: 12px 16px; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    }
    .filter-select {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; cursor: pointer;
    }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .unread-badge {
      font-size: var(--font-size-xs); font-weight: 700;
      background: #ef4444; color: #fff;
      padding: 2px 8px; border-radius: 999px;
    }
    /* Alert list */
    .alerts-list { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .alert-row {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 14px 16px; background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      transition: background .1s;
    }
    .alert-row:last-child { border-bottom: none; }
    .alert-row:hover { background: var(--color-bg); }
    .alert-row-unread { background: #eff6ff; border-left: 3px solid #3b82f6; }
    .alert-row-unread:hover { background: #dbeafe; }
    .alert-icon-col { flex-shrink: 0; padding-top: 2px; }
    .alert-type-icon { font-size: 20px; }
    .alert-content { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .alert-header-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .alert-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; }
    .alert-message { font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5; }
    .alert-footer-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .alert-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .alert-action-link { font-size: var(--font-size-xs); color: var(--color-primary); font-weight: 600; }
    .alert-action-link:hover { text-decoration: underline; }
    .alert-actions-col { flex-shrink: 0; }
    .btn-xs { padding: 3px 8px; font-size: var(--font-size-xs); }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
  `],
})
export class AlertsComponent implements OnInit {
  private readonly svc        = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly all      = signal<Alert[]>([]);
  readonly page     = signal(1);

  typeFilter = '';
  readFilter = '';

  readonly typeOptions = (Object.keys(ALERT_TYPE_CONFIG) as AlertType[]).map((k) => ({
    value: k,
    icon:  ALERT_TYPE_CONFIG[k].icon,
    label: ALERT_TYPE_CONFIG[k].label,
  }));

  readonly unreadCount = computed(() => this.all().filter((a) => !a.isRead).length);

  readonly filtered = computed(() => {
    const type = this.typeFilter;
    const read = this.readFilter;
    return this.all().filter((a) => {
      const matchType = !type || a.type === type;
      const matchRead = !read ||
        (read === 'unread' && !a.isRead) ||
        (read === 'read'   && a.isRead);
      return matchType && matchRead;
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
    this.svc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.all.set(data); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  markRead(alert: Alert): void {
    this.svc.markRead(alert.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.all.update((list) => list.map((a) => a.id === updated.id ? updated : a));
        },
        error: () => {},
      });
  }

  markAllRead(): void {
    const unread = this.all().filter((a) => !a.isRead);
    unread.forEach((a) => this.markRead(a));
  }

  typeIcon(type: AlertType): string  { return ALERT_TYPE_CONFIG[type]?.icon  ?? '🔔'; }
  typeLabel(type: AlertType): string { return ALERT_TYPE_CONFIG[type]?.label ?? type; }

  typeBadge(type: AlertType): BadgeVariant {
    const map: Record<AlertType, BadgeVariant> = {
      followup_due:      'warning',
      discount_decision: 'primary',
      fee_due:           'danger',
      system:            'info',
    };
    return map[type] ?? 'neutral';
  }

  actionRoute(alert: Alert): string | null { return alertActionRoute(alert); }

  clearFilters(): void { this.typeFilter = ''; this.readFilter = ''; this.page.set(1); }
}
