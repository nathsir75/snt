import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TeacherTopbarComponent } from '../teacher-topbar/teacher-topbar.component';
import { TEACHER_NAV } from '../../core/navigation/nav.config';

@Component({
  selector: 'snt-teacher-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TeacherTopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell layout-teacher" [class.shell--collapsed]="sidebarCollapsed()">
      <snt-sidebar [collapsed]="sidebarCollapsed()" [navConfig]="teacherNav" (toggleCollapse)="toggleSidebar()" />
      <div class="shell__main">
        <snt-teacher-topbar (sidebarToggle)="toggleSidebar()" />
        <main class="shell__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: '../shell/shell.component.scss',
})
export class TeacherShellComponent {
  readonly teacherNav = TEACHER_NAV;
  readonly sidebarCollapsed = signal(false);
  toggleSidebar(): void { this.sidebarCollapsed.update((v) => !v); }
}
