import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PublicBranchService } from './public-branch.service';
import { PublicPageService } from '../page-renderer/public-page.service';
import { PublicBranchMeta } from './public-site.models';
import { PageWithSections } from '../page-builder/page.models';
import { PublicSiteShellComponent } from './public-site-shell.component';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

@Component({
  selector: 'snt-public-site-page',
  standalone: true,
  imports: [PublicSiteShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-public-site-shell [branchId]="branchId()">

      @switch (state()) {
        @case ('loading') {
          <div class="pub-loading"><div class="pub-spinner"></div></div>
        }
        @case ('not-found') {
          <div class="pub-state">
            <div class="pub-state-icon">🏫</div>
            @if (meta(); as m) {
              <h1 class="pub-state-title">{{ m.websiteTitle ?? m.name }}</h1>
              <p class="pub-state-sub">{{ m.tagline ?? m.city }}</p>
            } @else {
              <h1 class="pub-state-title">Branch Website</h1>
              <p class="pub-state-sub">This branch has not published any pages yet.</p>
            }
            <a href="/verify-certificate" class="pub-cta-btn">Verify Certificate →</a>
          </div>
        }
        @case ('error') {
          <div class="pub-state">
            <div class="pub-state-icon">⚠️</div>
            <h1 class="pub-state-title">Something went wrong</h1>
            <p class="pub-state-sub">We could not load this page. Please try again later.</p>
          </div>
        }
        @case ('ready') {
          @if (page(); as p) {
            <div class="pub-page">
              @for (section of p.sections; track section.id) {
                @if (section.sectionType === 'hero') {
                  <section class="pub-hero" [style.backgroundImage]="section.configJson['imageUrl'] ? 'url(' + section.configJson['imageUrl'] + ')' : ''">
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
                    <div class="pub-container">
                      @if (section.title) { <h2 class="pub-section-title">{{ section.title }}</h2> }
                      <p class="pub-text-content">{{ section.configJson['content'] }}</p>
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
                @if (!['hero','text','cta'].includes(section.sectionType)) {
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
            </div>
          }
        }
      }

    </snt-public-site-shell>
  `,
  styles: [`
    .pub-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
    .pub-spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
    .pub-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; text-align: center; padding: 40px 24px; }
    .pub-state-icon { font-size: 56px; }
    .pub-state-title { font-size: clamp(22px, 4vw, 36px); font-weight: 800; color: #111827; }
    .pub-state-sub { font-size: 16px; color: #6b7280; max-width: 480px; }
    .pub-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .pub-hero { min-height: 480px; background: #1e1b4b; background-size: cover; background-position: center; display: flex; align-items: center; }
    .pub-hero-overlay { width: 100%; padding: 80px 0; background: linear-gradient(to right, rgba(0,0,0,.65), rgba(0,0,0,.2)); }
    .pub-hero-heading { font-size: clamp(28px, 5vw, 56px); font-weight: 800; color: #fff; line-height: 1.15; }
    .pub-hero-sub { font-size: clamp(16px, 2vw, 22px); color: rgba(255,255,255,.85); margin-top: 16px; max-width: 560px; }
    .pub-cta-btn { display: inline-block; margin-top: 24px; padding: 12px 28px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; transition: background .15s; }
    .pub-cta-btn:hover { background: #4f46e5; }
    .pub-section { padding: 64px 0; background: #fff; }
    .pub-section-title { font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 16px; }
    .pub-text-content { font-size: 16px; color: #374151; line-height: 1.8; white-space: pre-wrap; }
    .pub-cta-section { padding: 64px 0; background: #6366f1; }
    .pub-cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .pub-cta-heading { font-size: 26px; font-weight: 800; color: #fff; }
    .pub-cta-sub { font-size: 15px; color: rgba(255,255,255,.8); margin-top: 6px; }
    .pub-cta-outline { display: inline-block; padding: 12px 28px; background: transparent; color: #fff; border: 2px solid rgba(255,255,255,.7); border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; }
    .pub-cta-outline:hover { background: rgba(255,255,255,.15); }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class PublicSitePageComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly pageSvc    = inject(PublicPageService);
  private readonly branchSvc  = inject(PublicBranchService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state    = signal<LoadState>('loading');
  readonly page     = signal<PageWithSections | null>(null);
  readonly meta     = signal<PublicBranchMeta | null>(null);
  readonly branchId = signal<number>(0);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id   = Number(params.get('branchId'));
        const slug = params.get('slug') ?? '';
        this.branchId.set(id);
        this.loadMeta(id);
        this.loadPage(id, slug || 'home');
      });
  }

  private loadMeta(branchId: number): void {
    this.branchSvc.getBranchMeta(branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (m) => this.meta.set(m), error: () => {} });
  }

  private loadPage(branchId: number, slug: string): void {
    this.state.set('loading');
    this.pageSvc.getPage(branchId, slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (p) => { this.page.set(p); this.state.set('ready'); },
        error: (e: Error) => {
          this.state.set(
            e.message.includes('NOT_FOUND') || e.message.includes('not found')
              ? 'not-found'
              : 'error',
          );
        },
      });
  }
}
