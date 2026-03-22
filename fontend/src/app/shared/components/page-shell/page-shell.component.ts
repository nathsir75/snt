import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * Standard feature page scaffold — the single layout wrapper for all feature pages.
 *
 * Slots:
 *   [slot=actions]  — toolbar buttons (top-right)
 *   [slot=filters]  — filter bar rendered below the header
 *   (default)       — main page content
 *
 * Usage:
 * ```html
 * <snt-page-shell title="Students" subtitle="Manage enrolled students" icon="🎓">
 *   <ng-container slot="actions">
 *     <button class="btn btn-primary">+ Enroll</button>
 *   </ng-container>
 *   <ng-container slot="filters">
 *     <input type="search" placeholder="Search…" />
 *   </ng-container>
 *   <!-- table / cards / content here -->
 * </snt-page-shell>
 * ```
 */
@Component({
  selector: 'snt-page-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ps">

      <!-- Header row -->
      <div class="ps__header">
        <div class="ps__title-block">
          @if (icon) {
            <span class="ps__icon">{{ icon }}</span>
          }
          <div>
            <h1 class="ps__title">{{ title }}</h1>
            @if (subtitle) {
              <p class="ps__subtitle">{{ subtitle }}</p>
            }
          </div>
        </div>
        <div class="ps__actions">
          <ng-content select="[slot=actions]" />
        </div>
      </div>

      <!-- Filters bar — only rendered when slot has content -->
      <div class="ps__filters">
        <ng-content select="[slot=filters]" />
      </div>

      <!-- Main content -->
      <div class="ps__body">
        <ng-content />
      </div>

    </div>
  `,
  styles: [`
    .ps {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .ps__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .ps__title-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .ps__icon {
      font-size: 28px;
      line-height: 1;
      flex-shrink: 0;
    }

    .ps__title {
      font-size: var(--font-size-xl);
      font-weight: 700;
      color: var(--color-text);
      line-height: 1.2;
    }

    .ps__subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: 3px;
    }

    .ps__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .ps__filters {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .ps__body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  `],
})
export class PageShellComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  /** Optional emoji/icon displayed before the title */
  @Input() icon?: string;
}
