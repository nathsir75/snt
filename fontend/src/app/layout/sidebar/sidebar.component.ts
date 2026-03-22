import {
  Component,
  inject,
  Input,
  output,
  ChangeDetectionStrategy,
  computed,
  Signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { HO_NAV } from '../../core/navigation/nav.config';
import { NavItem } from '../../core/navigation/nav.model';
import { NavBadgeCounts } from '../../shared/services/nav-badge.service';

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'snt-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">

      <!-- Brand -->
      <div class="sidebar__brand">
        @if (!collapsed) {
          <div class="brand-full">
            <span class="brand-logo">S</span>
            <span class="brand-name">SNT Education</span>
          </div>
        } @else {
          <span class="brand-icon">S</span>
        }
      </div>

      <!-- Navigation -->
      <nav class="sidebar__nav" role="navigation" aria-label="Main navigation">
        @for (group of navGroups(); track group.label) {
          @if (!collapsed) {
            <p class="nav-group-label">{{ group.label }}</p>
          }
          @for (item of group.items; track item.route) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="nav-item--active"
              [routerLinkActiveOptions]="{ exact: false }"
              [title]="collapsed ? item.label : ''"
              [attr.aria-label]="item.label"
            >
              <span class="nav-item__icon">{{ item.icon }}</span>
              @if (!collapsed) {
                <span class="nav-item__label">{{ item.label }}</span>
                @if (item.badge && item.badge > 0) {
                  <span class="nav-item__badge" [ngClass]="'nav-item__badge--' + (item.badgeColor ?? 'warning')">
                    {{ item.badge > 99 ? '99+' : item.badge }}
                  </span>
                }
              } @else {
                @if (item.badge && item.badge > 0) {
                  <span class="nav-item__badge-dot"></span>
                }
              }
            </a>
          }
        }
      </nav>

      <!-- Collapse toggle -->
      <button
        class="sidebar__collapse-btn"
        (click)="toggleCollapse.emit()"
        [title]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        [attr.aria-label]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        @if (collapsed) {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        } @else {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        }
      </button>

    </aside>
  `,
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() navConfig: NavItem[] = HO_NAV;
  @Input() badgeCounts: Signal<NavBadgeCounts> | null = null;
  readonly toggleCollapse = output<void>();

  private readonly auth = inject(AuthService);

  readonly navGroups = computed<NavGroup[]>(() => {
    const role   = this.auth.currentUser()?.role;
    if (!role) return [];

    const counts = this.badgeCounts?.() ?? null;

    const visible = this.navConfig
      .filter((item) => !item.roles || item.roles.includes(role))
      .map((item) => {
        if (!item.badgeKey || !counts) return item;
        const val = counts[item.badgeKey];
        return { ...item, badge: val > 0 ? val : undefined };
      });

    const groupMap = new Map<string, NavItem[]>();
    for (const item of visible) {
      const key = item.group ?? 'General';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    }

    return Array.from(groupMap.entries()).map(([label, items]) => ({ label, items }));
  });
}
