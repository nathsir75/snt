import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';

export type StatCardColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'snt-stat-card',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat-card" [ngClass]="'stat-card--' + color">
      <div class="stat-card__icon">
        <span>{{ icon }}</span>
      </div>
      <div class="stat-card__body">
        <p class="stat-card__label">{{ label }}</p>
        <p class="stat-card__value">{{ displayValue }}</p>
        @if (sub) {
          <p class="stat-card__sub">{{ sub }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      transition: box-shadow .2s;
    }
    .stat-card:hover { box-shadow: var(--shadow-md); }
    .stat-card__icon {
      width: 48px; height: 48px;
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
    }
    .stat-card__body { flex: 1; min-width: 0; }
    .stat-card__label {
      font-size: var(--font-size-xs); font-weight: 600;
      text-transform: uppercase; letter-spacing: .5px;
      color: var(--color-text-muted); margin-bottom: 4px;
    }
    .stat-card__value { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); line-height: 1; }
    .stat-card__sub { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px; }
    .stat-card--primary .stat-card__icon { background: var(--color-primary-light); }
    .stat-card--success .stat-card__icon { background: #d1fae5; }
    .stat-card--warning .stat-card__icon { background: #fef3c7; }
    .stat-card--danger  .stat-card__icon { background: #fee2e2; }
    .stat-card--info    .stat-card__icon { background: #dbeafe; }
  `]
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) set value(v: string | number | null | undefined) {
    this.displayValue = v ?? '—';
  }
  @Input() icon = '📊';
  @Input() sub?: string;
  @Input() color: StatCardColor = 'primary';

  displayValue: string | number = '—';
}
