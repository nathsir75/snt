import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BranchService } from './branch.service';
import { Branch, UpdateBranchPayload, UpdatePublicSettingsPayload } from './branch.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

type LoadState = 'loading' | 'error' | 'ready';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type ActiveTab = 'info' | 'contact' | 'branding' | 'website';

@Component({
  selector: 'snt-branch-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, PageShellComponent, PageStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      [title]="branch()?.name ?? 'Branch Profile'"
      [subtitle]="branch()?.code ? 'Code: ' + branch()!.code : 'Branch details and settings'"
      icon="🏢"
    >
      <ng-container slot="actions">
        @if (canEdit()) {
          <a routerLink="/ho/branches" class="btn btn-secondary">← All Branches</a>
        }
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (branch(); as b) {
            <div class="tab-nav">
              <button class="tab-btn" [class.tab-btn-active]="activeTab() === 'info'"     (click)="activeTab.set('info')">Branch Info</button>
              <button class="tab-btn" [class.tab-btn-active]="activeTab() === 'contact'"  (click)="activeTab.set('contact')">Contact Details</button>
              <button class="tab-btn" [class.tab-btn-active]="activeTab() === 'branding'" (click)="activeTab.set('branding')">Branding</button>
              <button class="tab-btn" [class.tab-btn-active]="activeTab() === 'website'"  (click)="activeTab.set('website')">
                Website / Public
                @if (b.isPublic) { <span class="tab-badge tab-badge-green">Live</span> }
                @else             { <span class="tab-badge tab-badge-grey">Hidden</span> }
              </button>
            </div>

            <!-- ── Branch Info ── -->
            @if (activeTab() === 'info') {
              <div class="settings-card">
                <p class="settings-section-title">Branch Information</p>
                <div class="form-grid">
                  <div class="form-field">
                    <label class="form-label">Branch Name</label>
                    @if (canEdit()) {
                      <input class="form-input" [(ngModel)]="form.name" placeholder="Branch name" />
                    } @else {
                      <p class="form-value">{{ b.name }}</p>
                    }
                  </div>
                  <div class="form-field">
                    <label class="form-label">Branch Code</label>
                    <p class="form-value"><code class="code-badge">{{ b.code }}</code></p>
                  </div>
                  <div class="form-field">
                    <label class="form-label">City</label>
                    @if (canEdit()) {
                      <input class="form-input" [(ngModel)]="form.city" placeholder="City" />
                    } @else {
                      <p class="form-value">{{ b.city || '—' }}</p>
                    }
                  </div>
                  <div class="form-field">
                    <label class="form-label">State</label>
                    @if (canEdit()) {
                      <input class="form-input" [(ngModel)]="form.state" placeholder="State" />
                    } @else {
                      <p class="form-value">{{ b.state || '—' }}</p>
                    }
                  </div>
                  @if (canEdit()) {
                    <div class="form-field">
                      <label class="form-label">Operational Status</label>
                      <select class="form-input" [(ngModel)]="form.status">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  } @else {
                    <div class="form-field">
                      <label class="form-label">Status</label>
                      <snt-badge [label]="b.status" [variant]="statusVariant(b.status)" />
                    </div>
                  }
                  <div class="form-field">
                    <label class="form-label">Created</label>
                    <p class="form-value">{{ b.createdAt | date:'dd MMM yyyy' }}</p>
                  </div>
                </div>
                @if (canEdit()) {
                  <div class="save-row">
                    @if (saveState() === 'saved') { <span class="save-success">✓ Saved</span> }
                    @if (saveState() === 'error') { <span class="save-error">Failed to save.</span> }
                    <button class="btn btn-primary" [disabled]="saveState() === 'saving'" (click)="save()">
                      {{ saveState() === 'saving' ? 'Saving…' : 'Save Changes' }}
                    </button>
                  </div>
                }
              </div>
            }

            <!-- ── Contact Details ── -->
            @if (activeTab() === 'contact') {
              <div class="settings-card">
                <p class="settings-section-title">Contact Details</p>
                <p class="settings-hint">Contact details are managed via the Website CMS → Website Settings tab.</p>
                <div class="form-grid">
                  <div class="form-field">
                    <label class="form-label">Branch City</label>
                    <p class="form-value">{{ b.city || '—' }}</p>
                  </div>
                  <div class="form-field">
                    <label class="form-label">Branch State</label>
                    <p class="form-value">{{ b.state || '—' }}</p>
                  </div>
                </div>
              </div>
            }

            <!-- ── Branding ── -->
            @if (activeTab() === 'branding') {
              <div class="settings-card">
                <p class="settings-section-title">Branding</p>
                <div class="logo-placeholder">Manage logo, colors and tagline via the Website CMS → Website Settings tab.</div>
                <p class="settings-hint">Go to Website CMS in the branch panel to update branding.</p>
              </div>
            }

            <!-- ── Website / Public ── -->
            @if (activeTab() === 'website') {
              <div class="settings-card">
                <p class="settings-section-title">Public Website Controls</p>
                <p class="settings-hint">These fields control how this branch appears on the HO Branch Locations page and its own public website.</p>

                <!-- Visibility toggles -->
                <div class="toggle-group">
                  <div class="toggle-row">
                    <div class="toggle-info">
                      <span class="toggle-label">Show on HO Branch Locations page</span>
                      <span class="toggle-desc">When ON, this branch appears on the public /branch-locations page.</span>
                    </div>
                    @if (canEdit()) {
                      <label class="toggle-switch">
                        <input type="checkbox" [(ngModel)]="pubForm.isPublic" />
                        <span class="toggle-track"></span>
                      </label>
                    } @else {
                      <snt-badge [label]="b.isPublic ? 'Visible' : 'Hidden'" [variant]="b.isPublic ? 'success' : 'neutral'" />
                    }
                  </div>

                  <div class="toggle-row">
                    <div class="toggle-info">
                      <span class="toggle-label">Branch website enabled</span>
                      <span class="toggle-desc">When ON, the branch public website at /b/{{ b.code }} is accessible.</span>
                    </div>
                    @if (canEdit()) {
                      <label class="toggle-switch">
                        <input type="checkbox" [(ngModel)]="pubForm.websiteEnabled" />
                        <span class="toggle-track"></span>
                      </label>
                    } @else {
                      <snt-badge [label]="b.websiteEnabled ? 'Enabled' : 'Disabled'" [variant]="b.websiteEnabled ? 'success' : 'neutral'" />
                    }
                  </div>
                </div>

                <!-- Public contact fields -->
                <div class="form-grid">
                  <div class="form-field">
                    <label class="form-label">Display Priority</label>
                    @if (canEdit()) {
                      <input class="form-input" type="number" min="0" [(ngModel)]="pubForm.publicPriority" placeholder="0" />
                      <span class="form-hint">Higher number = appears first on the locations page.</span>
                    } @else {
                      <p class="form-value">{{ b.publicPriority }}</p>
                    }
                  </div>

                  <div class="form-field">
                    <label class="form-label">Public Phone</label>
                    @if (canEdit()) {
                      <input class="form-input" [(ngModel)]="pubForm.publicPhone" placeholder="+91 98765 43210" />
                      <span class="form-hint">Shown on the branch card on the locations page.</span>
                    } @else {
                      <p class="form-value">{{ b.publicPhone || '—' }}</p>
                    }
                  </div>

                  <div class="form-field">
                    <label class="form-label">Public Email</label>
                    @if (canEdit()) {
                      <input class="form-input" type="email" [(ngModel)]="pubForm.publicEmail" placeholder="branch@snteducation.com" />
                    } @else {
                      <p class="form-value">{{ b.publicEmail || '—' }}</p>
                    }
                  </div>

                  <div class="form-field">
                    <label class="form-label">Google Maps Link</label>
                    @if (canEdit()) {
                      <input class="form-input" [(ngModel)]="pubForm.publicMapLink" placeholder="https://maps.google.com/..." />
                      <span class="form-hint">Shown as a "Map" link on the branch card.</span>
                    } @else {
                      @if (b.publicMapLink) {
                        <a [href]="b.publicMapLink" target="_blank" class="form-link">Open Map ↗</a>
                      } @else {
                        <p class="form-value">—</p>
                      }
                    }
                  </div>

                  <div class="form-field form-field-full">
                    <label class="form-label">Short Description</label>
                    @if (canEdit()) {
                      <textarea class="form-input form-textarea" rows="3" [(ngModel)]="pubForm.shortDescription"
                        placeholder="One-line description shown on the branch card (optional)…"></textarea>
                    } @else {
                      <p class="form-value">{{ b.shortDescription || '—' }}</p>
                    }
                  </div>
                </div>

                <!-- Public URL preview -->
                <div class="url-preview">
                  <span class="url-label">Branch public URL:</span>
                  <a [href]="'/b/' + b.code" target="_blank" class="url-link">/b/{{ b.code }}</a>
                  @if (!b.websiteEnabled) {
                    <span class="url-disabled">(website disabled)</span>
                  }
                </div>

                @if (canEdit()) {
                  <div class="save-row">
                    @if (pubSaveState() === 'saved') { <span class="save-success">✓ Saved</span> }
                    @if (pubSaveState() === 'error') { <span class="save-error">Failed to save.</span> }
                    <button class="btn btn-primary" [disabled]="pubSaveState() === 'saving'" (click)="savePublic()">
                      {{ pubSaveState() === 'saving' ? 'Saving…' : 'Save Public Settings' }}
                    </button>
                  </div>
                }
              </div>
            }
          }
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .tab-nav {
      display: flex; gap: 4px; border-bottom: 1px solid var(--color-border);
      flex-wrap: wrap;
    }
    .tab-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; font-size: var(--font-size-sm); font-weight: 600;
      color: var(--color-text-muted); border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: all .15s;
    }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn-active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
    .tab-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }
    .tab-badge-green { background: #dcfce7; color: #166534; }
    .tab-badge-grey  { background: #f3f4f6; color: #6b7280; }
    .settings-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 24px;
      display: flex; flex-direction: column; gap: 20px;
    }
    .settings-section-title { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); }
    .settings-hint { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: -12px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field-full { grid-column: 1 / -1; }
    .form-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .form-hint  { font-size: 11px; color: var(--color-text-muted); }
    .form-input {
      padding: 8px 12px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; width: 100%;
    }
    .form-input:focus { border-color: var(--color-primary); }
    .form-textarea { resize: vertical; }
    .form-value { font-size: var(--font-size-sm); color: var(--color-text); padding: 8px 0; }
    .form-link  { font-size: var(--font-size-sm); color: var(--color-primary); text-decoration: none; }
    .form-link:hover { text-decoration: underline; }
    .code-badge {
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); padding: 2px 8px;
      font-size: var(--font-size-xs); font-family: monospace;
    }
    /* Toggle switches */
    .toggle-group { display: flex; flex-direction: column; gap: 12px; }
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 14px 16px; background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .toggle-info { display: flex; flex-direction: column; gap: 3px; }
    .toggle-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .toggle-desc  { font-size: 12px; color: var(--color-text-muted); }
    .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; cursor: pointer; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-track {
      position: absolute; inset: 0; background: #d1d5db; border-radius: 12px; transition: background .2s;
    }
    .toggle-track::before {
      content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px;
      background: #fff; border-radius: 50%; transition: transform .2s;
      box-shadow: 0 1px 3px rgba(0,0,0,.2);
    }
    .toggle-switch input:checked + .toggle-track { background: var(--color-primary, #6366f1); }
    .toggle-switch input:checked + .toggle-track::before { transform: translateX(20px); }
    /* URL preview */
    .url-preview { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .url-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .4px; }
    .url-link  { font-size: var(--font-size-sm); color: var(--color-primary); text-decoration: none; font-weight: 600; }
    .url-link:hover { text-decoration: underline; }
    .url-disabled { font-size: 12px; color: var(--color-text-muted); }
    /* Save row */
    .save-row { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding-top: 8px; border-top: 1px solid var(--color-border); }
    .save-success { font-size: var(--font-size-sm); color: #059669; font-weight: 600; }
    .save-error   { font-size: var(--font-size-sm); color: var(--color-danger); font-weight: 600; }
    .logo-placeholder {
      width: 80px; height: 80px; border: 2px dashed var(--color-border);
      border-radius: var(--radius-md); display: flex; align-items: center;
      justify-content: center; font-size: var(--font-size-xs); color: var(--color-text-muted);
    }
    .text-muted { color: var(--color-text-muted); }
  `],
})
export class BranchDetailComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly svc        = inject(BranchService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state       = signal<LoadState>('loading');
  readonly saveState   = signal<SaveState>('idle');
  readonly pubSaveState = signal<SaveState>('idle');
  readonly branch      = signal<Branch | null>(null);
  readonly activeTab   = signal<ActiveTab>('info');

  readonly canEdit = this.auth.isSuperAdmin;

  form: UpdateBranchPayload & { status?: string } = {};

  pubForm: UpdatePublicSettingsPayload = {
    isPublic:         false,
    websiteEnabled:   false,
    publicPriority:   0,
    publicPhone:      null,
    publicEmail:      null,
    publicMapLink:    null,
    shortDescription: null,
  };

  ngOnInit(): void { this.load(); }

  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.state.set('loading');
    this.svc.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.branch.set(b);
          this.form = { name: b.name, city: b.city, state: b.state, status: b.status };
          this.pubForm = {
            isPublic:         b.isPublic,
            websiteEnabled:   b.websiteEnabled,
            publicPriority:   b.publicPriority,
            publicPhone:      b.publicPhone,
            publicEmail:      b.publicEmail,
            publicMapLink:    b.publicMapLink,
            shortDescription: b.shortDescription,
          };
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }

  save(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.saveState.set('saving');
    this.svc.update(id, this.form)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.branch.set(b);
          this.saveState.set('saved');
          setTimeout(() => this.saveState.set('idle'), 2500);
        },
        error: () => {
          this.saveState.set('error');
          setTimeout(() => this.saveState.set('idle'), 3000);
        },
      });
  }

  savePublic(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.pubSaveState.set('saving');
    this.svc.updatePublicSettings(id, this.pubForm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.branch.set(b);
          this.pubSaveState.set('saved');
          setTimeout(() => this.pubSaveState.set('idle'), 2500);
        },
        error: () => {
          this.pubSaveState.set('error');
          setTimeout(() => this.pubSaveState.set('idle'), 3000);
        },
      });
  }

  statusVariant(status: string): 'success' | 'danger' | 'warning' {
    if (status === 'active')    return 'success';
    if (status === 'suspended') return 'danger';
    return 'warning';
  }
}
