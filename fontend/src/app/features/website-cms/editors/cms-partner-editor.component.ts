import {
  Component, inject, signal, output, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { WebsiteCmsService } from '../website-cms.service';
import { BecomePartnerPageContent } from '../website-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from './cms-shared.component';

@Component({
  selector: 'snt-cms-partner-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">

      <!-- Hero -->
      <snt-cms-section title="Hero Section" icon="🦸">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().hero.visible" id="heroVis" />
          <label class="cms-toggle-label" for="heroVis">Section Visible</label>
        </div>
        <snt-cms-field label="Title">
          <input class="cms-input" [(ngModel)]="d().hero.title" />
        </snt-cms-field>
        <snt-cms-field label="Subtitle">
          <textarea class="cms-textarea" [(ngModel)]="d().hero.subtitle" rows="2"></textarea>
        </snt-cms-field>
        <p class="cms-sub-label">Hero Stats</p>
        <div class="cms-card-grid">
          @for (stat of d().hero.stats; track $index) {
            <div class="cms-card-item">
              <div class="cms-card-item-header">
                <span class="cms-card-num">Stat {{ $index + 1 }}</span>
                <button class="cms-remove-btn" (click)="d().hero.stats.splice($index, 1)">✕</button>
              </div>
              <input class="cms-input" [(ngModel)]="stat.value" placeholder="30+" style="margin-bottom:6px" />
              <input class="cms-input" [(ngModel)]="stat.label" placeholder="Partners" />
            </div>
          }
        </div>
        <button class="cms-add-btn" (click)="d().hero.stats.push({ icon:'', value:'', label:'' })">+ Add Stat</button>
      </snt-cms-section>

      <!-- Why Points Strip -->
      <snt-cms-section title="Why Points Strip" icon="✅" badge="Purple bar">
        @for (pt of d().whyPoints; track $index) {
          <div class="cms-list-item">
            <input class="cms-input" [(ngModel)]="pt.icon" placeholder="🏷️" style="max-width:60px" />
            <input class="cms-input" [(ngModel)]="pt.label" placeholder="Established Brand" />
            <button class="cms-remove-btn" (click)="d().whyPoints.splice($index, 1)">✕</button>
          </div>
        }
        <button class="cms-add-btn" (click)="d().whyPoints.push({ icon:'', label:'' })">+ Add Point</button>
      </snt-cms-section>

      <!-- Next Steps -->
      <snt-cms-section title="What Happens Next" icon="🚀">
        @for (step of d().nextSteps; track $index) {
          <div class="cms-card-item" style="margin-bottom:8px">
            <div class="cms-card-item-header">
              <span class="cms-card-num">Step {{ $index + 1 }}</span>
              <button class="cms-remove-btn" (click)="d().nextSteps.splice($index, 1)">✕</button>
            </div>
            <div class="cms-row" style="margin-bottom:6px">
              <input class="cms-input" [(ngModel)]="step.num" placeholder="1" />
              <input class="cms-input" [(ngModel)]="step.title" placeholder="Application Review" />
            </div>
            <input class="cms-input" [(ngModel)]="step.desc" placeholder="Description" />
          </div>
        }
        <button class="cms-add-btn" (click)="d().nextSteps.push({ num:'', title:'', desc:'' })">+ Add Step</button>
      </snt-cms-section>

      <!-- Quick Facts -->
      <snt-cms-section title="Quick Facts" icon="📊">
        <div class="cms-card-grid">
          @for (fact of d().quickFacts; track $index) {
            <div class="cms-card-item">
              <div class="cms-card-item-header">
                <span class="cms-card-num">Fact {{ $index + 1 }}</span>
                <button class="cms-remove-btn" (click)="d().quickFacts.splice($index, 1)">✕</button>
              </div>
              <input class="cms-input" [(ngModel)]="fact.icon" placeholder="💰" style="margin-bottom:6px" />
              <input class="cms-input" [(ngModel)]="fact.value" placeholder="₹5L+" style="margin-bottom:6px" />
              <input class="cms-input" [(ngModel)]="fact.label" placeholder="Starting Investment" />
            </div>
          }
        </div>
        <button class="cms-add-btn" (click)="d().quickFacts.push({ icon:'', value:'', label:'' })">+ Add Fact</button>
      </snt-cms-section>

      <!-- Contact Sidebar -->
      <snt-cms-section title="Contact Sidebar" icon="📞">
        <snt-cms-field label="Phone Number">
          <input class="cms-input" [(ngModel)]="d().contactPhone" />
        </snt-cms-field>
        <snt-cms-field label="Office Hours">
          <input class="cms-input" [(ngModel)]="d().contactHours" />
        </snt-cms-field>
      </snt-cms-section>

      <snt-cms-save-bar (saved)="save()" (cancelled)="reset()" />
    </div>
  `,
  styles: [CMS_INPUT_STYLES + `.cms-editor { max-width: 860px; }`],
})
export class CmsPartnerEditorComponent implements OnInit {
  private readonly cms = inject(WebsiteCmsService);
  readonly saved = output<void>();

  readonly d = signal<BecomePartnerPageContent>(structuredClone(this.cms.becomePartner()));

  ngOnInit(): void {
    this.d.set(structuredClone(this.cms.becomePartner()));
  }

  save(): void {
    this.cms.saveBecomePartner(this.d());
    this.saved.emit();
  }

  reset(): void {
    this.d.set(structuredClone(this.cms.becomePartner()));
  }
}
