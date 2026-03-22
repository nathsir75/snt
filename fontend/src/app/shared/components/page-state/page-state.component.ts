import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass } from '@angular/common';

export type PageStateType = 'loading' | 'error' | 'empty' | 'forbidden';

interface StateDefaults {
  icon: string;
  title: string;
  description: string;
}

const DEFAULTS: Record<PageStateType, StateDefaults> = {
  loading: {
    icon: '',
    title: 'Loading…',
    description: 'Please wait while we fetch the data.',
  },
  error: {
    icon: '⚠️',
    title: 'Something went wrong',
    description: 'We could not load this data. Please try again.',
  },
  empty: {
    icon: '📭',
    title: 'Nothing here yet',
    description: 'No records found. Start by adding one.',
  },
  forbidden: {
    icon: '🔒',
    title: 'Access Denied',
    description: 'You do not have permission to view this page. Contact your administrator.',
  },
};

@Component({
  selector: 'snt-page-state',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="page-state"
      [class.page-state--compact]="compact"
      [ngClass]="'page-state--' + type"
    >
      @if (type === 'loading') {
        <div class="page-state__spinner"></div>
      } @else {
        <div class="page-state__icon">{{ resolvedIcon }}</div>
      }

      <p class="page-state__title">{{ resolvedTitle }}</p>

      @if (resolvedDescription && !compact) {
        <p class="page-state__desc">{{ resolvedDescription }}</p>
      }

      @if (type === 'error' && actionLabel) {
        <button class="btn btn-secondary page-state__action" (click)="action.emit()">
          {{ actionLabel }}
        </button>
      }
      @if (type === 'empty' && actionLabel) {
        <button class="btn btn-primary page-state__action" (click)="action.emit()">
          {{ actionLabel }}
        </button>
      }

      <ng-content />
    </div>
  `,
  styles: [`
    .page-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
      gap: 10px;
      min-height: 280px;
    }

    .page-state--compact {
      padding: 32px 16px;
      min-height: 160px;
      gap: 8px;
    }

    .page-state__icon {
      font-size: 44px;
      line-height: 1;
      margin-bottom: 4px;
    }

    .page-state--compact .page-state__icon {
      font-size: 28px;
    }

    .page-state__title {
      font-size: var(--font-size-lg);
      font-weight: 700;
      color: var(--color-text);
    }

    .page-state--compact .page-state__title {
      font-size: var(--font-size-md);
    }

    .page-state__desc {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      max-width: 380px;
      line-height: 1.6;
    }

    .page-state__action {
      margin-top: 8px;
    }

    .page-state__spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: ps-spin .7s linear infinite;
      margin-bottom: 4px;
    }

    .page-state--compact .page-state__spinner {
      width: 24px;
      height: 24px;
      border-width: 2px;
    }

    @keyframes ps-spin { to { transform: rotate(360deg); } }

    .page-state--error     .page-state__title { color: var(--color-danger); }
    .page-state--forbidden .page-state__title { color: var(--color-warning); }
  `],
})
export class PageStateComponent {
  @Input({ required: true }) type!: PageStateType;
  @Input() icon?: string;
  @Input() title?: string;
  @Input() description?: string;
  @Input() actionLabel?: string;
  /** Compact mode — reduced padding, smaller icon, no description */
  @Input() compact = false;

  @Output() action = new EventEmitter<void>();

  get resolvedIcon(): string {
    return this.icon ?? DEFAULTS[this.type].icon;
  }

  get resolvedTitle(): string {
    return this.title ?? DEFAULTS[this.type].title;
  }

  get resolvedDescription(): string {
    return this.description ?? DEFAULTS[this.type].description;
  }
}
