import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'snt-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="overlay" (click)="cancel.emit()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <p class="dialog__title">{{ title }}</p>
          <p class="dialog__message">{{ message }}</p>
          <div class="dialog__actions">
            <button class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
            <button class="btn btn-danger"    (click)="confirm.emit()">{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 28px 32px;
      width: 100%; max-width: 420px;
      box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column; gap: 12px;
    }
    .dialog__title   { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); }
    .dialog__message { font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.6; }
    .dialog__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Delete';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel  = new EventEmitter<void>();
}
