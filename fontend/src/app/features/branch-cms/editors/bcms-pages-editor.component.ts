import {
  Component, inject, input, output, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PageService } from '../../page-builder/page.service';
import { Page, CreatePagePayload, PAGE_TYPE_OPTIONS } from '../../page-builder/page.models';
import { BranchCmsSettings, CMS_PAGE_SLUGS } from '../branch-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from '../../../features/website-cms/editors/cms-shared.component';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { BranchCmsService } from '../branch-cms.service';

@Component({
  selector: 'snt-bcms-pages-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS, RouterLink, DatePipe, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">

      <snt-cms-section title="Branch Website Pages" icon="📄">
        <p class="pages-hint">
          Each page maps to a URL on your branch website. Click <strong>Edit Sections</strong> to add/edit content blocks using the visual page builder.
        </p>

        <div class="pages-grid">
          @for (def of pageDefs; track def.key) {
            @let page = pageMap()[def.key];
            <div class="page-card" [class.page-card-published]="page?.isPublished">
              <div class="page-card-header">
                <span class="page-card-icon">{{ def.icon }}</span>
                <div class="page-card-info">
                  <span class="page-card-label">{{ def.label }}</span>
                  <span class="page-card-slug">/{{ def.key }}</span>
                </div>
                @if (page) {
                  <snt-badge [label]="page.isPublished ? 'Published' : 'Draft'" [variant]="page.isPublished ? 'success' : 'warning'" />
                } @else {
                  <span class="page-card-badge-none">Not created</span>
                }
              </div>
              <div class="page-card-actions">
                @if (page) {
                  <a [routerLink]="pageBuilderLink(page.id)" class="cms-add-btn">✏️ Edit Sections</a>
                  <a [href]="previewUrl(def.key)" target="_blank" class="cms-add-btn">👁 Preview ↗</a>
                  <button class="cms-add-btn" [style.color]="page.isPublished ? '#dc2626' : '#059669'"
                    (click)="togglePublish(page)">
                    {{ page.isPublished ? '⬇️ Unpublish' : '🚀 Publish' }}
                  </button>
                } @else {
                  <button class="cms-add-btn" (click)="createPage(def.key, def.label)">+ Create Page</button>
                }
              </div>
            </div>
          }
        </div>
      </snt-cms-section>

    </div>
  `,
  styles: [CMS_INPUT_STYLES + `
    .cms-editor { max-width: 960px; }
    .pages-hint { font-size: 12px; color: #6b7280; margin-bottom: 16px; line-height: 1.6; }
    .pages-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .page-card {
      background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px;
      padding: 14px; display: flex; flex-direction: column; gap: 10px;
    }
    .page-card-published { border-color: #bbf7d0; background: #f0fdf4; }
    .page-card-header { display: flex; align-items: center; gap: 10px; }
    .page-card-icon { font-size: 20px; flex-shrink: 0; }
    .page-card-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .page-card-label { font-size: 13px; font-weight: 700; color: #111827; }
    .page-card-slug { font-size: 11px; color: #9ca3af; font-family: monospace; }
    .page-card-badge-none { font-size: 11px; color: #9ca3af; font-weight: 600; }
    .page-card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    @media (max-width: 700px) { .pages-grid { grid-template-columns: 1fr; } }
  `],
})
export class BcmsPagesEditorComponent implements OnInit {
  private readonly pageSvc    = inject(PageService);
  private readonly auth       = inject(AuthService);
  private readonly cmsSvc     = inject(BranchCmsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly settings  = input.required<BranchCmsSettings>();
  readonly saved     = output<void>();

  readonly pageDefs   = CMS_PAGE_SLUGS;
  readonly pageMap    = signal<Record<string, Page>>({});
  readonly branchCode = signal<string>('');

  ngOnInit(): void {
    // Load branch code from settings (websiteTitle not useful) — fetch via branch-cms
    // branchCode is stored in BranchSettings.theme via getPublicMeta, but simplest is
    // to call /branches/me and read the code field
    this.pageSvc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pages) => {
          const map: Record<string, Page> = {};
          for (const p of pages) {
            map[p.slug] = p;
            // Grab branchCode from first page's branch.code
            if (!this.branchCode() && p.branch?.code) this.branchCode.set(p.branch.code);
          }
          this.pageMap.set(map);
        },
        error: () => {},
      });
  }

  previewUrl(slug: string): string {
    const code = this.branchCode();
    return code ? `/b/${code}/${slug}` : '#';
  }

  pageBuilderLink(pageId: number): string[] {
    const role = this.auth.role();
    const base = (role === 'branch_admin' || role === 'counselor') ? '/branch' : '/ho';
    return [base + '/page-builder', String(pageId)];
  }

  createPage(slug: string, label: string): void {
    const user = this.auth.currentUser();
    if (!user?.branchId) return;

    const pageType = PAGE_TYPE_OPTIONS.find(o => o.value === slug)?.value ?? 'custom';
    const payload: CreatePagePayload = { branchId: user.branchId, title: label, slug, pageType };

    this.pageSvc.create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => { this.pageMap.update(m => ({ ...m, [slug]: p })); },
        error: () => {},
      });
  }

  togglePublish(page: Page): void {
    this.pageSvc.update(page.id, { isPublished: !page.isPublished })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.pageMap.update(m => ({ ...m, [page.slug]: { ...page, ...updated } }));
          this.saved.emit();
        },
        error: () => {},
      });
  }
}
