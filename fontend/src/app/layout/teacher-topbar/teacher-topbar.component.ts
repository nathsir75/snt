import {
  Component, inject, ChangeDetectionStrategy, output,
  signal, OnInit, OnDestroy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { AlertService } from '../../features/alerts/alert.service';
import { TEACHER_NAV } from '../../core/navigation/nav.config';

@Component({
  selector: 'snt-teacher-topbar',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="teacher-topbar">
      <button class="teacher-topbar__toggle" (click)="sidebarToggle.emit()" aria-label="Toggle sidebar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div class="teacher-topbar__context">
        @if (pageTitle()) {
          <span class="teacher-topbar__page-title">{{ pageTitle() }}</span>
        }
        @if (user()?.branch?.name) {
          <span class="teacher-topbar__branch">{{ user()!.branch!.name }}</span>
        }
      </div>

      <div class="teacher-topbar__right">
        <a routerLink="/teacher/alerts" class="teacher-topbar__bell" aria-label="Alerts">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          @if (unreadCount() > 0) {
            <span class="teacher-topbar__bell-badge">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
          }
        </a>

        @if (user(); as u) {
          <div class="teacher-topbar__user">
            <div class="teacher-topbar__avatar" [title]="u.name">{{ u.name.charAt(0).toUpperCase() }}</div>
            <div class="teacher-topbar__user-info">
              <span class="teacher-topbar__user-name">{{ u.name }}</span>
              <span class="teacher-topbar__user-role">Teacher</span>
            </div>
          </div>
          <button class="btn btn-ghost teacher-topbar__logout" (click)="logout()">Sign out</button>
        }
      </div>
    </header>
  `,
  styleUrl: './teacher-topbar.component.scss',
})
export class TeacherTopbarComponent implements OnInit, OnDestroy {
  readonly sidebarToggle = output<void>();

  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly alertSvc   = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user        = this.auth.currentUser;
  readonly pageTitle   = signal('');
  readonly unreadCount = signal(0);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.updateTitle(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => this.updateTitle(e.urlAfterRedirects));
    this.fetchUnreadCount();
    this.pollInterval = setInterval(() => this.fetchUnreadCount(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  logout(): void { this.auth.logout(); }

  private fetchUnreadCount(): void {
    if (!this.auth.isLoggedIn()) return;
    this.alertSvc.getUnreadCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => this.unreadCount.set(r.count), error: () => {} });
  }

  private updateTitle(url: string): void {
    const match = TEACHER_NAV.find((item) => url.startsWith(item.route));
    this.pageTitle.set(match?.label ?? '');
  }
}
