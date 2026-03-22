import {
  Component, inject, signal, OnInit,
  ChangeDetectionStrategy, DestroyRef, output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from './chatbot.service';
import { ChatbotSettings, ChatbotQuickAction } from './chatbot.models';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const DEFAULTS: ChatbotSettings = {
  enabled:             true,
  welcomeMessage:      "Hi, I'm the SNT Education assistant. 👋",
  welcomeSubtext:      'How can I help you today? Pick a topic or type your question below.',
  supportContactText:  'Our team is available Mon–Sat, 9 AM – 6 PM.',
  branchAwareEnabled:  true,
  leadCaptureEnabled:  true,
  quickActions: [
    { label: '📚 Explore Courses',     message: 'Tell me about your courses'        },
    { label: '🤝 Franchise Enquiry',   message: 'I want to know about franchise'    },
    { label: '💼 Internship Program',  message: 'Tell me about internship programs' },
    { label: '🏢 Corporate Training',  message: 'Tell me about corporate training'  },
    { label: '🎓 College Partnership', message: 'Tell me about college partnership' },
    { label: '📍 Contact Branch',      message: 'Find a branch near me'             },
  ],
};

@Component({
  selector: 'snt-chatbot-settings-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loadState() === 'loading') {
      <p class="hint">Loading chatbot settings…</p>
    } @else {

      <!-- Master toggle -->
      <div class="settings-card">
        <p class="section-title">Chatbot Status</p>
        <div class="toggle-row">
          <div>
            <p class="toggle-label">Enable Chatbot Widget</p>
            <p class="toggle-hint">When off, the chat bubble is hidden on all public websites.</p>
          </div>
          <button
            class="toggle-btn"
            [class.toggle-btn-on]="form.enabled"
            (click)="form.enabled = !form.enabled"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>

        <div class="toggle-row">
          <div>
            <p class="toggle-label">Branch-Aware Mode</p>
            <p class="toggle-hint">Personalise replies using the branch's name, phone, and address.</p>
          </div>
          <button
            class="toggle-btn"
            [class.toggle-btn-on]="form.branchAwareEnabled"
            (click)="form.branchAwareEnabled = !form.branchAwareEnabled"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>

        <div class="toggle-row">
          <div>
            <p class="toggle-label">Lead Capture Flow</p>
            <p class="toggle-hint">When off, the bot answers questions but never asks for contact details.</p>
          </div>
          <button
            class="toggle-btn"
            [class.toggle-btn-on]="form.leadCaptureEnabled"
            (click)="form.leadCaptureEnabled = !form.leadCaptureEnabled"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>
      </div>

      <!-- Welcome text -->
      <div class="settings-card">
        <p class="section-title">Welcome Screen</p>
        <div class="form-grid">
          <div class="form-field form-field-full">
            <label class="form-label">Welcome Message (heading)</label>
            <input class="form-input" [(ngModel)]="form.welcomeMessage"
              placeholder="Hi, I'm the SNT Education assistant. 👋" />
          </div>
          <div class="form-field form-field-full">
            <label class="form-label">Welcome Subtext</label>
            <input class="form-input" [(ngModel)]="form.welcomeSubtext"
              placeholder="How can I help you today?" />
          </div>
          <div class="form-field form-field-full">
            <label class="form-label">Support Contact Text</label>
            <input class="form-input" [(ngModel)]="form.supportContactText"
              placeholder="Our team is available Mon–Sat, 9 AM – 6 PM." />
            <p class="field-hint">Shown in contact/fallback replies and when chatbot is disabled.</p>
          </div>
        </div>
      </div>

      <!-- Quick action chips -->
      <div class="settings-card">
        <div class="section-header">
          <p class="section-title">Quick Action Chips</p>
          <button class="btn btn-secondary btn-sm" (click)="addChip()" [disabled]="form.quickActions.length >= 6">
            + Add Chip
          </button>
        </div>
        <p class="section-hint">Up to 6 chips shown on the welcome screen. Label is display text; Message is sent as user input.</p>

        <div class="chips-list">
          @for (chip of form.quickActions; track $index; let i = $index) {
            <div class="chip-row">
              <span class="chip-num">{{ i + 1 }}</span>
              <input class="form-input chip-input" [(ngModel)]="chip.label"
                placeholder="e.g. 📚 Explore Courses" />
              <input class="form-input chip-input" [(ngModel)]="chip.message"
                placeholder="e.g. Tell me about your courses" />
              <button class="chip-remove" (click)="removeChip(i)" title="Remove">✕</button>
            </div>
          }
        </div>
      </div>

      <!-- Save row -->
      <div class="save-row">
        @if (saveState() === 'saved')  { <span class="save-success">✓ Chatbot settings saved</span> }
        @if (saveState() === 'error')  { <span class="save-error">Failed to save. Try again.</span> }
        <button class="btn btn-primary" [disabled]="saveState() === 'saving'" (click)="save()">
          {{ saveState() === 'saving' ? 'Saving…' : 'Save Chatbot Settings' }}
        </button>
      </div>
    }
  `,
  styles: [`
    .hint { font-size: var(--font-size-sm); color: var(--color-text-muted); }

    .settings-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 20px 24px;
      display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px;
    }
    .section-header { display: flex; align-items: center; justify-content: space-between; }
    .section-title { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); margin: 0; }
    .section-hint { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: -8px; line-height: 1.6; }

    /* Toggle */
    .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 4px 0; }
    .toggle-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); margin: 0 0 2px; }
    .toggle-hint  { font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0; line-height: 1.5; }
    .toggle-btn {
      position: relative; width: 44px; height: 24px; border-radius: 999px;
      background: #d1d5db; border: none; cursor: pointer; flex-shrink: 0;
      transition: background .2s;
    }
    .toggle-btn-on { background: #6366f1; }
    .toggle-knob {
      position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; border-radius: 50%; background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,.2);
      transition: transform .2s;
    }
    .toggle-btn-on .toggle-knob { transform: translateX(20px); }

    /* Form */
    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .form-field { display: flex; flex-direction: column; gap: 5px; }
    .form-field-full { grid-column: 1 / -1; }
    .form-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .form-input {
      padding: 8px 12px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; width: 100%;
    }
    .form-input:focus { border-color: var(--color-primary); }
    .field-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 2px 0 0; }

    /* Chips list */
    .chips-list { display: flex; flex-direction: column; gap: 8px; }
    .chip-row { display: flex; align-items: center; gap: 8px; }
    .chip-num { font-size: 11px; font-weight: 700; color: var(--color-text-muted); width: 16px; flex-shrink: 0; text-align: center; }
    .chip-input { flex: 1; min-width: 0; }
    .chip-remove {
      width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0;
      background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;
      font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .chip-remove:hover { background: #fee2e2; }

    /* Save row */
    .save-row { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding-top: 4px; }
    .save-success { font-size: var(--font-size-sm); color: #059669; font-weight: 600; }
    .save-error   { font-size: var(--font-size-sm); color: var(--color-danger); font-weight: 600; }
    .btn-sm { padding: 4px 10px; font-size: var(--font-size-xs); }
  `],
})
export class ChatbotSettingsEditorComponent implements OnInit {
  private readonly svc        = inject(ChatbotService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saved      = output<void>();
  readonly loadState  = signal<'loading' | 'ready'>('loading');
  readonly saveState  = signal<SaveState>('idle');

  form: ChatbotSettings = { ...DEFAULTS, quickActions: DEFAULTS.quickActions.map(a => ({ ...a })) };

  ngOnInit(): void {
    this.svc.getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (s) => { this.form = { ...s, quickActions: s.quickActions.map(a => ({ ...a })) }; this.loadState.set('ready'); },
        error: ()  => { this.loadState.set('ready'); }, // fall back to defaults
      });
  }

  addChip(): void {
    if (this.form.quickActions.length >= 6) return;
    this.form.quickActions = [...this.form.quickActions, { label: '', message: '' }];
  }

  removeChip(i: number): void {
    this.form.quickActions = this.form.quickActions.filter((_, idx) => idx !== i);
  }

  save(): void {
    this.saveState.set('saving');
    // Strip empty chips before saving
    const payload: ChatbotSettings = {
      ...this.form,
      quickActions: this.form.quickActions.filter(a => a.label.trim() && a.message.trim()),
    };
    this.svc.updateSettings(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.form = { ...s, quickActions: s.quickActions.map(a => ({ ...a })) };
          this.saveState.set('saved');
          this.saved.emit();
          setTimeout(() => this.saveState.set('idle'), 2500);
        },
        error: () => {
          this.saveState.set('error');
          setTimeout(() => this.saveState.set('idle'), 3000);
        },
      });
  }
}
