import {
  Component, inject, signal, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { SlicePipe } from '@angular/common';
import { WebsiteCmsService } from './website-cms.service';
import { CMS_PAGES, CmsPageKey } from './website-cms.models';
import { CmsHomeEditorComponent }        from './editors/cms-home-editor.component';
import { CmsAboutEditorComponent }       from './editors/cms-about-editor.component';
import { CmsContactEditorComponent }     from './editors/cms-contact-editor.component';
import { CmsPartnerEditorComponent }     from './editors/cms-partner-editor.component';
import { CmsGlobalEditorComponent }      from './editors/cms-global-editor.component';
import { CmsSeoEditorComponent }         from './editors/cms-seo-editor.component';
import { CmsNavEditorComponent }         from './editors/cms-nav-editor.component';
import { CmsCollectionsEditorComponent } from './editors/cms-collections-editor.component';
import { CmsEnquiriesEditorComponent }   from './editors/cms-enquiries-editor.component';

@Component({
  selector: 'snt-website-cms',
  standalone: true,
  imports: [
    SlicePipe,
    CmsHomeEditorComponent,
    CmsAboutEditorComponent,
    CmsContactEditorComponent,
    CmsPartnerEditorComponent,
    CmsGlobalEditorComponent,
    CmsSeoEditorComponent,
    CmsNavEditorComponent,
    CmsCollectionsEditorComponent,
    CmsEnquiriesEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-shell">

      <!-- ── Sidebar ── -->
      <aside class="cms-sidebar">
        <div class="cms-sidebar-header">
          <div class="cms-sidebar-icon">🌐</div>
          <div>
            <p class="cms-sidebar-title">HO Website CMS</p>
            <p class="cms-sidebar-sub">snteducation.com</p>
          </div>
        </div>

        <nav class="cms-nav">
          @for (page of pages; track page.key) {
            <button
              class="cms-nav-item"
              [class.cms-nav-item-active]="activePage() === page.key"
              (click)="activePage.set(page.key)"
            >
              <span class="cms-nav-icon">{{ page.icon }}</span>
              <div class="cms-nav-text">
                <span class="cms-nav-label">{{ page.label }}</span>
                <span class="cms-nav-desc">{{ page.description }}</span>
              </div>
            </button>
          }
        </nav>

        <div class="cms-sidebar-footer">
          <p class="cms-last-updated">Last saved</p>
          <p class="cms-last-updated-time">{{ lastUpdated() | slice:0:10 }}</p>
          <a href="/home" target="_blank" class="cms-preview-link">👁 Preview Public Site ↗</a>
          <button class="cms-reset-btn" (click)="confirmReset()">↺ Reset to Defaults</button>
        </div>
      </aside>

      <!-- ── Main editor area ── -->
      <main class="cms-main">

        <div class="cms-topbar">
          <div class="cms-topbar-left">
            <h1 class="cms-topbar-title">{{ activePageMeta()?.label }}</h1>
            <p class="cms-topbar-desc">{{ activePageMeta()?.description }}</p>
          </div>
          <div class="cms-topbar-actions">
            <a [href]="activePageMeta()?.publicRoute" target="_blank" class="cms-btn cms-btn-ghost">
              👁 Preview ↗
            </a>
          </div>
        </div>

        <div class="cms-editor-area">
          @switch (activePage()) {
            @case ('home')          { <snt-cms-home-editor (saved)="onSaved()" /> }
            @case ('about')         { <snt-cms-about-editor (saved)="onSaved()" /> }
            @case ('contact')       { <snt-cms-contact-editor (saved)="onSaved()" /> }
            @case ('becomePartner') { <snt-cms-partner-editor (saved)="onSaved()" /> }
            @case ('global')        { <snt-cms-global-editor (saved)="onSaved()" /> }
            @case ('seo')           { <snt-cms-seo-editor (saved)="onSaved()" /> }
            @case ('navigation')    { <snt-cms-nav-editor (saved)="onSaved()" /> }
            @case ('collections')   { <snt-cms-collections-editor /> }
            @case ('siteEnquiries') { <snt-cms-enquiries-editor /> }
          }
        </div>

      </main>

      @if (savedToast()) {
        <div class="cms-toast">✅ Changes saved successfully</div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .cms-shell { display: grid; grid-template-columns: 280px 1fr; height: calc(100vh - 64px); background: #f8fafc; }
    .cms-sidebar { background: #fff; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; overflow-y: auto; }
    .cms-sidebar-header { display: flex; align-items: center; gap: 12px; padding: 20px 16px 16px; border-bottom: 1px solid #f1f5f9; }
    .cms-sidebar-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .cms-sidebar-title { font-size: 14px; font-weight: 800; color: #111827; }
    .cms-sidebar-sub   { font-size: 11px; color: #6b7280; }
    .cms-nav { display: flex; flex-direction: column; gap: 2px; padding: 12px 8px; flex: 1; }
    .cms-nav-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: 8px; background: transparent; border: none; cursor: pointer; text-align: left; transition: background .12s; width: 100%; }
    .cms-nav-item:hover { background: #f3f4f6; }
    .cms-nav-item-active { background: #eef2ff !important; }
    .cms-nav-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .cms-nav-text { display: flex; flex-direction: column; gap: 2px; }
    .cms-nav-label { font-size: 13px; font-weight: 700; color: #111827; }
    .cms-nav-item-active .cms-nav-label { color: #6366f1; }
    .cms-nav-desc { font-size: 11px; color: #9ca3af; line-height: 1.4; }
    .cms-sidebar-footer { padding: 16px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 6px; }
    .cms-last-updated      { font-size: 11px; color: #9ca3af; }
    .cms-last-updated-time { font-size: 12px; font-weight: 600; color: #374151; }
    .cms-preview-link { display: block; padding: 7px 12px; background: #eef2ff; color: #6366f1; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; text-align: center; }
    .cms-preview-link:hover { background: #e0e7ff; }
    .cms-reset-btn { width: 100%; padding: 8px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .cms-reset-btn:hover { background: #fee2e2; }
    .cms-main { display: flex; flex-direction: column; overflow: hidden; }
    .cms-topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: #fff; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
    .cms-topbar-title { font-size: 18px; font-weight: 800; color: #111827; }
    .cms-topbar-desc  { font-size: 13px; color: #6b7280; margin-top: 2px; }
    .cms-topbar-actions { display: flex; gap: 8px; }
    .cms-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 7px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all .15s; border: none; }
    .cms-btn-ghost { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
    .cms-btn-ghost:hover { background: #e5e7eb; }
    .cms-editor-area { flex: 1; overflow-y: auto; padding: 24px; }
    .cms-toast { position: fixed; bottom: 24px; right: 24px; background: #059669; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 16px rgba(5,150,105,.3); z-index: 9999; animation: slideUp .2s ease; }
    @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @media (max-width: 900px) { .cms-shell { grid-template-columns: 1fr; } .cms-sidebar { display: none; } }
  `],
})
export class WebsiteCmsComponent implements OnInit {
  private readonly cms = inject(WebsiteCmsService);

  readonly pages       = CMS_PAGES;
  readonly activePage  = signal<string>('home');
  readonly savedToast  = signal(false);
  readonly lastUpdated = this.cms.lastUpdated;

  readonly activePageMeta = () => this.pages.find(p => p.key === this.activePage());

  ngOnInit(): void {
    // Load settings from API on open
    this.cms.loadFromApi().subscribe();
  }

  onSaved(): void {
    this.savedToast.set(true);
    setTimeout(() => this.savedToast.set(false), 3000);
  }

  confirmReset(): void {
    if (confirm('Reset ALL website content to factory defaults? This cannot be undone.')) {
      this.cms.resetToDefaults();
      this.onSaved();
    }
  }
}
