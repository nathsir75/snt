import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'snt-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <div class="empty-state__icon">{{ icon }}</div>
      <p class="empty-state__title">{{ title }}</p>
      @if (description) {
        <p class="empty-state__desc">{{ description }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 48px 24px; text-align: center; gap: 8px;
    }
    .empty-state__icon { font-size: 40px; margin-bottom: 8px; }
    .empty-state__title { font-size: var(--font-size-md); font-weight: 600; color: var(--color-text); }
    .empty-state__desc { font-size: var(--font-size-sm); color: var(--color-text-muted); max-width: 320px; }
  `]
})
export class EmptyStateComponent {
  @Input() icon = '📭';
  @Input({ required: true }) title!: string;
  @Input() description?: string;
}
