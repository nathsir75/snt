import {
  Component, inject, signal, output, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { WebsiteCmsService } from '../website-cms.service';
import { AboutPageContent } from '../website-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from './cms-shared.component';

@Component({
  selector: 'snt-cms-about-editor',
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
          <textarea class="cms-textarea" [(ngModel)]="d().hero.subtitle" rows="3"></textarea>
        </snt-cms-field>
        <p class="cms-sub-label">Hero Stats</p>
        <div class="cms-card-grid">
          @for (stat of d().hero.stats; track $index) {
            <div class="cms-card-item">
              <div class="cms-card-item-header">
                <span class="cms-card-num">Stat {{ $index + 1 }}</span>
                <button class="cms-remove-btn" (click)="d().hero.stats.splice($index, 1)">✕</button>
              </div>
              <input class="cms-input" [(ngModel)]="stat.value" placeholder="10K+" style="margin-bottom:6px" />
              <input class="cms-input" [(ngModel)]="stat.label" placeholder="Alumni" />
            </div>
          }
        </div>
        <button class="cms-add-btn" (click)="d().hero.stats.push({ icon:'', value:'', label:'' })">+ Add Stat</button>
      </snt-cms-section>

      <!-- Mission / Vision / Values -->
      <snt-cms-section title="Mission, Vision & Values" icon="🎯">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().missionVision.visible" id="mvVis" />
          <label class="cms-toggle-label" for="mvVis">Section Visible</label>
        </div>
        @for (card of mvCards(); track card.key) {
          <div class="cms-card-item" style="margin-bottom:10px">
            <p class="cms-card-num" style="margin-bottom:8px">{{ card.label }}</p>
            <div class="cms-row" style="margin-bottom:6px">
              <input class="cms-input" [(ngModel)]="card.ref.icon" placeholder="Icon emoji" />
              <input class="cms-input" [(ngModel)]="card.ref.title" placeholder="Title" />
            </div>
            <textarea class="cms-textarea" [(ngModel)]="card.ref.text" rows="2" placeholder="Description"></textarea>
          </div>
        }
      </snt-cms-section>

      <!-- Story -->
      <snt-cms-section title="Our Story" icon="📖">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().story.visible" id="storyVis" />
          <label class="cms-toggle-label" for="storyVis">Section Visible</label>
        </div>
        <div class="cms-row">
          <snt-cms-field label="Eyebrow">
            <input class="cms-input" [(ngModel)]="d().story.eyebrow" />
          </snt-cms-field>
          <snt-cms-field label="Title">
            <input class="cms-input" [(ngModel)]="d().story.title" />
          </snt-cms-field>
        </div>
        <snt-cms-field label="Story Paragraphs">
          @for (p of d().story.paragraphs; track $index) {
            <div class="cms-list-item">
              <textarea class="cms-textarea" [(ngModel)]="d().story.paragraphs[$index]" rows="2"></textarea>
              <button class="cms-remove-btn" (click)="d().story.paragraphs.splice($index, 1)">✕</button>
            </div>
          }
          <button class="cms-add-btn" (click)="d().story.paragraphs.push('')">+ Add Paragraph</button>
        </snt-cms-field>
        <div class="cms-row">
          <snt-cms-field label="CTA Label">
            <input class="cms-input" [(ngModel)]="d().story.ctaLabel" />
          </snt-cms-field>
          <snt-cms-field label="CTA Link">
            <input class="cms-input" [(ngModel)]="d().story.ctaLink" />
          </snt-cms-field>
        </div>
        <p class="cms-sub-label">Milestones Timeline</p>
        @for (m of d().story.milestones; track $index) {
          <div class="cms-card-item" style="margin-bottom:8px">
            <div class="cms-card-item-header">
              <span class="cms-card-num">Milestone {{ $index + 1 }}</span>
              <button class="cms-remove-btn" (click)="d().story.milestones.splice($index, 1)">✕</button>
            </div>
            <div class="cms-row" style="margin-bottom:6px">
              <input class="cms-input" [(ngModel)]="m.year" placeholder="2010" />
              <input class="cms-input" [(ngModel)]="m.title" placeholder="Founded in Pune" />
            </div>
            <input class="cms-input" [(ngModel)]="m.desc" placeholder="Description" />
          </div>
        }
        <button class="cms-add-btn" (click)="d().story.milestones.push({ year:'', title:'', desc:'' })">+ Add Milestone</button>
      </snt-cms-section>

      <!-- Team -->
      <snt-cms-section title="Leadership Team" icon="👥">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().team.visible" id="teamVis" />
          <label class="cms-toggle-label" for="teamVis">Section Visible</label>
        </div>
        <div class="cms-row">
          <snt-cms-field label="Eyebrow">
            <input class="cms-input" [(ngModel)]="d().team.eyebrow" />
          </snt-cms-field>
          <snt-cms-field label="Title">
            <input class="cms-input" [(ngModel)]="d().team.title" />
          </snt-cms-field>
        </div>
        @for (m of d().team.members; track $index) {
          <div class="cms-card-item" style="margin-bottom:8px">
            <div class="cms-card-item-header">
              <span class="cms-card-num">Member {{ $index + 1 }}</span>
              <button class="cms-remove-btn" (click)="d().team.members.splice($index, 1)">✕</button>
            </div>
            <div class="cms-row" style="margin-bottom:6px">
              <input class="cms-input" [(ngModel)]="m.name" placeholder="Name" />
              <input class="cms-input" [(ngModel)]="m.role" placeholder="Role" />
            </div>
            <input class="cms-input" [(ngModel)]="m.bio" placeholder="Bio" />
          </div>
        }
        <button class="cms-add-btn" (click)="d().team.members.push({ name:'', role:'', bio:'' })">+ Add Member</button>
      </snt-cms-section>

      <!-- CTA Band -->
      <snt-cms-section title="CTA Band" icon="📣">
        <div class="cms-toggle-row">
          <input type="checkbox" class="cms-toggle" [(ngModel)]="d().cta.visible" id="ctaVis" />
          <label class="cms-toggle-label" for="ctaVis">Section Visible</label>
        </div>
        <snt-cms-field label="Title">
          <input class="cms-input" [(ngModel)]="d().cta.title" />
        </snt-cms-field>
        <div class="cms-row">
          <snt-cms-field label="CTA 1 Label">
            <input class="cms-input" [(ngModel)]="d().cta.cta1.label" />
          </snt-cms-field>
          <snt-cms-field label="CTA 1 Link">
            <input class="cms-input" [(ngModel)]="d().cta.cta1.link" />
          </snt-cms-field>
        </div>
        <div class="cms-row">
          <snt-cms-field label="CTA 2 Label">
            <input class="cms-input" [(ngModel)]="d().cta.cta2.label" />
          </snt-cms-field>
          <snt-cms-field label="CTA 2 Link">
            <input class="cms-input" [(ngModel)]="d().cta.cta2.link" />
          </snt-cms-field>
        </div>
      </snt-cms-section>

      <snt-cms-save-bar (saved)="save()" (cancelled)="reset()" />
    </div>
  `,
  styles: [CMS_INPUT_STYLES + `.cms-editor { max-width: 860px; }`],
})
export class CmsAboutEditorComponent implements OnInit {
  private readonly cms = inject(WebsiteCmsService);
  readonly saved = output<void>();

  readonly d = signal<AboutPageContent>(structuredClone(this.cms.about()));

  ngOnInit(): void {
    this.d.set(structuredClone(this.cms.about()));
  }

  mvCards() {
    const mv = this.d().missionVision;
    return [
      { key: 'mission', label: 'Mission', ref: mv.mission },
      { key: 'vision',  label: 'Vision',  ref: mv.vision  },
      { key: 'values',  label: 'Values',  ref: mv.values  },
    ];
  }

  save(): void {
    this.cms.saveAbout(this.d());
    this.saved.emit();
  }

  reset(): void {
    this.d.set(structuredClone(this.cms.about()));
  }
}
