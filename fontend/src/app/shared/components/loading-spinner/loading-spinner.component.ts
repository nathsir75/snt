import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'snt-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner-wrap" [style.min-height]="minHeight">
      <div class="spinner"></div>
      @if (message) {
        <p class="spinner-msg">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    .spinner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    .spinner-msg {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoadingSpinnerComponent {
  @Input() message?: string;
  @Input() minHeight = '200px';
}
