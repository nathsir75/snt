import {
  Component, inject, signal, computed, ChangeDetectionStrategy, HostListener, OnInit,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { homeRouteForRole } from '../../core/models/user.model';
import { WebsiteCmsService } from '../website-cms/website-cms.service';
import { ChatbotWidgetComponent } from '../chatbot/chatbot-widget.component';
import { WebsitePublicService } from './website-public.service';
import { DisplayControlData, DC_DEFAULTS } from '../website-display-control/display-control.models';

interface NavLink { label: string; path: string; highlight?: boolean; }

const DEFAULT_NAV: NavLink[] = [
  { label: 'Home',                 path: '/home' },
  { label: 'About Us',             path: '/about' },
  { label: 'Courses',              path: '/courses' },
  { label: 'Placements',           path: '/placements' },
  { label: 'Careers',              path: '/careers' },
  { label: 'Internships',          path: '/internships' },
  { label: 'Corporate Training',   path: '/corporate-training' },
  { label: 'College Partnerships', path: '/college-partnerships' },
  { label: 'Hire Talent',          path: '/hire-talent' },
  { label: 'Franchise',            path: '/franchise-model' },
  { label: 'Contact',              path: '/contact' },
  { label: 'Become a Partner',     path: '/become-a-partner', highlight: true },
];

@Component({
  selector: 'snt-website-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ChatbotWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ws">

      <!-- ── Announcement Bar ── -->
      @if (announcementBar().visible && announcementBar().text) {
        <div class="ws-announcement" [style.background]="announcementBar().bgColor || '#6366f1'" [style.color]="announcementBar().textColor || '#ffffff'">
          {{ announcementBar().text }}
          @if (announcementBar().linkLabel && announcementBar().linkUrl) {
            <a [href]="announcementBar().linkUrl" class="ws-announcement-link">{{ announcementBar().linkLabel }}</a>
          }
        </div>
      }

      <!-- ── Header ── -->
      <header class="ws-header" [class.ws-header-scrolled]="scrolled()">

        <div class="ws-container ws-top-bar">
          <a routerLink="/home" class="ws-brand">
            @if (global().logoUrl) {
              <img [src]="global().logoUrl" class="ws-brand-logo-img" [alt]="global().siteName" />
            } @else {
              <div class="ws-brand-logo">{{ global().logoText || 'SNT' }}</div>
            }
            <div class="ws-brand-text">
              <span class="ws-brand-name">{{ global().siteName || 'SNT Education' }}</span>
              <span class="ws-brand-tagline">{{ global().tagline || 'Empowering Careers' }}</span>
            </div>
          </a>

          <div class="ws-actions">
            @if (auth.isLoggedIn()) {
              <a [routerLink]="dashboardRoute()" class="ws-btn ws-btn-dashboard" (click)="mobileOpen.set(false)">
                Dashboard
              </a>
              <button class="ws-btn ws-btn-outline" (click)="logout()">Logout</button>
            } @else {
              <a routerLink="/auth/login" class="ws-btn ws-btn-primary" (click)="mobileOpen.set(false)">Login</a>
            }
            <button class="ws-hamburger" (click)="toggleMobile()" aria-label="Toggle menu">
              @if (mobileOpen()) {
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              } @else {
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              }
            </button>
          </div>
        </div>

        <div class="ws-nav-row">
          <div class="ws-container">
            <nav class="ws-nav" [class.ws-nav-open]="mobileOpen()">
              @for (link of navLinks(); track link.path) {
                <a
                  [routerLink]="link.path"
                  routerLinkActive="ws-nav-active"
                  class="ws-nav-link"
                  [class.ws-nav-highlight]="link.highlight"
                  (click)="mobileOpen.set(false)"
                >{{ link.label }}</a>
              }
            </nav>
          </div>
        </div>

      </header>

      @if (mobileOpen()) {
        <div class="ws-mobile-overlay" (click)="mobileOpen.set(false)"></div>
      }

      <main class="ws-main">
        <router-outlet />
      </main>

      <!-- ── Chatbot widget — floats over all public pages ── -->
      <snt-chatbot-widget />

      <!-- ── Footer ── -->
      <footer class="ws-footer">
        <div class="ws-container ws-footer-grid">
          <div class="ws-footer-brand">
            <div class="ws-footer-logo">{{ global().logoText || 'SNT' }}</div>
            <p class="ws-footer-desc">{{ global().footerDesc || "India's fastest-growing IT training franchise network." }}</p>
            <div class="ws-footer-social">
              @for (link of global().socialLinks; track link.platform) {
                <a [href]="link.url" class="ws-social-link" [attr.aria-label]="link.platform" target="_blank" rel="noopener">
                  {{ link.platform[0] }}
                </a>
              }
            </div>
          </div>

          <div class="ws-footer-col">
            <p class="ws-footer-heading">Quick Links</p>
            <a routerLink="/about"              class="ws-footer-link">About Us</a>
            <a routerLink="/courses"            class="ws-footer-link">Courses</a>
            <a routerLink="/placements"         class="ws-footer-link">Placements</a>
            <a routerLink="/careers"            class="ws-footer-link">Careers</a>
            <a routerLink="/corporate-training" class="ws-footer-link">Corporate Training</a>
            <a routerLink="/contact"            class="ws-footer-link">Contact</a>
          </div>

          <div class="ws-footer-col">
            <p class="ws-footer-heading">Franchise</p>
            <a routerLink="/why-partner"      class="ws-footer-link">Why Partner With Us</a>
            <a routerLink="/franchise-model"  class="ws-footer-link">Franchise Model</a>
            <a routerLink="/branch-locations" class="ws-footer-link">Branch Locations</a>
            <a routerLink="/become-a-partner" class="ws-footer-link">Become a Partner</a>
          </div>

          <div class="ws-footer-col">
            <p class="ws-footer-heading">Contact</p>
            @if (global().supportEmail) { <p class="ws-footer-text">📧 {{ global().supportEmail }}</p> }
            @if (global().supportPhone) { <p class="ws-footer-text">📞 {{ global().supportPhone }}</p> }
            @if (global().address)      { <p class="ws-footer-text">🏢 {{ global().address }}</p> }
            <a routerLink="/verify-certificate" class="ws-footer-link ws-footer-verify">🎖️ Verify Certificate</a>
          </div>
        </div>

        <div class="ws-footer-bottom">
          <div class="ws-container ws-footer-bottom-inner">
            <p>{{ global().footerCopyright || ('© ' + year + ' SNT Education. All rights reserved.') }}</p>
            <p class="ws-footer-powered">Powered by SNT SaaS Platform</p>
          </div>
        </div>
      </footer>

    </div>
  `,
  styles: [`
    :host { display: block; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .ws { min-height: 100vh; display: flex; flex-direction: column; background: #fff; }
    .ws-container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
    .ws-main { flex: 1; }
    .ws-announcement { padding: 10px 24px; text-align: center; font-size: 13px; font-weight: 600; color: #fff; }
    .ws-announcement-link { color: inherit; font-weight: 700; margin-left: 10px; text-decoration: underline; }
    .ws-header { position: sticky; top: 0; z-index: 100; background: #fff; border-bottom: 1px solid #e5e7eb; transition: box-shadow .2s; }
    .ws-header-scrolled { box-shadow: 0 2px 16px rgba(0,0,0,.08); }
    .ws-top-bar { display: flex; align-items: center; justify-content: space-between; height: 62px; gap: 16px; }
    .ws-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
    .ws-brand-logo { width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 15px; font-weight: 900; display: flex; align-items: center; justify-content: center; letter-spacing: -1px; }
    .ws-brand-logo-img { width: 42px; height: 42px; border-radius: 10px; object-fit: contain; }
    .ws-brand-text { display: flex; flex-direction: column; }
    .ws-brand-name { font-size: 16px; font-weight: 800; color: #111827; line-height: 1.1; }
    .ws-brand-tagline { font-size: 10px; color: #6b7280; font-weight: 500; letter-spacing: .3px; }
    .ws-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .ws-btn { display: inline-flex; align-items: center; padding: 8px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 700; text-decoration: none; cursor: pointer; transition: all .15s; white-space: nowrap; border: none; line-height: 1; }
    .ws-btn-primary { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,.3); }
    .ws-btn-primary:hover { background: linear-gradient(135deg,#4f46e5,#7c3aed); }
    .ws-btn-outline { background: transparent; color: #6366f1; border: 1.5px solid #6366f1; }
    .ws-btn-outline:hover { background: #eef2ff; }
    .ws-btn-dashboard { background: linear-gradient(135deg,#059669,#10b981); color: #fff; }
    .ws-btn-dashboard:hover { background: linear-gradient(135deg,#047857,#059669); }
    .ws-hamburger { display: none; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px; color: #374151; background: transparent; border: none; cursor: pointer; transition: background .12s; flex-shrink: 0; }
    .ws-hamburger:hover { background: #f3f4f6; }
    .ws-nav-row { background: linear-gradient(to right, #f8fafc, #f1f5f9); border-top: 1px solid #e5e7eb; }
    .ws-nav { display: flex; align-items: stretch; gap: 2px; padding: 0; overflow-x: auto; scrollbar-width: none; }
    .ws-nav::-webkit-scrollbar { display: none; }
    .ws-nav-link { display: flex; align-items: center; justify-content: center; padding: 10px 14px; font-size: 11.5px; font-weight: 700; color: #4b5563; text-decoration: none; white-space: nowrap; transition: background .15s, color .15s; border-bottom: 3px solid transparent; min-width: 80px; }
    .ws-nav-link:hover { background: #eef2ff; color: #6366f1; border-bottom-color: #6366f1; }
    .ws-nav-active { color: #6366f1; background: #eef2ff; border-bottom-color: #6366f1; }
    .ws-nav-highlight { background: linear-gradient(135deg,#6366f1,#8b5cf6) !important; color: #fff !important; border-bottom-color: transparent !important; }
    .ws-nav-highlight:hover { background: linear-gradient(135deg,#4f46e5,#7c3aed) !important; }
    .ws-mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 99; }
    .ws-footer { background: #111827; color: #d1d5db; padding: 64px 0 0; margin-top: auto; }
    .ws-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; padding-bottom: 48px; }
    .ws-footer-logo { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 16px; font-weight: 900; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .ws-footer-desc { font-size: 13px; color: #9ca3af; line-height: 1.7; max-width: 260px; }
    .ws-footer-social { display: flex; gap: 8px; margin-top: 16px; }
    .ws-social-link { width: 32px; height: 32px; border-radius: 6px; background: #1f2937; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; text-decoration: none; transition: all .15s; }
    .ws-social-link:hover { background: #6366f1; color: #fff; }
    .ws-footer-col { display: flex; flex-direction: column; gap: 10px; }
    .ws-footer-heading { font-size: 13px; font-weight: 700; color: #f9fafb; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 4px; }
    .ws-footer-link { font-size: 13px; color: #9ca3af; text-decoration: none; transition: color .12s; }
    .ws-footer-link:hover { color: #e5e7eb; }
    .ws-footer-text { font-size: 13px; color: #9ca3af; }
    .ws-footer-verify { color: #a5b4fc; font-weight: 600; }
    .ws-footer-verify:hover { color: #c7d2fe; }
    .ws-footer-bottom { border-top: 1px solid #1f2937; padding: 20px 0; }
    .ws-footer-bottom-inner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .ws-footer-bottom p { font-size: 12px; color: #6b7280; }
    .ws-footer-powered { color: #4b5563; }
    @media (max-width: 768px) {
      .ws-hamburger { display: flex; }
      .ws-nav-row { display: none; }
      .ws-nav { position: fixed; top: 62px; right: 0; bottom: 0; width: 280px; background: #fff; flex-direction: column; align-items: flex-start; padding: 12px; gap: 2px; z-index: 100; transform: translateX(100%); transition: transform .25s ease; box-shadow: -4px 0 24px rgba(0,0,0,.12); overflow-y: auto; display: flex; }
      .ws-nav-open { transform: translateX(0); }
      .ws-nav-link { flex-direction: row; width: 100%; padding: 10px 12px; font-size: 13.5px; min-width: unset; border-bottom: none; border-radius: 8px; }
      .ws-nav-link:hover { border-bottom: none; }
      .ws-nav-active { border-bottom: none; }
      .ws-footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
    }
    @media (max-width: 480px) {
      .ws-footer-grid { grid-template-columns: 1fr; }
      .ws-brand-tagline { display: none; }
    }
  `],
})
export class WebsiteShellComponent implements OnInit {
  readonly auth       = inject(AuthService);
  private readonly cmsService  = inject(WebsiteCmsService);
  private readonly publicSvc   = inject(WebsitePublicService);

  readonly mobileOpen = signal(false);
  readonly scrolled   = signal(false);
  readonly year       = new Date().getFullYear();

  readonly global = this.cmsService.global;

  private readonly dc = signal<DisplayControlData>(DC_DEFAULTS);
  readonly announcementBar = computed(() => this.dc().announcementBar);

  readonly navLinks = computed<NavLink[]>(() => {
    const stored = this.global().navItems;
    if (stored?.length) {
      return stored
        .filter(n => n.visible)
        .sort((a, b) => a.order - b.order)
        .map(n => ({ label: n.label, path: n.path, highlight: n.path === '/become-a-partner' }));
    }
    return DEFAULT_NAV;
  });

  ngOnInit(): void {
    this.cmsService.loadFromApi().subscribe();
    this.publicSvc.getDisplayControl().subscribe({
      next: (res) => this.dc.set(res.data),
      error: () => {},
    });
  }

  dashboardRoute(): string {
    const role = this.auth.role();
    return role ? homeRouteForRole(role) : '/auth/login';
  }

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled.set(window.scrollY > 10); }

  toggleMobile(): void { this.mobileOpen.update(v => !v); }

  logout(): void {
    this.mobileOpen.set(false);
    this.auth.logout();
  }
}
