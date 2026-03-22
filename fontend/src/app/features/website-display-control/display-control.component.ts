import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DisplayControlService } from './display-control.service';
import { DcImageFieldComponent } from './dc-image-field.component';
import {
  DC_GROUPS, DcGroupKey, DcGroupMeta,
  DisplayControlData, DcImageRef,
  DcHomeHero, DcHomepageStats, DcHeroGroup, DcFranchiseHero,
  DcAnnouncementBar, DcFooterDisplay, DcOgImage,
} from './display-control.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from '../website-cms/editors/cms-shared.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'snt-display-control',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS, FormsModule, DatePipe, DcImageFieldComponent, PageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Website Display Control"
      subtitle="Manage marketing text and images shown on the HO public website"
      icon="🎨"
    >
      <ng-container slot="actions">
        @if (svc.updatedBy()) {
          <span class="last-saved">
            Last saved by {{ svc.updatedBy() }} · {{ svc.updatedAt() | date:'dd MMM, h:mm a' }}
          </span>
        }
      </ng-container>

      @if (loadError()) {
        <div class="dc-error-banner">
          ⚠️ Failed to load settings. Showing defaults — changes will still save correctly.
        </div>
      }

      <div class="dc-layout">

        <!-- ── Sidebar nav ── -->
        <aside class="dc-sidebar">
          @for (g of groups; track g.key) {
            <button
              class="dc-nav-btn"
              [class.dc-nav-btn-active]="activeGroup() === g.key"
              (click)="switchGroup(g.key)"
            >
              <span class="dc-nav-icon">{{ g.icon }}</span>
              <div class="dc-nav-text">
                <span class="dc-nav-label">{{ g.label }}</span>
                <span class="dc-nav-desc">{{ g.description }}</span>
              </div>
            </button>
          }
        </aside>

        <!-- ── Editor panel ── -->
        <div class="dc-panel">

          <div class="dc-panel-header">
            <div>
              <h2 class="dc-panel-title">{{ activeMeta()?.icon }} {{ activeMeta()?.label }}</h2>
              <p class="dc-panel-desc">{{ activeMeta()?.description }}</p>
            </div>
            <div class="dc-panel-actions">
              <button class="btn btn-secondary" (click)="resetGroup()" [disabled]="saveState() === 'saving'">
                Reset
              </button>
              <button class="btn btn-primary" (click)="saveGroup()" [disabled]="saveState() === 'saving'">
                @if (saveState() === 'saving') { <span class="dc-spinner"></span> Saving… }
                @else if (saveState() === 'saved') { ✅ Saved }
                @else { 💾 Save Changes }
              </button>
            </div>
          </div>

          @if (saveState() === 'error') {
            <div class="dc-error-banner">Save failed — please try again.</div>
          }

          <div class="dc-form">

            <!-- ── Home Hero ── -->
            @if (activeGroup() === 'homeHero') {
              <ng-container *ngTemplateOutlet="tplToggle; context: { $implicit: draft, field: 'visible', label: 'Section Visible' }" />

              <snt-cms-section title="Hero Image" icon="🖼️">
                <snt-cms-field label="Hero Image" hint="Main illustration or photo beside the text">
                  <snt-dc-image-field
                    [value]="asHomeHero(draft).heroImage"
                    label="Hero Image"
                    hint="Recommended: 800×600px, PNG or WebP"
                    (changed)="patchImage('heroImage', $event)"
                  />
                </snt-cms-field>
                <snt-cms-field label="Background Image" hint="Optional full-bleed background (use a dark/muted image)">
                  <snt-dc-image-field
                    [value]="asHomeHero(draft).bgImage"
                    label="Background Image"
                    hint="Recommended: 1920×1080px, JPG"
                    (changed)="patchImage('bgImage', $event)"
                  />
                </snt-cms-field>
              </snt-cms-section>

              <snt-cms-section title="Text Content" icon="✏️">
                <snt-cms-field label="Badge Text">
                  <input class="cms-input" [(ngModel)]="asHomeHero(draft).badgeText" />
                </snt-cms-field>
                <snt-cms-field label="Title">
                  <input class="cms-input" [(ngModel)]="asHomeHero(draft).title" />
                </snt-cms-field>
                <snt-cms-field label="Subtitle">
                  <textarea class="cms-textarea" [(ngModel)]="asHomeHero(draft).subtitle" rows="3"></textarea>
                </snt-cms-field>
              </snt-cms-section>

              <snt-cms-section title="CTA Buttons" icon="🔘">
                <div class="cms-row">
                  <snt-cms-field label="Button 1 Label">
                    <input class="cms-input" [(ngModel)]="asHomeHero(draft).cta1Label" />
                  </snt-cms-field>
                  <snt-cms-field label="Button 1 Link">
                    <input class="cms-input" [(ngModel)]="asHomeHero(draft).cta1Link" />
                  </snt-cms-field>
                </div>
                <div class="cms-row">
                  <snt-cms-field label="Button 2 Label">
                    <input class="cms-input" [(ngModel)]="asHomeHero(draft).cta2Label" />
                  </snt-cms-field>
                  <snt-cms-field label="Button 2 Link">
                    <input class="cms-input" [(ngModel)]="asHomeHero(draft).cta2Link" />
                  </snt-cms-field>
                </div>
              </snt-cms-section>
            }

            <!-- ── Homepage Stats ── -->
            @if (activeGroup() === 'homepageStats') {
              <ng-container *ngTemplateOutlet="tplToggle; context: { $implicit: draft, field: 'visible', label: 'Stats Bar Visible' }" />
              <snt-cms-section title="Stat Items" icon="📊">
                <div class="cms-card-grid">
                  @for (item of asStats(draft).items; track $index) {
                    <div class="cms-card-item">
                      <div class="cms-card-item-header">
                        <span class="cms-card-num">Stat {{ $index + 1 }}</span>
                        <button class="cms-remove-btn" (click)="asStats(draft).items.splice($index, 1)">✕</button>
                      </div>
                      <input class="cms-input" [(ngModel)]="item.value" placeholder="10,000+" style="margin-bottom:6px" />
                      <input class="cms-input" [(ngModel)]="item.label" placeholder="Students Placed" />
                    </div>
                  }
                </div>
                <button class="cms-add-btn" (click)="asStats(draft).items.push({ value: '', label: '' })">+ Add Stat</button>
              </snt-cms-section>
            }

            <!-- ── Simple hero groups (branchLocationsHero, contactHero, placementsHero) ── -->
            @if (activeGroup() === 'branchLocationsHero' || activeGroup() === 'contactHero' || activeGroup() === 'placementsHero') {
              <ng-container *ngTemplateOutlet="tplToggle; context: { $implicit: draft, field: 'visible', label: 'Section Visible' }" />
              <snt-cms-section title="Hero Image" icon="🖼️">
                <snt-cms-field label="Hero Image" hint="Recommended: 800×500px">
                  <snt-dc-image-field
                    [value]="asHeroGroup(draft).heroImage"
                    label="Hero Image"
                    (changed)="patchImage('heroImage', $event)"
                  />
                </snt-cms-field>
              </snt-cms-section>
              <snt-cms-section title="Text Content" icon="✏️">
                <snt-cms-field label="Title">
                  <input class="cms-input" [(ngModel)]="asHeroGroup(draft).title" />
                </snt-cms-field>
                <snt-cms-field label="Subtitle">
                  <textarea class="cms-textarea" [(ngModel)]="asHeroGroup(draft).subtitle" rows="3"></textarea>
                </snt-cms-field>
              </snt-cms-section>
            }

            <!-- ── Franchise Hero ── -->
            @if (activeGroup() === 'franchiseHero') {
              <ng-container *ngTemplateOutlet="tplToggle; context: { $implicit: draft, field: 'visible', label: 'Section Visible' }" />
              <snt-cms-section title="Images" icon="🖼️">
                <snt-cms-field label="Hero Image" hint="Main franchise illustration">
                  <snt-dc-image-field
                    [value]="asFranchise(draft).heroImage"
                    label="Hero Image"
                    (changed)="patchImage('heroImage', $event)"
                  />
                </snt-cms-field>
                <snt-cms-field label="Background Image" hint="Optional section background">
                  <snt-dc-image-field
                    [value]="asFranchise(draft).bgImage"
                    label="Background Image"
                    (changed)="patchImage('bgImage', $event)"
                  />
                </snt-cms-field>
              </snt-cms-section>
              <snt-cms-section title="Text Content" icon="✏️">
                <snt-cms-field label="Title">
                  <input class="cms-input" [(ngModel)]="asFranchise(draft).title" />
                </snt-cms-field>
                <snt-cms-field label="Subtitle">
                  <textarea class="cms-textarea" [(ngModel)]="asFranchise(draft).subtitle" rows="3"></textarea>
                </snt-cms-field>
              </snt-cms-section>
            }

            <!-- ── Announcement Bar ── -->
            @if (activeGroup() === 'announcementBar') {
              <snt-cms-section title="Announcement Bar" icon="📢">
                <div class="cms-toggle-row">
                  <input type="checkbox" class="cms-toggle" [(ngModel)]="asAnnouncement(draft).visible" id="ann-vis" />
                  <label class="cms-toggle-label" for="ann-vis">Show announcement bar on all pages</label>
                </div>
                <snt-cms-field label="Message Text">
                  <input class="cms-input" [(ngModel)]="asAnnouncement(draft).text" placeholder="🎉 New batch starting soon!" />
                </snt-cms-field>
                <div class="cms-row">
                  <snt-cms-field label="Background Colour">
                    <div class="color-row">
                      <input type="color" class="color-swatch" [(ngModel)]="asAnnouncement(draft).bgColor" />
                      <input class="cms-input" [(ngModel)]="asAnnouncement(draft).bgColor" placeholder="#6366f1" />
                    </div>
                  </snt-cms-field>
                  <snt-cms-field label="Text Colour">
                    <div class="color-row">
                      <input type="color" class="color-swatch" [(ngModel)]="asAnnouncement(draft).textColor" />
                      <input class="cms-input" [(ngModel)]="asAnnouncement(draft).textColor" placeholder="#ffffff" />
                    </div>
                  </snt-cms-field>
                </div>
                <div class="cms-row">
                  <snt-cms-field label="Link Label" hint="optional">
                    <input class="cms-input" [(ngModel)]="asAnnouncement(draft).linkLabel" placeholder="Learn more →" />
                  </snt-cms-field>
                  <snt-cms-field label="Link URL" hint="optional">
                    <input class="cms-input" [(ngModel)]="asAnnouncement(draft).linkUrl" placeholder="/courses" />
                  </snt-cms-field>
                </div>
                @if (asAnnouncement(draft).visible) {
                  <div class="ann-preview" [style.background]="asAnnouncement(draft).bgColor" [style.color]="asAnnouncement(draft).textColor">
                    {{ asAnnouncement(draft).text }}
                    @if (asAnnouncement(draft).linkLabel) {
                      <span class="ann-link">{{ asAnnouncement(draft).linkLabel }}</span>
                    }
                  </div>
                }
              </snt-cms-section>
            }

            <!-- ── Footer Display ── -->
            @if (activeGroup() === 'footerDisplay') {
              <snt-cms-section title="Footer Text" icon="✏️">
                <snt-cms-field label="Tagline">
                  <textarea class="cms-textarea" [(ngModel)]="asFooter(draft).tagline" rows="2"></textarea>
                </snt-cms-field>
                <snt-cms-field label="Copyright">
                  <input class="cms-input" [(ngModel)]="asFooter(draft).copyright" />
                </snt-cms-field>
              </snt-cms-section>
              <snt-cms-section title="Visibility Toggles" icon="👁️">
                @for (toggle of footerToggles; track toggle.field) {
                  <div class="cms-toggle-row">
                    <input type="checkbox" class="cms-toggle" [id]="'ft-' + toggle.field"
                      [ngModel]="getFooterToggle(toggle.field)"
                      (ngModelChange)="setFooterToggle(toggle.field, $event)" />
                    <label class="cms-toggle-label" [for]="'ft-' + toggle.field">{{ toggle.label }}</label>
                  </div>
                }
              </snt-cms-section>
              <snt-cms-section title="Footer Link Columns" icon="🔗">
                @for (col of asFooter(draft).columns; track $index) {
                  <div class="cms-card-item" style="margin-bottom:12px">
                    <div class="cms-card-item-header">
                      <span class="cms-card-num">Column {{ $index + 1 }}</span>
                      <button class="cms-remove-btn" (click)="asFooter(draft).columns.splice($index, 1)">✕</button>
                    </div>
                    <snt-cms-field label="Column Heading">
                      <input class="cms-input" [(ngModel)]="col.heading" placeholder="Quick Links" />
                    </snt-cms-field>
                    @for (link of col.links; track $index) {
                      <div class="cms-list-item">
                        <input class="cms-input" [(ngModel)]="link.label" placeholder="Label" style="flex:1" />
                        <input class="cms-input" [(ngModel)]="link.url" placeholder="/path" style="flex:1" />
                        <button class="cms-remove-btn" (click)="col.links.splice($index, 1)">✕</button>
                      </div>
                    }
                    <button class="cms-add-btn" (click)="col.links.push({ label: '', url: '' })">+ Add Link</button>
                  </div>
                }
                <button class="cms-add-btn" (click)="asFooter(draft).columns.push({ heading: '', links: [] })">+ Add Column</button>
              </snt-cms-section>
            }

            <!-- ── OG / Logo Images ── -->
            @if (activeGroup() === 'ogImage') {
              <snt-cms-section title="Site Logo" icon="🏷️">
                <snt-cms-field label="Logo Image" hint="Used in header, emails, and OG tags. Recommended: 400×120px PNG with transparent background">
                  <snt-dc-image-field
                    [value]="asOg(draft).logoImage"
                    label="Logo"
                    (changed)="patchImage('logoImage', $event)"
                  />
                </snt-cms-field>
              </snt-cms-section>
              <snt-cms-section title="Default Social Share Image" icon="📸">
                <snt-cms-field label="Default OG Image" hint="Shown when pages are shared on social media without a specific OG image. Recommended: 1200×630px JPG">
                  <snt-dc-image-field
                    [value]="asOg(draft).defaultOgImage"
                    label="OG Image"
                    (changed)="patchImage('defaultOgImage', $event)"
                  />
                </snt-cms-field>
              </snt-cms-section>
            }

          </div>
        </div>
      </div>
    </snt-page-shell>

    <!-- Invisible toggle template -->
    <ng-template #tplToggle let-d let-field="field" let-label="label">
      <div class="cms-toggle-row" style="margin-bottom:16px">
        <input type="checkbox" class="cms-toggle" [id]="'vis-' + activeGroup()"
          [ngModel]="getVisible(d)" (ngModelChange)="setVisible(d, $event)" />
        <label class="cms-toggle-label" [for]="'vis-' + activeGroup()">{{ label }}</label>
      </div>
    </ng-template>
  `,
  styles: [CMS_INPUT_STYLES + `
    .last-saved { font-size: 12px; color: var(--color-text-muted); }
    .dc-error-banner {
      background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;
      border-radius: 8px; padding: 10px 16px; font-size: 13px; margin-bottom: 16px;
    }
    .dc-layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: start; }
    @media (max-width: 768px) { .dc-layout { grid-template-columns: 1fr; } }

    .dc-sidebar {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 8px; display: flex; flex-direction: column; gap: 2px;
      position: sticky; top: 16px;
    }
    .dc-nav-btn {
      display: flex; align-items: flex-start; gap: 10px; padding: 10px;
      border-radius: var(--radius-md); background: transparent; border: none;
      cursor: pointer; text-align: left; transition: background .12s; width: 100%;
    }
    .dc-nav-btn:hover { background: var(--color-bg); }
    .dc-nav-btn-active { background: #eef2ff !important; }
    .dc-nav-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .dc-nav-text { display: flex; flex-direction: column; gap: 2px; }
    .dc-nav-label { font-size: 13px; font-weight: 700; color: #111827; }
    .dc-nav-btn-active .dc-nav-label { color: #6366f1; }
    .dc-nav-desc { font-size: 11px; color: #9ca3af; line-height: 1.4; }

    .dc-panel {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .dc-panel-header {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 16px 20px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap;
    }
    .dc-panel-title { font-size: 16px; font-weight: 800; color: #111827; }
    .dc-panel-desc  { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .dc-panel-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .dc-form { padding: 20px; }

    .dc-spinner {
      display: inline-block; width: 12px; height: 12px;
      border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
      border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 4px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .color-row { display: flex; align-items: center; gap: 8px; }
    .color-swatch { width: 36px; height: 36px; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; padding: 2px; flex-shrink: 0; }

    .ann-preview {
      margin-top: 12px; padding: 10px 16px; border-radius: 6px;
      font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 12px;
    }
    .ann-link { text-decoration: underline; cursor: pointer; opacity: .85; }
  `],
})
export class DisplayControlComponent implements OnInit {
  readonly svc       = inject(DisplayControlService);
  private readonly cd = inject(ChangeDetectorRef);

  readonly groups     = DC_GROUPS;
  readonly activeGroup = signal<DcGroupKey>('homeHero');
  readonly saveState   = signal<SaveState>('idle');
  readonly loadError   = signal(false);

  // Working draft — deep-cloned from service on load and on group switch
  draft: Record<string, unknown> = {};

  readonly activeMeta = computed<DcGroupMeta | undefined>(
    () => DC_GROUPS.find(g => g.key === this.activeGroup()),
  );

  readonly footerToggles: { field: string; label: string }[] = [
    { field: 'showSocialLinks', label: 'Show social media links' },
    { field: 'showAddress',     label: 'Show office address' },
    { field: 'showPhone',       label: 'Show phone number' },
    { field: 'showEmail',       label: 'Show email address' },
  ];

  ngOnInit(): void {
    this.svc.load().subscribe({
      next:  () => { this.resetDraft(); this.cd.markForCheck(); },
      error: () => { this.loadError.set(true); this.resetDraft(); },
    });
  }

  // ── Draft management ──────────────────────────────────────────────────────

  private resetDraft(): void {
    const key = this.activeGroup();
    const src = (this.svc.data() as unknown as Record<string, unknown>)[key];
    this.draft = JSON.parse(JSON.stringify(src ?? {}));
  }

  resetGroup(): void { this.resetDraft(); this.saveState.set('idle'); }

  // Called when user switches sidebar tab — save prompt not needed (per-group save)
  switchGroup(key: DcGroupKey): void {
    this.activeGroup.set(key);
    this.resetDraft();
    this.saveState.set('idle');
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  saveGroup(): void {
    this.saveState.set('saving');
    this.svc.saveGroup(this.activeGroup(), this.draft).subscribe({
      next: () => {
        this.saveState.set('saved');
        setTimeout(() => this.saveState.set('idle'), 2500);
      },
      error: () => { this.saveState.set('error'); },
    });
  }

  // ── Image patch helpers ───────────────────────────────────────────────────
  // Called by DcImageFieldComponent (changed) output — patches the draft in place

  patchImage(field: string, ref: DcImageRef): void {
    (this.draft as Record<string, unknown>)[field] = ref;
  }

  // ── Type-cast helpers (avoid any in template) ─────────────────────────────

  asHomeHero(d: Record<string, unknown>):    DcHomeHero       { return d as unknown as DcHomeHero; }
  asStats(d: Record<string, unknown>):       DcHomepageStats  { return d as unknown as DcHomepageStats; }
  asHeroGroup(d: Record<string, unknown>):   DcHeroGroup      { return d as unknown as DcHeroGroup; }
  asFranchise(d: Record<string, unknown>):   DcFranchiseHero  { return d as unknown as DcFranchiseHero; }
  asAnnouncement(d: Record<string, unknown>):DcAnnouncementBar{ return d as unknown as DcAnnouncementBar; }
  asFooter(d: Record<string, unknown>):      DcFooterDisplay  { return d as unknown as DcFooterDisplay; }
  asOg(d: Record<string, unknown>):          DcOgImage        { return d as unknown as DcOgImage; }

  // ── Toggle helpers ────────────────────────────────────────────────────────

  getVisible(d: Record<string, unknown>): boolean { return !!(d['visible']); }
  setVisible(d: Record<string, unknown>, v: boolean): void { d['visible'] = v; }

  getFooterToggle(field: string): boolean { return !!(this.draft[field]); }
  setFooterToggle(field: string, v: boolean): void { this.draft[field] = v; }
}
