import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SlicePipe } from '@angular/common';
import { BranchCmsService } from './branch-cms.service';
import { BranchCmsSettings, CmsTab, CMS_TABS } from './branch-cms.models';
import { BcmsSettingsEditorComponent }  from './editors/bcms-settings-editor.component';
import { BcmsNavEditorComponent }       from './editors/bcms-nav-editor.component';
import { BcmsPagesEditorComponent }     from './editors/bcms-pages-editor.component';
import { BcmsSeoEditorComponent }       from './editors/bcms-seo-editor.component';
import { BcmsPreviewPanelComponent }    from './editors/bcms-preview-panel.component';
import { BcmsCollectionsEditorComponent } from './editors/bcms-collections-editor.component';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'snt-branch-cms',
  standalone: true,
  imports: [
    SlicePipe,
    BcmsSettingsEditorComponent,
    BcmsNavEditorComponent,
    BcmsPagesEditorComponent,
    BcmsSeoEditorComponent,
    BcmsPreviewPanelComponent,
    BcmsCollectionsEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bcms-shell">

      <!-- ── Sidebar ── -->
      <aside class="bcms-sidebar">
        <div class="bcms-sidebar-header">
          <div class="bcms-sidebar-icon">🌐</div>
          <div>
            <p class="bcms-sidebar-title">Website CMS</p>
            <p class="bcms-sidebar-sub">Branch Public Site</p>
          </div>
        </div>

        <nav class="bcms-nav">
          @for (tab of tabs; track tab.key) {
            <button
              class="bcms-nav-item"
              [class.bcms-nav-item-active]="activeTab() === tab.key"
              (click)="activeTab.set(tab.key)"
            >
              <span class="bcms-nav-icon">{{ tab.icon }}</span>
              <span class="bcms-nav-label">{{ tab.label }}</span>
            </button>
          }
        </nav>

        @if (savedToast()) {
          <div class="bcms-sidebar-toast">✅ Saved</div>
        }
      </aside>

      <!-- ── Main ── -->
      <main class="bcms-main">

        <div class="bcms-topbar">
          <div>
            <h1 class="bcms-topbar-title">{{ activeTabMeta()?.label }}</h1>
          </div>
        </div>

        <div class="bcms-editor-area">
          @switch (state()) {
            @case ('loading') {
              <div class="bcms-loading">Loading settings…</div>
            }
            @case ('error') {
              <div class="bcms-error">Failed to load CMS settings. Please refresh.</div>
            }
            @case ('ready') {
              @if (settings(); as s) {
                @switch (activeTab()) {
                  @case ('settings') {
                    <snt-bcms-settings-editor [settings]="s" (saved)="onSaved($event)" />
                  }
                  @case ('navigation') {
                    <snt-bcms-nav-editor [settings]="s" (saved)="onSaved($event)" />
                  }
                  @case ('pages') {
                    <snt-bcms-pages-editor [settings]="s" (saved)="onPageAction()" />
                  }
                  @case ('collections') {
                    <snt-bcms-collections-editor />
                  }
                  @case ('seo') {
                    <snt-bcms-seo-editor [settings]="s" (saved)="onSaved($event)" />
                  }
                  @case ('preview') {
                    <snt-bcms-preview-panel [settings]="s" (saved)="onPageAction()" />
                  }
                }
              }
            }
          }
        </div>

      </main>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .bcms-shell {
      display: grid;
      grid-template-columns: 240px 1fr;
      height: calc(100vh - 64px);
      background: #f8fafc;
    }

    /* ── Sidebar ── */
    .bcms-sidebar {
      background: #fff;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .bcms-sidebar-header {
      display: flex; align-items: center; gap: 12px;
      padding: 20px 16px 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .bcms-sidebar-icon {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #16a34a, #059669);
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; flex-shrink: 0;
    }
    .bcms-sidebar-title { font-size: 13px; font-weight: 800; color: #111827; }
    .bcms-sidebar-sub   { font-size: 11px; color: #6b7280; }

    .bcms-nav { display: flex; flex-direction: column; gap: 2px; padding: 10px 8px; flex: 1; }
    .bcms-nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 10px; border-radius: 8px;
      background: transparent; border: none; cursor: pointer;
      text-align: left; transition: background .12s; width: 100%;
    }
    .bcms-nav-item:hover { background: #f3f4f6; }
    .bcms-nav-item-active { background: #f0fdf4 !important; }
    .bcms-nav-icon  { font-size: 16px; flex-shrink: 0; }
    .bcms-nav-label { font-size: 13px; font-weight: 600; color: #374151; }
    .bcms-nav-item-active .bcms-nav-label { color: #16a34a; }

    .bcms-sidebar-toast {
      margin: 12px; padding: 10px 14px;
      background: #f0fdf4; border: 1px solid #bbf7d0;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #059669;
      text-align: center;
    }

    /* ── Main ── */
    .bcms-main { display: flex; flex-direction: column; overflow: hidden; }
    .bcms-topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px;
      background: #fff; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
    }
    .bcms-topbar-title { font-size: 18px; font-weight: 800; color: #111827; }
    .bcms-editor-area { flex: 1; overflow-y: auto; padding: 24px; }

    .bcms-loading { padding: 60px; text-align: center; color: #6b7280; font-size: 14px; }
    .bcms-error   { padding: 40px; text-align: center; color: #dc2626; font-size: 14px; }

    @media (max-width: 860px) {
      .bcms-shell { grid-template-columns: 1fr; }
      .bcms-sidebar { display: none; }
    }
  `],
})
export class BranchCmsComponent implements OnInit {
  private readonly svc        = inject(BranchCmsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tabs       = CMS_TABS;
  readonly activeTab  = signal<CmsTab>('settings');
  readonly state      = signal<LoadState>('loading');
  readonly settings   = signal<BranchCmsSettings | null>(null);
  readonly savedToast = signal(false);

  readonly activeTabMeta = () => this.tabs.find(t => t.key === this.activeTab());

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (s) => { this.settings.set(s); this.state.set('ready'); },
        error: ()  => { this.state.set('error'); },
      });
  }

  onSaved(s: BranchCmsSettings): void {
    this.settings.set(s);
    this.showToast();
  }

  onPageAction(): void { this.showToast(); }

  private showToast(): void {
    this.savedToast.set(true);
    setTimeout(() => this.savedToast.set(false), 2500);
  }
}
