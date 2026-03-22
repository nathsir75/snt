import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AdminTopbarComponent } from '../admin-topbar/admin-topbar.component';
import { HO_NAV } from '../../core/navigation/nav.config';
import { NavBadgeService } from '../../shared/services/nav-badge.service';

@Component({
  selector: 'snt-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, AdminTopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell layout-ho" [class.shell--collapsed]="sidebarCollapsed()">
      <snt-sidebar [collapsed]="sidebarCollapsed()" [navConfig]="hoNav" [badgeCounts]="badgeSvc.counts" (toggleCollapse)="toggleSidebar()" />
      <div class="shell__main">
        <snt-admin-topbar alertsRoute="/ho/alerts" (sidebarToggle)="toggleSidebar()" />
        <main class="shell__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  readonly badgeSvc = inject(NavBadgeService);
  readonly hoNav = HO_NAV;
  readonly sidebarCollapsed = signal(false);
  ngOnInit(): void { this.badgeSvc.start(); }
  toggleSidebar(): void { this.sidebarCollapsed.update((v) => !v); }
}
