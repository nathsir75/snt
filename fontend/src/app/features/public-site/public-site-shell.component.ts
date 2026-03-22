import {
  Component, inject, signal, Input,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicBranchService } from './public-branch.service';
import { PublicBranchMeta } from './public-site.models';
import { AuthService } from '../../core/auth/auth.service';
import { ChatbotWidgetComponent } from '../chatbot/chatbot-widget.component';

@Component({
  selector: 'snt-public-site-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatbotWidgetComponent],
  template: `
    <div class="site-shell" [style.--site-primary]="meta()?.primaryColor ?? '#6366f1'">
      <header class="site-header">
        <div class="site-container site-header-inner">
          <div class="site-brand">
            @if (meta()?.logoUrl) {
              <img [src]="meta()!.logoUrl!" [alt]="meta()!.name" class="site-logo" />
            } @else {
              <div class="site-logo-text">{{ meta()?.name ?? 'SNT Education' }}</div>
            }
            @if (meta()?.tagline) {
              <span class="site-tagline">{{ meta()!.tagline }}</span>
            }
          </div>
          <nav class="site-nav">
            <a [href]="'/site/' + branchId" class="site-nav-link">Home</a>
            <a href="/verify-certificate" class="site-nav-link">Verify Certificate</a>
            @if (auth.isLoggedIn()) {
              <a [href]="auth.isBranchUser() ? '/branch/dashboard' : auth.isTeacher() ? '/teacher/dashboard' : '/student/dashboard'" class="site-nav-btn site-nav-btn-dashboard">Dashboard</a>
            } @else {
              <a [href]="loginUrl()" class="site-nav-btn">Login</a>
            }
          </nav>
        </div>
      </header>

      <main class="site-main">
        <ng-content />
      </main>

      <!-- Chatbot widget — branch-aware -->
      <snt-chatbot-widget
        [branchCode]="meta()?.code"
        [branchMeta]="meta()"
      />

      <footer class="site-footer">
        <div class="site-container site-footer-inner">
          <p class="site-footer-text">
            {{ meta()?.footerText ?? ('© ' + year + ' ' + (meta()?.name ?? 'SNT Education') + '. All rights reserved.') }}
          </p>
          <p class="site-footer-sub">Powered by SNT Education Platform</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; font-family: system-ui, -apple-system, sans-serif; }
    .site-shell { min-height: 100vh; display: flex; flex-direction: column; background: #f9fafb; }
    .site-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .site-header {
      background: #fff; border-bottom: 1px solid #e5e7eb;
      position: sticky; top: 0; z-index: 50;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    .site-header-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; gap: 16px; }
    .site-brand { display: flex; align-items: center; gap: 12px; }
    .site-logo { height: 40px; width: auto; object-fit: contain; }
    .site-logo-text { font-size: 20px; font-weight: 800; color: var(--site-primary, #6366f1); }
    .site-tagline { font-size: 13px; color: #6b7280; border-left: 1px solid #e5e7eb; padding-left: 12px; }
    .site-nav { display: flex; align-items: center; gap: 4px; }
    .site-nav-link {
      padding: 6px 14px; border-radius: 6px; font-size: 14px; font-weight: 600;
      color: #374151; text-decoration: none; transition: all .15s;
    }
    .site-nav-link:hover { background: #f3f4f6; color: var(--site-primary, #6366f1); }
    .site-nav-btn {
      padding: 7px 16px; border-radius: 7px; font-size: 13px; font-weight: 700;
      background: var(--site-primary, #6366f1); color: #fff; text-decoration: none;
      transition: filter .15s; margin-left: 4px;
    }
    .site-nav-btn:hover { filter: brightness(1.1); }
    .site-nav-btn-dashboard { background: #059669; }
    .site-main { flex: 1; }
    .site-footer { background: #1f2937; color: #d1d5db; padding: 32px 0; margin-top: auto; }
    .site-footer-inner { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
    .site-footer-text { font-size: 14px; }
    .site-footer-sub  { font-size: 12px; color: #6b7280; }
    @media (max-width: 600px) {
      .site-tagline { display: none; }
      .site-nav-link { padding: 6px 8px; font-size: 13px; }
    }
  `],
})
export class PublicSiteShellComponent implements OnChanges {
  @Input({ required: true }) branchId!: number;

  private readonly svc        = inject(PublicBranchService);
  private readonly destroyRef = inject(DestroyRef);

  readonly auth = inject(AuthService);
  readonly meta = signal<PublicBranchMeta | null>(null);
  readonly year = new Date().getFullYear();

  readonly loginUrl = () => {
    const code = this.meta()?.code;
    return code ? `/auth/login?branchCode=${encodeURIComponent(code)}` : '/auth/login';
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['branchId'] && this.branchId) {
      this.svc.getBranchMeta(this.branchId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (m) => this.meta.set(m), error: () => {} });
    }
  }
}
