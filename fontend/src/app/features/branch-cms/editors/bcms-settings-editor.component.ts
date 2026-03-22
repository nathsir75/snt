import {
  Component, inject, input, output, signal,
  OnInit, ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BranchCmsService } from '../branch-cms.service';
import { BranchCmsSettings, SocialLink } from '../branch-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from '../../../features/website-cms/editors/cms-shared.component';
import { MediaPickerComponent } from '../../../shared/components/media-picker/media-picker.component';
import { MediaAsset } from '../../media-library/media.models';

@Component({
  selector: 'snt-bcms-settings-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS, MediaPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">

      <snt-cms-section title="Site Branding" icon="🎨">
        <div class="cms-row">
          <snt-cms-field label="Website Title" hint="shown in browser tab">
            <input class="cms-input" [value]="d().websiteTitle ?? ''" (input)="patch('websiteTitle', $any($event.target).value)" placeholder="Mumbai Branch — SNT Education" />
          </snt-cms-field>
          <snt-cms-field label="Tagline">
            <input class="cms-input" [value]="d().tagline ?? ''" (input)="patch('tagline', $any($event.target).value)" placeholder="Empowering Careers in Mumbai" />
          </snt-cms-field>
        </div>
        <snt-cms-field label="Logo">
          <div style="display:flex;gap:8px">
            <input class="cms-input" [value]="d().logoUrl ?? ''" (input)="patch('logoUrl', $any($event.target).value)" placeholder="https://..." style="flex:1" />
            <button class="cms-add-btn" style="white-space:nowrap" (click)="pickerFor.set('logo')">🖼️ Pick</button>
          </div>
          @if (d().logoUrl) {
            <img [src]="d().logoUrl!" alt="Logo" style="height:48px;margin-top:8px;border-radius:6px;border:1px solid #e5e7eb" />
          }
        </snt-cms-field>
        <div class="cms-row">
          <snt-cms-field label="Primary Color" hint="hex">
            <div style="display:flex;gap:8px;align-items:center">
              <input class="cms-input" [value]="d().primaryColor ?? ''" (input)="patch('primaryColor', $any($event.target).value)" placeholder="#6366f1" style="flex:1" />
              <input type="color" [value]="d().primaryColor ?? '#6366f1'" (input)="patch('primaryColor', $any($event.target).value)" style="width:40px;height:38px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;padding:2px" />
            </div>
          </snt-cms-field>
          <snt-cms-field label="Footer Text">
            <input class="cms-input" [value]="d().footerText ?? ''" (input)="patch('footerText', $any($event.target).value)" placeholder="© 2025 SNT Education Mumbai" />
          </snt-cms-field>
        </div>
      </snt-cms-section>

      <snt-cms-section title="Contact Information" icon="📞">
        <div class="cms-row">
          <snt-cms-field label="Phone">
            <input class="cms-input" [value]="d().phone ?? ''" (input)="patch('phone', $any($event.target).value)" placeholder="+91 98765 43210" />
          </snt-cms-field>
          <snt-cms-field label="WhatsApp">
            <input class="cms-input" [value]="d().whatsapp ?? ''" (input)="patch('whatsapp', $any($event.target).value)" placeholder="+91 98765 43210" />
          </snt-cms-field>
        </div>
        <snt-cms-field label="Email">
          <input class="cms-input" type="email" [value]="d().email ?? ''" (input)="patch('email', $any($event.target).value)" placeholder="mumbai@snteducation.com" />
        </snt-cms-field>
        <snt-cms-field label="Address">
          <textarea class="cms-textarea" [value]="d().address ?? ''" (input)="patch('address', $any($event.target).value)" rows="2" placeholder="123 Main Street, Mumbai – 400001"></textarea>
        </snt-cms-field>
        <snt-cms-field label="Working Hours">
          <input class="cms-input" [value]="d().workingHours ?? ''" (input)="patch('workingHours', $any($event.target).value)" placeholder="Mon–Sat: 9:00 AM – 7:00 PM" />
        </snt-cms-field>
        <snt-cms-field label="Google Maps Embed Link" hint="paste the embed src URL">
          <input class="cms-input" [value]="d().mapLink ?? ''" (input)="patch('mapLink', $any($event.target).value)" placeholder="https://maps.google.com/maps?..." />
        </snt-cms-field>
      </snt-cms-section>

      <snt-cms-section title="Social Media Links" icon="🔗">
        @for (link of d().socialLinks; track $index) {
          <div class="cms-list-item">
            <input class="cms-input" [value]="link.platform" (input)="updateLink($index, 'platform', $any($event.target).value)" placeholder="Facebook" style="max-width:120px" />
            <input class="cms-input" [value]="link.url" (input)="updateLink($index, 'url', $any($event.target).value)" placeholder="https://facebook.com/..." />
            <button class="cms-remove-btn" (click)="removeLink($index)">✕</button>
          </div>
        }
        <button class="cms-add-btn" (click)="addLink()">+ Add Social Link</button>
      </snt-cms-section>

      <snt-cms-save-bar note="Saves to your branch settings." (saved)="save()" (cancelled)="reset()" />
    </div>

    <snt-media-picker [open]="pickerFor() !== null" filterType="image"
      (picked)="onPicked($event)" (cancel)="pickerFor.set(null)" />
  `,
  styles: [CMS_INPUT_STYLES + `.cms-editor { max-width: 860px; }`],
})
export class BcmsSettingsEditorComponent implements OnInit {
  private readonly svc = inject(BranchCmsService);

  readonly settings  = input.required<BranchCmsSettings>();
  readonly saved     = output<BranchCmsSettings>();
  readonly d         = signal<BranchCmsSettings>({} as BranchCmsSettings);
  readonly pickerFor = signal<string | null>(null);

  ngOnInit(): void { this.reset(); }

  reset(): void { this.d.set(structuredClone(this.settings())); }

  patch(key: keyof BranchCmsSettings, value: unknown): void {
    this.d.update(cur => ({ ...cur, [key]: value }));
  }

  addLink(): void {
    this.d.update(cur => ({ ...cur, socialLinks: [...cur.socialLinks, { platform: '', url: '' }] }));
  }

  removeLink(i: number): void {
    this.d.update(cur => ({ ...cur, socialLinks: cur.socialLinks.filter((_, idx) => idx !== i) }));
  }

  updateLink(i: number, field: keyof SocialLink, value: string): void {
    this.d.update(cur => ({
      ...cur,
      socialLinks: cur.socialLinks.map((l, idx) => idx === i ? { ...l, [field]: value } : l),
    }));
  }

  onPicked(a: MediaAsset): void {
    if (this.pickerFor() === 'logo') this.patch('logoUrl', a.fileUrl);
    this.pickerFor.set(null);
  }

  save(): void {
    const { logoUrl, tagline, phone, whatsapp, email, address, workingHours, mapLink, socialLinks, primaryColor, websiteTitle, footerText } = this.d();
    this.svc.update({ logoUrl, tagline, phone, whatsapp, email, address, workingHours, mapLink, socialLinks, primaryColor, websiteTitle, footerText })
      .subscribe({ next: (s) => this.saved.emit(s), error: () => {} });
  }
}
