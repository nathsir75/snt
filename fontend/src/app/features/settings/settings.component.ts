import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SettingsService } from './settings.service';
import { AppSettings } from './settings.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { MediaPickerComponent } from '../../shared/components/media-picker/media-picker.component';
import { ChatbotSettingsEditorComponent } from '../chatbot/chatbot-settings-editor.component';
import { AuthService } from '../../core/auth/auth.service';

type LoadState = 'loading' | 'error' | 'ready';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type ActiveTab = 'branding' | 'website' | 'contact' | 'operational' | 'chatbot';

@Component({
  selector: 'snt-settings',
  standalone: true,
  imports: [FormsModule, PageShellComponent, PageStateComponent, MediaPickerComponent, ChatbotSettingsEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="App Settings"
      subtitle="Configure branding, public website metadata and operational defaults"
      icon="⚙️"
    >
      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          <div class="tab-nav">
            <button class="tab-btn" [class.tab-btn-active]="activeTab() === 'branding'"    (click)="activeTab.set('branding')">Branding</button>
            <button class="tab-btn" [class.tab-btn-active]="activeTab() === 'website'"     (click)="activeTab.set('website')">Public Website</button>
            <button class="tab-btn" [class.tab-btn-active]="activeTab() === 'contact'"     (click)="activeTab.set('contact')">Support & Contact</button>
            <button class="tab-btn" [class.tab-btn-active]="activeTab() === 'operational'" (click)="activeTab.set('operational')">Operational</button>
            @if (isSuperAdmin()) {
              <button class="tab-btn" [class.tab-btn-active]="activeTab() === 'chatbot'" (click)="activeTab.set('chatbot')">🤖 Chatbot</button>
            }
          </div>

          @if (activeTab() === 'branding') {
            <div class="settings-card">
              <p class="section-title">App Branding</p>
              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label">App / Platform Name</label>
                  <input class="form-input" [(ngModel)]="form.appName" placeholder="SNT Education" />
                </div>
                <div class="form-field">
                  <label class="form-label">Primary Color</label>
                  <div class="color-row">
                    <input type="color" class="color-swatch" [(ngModel)]="form.primaryColor" />
                    <input class="form-input" [(ngModel)]="form.primaryColor" placeholder="#6366f1" />
                  </div>
                </div>
                <div class="form-field">
                  <label class="form-label">Accent Color</label>
                  <div class="color-row">
                    <input type="color" class="color-swatch" [(ngModel)]="form.accentColor" />
                    <input class="form-input" [(ngModel)]="form.accentColor" placeholder="#8b5cf6" />
                  </div>
                </div>
                <div class="form-field form-field-full">
                  <label class="form-label">Logo</label>
                  @if (form.logoUrl) {
                    <div class="logo-preview">
                      <img [src]="form.logoUrl" alt="Logo" class="logo-img" />
                      <button class="btn btn-secondary btn-sm" (click)="form.logoUrl = null">Remove</button>
                    </div>
                  } @else {
                    <div class="logo-placeholder">No logo set</div>
                  }
                  <button class="btn btn-secondary btn-sm mt-8" (click)="openPicker('logo')">
                    📁 Pick from Media Library
                  </button>
                </div>
                <div class="form-field form-field-full">
                  <label class="form-label">Favicon</label>
                  @if (form.faviconUrl) {
                    <div class="logo-preview">
                      <img [src]="form.faviconUrl" alt="Favicon" class="favicon-img" />
                      <button class="btn btn-secondary btn-sm" (click)="form.faviconUrl = null">Remove</button>
                    </div>
                  } @else {
                    <div class="logo-placeholder logo-placeholder-sm">No favicon</div>
                  }
                  <button class="btn btn-secondary btn-sm mt-8" (click)="openPicker('favicon')">
                    📁 Pick Favicon
                  </button>
                </div>
              </div>
              <div class="save-row">
                @if (saveState() === 'saved') { <span class="save-success">✓ Settings saved</span> }
                @if (saveState() === 'error') { <span class="save-error">{{ saveErrorMsg }}</span> }
                <button class="btn btn-primary" [disabled]="saveState() === 'saving'" (click)="save()">
                  {{ saveState() === 'saving' ? 'Saving…' : 'Save Settings' }}
                </button>
              </div>
            </div>
          }

          @if (activeTab() === 'website') {
            <div class="settings-card">
              <p class="section-title">Public Website Metadata</p>
              <p class="section-hint">These values are used as defaults when branch-specific values are not set.</p>
              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label">Public Title</label>
                  <input class="form-input" [(ngModel)]="form.publicTitle" placeholder="e.g. SNT Education – Official Website" />
                </div>
                <div class="form-field">
                  <label class="form-label">Tagline</label>
                  <input class="form-input" [(ngModel)]="form.tagline" placeholder="e.g. Empowering careers since 2010" />
                </div>
                <div class="form-field form-field-full">
                  <label class="form-label">Footer Text</label>
                  <input class="form-input" [(ngModel)]="form.footerText" placeholder="e.g. © 2025 SNT Education. All rights reserved." />
                </div>
              </div>
              <div class="save-row">
                @if (saveState() === 'saved') { <span class="save-success">✓ Settings saved</span> }
                @if (saveState() === 'error') { <span class="save-error">{{ saveErrorMsg }}</span> }
                <button class="btn btn-primary" [disabled]="saveState() === 'saving'" (click)="save()">
                  {{ saveState() === 'saving' ? 'Saving…' : 'Save Settings' }}
                </button>
              </div>
            </div>
          }

          @if (activeTab() === 'contact') {
            <div class="settings-card">
              <p class="section-title">Support & Contact Info</p>
              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label">Support Email</label>
                  <input class="form-input" type="email" [(ngModel)]="form.supportEmail" placeholder="support@snteducation.com" />
                </div>
                <div class="form-field">
                  <label class="form-label">Support Phone</label>
                  <input class="form-input" [(ngModel)]="form.supportPhone" placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
              <div class="save-row">
                @if (saveState() === 'saved') { <span class="save-success">✓ Settings saved</span> }
                @if (saveState() === 'error') { <span class="save-error">{{ saveErrorMsg }}</span> }
                <button class="btn btn-primary" [disabled]="saveState() === 'saving'" (click)="save()">
                  {{ saveState() === 'saving' ? 'Saving…' : 'Save Settings' }}
                </button>
              </div>
            </div>
          }

          @if (activeTab() === 'operational') {
            <div class="settings-card">
              <p class="section-title">Operational Defaults</p>
              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label">Timezone</label>
                  <select class="form-input" [(ngModel)]="form.timezone">
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div class="form-field">
                  <label class="form-label">Currency</label>
                  <select class="form-input" [(ngModel)]="form.currency">
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
              </div>
              <div class="save-row">
                @if (saveState() === 'saved') { <span class="save-success">✓ Settings saved</span> }
                @if (saveState() === 'error') { <span class="save-error">{{ saveErrorMsg }}</span> }
                <button class="btn btn-primary" [disabled]="saveState() === 'saving'" (click)="save()">
                  {{ saveState() === 'saving' ? 'Saving…' : 'Save Settings' }}
                </button>
              </div>
            </div>
          }

          @if (activeTab() === 'chatbot' && isSuperAdmin()) {
            <snt-chatbot-settings-editor (saved)="onChatbotSaved()" />
          }
        }
      }
    </snt-page-shell>

    <snt-media-picker
      [open]="pickerOpen()"
      filterType="image"
      (picked)="onAssetPicked($event)"
      (cancel)="pickerOpen.set(false)"
    />
  `,
  styles: [`
    .tab-nav {
      display: flex; gap: 4px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap;
    }
    .tab-btn {
      padding: 8px 16px; font-size: var(--font-size-sm); font-weight: 600;
      color: var(--color-text-muted); border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: all .15s;
    }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn-active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
    .settings-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 24px;
      display: flex; flex-direction: column; gap: 20px;
    }
    .section-title { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); }
    .section-hint { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: -12px; line-height: 1.6; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field-full { grid-column: 1 / -1; }
    .form-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .form-input {
      padding: 8px 12px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; width: 100%;
    }
    .form-input:focus { border-color: var(--color-primary); }
    .color-row { display: flex; align-items: center; gap: 8px; }
    .color-swatch { width: 36px; height: 36px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); cursor: pointer; padding: 2px; flex-shrink: 0; }
    .logo-preview { display: flex; align-items: center; gap: 12px; }
    .logo-img { height: 56px; width: auto; max-width: 160px; object-fit: contain; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); padding: 4px; }
    .favicon-img { width: 32px; height: 32px; object-fit: contain; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); }
    .logo-placeholder {
      width: 120px; height: 56px; border: 2px dashed var(--color-border);
      border-radius: var(--radius-md); display: flex; align-items: center;
      justify-content: center; font-size: var(--font-size-xs); color: var(--color-text-muted);
    }
    .logo-placeholder-sm { width: 56px; height: 56px; }
    .save-row { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding-top: 8px; border-top: 1px solid var(--color-border); }
    .save-success { font-size: var(--font-size-sm); color: #059669; font-weight: 600; }
    .save-error   { font-size: var(--font-size-sm); color: var(--color-danger); font-weight: 600; }
    .btn-sm { padding: 4px 10px; font-size: var(--font-size-xs); }
    .mt-8 { margin-top: 8px; }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly svc        = inject(SettingsService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSuperAdmin = this.auth.isSuperAdmin;
  readonly state        = signal<LoadState>('loading');
  readonly saveState    = signal<SaveState>('idle');
  readonly activeTab    = signal<ActiveTab>('branding');
  readonly pickerOpen   = signal(false);

  saveErrorMsg = 'Failed to save. Try again.';
  private pickerTarget: 'logo' | 'favicon' = 'logo';

  form: AppSettings = {
    appName: 'SNT Education',
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#6366f1',
    accentColor: '#8b5cf6',
    publicTitle: null,
    tagline: null,
    footerText: null,
    supportEmail: null,
    supportPhone: null,
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (s) => { this.form = { ...s }; this.state.set('ready'); },
        error: () => this.state.set('ready'),
      });
  }

  save(): void {
    this.saveState.set('saving');
    this.svc.update(this.form)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.form = { ...s };
          this.saveState.set('saved');
          setTimeout(() => this.saveState.set('idle'), 2500);
        },
        error: (e: Error) => {
          this.saveErrorMsg = e.message || 'Failed to save settings. Please try again.';
          this.saveState.set('error');
          setTimeout(() => this.saveState.set('idle'), 3000);
        },
      });
  }

  onChatbotSaved(): void {
    this.saveState.set('saved');
    setTimeout(() => this.saveState.set('idle'), 2500);
  }

  openPicker(target: 'logo' | 'favicon'): void {
    this.pickerTarget = target;
    this.pickerOpen.set(true);
  }

  onAssetPicked(asset: { fileUrl: string }): void {
    if (this.pickerTarget === 'logo') {
      this.form.logoUrl = asset.fileUrl;
    } else {
      this.form.faviconUrl = asset.fileUrl;
    }
    this.pickerOpen.set(false);
  }
}
