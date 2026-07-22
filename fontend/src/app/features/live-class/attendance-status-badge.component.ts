import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LiveClassService, MySessionAttendanceResponse } from './live-class.service';

type BadgeState = 'loading' | 'pending' | 'present' | 'incomplete' | 'error';

@Component({
  selector: 'snt-attendance-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="'attendance-status attendance-status--' + badgeState()" [title]="tooltip()">
      <span class="attendance-status__dot"></span>
      <span class="attendance-status__text">{{ statusText() }}</span>
    </span>
  `,
  styles: [`
    .attendance-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 30px;
      padding: 5px 10px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-text-muted);
      box-shadow: var(--shadow-sm);
      font-size: var(--font-size-xs);
      font-weight: 700;
      white-space: nowrap;
    }

    .attendance-status__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }

    .attendance-status__text { line-height: 1; }
    .attendance-status--present { background: var(--layout-accent-light, #dcfce7); border-color: var(--layout-accent-light, #dcfce7); color: var(--layout-accent-dark, #15803d); }
    .attendance-status--pending { background: #fef3c7; border-color: #fde68a; color: #92400e; }
    .attendance-status--incomplete { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
    .attendance-status--loading { background: var(--color-bg); color: var(--color-text-muted); }
    .attendance-status--error { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
  `],
})
export class AttendanceStatusBadgeComponent implements OnInit {
  private readonly liveClassService = inject(LiveClassService);
  private readonly destroyRef = inject(DestroyRef);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly liveSessionId = input.required<number>();
  readonly data = signal<MySessionAttendanceResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly badgeState = computed<BadgeState>(() => {
    if (this.loading()) return 'loading';
    if (this.error()) return 'error';
    const attendance = this.data()?.attendance;
    if (!attendance) return 'pending';
    return attendance.isPresent ? 'present' : 'incomplete';
  });

  readonly statusText = computed(() => {
    switch (this.badgeState()) {
      case 'present': return 'उपस्थित';
      case 'incomplete': return 'अधूरा';
      case 'pending': return 'गणना जारी';
      case 'error': return 'स्थिति उपलब्ध नहीं';
      default: return 'लोड हो रहा है';
    }
  });

  readonly tooltip = computed(() => {
    const attendance = this.data()?.attendance;
    if (!attendance) return 'सेशन उपस्थिति अभी गणना में है';
    const minutes = Math.floor(attendance.totalWatchSeconds / 60);
    return `देखा गया समय: ${minutes} मिनट`;
  });

  ngOnInit(): void {
    this.fetchStatus();
    this.pollTimer = setInterval(() => this.fetchStatus(), 15_000);
    this.destroyRef.onDestroy(() => {
      if (this.pollTimer) clearInterval(this.pollTimer);
    });
  }

  private fetchStatus(): void {
    this.liveClassService.getMySessionAttendance(this.liveSessionId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.error.set(false);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
}
