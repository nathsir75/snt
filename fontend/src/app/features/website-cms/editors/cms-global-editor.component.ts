import {
  Component, inject, signal, output, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { WebsiteCmsService } from '../website-cms.service';
import { GlobalSiteContent } from '../website-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from './cms-shared.component';

@Component({
  selector: 'snt-cms-global-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">

      <snt-cms-section title="Site Branding" icon="🎨">
        <div class="cms-row">
          <snt-cms-field label="Site Name">
            <input class="cms-input" [(ngModel)]="d().siteName" placeholder="SNT Education" />
          </snt-cms-field>
          <snt-cms-field label="Tagline">
            <input class="cms-input" [(ngModel)]="d().tagline" placeholder="Empowering Careers" />
          </snt-cms-field>
        </div>
        <div class="cms-row">
          <snt-cms-field label="Logo Text" hint="shown when no logo image">
            <input class="cms-input" [(ngModel)]="d().logoText" placeholder="SNT" />
          </snt-cms-field>
          <snt-cms-field label="Logo Image URL" hint="leave blank to use text">
            <input class="cms-input" [(ngModel)]="d().logoUrl" placeholder="https://..." />
          </snt-cms-field>
        </div>
        <snt-cms-field label="Primary Brand Color">
          <div style="display:flex;gap:8px;align-items:center">
            <input class="cms-input" [(ngModel)]="d().primaryColor" placeholder="#6366f1" style="flex:1" />
            <input type="color" [(ngModel)]="d().primaryColor" style="width:40px;height:38px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;padding:2px" />
          </div>
        </snt-cms-field>
      </snt-cms-section>

      <snt-cms-section title="Contact Information" icon="📞">
        <div class="cms-row">
          <snt-cms-field label="Support Email">
            <input class="cms-input" type="email" [(ngModel)]="d().supportEmail" />
          </snt-cms-field>
          <snt-cms-field label="Support Phone">
            <input class="cms-input" [(ngModel)]="d().supportPhone" />
          </snt-cms-field>
        </div>
        <div class="cms-row">
          <snt-cms-field label="WhatsApp Number">
            <input class="cms-input" [(ngModel)]="d().whatsapp" placeholder="+91 98765 43210" />
          </snt-cms-field>
          <snt-cms-field label="Working Hours">
            <input class="cms-input" [(ngModel)]="d().workingHours" placeholder="Mon–Sat: 9 AM – 7 PM" />
          </snt-cms-field>
        </div>
        <snt-cms-field label="Address">
          <textarea class="cms-textarea" [(ngModel)]="d().address" rows="2"></textarea>
        </snt-cms-field>
        <snt-cms-field label="Google Maps Link">
          <input class="cms-input" [(ngModel)]="d().mapLink" placeholder="https://maps.google.com/..." />
        </snt-cms-field>
      </snt-cms-section>

      <snt-cms-section title="Footer Content" icon="🦶">
        <snt-cms-field label="Footer Description">
          <textarea class="cms-textarea" [(ngModel)]="d().footerDesc" rows="3"></textarea>
        </snt-cms-field>
        <snt-cms-field label="Copyright Text">
          <input class="cms-input" [(ngModel)]="d().footerCopyright" placeholder="© 2024 SNT Education..." />
        </snt-cms-field>
      </snt-cms-section>

      <snt-cms-section title="Social Media Links" icon="🔗">
        @for (link of d().socialLinks; track $index) {
          <div class="cms-list-item">
            <input class="cms-input" [(ngModel)]="link.platform" placeholder="Facebook" style="max-width:120px" />
            <input class="cms-input" [(ngModel)]="link.url" placeholder="https://facebook.com/..." />
            <button class="cms-remove-btn" (click)="d().socialLinks.splice($index, 1)">✕</button>
          </div>
        }
        <button class="cms-add-btn" (click)="d().socialLinks.push({ platform:'', url:'' })">+ Add Social Link</button>
      </snt-cms-section>

      <snt-cms-section title="Announcement Bar" icon="📢" badge="Top of site">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().announcementBar.visible" id="annVis" />
          <label class="cms-toggle-label" for="annVis">Show Announcement Bar</label>
        </div>
        <snt-cms-field label="Announcement Text">
          <input class="cms-input" [(ngModel)]="d().announcementBar.text" placeholder="🎉 New batch starting soon! Enroll now." />
        </snt-cms-field>
        <snt-cms-field label="Background Color" hint="hex color">
          <div style="display:flex;gap:8px;align-items:center">
            <input class="cms-input" [(ngModel)]="d().announcementBar.bgColor" placeholder="#6366f1" style="flex:1" />
            <input type="color" [(ngModel)]="d().announcementBar.bgColor" style="width:40px;height:38px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;padding:2px" />
          </div>
        </snt-cms-field>
      </snt-cms-section>

      <snt-cms-save-bar note="Saves to database — changes reflect on public site immediately." (saved)="save()" (cancelled)="reset()" />
    </div>
  `,
  styles: [CMS_INPUT_STYLES + `.cms-editor { max-width: 860px; }`],
})
export class CmsGlobalEditorComponent implements OnInit {
  private readonly cms = inject(WebsiteCmsService);
  readonly saved = output<void>();

  readonly d = signal<GlobalSiteContent>(structuredClone(this.cms.global()));

  ngOnInit(): void { this.d.set(structuredClone(this.cms.global())); }

  save(): void {
    this.cms.saveGlobal(this.d()).subscribe();
    this.saved.emit();
  }

  reset(): void { this.d.set(structuredClone(this.cms.global())); }
}
