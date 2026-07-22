import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StudentTopbarComponent } from '../student-topbar/student-topbar.component';
import { BottomNavItem, StudentBottomNavComponent } from '../student-bottom-nav/student-bottom-nav.component';
import { AuthService } from '../../core/auth/auth.service';
import { STUDENT_NAV } from '../../core/navigation/nav.config';
import { NavItem } from '../../core/navigation/nav.model';

const SNDTWU_BRANCH_CODE = 'SNDTWU';

const SNDTWU_STUDENT_NAV: NavItem[] = [
  { label: 'Live Class',       icon: '🎥', route: '/student/live-class',       group: 'Learning' },
  { label: 'Recorded Classes', icon: '▶️', route: '/student/recorded-classes', group: 'Learning' },
  { label: 'Study Material',   icon: '📄', route: '/student/study-material',   group: 'Learning' },
  { label: 'Mentor Q&A',       icon: '💬', route: '/student/mentor-qa',        group: 'Learning' },
];

const DEFAULT_BOTTOM_NAV: BottomNavItem[] = [
  { label: 'Home',       route: '/student/dashboard',     icon: 'home' },
  { label: 'My Course',  route: '/student/my-course',     icon: 'book' },
  { label: 'Attendance', route: '/student/my-attendance', icon: 'check' },
  { label: 'Schedule',   route: '/student/schedule',      icon: 'calendar' },
  { label: 'Profile',    route: '/student/profile',       icon: 'user' },
];

const SNDTWU_BOTTOM_NAV: BottomNavItem[] = [
  { label: 'Live Class', route: '/student/live-class', icon: 'live' },
  { label: 'Recorded',   route: '/student/recorded-classes', icon: 'replay' },
  { label: 'Material',   route: '/student/study-material', icon: 'file' },
  { label: 'Mentor Q&A', route: '/student/mentor-qa', icon: 'message' },
];

@Component({
  selector: 'snt-student-shell',
  standalone: true,
  imports: [RouterOutlet, StudentTopbarComponent, StudentBottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="student-layout layout-student">
      <snt-student-topbar [navItems]="studentNav()" />
      <main class="student-layout__content">
        <router-outlet />
      </main>
      <snt-student-bottom-nav [navItems]="bottomNav()" />
    </div>
  `,
  styleUrl: './student-shell.component.scss',
})
export class StudentShellComponent {
  private readonly auth = inject(AuthService);

  readonly isSndtwuStudent = computed(() => (
    this.auth.currentUser()?.branch?.code?.toUpperCase() === SNDTWU_BRANCH_CODE
  ));

  readonly studentNav = computed(() => (
    this.isSndtwuStudent() ? SNDTWU_STUDENT_NAV : STUDENT_NAV
  ));

  readonly bottomNav = computed(() => (
    this.isSndtwuStudent() ? SNDTWU_BOTTOM_NAV : DEFAULT_BOTTOM_NAV
  ));
}
