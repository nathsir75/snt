import {
  Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

// ── Section accordion wrapper ─────────────────────────────────────────────────
@Component({
  selector: 'snt-cms-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-section" [class.cms-section-collapsed]="!open()">
      <button class="cms-section-header" (click)="toggleOpen()">
        <span class="cms-section-icon">{{ icon }}</span>
        <span class="cms-section-title">{{ title }}</span>
        @if (badge) { <span class="cms-section-badge">{{ badge }}</span> }
        <span class="cms-section-chevron">{{ open() ? '▲' : '▼' }}</span>
      </button>
      @if (open()) {
        <div class="cms-section-body">
          <ng-content />
        </div>
      }
    </div>
  `,
  styles: [`
    .cms-section { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 12px; }
    .cms-section-header {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 14px 16px;
      background: transparent; border: none; cursor: pointer;
      text-align: left; transition: background .12s;
    }
    .cms-section-header:hover { background: #f9fafb; }
    .cms-section-icon  { font-size: 16px; }
    .cms-section-title { font-size: 14px; font-weight: 700; color: #111827; flex: 1; }
    .cms-section-badge { background: #eef2ff; color: #6366f1; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .cms-section-chevron { font-size: 10px; color: #9ca3af; }
    .cms-section-body { padding: 16px; border-top: 1px solid #f1f5f9; }
  `],
})
export class CmsSectionComponent {
  @Input() title = '';
  @Input() icon  = '📝';
  @Input() badge = '';
  readonly open  = signal(true);

  toggleOpen(): void { this.open.update(v => !v); }
}

// ── Field row ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'snt-cms-field',
  standalone: true,
  template: `
    <div class="cms-field">
      <label class="cms-field-label">{{ label }}
        @if (hint) { <span class="cms-field-hint">{{ hint }}</span> }
      </label>
      <ng-content />
    </div>
  `,
  styles: [`
    .cms-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
    .cms-field-label { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .4px; }
    .cms-field-hint  { font-size: 11px; color: #9ca3af; font-weight: 400; text-transform: none; letter-spacing: 0; margin-left: 6px; }
  `],
})
export class CmsFieldComponent {
  @Input() label = '';
  @Input() hint  = '';
}

// ── Save bar ──────────────────────────────────────────────────────────────────
@Component({
  selector: 'snt-cms-save-bar',
  standalone: true,
  template: `
    <div class="cms-save-bar">
      <p class="cms-save-note">{{ note || 'Changes are saved to local storage and applied immediately to the public site.' }}</p>
      <div class="cms-save-actions">
        <button class="cms-btn-cancel" (click)="cancelled.emit()">Cancel</button>
        <button class="cms-btn-save" (click)="saved.emit()">💾 Save Changes</button>
      </div>
    </div>
  `,
  styles: [`
    .cms-save-bar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; padding: 14px 16px;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
      margin-top: 8px; flex-wrap: wrap;
    }
    .cms-save-note { font-size: 12px; color: #059669; flex: 1; }
    .cms-save-actions { display: flex; gap: 8px; }
    .cms-btn-save {
      padding: 9px 20px; background: #059669; color: #fff;
      border: none; border-radius: 7px; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: background .15s;
    }
    .cms-btn-save:hover { background: #047857; }
    .cms-btn-cancel {
      padding: 9px 16px; background: #f3f4f6; color: #374151;
      border: 1px solid #e5e7eb; border-radius: 7px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: background .15s;
    }
    .cms-btn-cancel:hover { background: #e5e7eb; }
  `],
})
export class CmsSaveBarComponent {
  @Input() note = '';
  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}

// ── Shared input/textarea styles (used via global class in editors) ───────────
export const CMS_INPUT_STYLES = `
  .cms-input, .cms-textarea, .cms-select {
    width: 100%; padding: 9px 12px;
    border: 1px solid #e5e7eb; border-radius: 7px;
    font-size: 13.5px; color: #111827;
    outline: none; transition: border-color .15s;
    background: #fff; font-family: inherit;
  }
  .cms-input:focus, .cms-textarea:focus, .cms-select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.08); }
  .cms-textarea { resize: vertical; min-height: 80px; }
  .cms-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .cms-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .cms-toggle-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .cms-toggle { width: 40px; height: 22px; appearance: none; background: #d1d5db; border-radius: 11px; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
  .cms-toggle:checked { background: #6366f1; }
  .cms-toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: left .2s; }
  .cms-toggle:checked::after { left: 21px; }
  .cms-toggle-label { font-size: 13px; font-weight: 600; color: #374151; }
  .cms-list-item { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px; }
  .cms-list-item input { flex: 1; }
  .cms-remove-btn { padding: 8px 10px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; font-size: 12px; cursor: pointer; flex-shrink: 0; }
  .cms-remove-btn:hover { background: #fee2e2; }
  .cms-add-btn { padding: 7px 14px; background: #eef2ff; color: #6366f1; border: 1px solid #c7d2fe; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 4px; }
  .cms-add-btn:hover { background: #e0e7ff; }
  .cms-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .cms-card-item { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .cms-card-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .cms-card-num { font-size: 11px; font-weight: 700; color: #6366f1; }
  .cms-divider { height: 1px; background: #f1f5f9; margin: 16px 0; }
  .cms-sub-label { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px; }
`;

// ── Shared imports array for all editors ──────────────────────────────────────
export const CMS_EDITOR_IMPORTS = [FormsModule, CmsSectionComponent, CmsFieldComponent, CmsSaveBarComponent];
