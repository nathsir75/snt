import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';

export interface NavBadgeCounts {
  unreadAlerts:     number;
  newEnquiries:     number;
  pendingDiscounts: number;
  draftPages:       number;
}

const EMPTY: NavBadgeCounts = {
  unreadAlerts: 0, newEnquiries: 0, pendingDiscounts: 0, draftPages: 0,
};

const POLL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class NavBadgeService implements OnDestroy {
  private readonly api  = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly counts = signal<NavBadgeCounts>(EMPTY);

  private timer: ReturnType<typeof setInterval> | null = null;

  /** Call once from each shell (HO / Branch). Idempotent. */
  start(): void {
    if (this.timer) return;
    this.fetch();
    this.timer = setInterval(() => this.fetch(), POLL_MS);
  }

  /** Force immediate refresh — call after marking alerts read, etc. */
  refresh(): void { this.fetch(); }

  ngOnDestroy(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private fetch(): void {
    if (!this.auth.isLoggedIn()) return;
    this.api.get<NavBadgeCounts>('/nav-badges').subscribe({
      next:  (c) => this.counts.set(c),
      error: ()  => { /* non-critical — keep last known counts */ },
    });
  }
}
