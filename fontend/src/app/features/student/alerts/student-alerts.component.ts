import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { StudentService, MyAlert } from '../student.service';

const TYPE_ICON: Record<string, string> = {
  system:            '🔔',
  followup_due:      '📋',
  fee_due:           '💰',
  discount_decision: '🎟️',
};

@Component({
  selector: 'snt-student-alerts',
  standalone: true,
  imports: [SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Alerts</h1>
        <p>
          @if (unreadCount() > 0) {
            <span class="unread-badge">{{ unreadCount() }} unread</span>
          } @else {
            All caught up
          }
        </p>
      </div>
    </div>

    @if (loading()) {
      <div class="page-state">Loading alerts…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (alerts().length === 0) {
      <div class="card page-state">No alerts yet.</div>
    } @else {
      <div class="alerts-list">
        @for (a of alerts(); track a.id) {
          <div class="alert-item card" [class.alert-item--unread]="!a.isRead" (click)="markRead(a)">
            <div class="alert-item__icon">{{ typeIcon(a.type) }}</div>
            <div class="alert-item__body">
              <div class="alert-item__title">{{ a.title }}</div>
              <div class="alert-item__message text-muted text-sm">{{ a.message }}</div>
              <div class="alert-item__time text-muted text-sm">{{ a.createdAt | slice:0:10 }}</div>
            </div>
            @if (!a.isRead) {
              <div class="alert-item__dot"></div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .unread-badge {
      background: var(--layout-accent, #16a34a); color: #fff;
      border-radius: 999px; padding: 2px 10px;
      font-size: var(--font-size-xs); font-weight: 700;
    }
    .alerts-list { display: flex; flex-direction: column; gap: 8px; }
    .alert-item {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 14px 16px; cursor: pointer;
      transition: background .12s;
      position: relative;
    }
    .alert-item--unread { background: color-mix(in srgb, var(--layout-accent, #16a34a) 6%, var(--color-surface)); }
    .alert-item:hover { background: var(--color-surface-hover, var(--color-surface)); }
    .alert-item__icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
    .alert-item__body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .alert-item__title { font-weight: 600; font-size: var(--font-size-sm); }
    .alert-item__message { font-size: var(--font-size-sm); }
    .alert-item__time { font-size: var(--font-size-xs); }
    .alert-item__dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--layout-accent, #16a34a);
      flex-shrink: 0; margin-top: 6px;
    }
  `],
})
export class StudentAlertsComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly alerts      = signal<MyAlert[]>([]);
  readonly unreadCount = signal(0);
  readonly loading     = signal(true);
  readonly error       = signal<string | null>(null);

  typeIcon(type: string): string {
    return TYPE_ICON[type] ?? '🔔';
  }

  ngOnInit(): void {
    this.studentSvc.getMyAlerts().subscribe({
      next: (d) => {
        this.alerts.set(d.alerts);
        this.unreadCount.set(d.unreadCount);
        this.loading.set(false);
      },
      error: (e) => { this.error.set(e.error?.error ?? 'Failed to load alerts'); this.loading.set(false); },
    });
  }

  markRead(alert: MyAlert): void {
    if (alert.isRead) return;
    this.studentSvc.markAlertRead(alert.id).subscribe({
      next: () => {
        this.alerts.update((list) =>
          list.map((a) => a.id === alert.id ? { ...a, isRead: true } : a),
        );
        this.unreadCount.update((n) => Math.max(0, n - 1));
      },
    });
  }
}
