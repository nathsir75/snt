import {
  Component, inject, signal, output, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { WebsiteCmsService } from '../website-cms.service';
import { SiteSeoConfig } from '../website-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from './cms-shared.component';

@Component({
  selector: 'snt-cms-seo-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">

      <div class="seo-info-banner">
        <span>ℹ️</span>
        <p>SEO meta tags are rendered in the page <code>&lt;head&gt;</code>. These fields are ready for integration with Angular's <code>Meta</code> and <code>Title</code> services.</p>
      </div>

      @for (page of seoPages; track page.key) {
        <snt-cms-section [title]="page.label" [icon]="page.icon">
          <snt-cms-field label="Meta Title" hint="50–60 chars recommended">
            <input class="cms-input" [(ngModel)]="d()[page.key].metaTitle" [placeholder]="'Page title for ' + page.label" />
            <span class="char-count" [class.over]="d()[page.key].metaTitle.length > 60">
              {{ d()[page.key].metaTitle.length }}/60
            </span>
          </snt-cms-field>
          <snt-cms-field label="Meta Description" hint="150–160 chars recommended">
            <textarea class="cms-textarea" [(ngModel)]="d()[page.key].metaDescription" rows="2" [placeholder]="'Description for ' + page.label"></textarea>
            <span class="char-count" [class.over]="d()[page.key].metaDescription.length > 160">
              {{ d()[page.key].metaDescription.length }}/160
            </span>
          </snt-cms-field>
          <snt-cms-field label="OG Image URL" hint="1200×630px recommended">
            <input class="cms-input" [(ngModel)]="d()[page.key].ogImageUrl" placeholder="https://..." />
          </snt-cms-field>
          <div class="cms-toggle-row">
            <input type="checkbox" class="cms-toggle" [(ngModel)]="d()[page.key].indexed" [id]="'idx-' + page.key" />
            <label class="cms-toggle-label" [for]="'idx-' + page.key">Allow search engine indexing</label>
          </div>
        </snt-cms-section>
      }

      <snt-cms-save-bar (saved)="save()" (cancelled)="reset()" />
    </div>
  `,
  styles: [CMS_INPUT_STYLES + `
    .cms-editor { max-width: 860px; }
    .seo-info-banner {
      display: flex; gap: 10px; align-items: flex-start;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 12px 14px; margin-bottom: 16px; font-size: 13px; color: #1e40af;
    }
    .seo-info-banner p { line-height: 1.6; }
    .seo-info-banner code { background: #dbeafe; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
    .char-count { font-size: 11px; color: #9ca3af; margin-top: 3px; display: block; }
    .char-count.over { color: #dc2626; font-weight: 700; }
  `],
})
export class CmsSeoEditorComponent implements OnInit {
  private readonly cms = inject(WebsiteCmsService);
  readonly saved = output<void>();

  readonly d = signal<SiteSeoConfig>(structuredClone(this.cms.seo()));

  readonly seoPages = [
    { key: 'home'               as const, label: 'Home Page',            icon: '🏠' },
    { key: 'about'              as const, label: 'About Us',             icon: 'ℹ️' },
    { key: 'contact'            as const, label: 'Contact Page',         icon: '📞' },
    { key: 'becomePartner'      as const, label: 'Become a Partner',     icon: '🤝' },
    { key: 'courses'            as const, label: 'Courses',              icon: '📚' },
    { key: 'placements'         as const, label: 'Placements',           icon: '🏆' },
    { key: 'careers'            as const, label: 'Careers',              icon: '💼' },
    { key: 'internships'        as const, label: 'Internships',          icon: '🎓' },
    { key: 'corporateTraining'  as const, label: 'Corporate Training',   icon: '🏢' },
    { key: 'collegePartnerships'as const, label: 'College Partnerships', icon: '🏫' },
    { key: 'hireTalent'         as const, label: 'Hire Talent',          icon: '🔍' },
    { key: 'franchise'          as const, label: 'Franchise',            icon: '💰' },
  ];

  ngOnInit(): void {
    this.d.set(structuredClone(this.cms.seo()));
  }

  save(): void {
    this.cms.saveSeo(this.d());
    this.saved.emit();
  }

  reset(): void {
    this.d.set(structuredClone(this.cms.seo()));
  }
}
