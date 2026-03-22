import {
  Component, inject, input, output, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BranchCmsSettings, CMS_PAGE_SLUGS } from '../branch-cms.models';
import { PageService } from '../../page-builder/page.service';
import { Page } from '../../page-builder/page.models';

@Component({
  selector: 'snt-bcms-preview-panel',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-panel">

      <div class="preview-hero">
        <div class="preview-hero-icon">🚀</div>
        <h2 class="preview-hero-title">Preview & Publish</h2>
        <p class="preview-hero-sub">Your branch website is live at the URL below. Publish individual pages from the Page Content tab.</p>
      </div>

      <div class="preview-url-card">
        <span class="preview-url-label">Branch Website URL</span>
        <div class="preview-url-row">
          <code class="preview-url">{{ siteUrl() }}</code>
          <a [href]="siteUrl()" target="_blank" class="preview-open-btn">Open ↗</a>
        </div>
      </div>

      <div class="preview-stats">
        <div class="preview-stat">
          <span class="preview-stat-val">{{ publishedCount() }}</span>
          <span class="preview-stat-label">Pages Published</span>
        </div>
        <div class="preview-stat">
          <span class="preview-stat-val">{{ draftCount() }}</span>
          <span class="preview-stat-label">Drafts</span>
        </div>
        <div class="preview-stat">
          <span class="preview-stat-val">{{ totalDefined }}</span>
          <span class="preview-stat-label">Total Page Slots</span>
        </div>
      </div>

      <div class="preview-pages">
        <h3 class="preview-section-title">Page Status</h3>
        <div class="preview-page-list">
          @for (def of pageDefs; track def.key) {
            @let page = pageMap()[def.key];
            <div class="preview-page-row">
              <span class="preview-page-icon">{{ def.icon }}</span>
              <span class="preview-page-label">{{ def.label }}</span>
              <span class="preview-page-slug">/{{ def.key }}</span>
              <span class="preview-page-status"
                [class.status-pub]="page?.isPublished"
                [class.status-draft]="page && !page.isPublished"
                [class.status-none]="!page">
                {{ page ? (page.isPublished ? '✅ Published' : '📝 Draft') : '— Not created' }}
              </span>
              @if (page?.isPublished) {
                <a [href]="siteUrl() + '/' + def.key" target="_blank" class="preview-link">Preview ↗</a>
              }
            </div>
          }
        </div>
      </div>

    </div>
  `,
  styles: [`
    .preview-panel { max-width: 860px; display: flex; flex-direction: column; gap: 20px; }
    .preview-hero { text-align: center; padding: 32px 24px 16px; }
    .preview-hero-icon { font-size: 48px; margin-bottom: 12px; }
    .preview-hero-title { font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 8px; }
    .preview-hero-sub { font-size: 14px; color: #6b7280; max-width: 480px; margin: 0 auto; line-height: 1.6; }
    .preview-url-card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .preview-url-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #9ca3af; }
    .preview-url-row { display: flex; align-items: center; gap: 12px; }
    .preview-url { font-size: 14px; font-weight: 600; color: #16a34a; flex: 1; word-break: break-all; }
    .preview-open-btn {
      padding: 7px 14px; background: #16a34a; color: #fff; border-radius: 7px;
      font-size: 13px; font-weight: 700; text-decoration: none; white-space: nowrap;
    }
    .preview-open-btn:hover { background: #15803d; }
    .preview-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .preview-stat {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
      padding: 16px; text-align: center; display: flex; flex-direction: column; gap: 4px;
    }
    .preview-stat-val { font-size: 28px; font-weight: 800; color: #111827; }
    .preview-stat-label { font-size: 12px; color: #6b7280; }
    .preview-pages { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; }
    .preview-section-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 12px; }
    .preview-page-list { display: flex; flex-direction: column; gap: 8px; }
    .preview-page-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 0; border-bottom: 1px solid #f1f5f9;
    }
    .preview-page-row:last-child { border-bottom: none; }
    .preview-page-icon { font-size: 16px; flex-shrink: 0; }
    .preview-page-label { font-size: 13px; font-weight: 600; color: #111827; width: 90px; flex-shrink: 0; }
    .preview-page-slug { font-size: 11px; color: #9ca3af; font-family: monospace; flex: 1; }
    .preview-page-status { font-size: 12px; font-weight: 600; }
    .status-pub   { color: #059669; }
    .status-draft { color: #d97706; }
    .status-none  { color: #9ca3af; }
    .preview-link { font-size: 12px; color: #16a34a; text-decoration: none; }
    .preview-link:hover { text-decoration: underline; }
  `],
})
export class BcmsPreviewPanelComponent implements OnInit {
  private readonly pageSvc    = inject(PageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly settings = input.required<BranchCmsSettings>();
  readonly saved    = output<void>();

  readonly pageDefs     = CMS_PAGE_SLUGS;
  readonly totalDefined = CMS_PAGE_SLUGS.length;
  readonly pageMap      = signal<Record<string, Page>>({});
  private readonly _pageCode = signal('');

  siteUrl(): string {
    const code = this.settings().branchCode ?? this._pageCode();
    return code ? `http://localhost:4200/b/${code}` : 'http://localhost:4200/b/branch';
  }

  readonly publishedCount = () => Object.values(this.pageMap()).filter(p => p.isPublished).length;
  readonly draftCount     = () => Object.values(this.pageMap()).filter(p => !p.isPublished).length;

  ngOnInit(): void {
    this.pageSvc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pages) => {
          const map: Record<string, Page> = {};
          for (const p of pages) {
            map[p.slug] = p;
            if (!this._pageCode() && p.branch?.code) this._pageCode.set(p.branch.code);
          }
          this.pageMap.set(map);
        },
        error: () => {},
      });
  }
}
