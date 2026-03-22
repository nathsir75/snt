import {
  Component, inject, signal, output, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { WebsiteCmsService } from '../website-cms.service';
import { HomePageContent } from '../website-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from './cms-shared.component';

@Component({
  selector: 'snt-cms-home-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">

      <!-- Hero Section -->
      <snt-cms-section title="Hero Section" icon="🦸" badge="Top of page">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().hero.visible" id="heroVis" />
          <label class="cms-toggle-label" for="heroVis">Section Visible</label>
        </div>
        <snt-cms-field label="Badge Text" hint="small pill above title">
          <input class="cms-input" [(ngModel)]="d().hero.badgeText" placeholder="🏆 India's #1 IT Training..." />
        </snt-cms-field>
        <snt-cms-field label="Hero Title">
          <input class="cms-input" [(ngModel)]="d().hero.title" placeholder="Launch Your Career in IT..." />
        </snt-cms-field>
        <snt-cms-field label="Hero Subtitle">
          <textarea class="cms-textarea" [(ngModel)]="d().hero.subtitle" rows="3"></textarea>
        </snt-cms-field>
        <div class="cms-row">
          <snt-cms-field label="CTA Button 1 Label">
            <input class="cms-input" [(ngModel)]="d().hero.cta1.label" />
          </snt-cms-field>
          <snt-cms-field label="CTA Button 1 Link">
            <input class="cms-input" [(ngModel)]="d().hero.cta1.link" />
          </snt-cms-field>
        </div>
        <div class="cms-row">
          <snt-cms-field label="CTA Button 2 Label">
            <input class="cms-input" [(ngModel)]="d().hero.cta2.label" />
          </snt-cms-field>
          <snt-cms-field label="CTA Button 2 Link">
            <input class="cms-input" [(ngModel)]="d().hero.cta2.link" />
          </snt-cms-field>
        </div>
        <snt-cms-field label="Trust Points" hint="one per line">
          @for (tp of d().hero.trustPoints; track $index) {
            <div class="cms-list-item">
              <input class="cms-input" [(ngModel)]="d().hero.trustPoints[$index]" />
              <button class="cms-remove-btn" (click)="removeTrustPoint($index)">✕</button>
            </div>
          }
          <button class="cms-add-btn" (click)="addTrustPoint()">+ Add Trust Point</button>
        </snt-cms-field>
        <p class="cms-sub-label">Hero Stat Cards</p>
        <div class="cms-card-grid">
          @for (stat of d().hero.stats; track $index) {
            <div class="cms-card-item">
              <div class="cms-card-item-header">
                <span class="cms-card-num">Stat {{ $index + 1 }}</span>
                <button class="cms-remove-btn" (click)="removeHeroStat($index)">✕</button>
              </div>
              <input class="cms-input" [(ngModel)]="stat.icon" placeholder="Icon emoji" style="margin-bottom:6px" />
              <input class="cms-input" [(ngModel)]="stat.value" placeholder="10,000+" style="margin-bottom:6px" />
              <input class="cms-input" [(ngModel)]="stat.label" placeholder="Students Trained" />
            </div>
          }
        </div>
        <button class="cms-add-btn" (click)="addHeroStat()">+ Add Stat Card</button>
      </snt-cms-section>

      <!-- Stats Bar -->
      <snt-cms-section title="Stats Bar" icon="📊" badge="Purple band">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().statsBar.visible" id="statsVis" />
          <label class="cms-toggle-label" for="statsVis">Section Visible</label>
        </div>
        <div class="cms-card-grid">
          @for (stat of d().statsBar.items; track $index) {
            <div class="cms-card-item">
              <div class="cms-card-item-header">
                <span class="cms-card-num">Stat {{ $index + 1 }}</span>
                <button class="cms-remove-btn" (click)="d().statsBar.items.splice($index, 1)">✕</button>
              </div>
              <input class="cms-input" [(ngModel)]="stat.value" placeholder="10,000+" style="margin-bottom:6px" />
              <input class="cms-input" [(ngModel)]="stat.label" placeholder="Students Placed" />
            </div>
          }
        </div>
        <button class="cms-add-btn" (click)="d().statsBar.items.push({ icon:'', value:'', label:'' })">+ Add Stat</button>
      </snt-cms-section>

      <!-- Features Section -->
      <snt-cms-section title="Why Choose SNT — Features" icon="⭐">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().featuresSection.visible" id="featVis" />
          <label class="cms-toggle-label" for="featVis">Section Visible</label>
        </div>
        <div class="cms-row">
          <snt-cms-field label="Eyebrow Text">
            <input class="cms-input" [(ngModel)]="d().featuresSection.eyebrow" />
          </snt-cms-field>
          <snt-cms-field label="Section Title">
            <input class="cms-input" [(ngModel)]="d().featuresSection.title" />
          </snt-cms-field>
        </div>
        @for (feat of d().featuresSection.items; track $index) {
          <div class="cms-card-item" style="margin-bottom:8px">
            <div class="cms-card-item-header">
              <span class="cms-card-num">Feature {{ $index + 1 }}</span>
              <button class="cms-remove-btn" (click)="d().featuresSection.items.splice($index, 1)">✕</button>
            </div>
            <div class="cms-row">
              <input class="cms-input" [(ngModel)]="feat.icon" placeholder="Icon emoji" />
              <input class="cms-input" [(ngModel)]="feat.title" placeholder="Feature title" />
            </div>
            <textarea class="cms-textarea" [(ngModel)]="feat.desc" rows="2" placeholder="Description" style="margin-top:6px"></textarea>
          </div>
        }
        <button class="cms-add-btn" (click)="d().featuresSection.items.push({ icon:'', title:'', desc:'' })">+ Add Feature</button>
      </snt-cms-section>

      <!-- Franchise CTA -->
      <snt-cms-section title="Franchise CTA Section" icon="🏢">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().franchiseCta.visible" id="franVis" />
          <label class="cms-toggle-label" for="franVis">Section Visible</label>
        </div>
        <snt-cms-field label="Eyebrow">
          <input class="cms-input" [(ngModel)]="d().franchiseCta.eyebrow" />
        </snt-cms-field>
        <snt-cms-field label="Title">
          <input class="cms-input" [(ngModel)]="d().franchiseCta.title" />
        </snt-cms-field>
        <snt-cms-field label="Subtitle">
          <textarea class="cms-textarea" [(ngModel)]="d().franchiseCta.subtitle" rows="2"></textarea>
        </snt-cms-field>
        <snt-cms-field label="Bullet Points">
          @for (pt of d().franchiseCta.points; track $index) {
            <div class="cms-list-item">
              <input class="cms-input" [(ngModel)]="d().franchiseCta.points[$index]" />
              <button class="cms-remove-btn" (click)="d().franchiseCta.points.splice($index, 1)">✕</button>
            </div>
          }
          <button class="cms-add-btn" (click)="d().franchiseCta.points.push('')">+ Add Point</button>
        </snt-cms-field>
        <div class="cms-row">
          <snt-cms-field label="CTA 1 Label">
            <input class="cms-input" [(ngModel)]="d().franchiseCta.cta1.label" />
          </snt-cms-field>
          <snt-cms-field label="CTA 1 Link">
            <input class="cms-input" [(ngModel)]="d().franchiseCta.cta1.link" />
          </snt-cms-field>
        </div>
      </snt-cms-section>

      <!-- Testimonials -->
      <snt-cms-section title="Testimonials" icon="💬">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().testimonials.visible" id="testVis" />
          <label class="cms-toggle-label" for="testVis">Section Visible</label>
        </div>
        <div class="cms-row">
          <snt-cms-field label="Eyebrow">
            <input class="cms-input" [(ngModel)]="d().testimonials.eyebrow" />
          </snt-cms-field>
          <snt-cms-field label="Title">
            <input class="cms-input" [(ngModel)]="d().testimonials.title" />
          </snt-cms-field>
        </div>
        @for (t of d().testimonials.items; track $index) {
          <div class="cms-card-item" style="margin-bottom:8px">
            <div class="cms-card-item-header">
              <span class="cms-card-num">Testimonial {{ $index + 1 }}</span>
              <button class="cms-remove-btn" (click)="d().testimonials.items.splice($index, 1)">✕</button>
            </div>
            <div class="cms-row" style="margin-bottom:6px">
              <input class="cms-input" [(ngModel)]="t.name" placeholder="Name" />
              <input class="cms-input" [(ngModel)]="t.role" placeholder="Role" />
            </div>
            <input class="cms-input" [(ngModel)]="t.company" placeholder="Company" style="margin-bottom:6px" />
            <textarea class="cms-textarea" [(ngModel)]="t.text" rows="2" placeholder="Testimonial text"></textarea>
          </div>
        }
        <button class="cms-add-btn" (click)="d().testimonials.items.push({ name:'', role:'', company:'', text:'' })">+ Add Testimonial</button>
      </snt-cms-section>

      <!-- Final CTA -->
      <snt-cms-section title="Final CTA Band" icon="📣">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().finalCta.visible" id="finalVis" />
          <label class="cms-toggle-label" for="finalVis">Section Visible</label>
        </div>
        <snt-cms-field label="Title">
          <input class="cms-input" [(ngModel)]="d().finalCta.title" />
        </snt-cms-field>
        <snt-cms-field label="Subtitle">
          <input class="cms-input" [(ngModel)]="d().finalCta.subtitle" />
        </snt-cms-field>
        <div class="cms-row">
          <snt-cms-field label="CTA 1 Label">
            <input class="cms-input" [(ngModel)]="d().finalCta.cta1.label" />
          </snt-cms-field>
          <snt-cms-field label="CTA 1 Link">
            <input class="cms-input" [(ngModel)]="d().finalCta.cta1.link" />
          </snt-cms-field>
        </div>
      </snt-cms-section>

      <snt-cms-save-bar (saved)="save()" (cancelled)="reset()" />
    </div>
  `,
  styles: [CMS_INPUT_STYLES + `.cms-editor { max-width: 860px; }`],
})
export class CmsHomeEditorComponent implements OnInit {
  private readonly cms = inject(WebsiteCmsService);
  readonly saved = output<void>();

  readonly d = signal<HomePageContent>(structuredClone(this.cms.home()));

  ngOnInit(): void {
    this.d.set(structuredClone(this.cms.home()));
  }

  save(): void {
    this.cms.saveHome(this.d());
    this.saved.emit();
  }

  reset(): void {
    this.d.set(structuredClone(this.cms.home()));
  }

  addTrustPoint(): void   { this.d().hero.trustPoints.push(''); }
  removeTrustPoint(i: number): void { this.d().hero.trustPoints.splice(i, 1); }
  addHeroStat(): void     { this.d().hero.stats.push({ icon: '', value: '', label: '' }); }
  removeHeroStat(i: number): void   { this.d().hero.stats.splice(i, 1); }
}
