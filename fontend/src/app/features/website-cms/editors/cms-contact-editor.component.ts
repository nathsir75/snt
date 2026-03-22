import {
  Component, inject, signal, output, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { WebsiteCmsService } from '../website-cms.service';
import { ContactPageContent } from '../website-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from './cms-shared.component';

@Component({
  selector: 'snt-cms-contact-editor',
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
      </snt-cms-section>

      <!-- Contact Info -->
      <snt-cms-section title="Contact Information" icon="📞">
        @for (item of d().contactItems; track $index) {
          <div class="cms-card-item" style="margin-bottom:8px">
            <div class="cms-card-item-header">
              <span class="cms-card-num">Item {{ $index + 1 }}</span>
              <button class="cms-remove-btn" (click)="d().contactItems.splice($index, 1)">✕</button>
            </div>
            <div class="cms-row-3">
              <input class="cms-input" [(ngModel)]="item.icon" placeholder="📧" />
              <input class="cms-input" [(ngModel)]="item.label" placeholder="Email" />
              <input class="cms-input" [(ngModel)]="item.value" placeholder="info@..." />
            </div>
          </div>
        }
        <button class="cms-add-btn" (click)="d().contactItems.push({ icon:'', label:'', value:'' })">+ Add Contact Item</button>
      </snt-cms-section>

      <!-- Office Hours -->
      <snt-cms-section title="Office Hours" icon="🕐">
        <snt-cms-field label="Weekdays">
          <input class="cms-input" [(ngModel)]="d().officeHours.weekdays" placeholder="Monday – Saturday: 9:00 AM – 7:00 PM" />
        </snt-cms-field>
        <snt-cms-field label="Sunday">
          <input class="cms-input" [(ngModel)]="d().officeHours.sunday" placeholder="Sunday: 10:00 AM – 2:00 PM" />
        </snt-cms-field>
      </snt-cms-section>

      <!-- Form -->
      <snt-cms-section title="Contact Form" icon="📝">
        <snt-cms-field label="Form Title">
          <input class="cms-input" [(ngModel)]="d().formTitle" />
        </snt-cms-field>
      </snt-cms-section>

      <snt-cms-save-bar (saved)="save()" (cancelled)="reset()" />
    </div>
  `,
  styles: [CMS_INPUT_STYLES + `.cms-editor { max-width: 860px; }`],
})
export class CmsContactEditorComponent implements OnInit {
  private readonly cms = inject(WebsiteCmsService);
  readonly saved = output<void>();

  readonly d = signal<ContactPageContent>(structuredClone(this.cms.contact()));

  ngOnInit(): void {
    this.d.set(structuredClone(this.cms.contact()));
  }

  save(): void {
    this.cms.saveContact(this.d());
    this.saved.emit();
  }

  reset(): void {
    this.d.set(structuredClone(this.cms.contact()));
  }
}
