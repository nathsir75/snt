import {
  Component, inject, input, output, signal,
  OnInit, ChangeDetectionStrategy,
} from '@angular/core';
import { BranchCmsService } from '../branch-cms.service';
import { BranchCmsSettings, CMS_PAGE_SLUGS, DEFAULT_SEO, PageSeo } from '../branch-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from '../../../features/website-cms/editors/cms-shared.component';

@Component({
  selector: 'snt-bcms-seo-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">

      <div class="seo-banner">
        ℹ️ SEO fields are served via the public API and can be injected into <code>&lt;head&gt;</code> by the branch site renderer.
      </div>

      @for (def of pageDefs; track def.key) {
        @let seo = d()[def.key];
        <snt-cms-section [title]="def.label" [icon]="def.icon">
          <div class="cms-row">
            <snt-cms-field label="Meta Title" hint="50–60 chars">
              <input class="cms-input" [(ngModel)]="seo.metaTitle" [placeholder]="def.label + ' — SNT Education'" />
              <span class="char-count" [class.over]="seo.metaTitle.length > 60">{{ seo.metaTitle.length }}/60</span>
            </snt-cms-field>
            <snt-cms-field label="URL Slug" hint="e.g. about">
              <input class="cms-input" [(ngModel)]="seo.slug" [placeholder]="def.key" />
            </snt-cms-field>
          </div>
          <snt-cms-field label="Meta Description" hint="150–160 chars">
            <textarea class="cms-textarea" [(ngModel)]="seo.metaDescription" rows="2" [placeholder]="'Description for ' + def.label"></textarea>
            <span class="char-count" [class.over]="seo.metaDescription.length > 160">{{ seo.metaDescription.length }}/160</span>
          </snt-cms-field>
          <snt-cms-field label="OG Image URL" hint="1200×630px recommended">
            <input class="cms-input" [(ngModel)]="seo.ogImageUrl" placeholder="https://..." />
          </snt-cms-field>
        </snt-cms-section>
      }

      <snt-cms-save-bar note="Saves SEO config to your branch settings." (saved)="save()" (cancelled)="reset()" />
    </div>
  `,
  styles: [CMS_INPUT_STYLES + `
    .cms-editor { max-width: 860px; }
    .seo-banner {
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 12px 14px; margin-bottom: 16px; font-size: 13px; color: #1e40af; line-height: 1.6;
    }
    .seo-banner code { background: #dbeafe; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
    .char-count { font-size: 11px; color: #9ca3af; margin-top: 3px; display: block; }
    .char-count.over { color: #dc2626; font-weight: 700; }
  `],
})
export class BcmsSeoEditorComponent implements OnInit {
  private readonly svc = inject(BranchCmsService);

  readonly settings = input.required<BranchCmsSettings>();
  readonly saved    = output<BranchCmsSettings>();

  readonly pageDefs = CMS_PAGE_SLUGS;
  readonly d        = signal<Record<string, PageSeo>>({});

  ngOnInit(): void { this.reset(); }

  reset(): void {
    const seo = this.settings().seo ?? {};
    const map: Record<string, PageSeo> = {};
    for (const def of this.pageDefs) {
      map[def.key] = structuredClone(seo[def.key] ?? { ...DEFAULT_SEO, slug: def.key });
    }
    this.d.set(map);
  }

  save(): void {
    this.svc.update({ seo: this.d() })
      .subscribe({ next: (s) => this.saved.emit(s), error: () => {} });
  }
}
