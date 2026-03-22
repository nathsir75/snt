import {
  Component, inject, signal, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PublicPageService } from './public-page.service';
import { PageWithSections } from '../page-builder/page.models';

type LoadState = 'loading' | 'error' | 'ready' | 'not-found';

@Component({
  selector: 'snt-page-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') {
        <div class="pub-loading"><div class="pub-spinner"></div></div>
      }
      @case ('not-found') {
        <div class="pub-error"><h1>404</h1><p>Page not found or not yet published.</p></div>
      }
      @case ('error') {
        <div class="pub-error"><h1>⚠️</h1><p>Something went wrong loading this page.</p></div>
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
                  <div class="pub-container" [style.textAlign]="section.configJson['alignment'] ?? 'left'">
                    @if (section.title) { <h2 class="pub-section-title">{{ section.title }}</h2> }
                    <div class="pub-text-content">{{ section.configJson['content'] }}</div>
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
                <section class="pub-banner" [style.backgroundImage]="section.configJson['imageUrl'] ? 'url(' + section.configJson['imageUrl'] + ')' : ''">
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
          </div>
        }
      }
    }
  `,
  styles: [`
    :host { display: block; font-family: system-ui, -apple-system, sans-serif; }
    .pub-loading { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .pub-spinner {
      width: 40px; height: 40px; border: 3px solid #e5e7eb;
      border-top-color: #6366f1; border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    .pub-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 12px; text-align: center; }
    .pub-error h1 { font-size: 64px; font-weight: 800; color: #374151; }
    .pub-error p  { font-size: 18px; color: #6b7280; }
    .pub-page { min-height: 100vh; }
    .pub-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .pub-hero { min-height: 480px; background: #1e1b4b; background-size: cover; background-position: center; display: flex; align-items: center; }
    .pub-hero-overlay { width: 100%; padding: 80px 0; background: linear-gradient(to right, rgba(0,0,0,.65), rgba(0,0,0,.2)); }
    .pub-hero-heading { font-size: clamp(28px, 5vw, 56px); font-weight: 800; color: #fff; line-height: 1.15; }
    .pub-hero-sub { font-size: clamp(16px, 2vw, 22px); color: rgba(255,255,255,.85); margin-top: 16px; max-width: 560px; }
    .pub-cta-btn { display: inline-block; margin-top: 28px; padding: 14px 32px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 16px; font-weight: 700; text-decoration: none; transition: background .15s; }
    .pub-cta-btn:hover { background: #4f46e5; }
    .pub-section { padding: 72px 0; background: #fff; }
    .pub-section-alt { background: #f9fafb; }
    .pub-section-title { font-size: 32px; font-weight: 800; color: #111827; margin-bottom: 20px; }
    .pub-center { text-align: center; }
    .pub-text-content { font-size: 17px; color: #374151; line-height: 1.8; white-space: pre-wrap; }
    .pub-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-top: 24px; }
    .pub-gallery-item img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }
    .pub-gallery-caption { font-size: 13px; color: #6b7280; margin-top: 6px; text-align: center; }
    .pub-cta-section { padding: 72px 0; background: #6366f1; }
    .pub-cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .pub-cta-heading { font-size: 28px; font-weight: 800; color: #fff; }
    .pub-cta-sub { font-size: 16px; color: rgba(255,255,255,.8); margin-top: 8px; }
    .pub-cta-outline { display: inline-block; padding: 14px 32px; background: transparent; color: #fff; border: 2px solid rgba(255,255,255,.7); border-radius: 8px; font-size: 16px; font-weight: 700; text-decoration: none; white-space: nowrap; transition: all .15s; }
    .pub-cta-outline:hover { background: rgba(255,255,255,.15); }
    .pub-banner { min-height: 160px; background: #1e1b4b; background-size: cover; background-position: center; display: flex; align-items: center; }
    .pub-banner-overlay { width: 100%; padding: 40px 0; background: rgba(0,0,0,.5); }
    .pub-banner-text { font-size: clamp(18px, 3vw, 28px); font-weight: 700; color: #fff; text-align: center; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class PageRendererComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly svc        = inject(PublicPageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<LoadState>('loading');
  readonly page  = signal<PageWithSections | null>(null);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const branchId = Number(params.get('branchId'));
        const slug     = params.get('slug') ?? '';
        this.loadPage(branchId, slug);
      });
  }

  private loadPage(branchId: number, slug: string): void {
    this.state.set('loading');
    this.svc.getPage(branchId, slug)
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

  asImages(val: unknown): { url: string; caption?: string }[] {
    return Array.isArray(val) ? (val as { url: string; caption?: string }[]) : [];
  }
}
