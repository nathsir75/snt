import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef, computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicPageService } from '../page-renderer/public-page.service';
import { PublicBranchService } from '../public-site/public-branch.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { AuthService } from '../../core/auth/auth.service';
import { PublicBranchMeta } from '../public-site/public-site.models';
import { PageWithSections } from '../page-builder/page.models';
import { ChatbotWidgetComponent } from '../chatbot/chatbot-widget.component';

// 'branch_not_found' = invalid branchCode
// 'no_content'       = branch exists but zero published pages
// 'not_found'        = slug given but page missing/unpublished
// 'ready'            = page loaded successfully
// 'loading'          = in-flight
type LoadState = 'loading' | 'ready' | 'no_content' | 'not_found' | 'branch_not_found' | 'error';

interface NavLink { label: string; slug: string; }

const DEFAULT_NAV: NavLink[] = [
  { label: 'Home',               slug: '' },
  { label: 'About',              slug: 'about' },
  { label: 'Courses',            slug: 'courses' },
  { label: 'Contact',            slug: 'contact' },
];

@Component({
  selector: 'snt-branch-site-page',
  standalone: true,
  imports: [RouterLink, ChatbotWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="site-shell" [style.--site-primary]="meta()?.primaryColor ?? '#6366f1'">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <header class="site-header">
        <div class="site-container site-header-inner">
          <div class="site-brand">
            @if (meta()?.logoUrl) {
              <img [src]="meta()!.logoUrl!" [alt]="meta()!.name" class="site-logo" />
            } @else {
              <div class="site-logo-text">{{ meta()?.websiteTitle ?? meta()?.name ?? branchCode() }}</div>
            }
            @if (meta()?.tagline) {
              <span class="site-tagline">{{ meta()!.tagline }}</span>
            }
          </div>

          <nav class="site-nav" aria-label="Branch navigation">
            @for (link of navLinks(); track link.slug) {
              @if (link.slug === '') {
                <a [routerLink]="['/b', branchCode()]" class="site-nav-link">{{ link.label }}</a>
              } @else {
                <a [routerLink]="['/b', branchCode(), link.slug]" class="site-nav-link">{{ link.label }}</a>
              }
            }
            <a routerLink="/verify-certificate" class="site-nav-link">Verify Certificate</a>
            @if (auth.isLoggedIn()) {
              <a [routerLink]="dashboardRoute()" class="site-nav-btn site-nav-btn-dashboard">Dashboard</a>
            } @else {
              <a [routerLink]="['/auth/login']" [queryParams]="{ branchCode: branchCode() }" class="site-nav-btn">Login</a>
            }
          </nav>
        </div>
      </header>

      <!-- ── Main content ───────────────────────────────────────────────── -->
      <main class="site-main">
        @switch (state()) {

          @case ('loading') {
            <div class="pub-loading"><div class="pub-spinner"></div></div>
          }

          <!-- Case 5: invalid branch code -->
          @case ('branch_not_found') {
            <div class="pub-state">
              <div class="pub-state-icon">🔍</div>
              <h1 class="pub-state-title">Branch Not Found</h1>
              <p class="pub-state-sub">The branch <strong>{{ branchCode() }}</strong> does not exist or is not active.</p>
              <a routerLink="/" class="pub-cta-btn">Visit Main Website →</a>
            </div>
          }

          <!-- Case 3: branch exists but no published content yet -->
          @case ('no_content') {
            <div class="pub-state pub-state-onboarding">
              <div class="pub-state-icon">🏫</div>
              <h1 class="pub-state-title">{{ resolvedBranchName() }}</h1>
              <p class="pub-state-sub">This branch website is being prepared. Check back soon!</p>
              <div class="pub-state-actions">
                <a [routerLink]="['/b', branchCode(), 'contact']" class="pub-cta-btn">Contact Branch</a>
                <a routerLink="/" class="pub-cta-btn pub-cta-outline">Visit Main Website</a>
                @if (!auth.isLoggedIn()) {
                  <a [routerLink]="['/auth/login']" [queryParams]="{ branchCode: branchCode() }" class="pub-cta-btn pub-cta-outline">Login</a>
                }
              </div>
            </div>
          }

          <!-- Case 4: slug given but page not found / unpublished -->
          @case ('not_found') {
            <div class="pub-state">
              <div class="pub-state-icon">📄</div>
              <h1 class="pub-state-title">Page Not Found</h1>
              <p class="pub-state-sub">This page doesn't exist or hasn't been published yet.</p>
              <a [routerLink]="['/b', branchCode()]" class="pub-cta-btn">← Back to Home</a>
            </div>
          }

          <!-- Unexpected error -->
          @case ('error') {
            <div class="pub-state">
              <div class="pub-state-icon">⚠️</div>
              <h1 class="pub-state-title">Something went wrong</h1>
              <p class="pub-state-sub">We could not load this page. Please try again later.</p>
              <button class="pub-cta-btn" (click)="retry()">Try Again</button>
            </div>
          }

          <!-- Case 1 & 2: page loaded -->
          @case ('ready') {
            @if (page(); as p) {
              <div class="pub-page">
                @for (section of p.sections; track section.id) {

                  @if (section.sectionType === 'hero') {
                    <section class="pub-hero"
                      [style.backgroundImage]="section.configJson['imageUrl'] ? 'url(' + section.configJson['imageUrl'] + ')' : ''">
                      <div class="pub-hero-overlay">
                        <div class="pub-container">
                          <h1 class="pub-hero-heading">{{ section.configJson['heading'] }}</h1>
                          @if (section.configJson['subheading']) {
                            <p class="pub-hero-sub">{{ section.configJson['subheading'] }}</p>
                          }
                          @if (section.configJson['ctaLabel'] && section.configJson['ctaUrl']) {
                            <a [href]="section.configJson['ctaUrl']" class="pub-cta-btn">{{ section.configJson['ctaLabel'] }}</a>
                          }
                        </div>
                      </div>
                    </section>
                  }

                  @if (section.sectionType === 'text') {
                    <section class="pub-section">
                      <div class="pub-container" [style.textAlign]="section.configJson['alignment'] ?? 'left'">
                        @if (section.title) { <h2 class="pub-section-title">{{ section.title }}</h2> }
                        <p class="pub-text-content">{{ section.configJson['content'] }}</p>
                      </div>
                    </section>
                  }

                  @if (section.sectionType === 'gallery') {
                    <section class="pub-section pub-section-alt">
                      <div class="pub-container">
                        @if (section.title) { <h2 class="pub-section-title pub-center">{{ section.title }}</h2> }
                        <div class="pub-gallery">
                          @for (img of asImages(section.configJson['images']); track img.url) {
                            <div class="pub-gallery-item">
                              <img [src]="img.url" [alt]="img.caption ?? ''" loading="lazy" />
                              @if (img.caption) { <p class="pub-gallery-caption">{{ img.caption }}</p> }
                            </div>
                          }
                        </div>
                      </div>
                    </section>
                  }

                  @if (section.sectionType === 'cta') {
                    <section class="pub-cta-section">
                      <div class="pub-container pub-cta-inner">
                        <div>
                          <h2 class="pub-cta-heading">{{ section.configJson['heading'] }}</h2>
                          @if (section.configJson['subheading']) {
                            <p class="pub-cta-sub">{{ section.configJson['subheading'] }}</p>
                          }
                        </div>
                        @if (section.configJson['buttonLabel'] && section.configJson['buttonUrl']) {
                          <a [href]="section.configJson['buttonUrl']" class="pub-cta-btn pub-cta-outline">
                            {{ section.configJson['buttonLabel'] }}
                          </a>
                        }
                      </div>
                    </section>
                  }

                  @if (section.sectionType === 'banner') {
                    <section class="pub-banner"
                      [style.backgroundImage]="section.configJson['imageUrl'] ? 'url(' + section.configJson['imageUrl'] + ')' : ''">
                      <div class="pub-banner-overlay">
                        <div class="pub-container">
                          <p class="pub-banner-text">{{ section.configJson['text'] }}</p>
                        </div>
                      </div>
                    </section>
                  }

                  @if (!['hero','text','gallery','cta','banner'].includes(section.sectionType)) {
                    <section class="pub-section">
                      <div class="pub-container">
                        @if (section.title) { <h2 class="pub-section-title">{{ section.title }}</h2> }
                        @if (section.configJson['content']) {
                          <p class="pub-text-content">{{ section.configJson['content'] }}</p>
                        }
                      </div>
                    </section>
                  }

                }

                <!-- Empty page: published but no sections yet -->
                @if (p.sections.length === 0) {
                  <div class="pub-state">
                    <div class="pub-state-icon">📝</div>
                    <h1 class="pub-state-title">{{ p.title }}</h1>
                    <p class="pub-state-sub">This page is published but has no content sections yet.</p>
                  </div>
                }
              </div>
            }
          }

        }
      </main>

      <!-- ── Footer ─────────────────────────────────────────────────────── -->
      <footer class="site-footer">
        <div class="site-container site-footer-inner">
          <p class="site-footer-text">
            {{ meta()?.footerText ?? ('© ' + year + ' ' + (meta()?.websiteTitle ?? meta()?.name ?? 'SNT Education') + '. All rights reserved.') }}
          </p>
          <p class="site-footer-sub">Powered by SNT Education Platform</p>
        </div>
      </footer>

      <!-- ── Chatbot widget — branch context ────────────────────────────── -->
      <!-- branchCode drives branch-aware replies; context='branch_website' tags analytics/leads -->
      @if (branchCode()) {
        <snt-chatbot-widget
          [branchCode]="branchCode()"
          [branchMeta]="meta()"
          context="branch_website"
        />
      }

    </div>
  `,
  styles: [`
    :host { display: block; font-family: system-ui, -apple-system, sans-serif; }
    .site-shell { min-height: 100vh; display: flex; flex-direction: column; background: #f9fafb; }
    .site-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .site-header { background: #fff; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .site-header-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; gap: 16px; }
    .site-brand { display: flex; align-items: center; gap: 12px; }
    .site-logo { height: 40px; width: auto; object-fit: contain; }
    .site-logo-text { font-size: 20px; font-weight: 800; color: var(--site-primary, #6366f1); }
    .site-tagline { font-size: 13px; color: #6b7280; border-left: 1px solid #e5e7eb; padding-left: 12px; }
    .site-nav { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .site-nav-link { padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 600; color: #374151; text-decoration: none; transition: all .15s; }
    .site-nav-link:hover { background: #f3f4f6; color: var(--site-primary, #6366f1); }
    .site-nav-btn { padding: 7px 16px; border-radius: 7px; font-size: 13px; font-weight: 700; background: var(--site-primary, #6366f1); color: #fff; text-decoration: none; transition: filter .15s; margin-left: 4px; }
    .site-nav-btn:hover { filter: brightness(1.1); }
    .site-nav-btn-dashboard { background: #059669; }
    .site-main { flex: 1; }
    .site-footer { background: #1f2937; color: #d1d5db; padding: 32px 0; margin-top: auto; }
    .site-footer-inner { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
    .site-footer-text { font-size: 14px; }
    .site-footer-sub  { font-size: 12px; color: #6b7280; }
    .pub-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
    .pub-spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: var(--site-primary, #6366f1); border-radius: 50%; animation: spin .7s linear infinite; }
    .pub-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; text-align: center; padding: 40px 24px; }
    .pub-state-onboarding { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); }
    .pub-state-icon { font-size: 56px; }
    .pub-state-title { font-size: clamp(22px, 4vw, 36px); font-weight: 800; color: #111827; }
    .pub-state-sub { font-size: 16px; color: #6b7280; max-width: 480px; }
    .pub-state-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
    .pub-page { min-height: 60vh; }
    .pub-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .pub-hero { min-height: 480px; background: #1e1b4b; background-size: cover; background-position: center; display: flex; align-items: center; }
    .pub-hero-overlay { width: 100%; padding: 80px 0; background: linear-gradient(to right, rgba(0,0,0,.65), rgba(0,0,0,.2)); }
    .pub-hero-heading { font-size: clamp(28px, 5vw, 56px); font-weight: 800; color: #fff; line-height: 1.15; }
    .pub-hero-sub { font-size: clamp(16px, 2vw, 22px); color: rgba(255,255,255,.85); margin-top: 16px; max-width: 560px; }
    .pub-cta-btn { display: inline-block; margin-top: 4px; padding: 12px 28px; background: var(--site-primary, #6366f1); color: #fff; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; transition: filter .15s; border: none; cursor: pointer; }
    .pub-cta-btn:hover { filter: brightness(1.1); }
    .pub-cta-outline { background: transparent; border: 2px solid var(--site-primary, #6366f1); color: var(--site-primary, #6366f1); }
    .pub-cta-outline:hover { background: var(--site-primary, #6366f1); color: #fff; }
    .pub-section { padding: 64px 0; background: #fff; }
    .pub-section-alt { background: #f9fafb; }
    .pub-section-title { font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 16px; }
    .pub-center { text-align: center; }
    .pub-text-content { font-size: 16px; color: #374151; line-height: 1.8; white-space: pre-wrap; }
    .pub-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-top: 24px; }
    .pub-gallery-item img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }
    .pub-gallery-caption { font-size: 13px; color: #6b7280; margin-top: 6px; text-align: center; }
    .pub-cta-section { padding: 64px 0; background: var(--site-primary, #6366f1); }
    .pub-cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .pub-cta-heading { font-size: 26px; font-weight: 800; color: #fff; }
    .pub-cta-sub { font-size: 15px; color: rgba(255,255,255,.8); margin-top: 6px; }
    .pub-banner { min-height: 160px; background: #1e1b4b; background-size: cover; background-position: center; display: flex; align-items: center; }
    .pub-banner-overlay { width: 100%; padding: 40px 0; background: rgba(0,0,0,.5); }
    .pub-banner-text { font-size: clamp(18px, 3vw, 28px); font-weight: 700; color: #fff; text-align: center; }
    @media (max-width: 600px) { .site-tagline { display: none; } .site-nav-link { padding: 6px 8px; font-size: 13px; } }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class BranchSitePageComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly pageSvc    = inject(PublicPageService);
  private readonly branchSvc  = inject(PublicBranchService);
  private readonly branchCtx  = inject(BranchContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly auth       = inject(AuthService);
  readonly state      = signal<LoadState>('loading');
  readonly page       = signal<PageWithSections | null>(null);
  readonly meta       = signal<PublicBranchMeta | null>(null);
  readonly branchCode = signal<string>('');
  readonly year       = new Date().getFullYear();

  // Branch name from the page result (available even before meta loads)
  private readonly resolvedBranch = signal<{ name: string } | null>(null);
  readonly resolvedBranchName = computed(() =>
    this.meta()?.websiteTitle ?? this.meta()?.name ?? this.resolvedBranch()?.name ?? this.branchCode()
  );

  // Nav: use CMS navItems if configured, else default fallback
  readonly navLinks = computed<{ label: string; slug: string }[]>(() => {
    const items = (this.meta()?.navItems ?? []).filter((n) => n.visible !== false);
    return items.length > 0 ? items : DEFAULT_NAV;
  });

  // Stored params for retry
  private _code = '';
  private _slug = '';

  dashboardRoute(): string {
    const role = this.auth.role();
    if (!role) return '/auth/login';
    if (role === 'branch_admin' || role === 'counselor') return '/branch/dashboard';
    if (role === 'teacher') return '/teacher/dashboard';
    if (role === 'student') return '/student/dashboard';
    return '/ho/dashboard';
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const subCode  = this.branchCtx.detectSubdomainCode();
        const pathCode = params.get('branchCode') ?? '';
        const code     = subCode ?? pathCode;
        const slug     = params.get('slug') ?? '';

        this._code = code;
        this._slug = slug;
        this.branchCode.set(code);
        this.loadMeta(code);
        this.loadPage(code, slug);
      });
  }

  retry(): void {
    this.loadPage(this._code, this._slug);
  }

  private loadMeta(code: string): void {
    this.branchSvc.getBranchMetaByCode(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (m) => this.meta.set(m), error: () => {} });
  }

  private loadPage(code: string, slug: string): void {
    this.state.set('loading');
    this.page.set(null);

    this.pageSvc.getPageByCode(code, slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          // Capture branch name from result for fallback display
          if (result.branch) this.resolvedBranch.set(result.branch);

          switch (result.status) {
            case 'ok':
              this.page.set(result.page);
              this.state.set('ready');
              break;
            case 'no_content':
              this.state.set('no_content');
              break;
            case 'not_found':
              this.state.set('not_found');
              break;
            case 'branch_not_found':
              this.state.set('branch_not_found');
              break;
            default:
              this.state.set('error');
          }
        },
        error: () => this.state.set('error'),
      });
  }

  asImages(val: unknown): { url: string; caption?: string }[] {
    return Array.isArray(val) ? (val as { url: string; caption?: string }[]) : [];
  }
}
