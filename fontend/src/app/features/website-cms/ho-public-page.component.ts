import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { HoPage } from './ho-page.service';
import { AuthService } from '../../core/auth/auth.service';

// ── Response shape from GET /site-pages/public/:slug ─────────────────────────
type SlugStatus = 'ok' | 'not_found' | 'unpublished' | 'error';
interface PublicSlugResult {
  status: SlugStatus;
  page?: HoPage;
}

// ── Render state ──────────────────────────────────────────────────────────────
type RenderState = 'loading' | 'ready' | 'not_found' | 'unpublished' | 'no_content' | 'error';

@Component({
  selector: 'snt-ho-public-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ho-site">

      <!-- Minimal HO header -->
      <header class="ho-header">
        <div class="ho-container ho-header-inner">
          <a href="/home" class="ho-brand">SNT Education</a>
          <nav class="ho-nav">
            <a href="/home" class="ho-nav-link">Home</a>
            <a href="/verify-certificate" class="ho-nav-link">Verify Certificate</a>
          </nav>
        </div>
      </header>

      <main class="ho-main">
        @switch (state()) {

          @case ('loading') {
            <div class="ho-state">
              <div class="ho-spinner"></div>
            </div>
          }

          @case ('not_found') {
            <div class="ho-state">
              <div class="ho-state-icon">🔍</div>
              <h1 class="ho-state-title">Page not found</h1>
              <p class="ho-state-sub">The page <strong>/{{ slug() }}</strong> does not exist.</p>
              <a href="/home" class="ho-cta-btn">← Back to Home</a>
            </div>
          }

          @case ('unpublished') {
            <div class="ho-state">
              <div class="ho-state-icon">🔒</div>
              <h1 class="ho-state-title">This page is not published yet</h1>
              <p class="ho-state-sub">Check back soon — content is being prepared.</p>
              <a href="/home" class="ho-cta-btn">← Back to Home</a>
            </div>
          }

          @case ('no_content') {
            <div class="ho-state">
              <div class="ho-state-icon">📄</div>
              <h1 class="ho-state-title">{{ page()?.title ?? 'Page' }}</h1>
              <p class="ho-state-sub">Page content is being prepared. Check back soon.</p>
            </div>
          }

          @case ('error') {
            <div class="ho-state">
              <div class="ho-state-icon">⚠️</div>
              <h1 class="ho-state-title">Something went wrong</h1>
              <p class="ho-state-sub">We could not load this page. Please try again later.</p>
              <button class="ho-cta-btn" (click)="load()">Retry</button>
            </div>
          }

          @case ('ready') {
            <div class="ho-page">
              @for (section of page()!.sections; track section.id) {
                @switch (section.sectionType) {

                  @case ('hero') {
                    <section class="ho-hero"
                      [style.backgroundImage]="section.configJson['imageUrl']
                        ? 'url(' + section.configJson['imageUrl'] + ')' : ''">
                      <div class="ho-hero-overlay">
                        <div class="ho-container">
                          <h1 class="ho-hero-heading">
                            {{ section.configJson['heading'] ?? page()!.title }}
                          </h1>
                          @if (section.configJson['subheading']) {
                            <p class="ho-hero-sub">{{ section.configJson['subheading'] }}</p>
                          }
                          @if (section.configJson['ctaLabel'] && section.configJson['ctaUrl']) {
                            <a [href]="section.configJson['ctaUrl']" class="ho-cta-btn">
                              {{ section.configJson['ctaLabel'] }}
                            </a>
                          }
                        </div>
                      </div>
                    </section>
                  }

                  @case ('text') {
                    <section class="ho-section">
                      <div class="ho-container">
                        @if (section.title) { <h2 class="ho-section-title">{{ section.title }}</h2> }
                        @if (section.configJson['content']) {
                          <p class="ho-text-body">{{ section.configJson['content'] }}</p>
                        }
                      </div>
                    </section>
                  }

                  @case ('cta') {
                    <section class="ho-cta-section">
                      <div class="ho-container ho-cta-inner">
                        <div>
                          <h2 class="ho-cta-heading">{{ section.configJson['heading'] }}</h2>
                          @if (section.configJson['subheading']) {
                            <p class="ho-cta-sub">{{ section.configJson['subheading'] }}</p>
                          }
                        </div>
                        @if (section.configJson['buttonLabel'] && section.configJson['buttonUrl']) {
                          <a [href]="section.configJson['buttonUrl']" class="ho-cta-outline">
                            {{ section.configJson['buttonLabel'] }}
                          </a>
                        }
                      </div>
                    </section>
                  }

                  @case ('stats') {
                    <section class="ho-section ho-section-alt">
                      <div class="ho-container">
                        @if (section.title) { <h2 class="ho-section-title">{{ section.title }}</h2> }
                        @if (section.configJson['items']) {
                          <div class="ho-stats-grid">
                            @for (stat of asArray(section.configJson['items']); track $index) {
                              <div class="ho-stat-card">
                                <div class="ho-stat-value">{{ stat['value'] }}</div>
                                <div class="ho-stat-label">{{ stat['label'] }}</div>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </section>
                  }

                  @default {
                    <section class="ho-section">
                      <div class="ho-container">
                        @if (section.title) { <h2 class="ho-section-title">{{ section.title }}</h2> }
                        @if (section.configJson['content']) {
                          <p class="ho-text-body">{{ section.configJson['content'] }}</p>
                        }
                      </div>
                    </section>
                  }

                }
              }
            </div>
          }

        }
      </main>

      <footer class="ho-footer">
        <div class="ho-container ho-footer-inner">
          <p>© {{ year }} SNT Education. All rights reserved.</p>
          <p class="ho-footer-sub">Powered by SNT Education Platform</p>
        </div>
      </footer>

    </div>
  `,
  styles: [`
    :host { display: block; font-family: system-ui, -apple-system, sans-serif; }
    .ho-site { min-height: 100vh; display: flex; flex-direction: column; background: #f9fafb; }
    .ho-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

    /* Header */
    .ho-header { background: #fff; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .ho-header-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
    .ho-brand { font-size: 20px; font-weight: 800; color: #6366f1; text-decoration: none; }
    .ho-nav { display: flex; gap: 4px; }
    .ho-nav-link { padding: 6px 14px; border-radius: 6px; font-size: 14px; font-weight: 600; color: #374151; text-decoration: none; }
    .ho-nav-link:hover { background: #f3f4f6; color: #6366f1; }

    /* Main */
    .ho-main { flex: 1; }

    /* States */
    .ho-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; text-align: center; padding: 40px 24px; }
    .ho-spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
    .ho-state-icon { font-size: 56px; }
    .ho-state-title { font-size: clamp(22px, 4vw, 36px); font-weight: 800; color: #111827; margin: 0; }
    .ho-state-sub { font-size: 16px; color: #6b7280; max-width: 480px; margin: 0; }

    /* CTA button (shared) */
    .ho-cta-btn { display: inline-block; margin-top: 8px; padding: 12px 28px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; transition: background .15s; }
    .ho-cta-btn:hover { background: #4f46e5; }

    /* Hero */
    .ho-hero { min-height: 480px; background: #1e1b4b; background-size: cover; background-position: center; display: flex; align-items: center; }
    .ho-hero-overlay { width: 100%; padding: 80px 0; background: linear-gradient(to right, rgba(0,0,0,.65), rgba(0,0,0,.2)); }
    .ho-hero-heading { font-size: clamp(28px, 5vw, 56px); font-weight: 800; color: #fff; line-height: 1.15; margin: 0; }
    .ho-hero-sub { font-size: clamp(16px, 2vw, 22px); color: rgba(255,255,255,.85); margin-top: 16px; max-width: 560px; }

    /* Sections */
    .ho-section { padding: 64px 0; background: #fff; }
    .ho-section-alt { background: #f9fafb; }
    .ho-section-title { font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 16px; }
    .ho-text-body { font-size: 16px; color: #374151; line-height: 1.8; white-space: pre-wrap; margin: 0; }

    /* CTA section */
    .ho-cta-section { padding: 64px 0; background: #6366f1; }
    .ho-cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .ho-cta-heading { font-size: 26px; font-weight: 800; color: #fff; margin: 0; }
    .ho-cta-sub { font-size: 15px; color: rgba(255,255,255,.8); margin-top: 6px; }
    .ho-cta-outline { display: inline-block; padding: 12px 28px; background: transparent; color: #fff; border: 2px solid rgba(255,255,255,.7); border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; }
    .ho-cta-outline:hover { background: rgba(255,255,255,.15); }

    /* Stats */
    .ho-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 24px; margin-top: 24px; }
    .ho-stat-card { text-align: center; padding: 24px 16px; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .ho-stat-value { font-size: 32px; font-weight: 800; color: #6366f1; }
    .ho-stat-label { font-size: 13px; color: #6b7280; margin-top: 4px; }

    /* Footer */
    .ho-footer { background: #1f2937; color: #d1d5db; padding: 32px 0; margin-top: auto; }
    .ho-footer-inner { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; font-size: 14px; }
    .ho-footer-sub { font-size: 12px; color: #6b7280; }

    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class HoPublicPageComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly http       = inject(HttpClient);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly base       = environment.apiUrl;

  readonly state = signal<RenderState>('loading');
  readonly page  = signal<HoPage | null>(null);
  readonly slug  = signal<string>('');
  readonly year  = new Date().getFullYear();

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        // Normalise slug — strip any leading slash stored in DB
        const raw = params.get('slug') ?? '';
        const slug = raw.replace(/^\/+/, '');
        this.slug.set(slug);
        this.load(slug);
      });
  }

  load(slug?: string): void {
    const s = slug ?? this.slug();
    if (!s) { this.state.set('not_found'); return; }

    this.state.set('loading');

    // Support ?preview=1 for draft pages — passes auth token so backend allows it
    const isPreview = this.route.snapshot.queryParamMap.get('preview') === '1';
    const token     = this.auth.getToken();
    const headers   = isPreview && token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;
    const url = isPreview
      ? `${this.base}/site-pages/public/${s}?preview=1`
      : `${this.base}/site-pages/public/${s}`;

    console.log('[HoPublicPage] fetching slug:', s, isPreview ? '(preview mode)' : '');

    this.http
      .get<PublicSlugResult>(url, headers ? { headers } : {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          console.log('[HoPublicPage] response status:', result.status, result.page?.id);
          switch (result.status) {
            case 'ok':
              this.page.set(result.page!);
              this.state.set(
                result.page!.sections?.length ? 'ready' : 'no_content'
              );
              break;
            case 'not_found':
              this.state.set('not_found');
              break;
            case 'unpublished':
              this.state.set('unpublished');
              break;
            default:
              this.state.set('error');
          }
        },
        error: (e) => {
          console.error('[HoPublicPage] fetch error:', e);
          this.state.set('error');
        },
      });
  }

  // Safe cast for template — configJson['items'] may be unknown[]
  asArray(val: unknown): Record<string, unknown>[] {
    return Array.isArray(val) ? (val as Record<string, unknown>[]) : [];
  }
}
