import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

@Component({
  selector: 'snt-badge',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [ngClass]="'badge-' + variant">{{ label }}</span>`,
})
export class BadgeComponent {
  @Input({ required: true }) label!: string;
  @Input() variant: BadgeVariant = 'neutral';
}
