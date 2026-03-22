import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StudentTopbarComponent } from '../student-topbar/student-topbar.component';
import { StudentBottomNavComponent } from '../student-bottom-nav/student-bottom-nav.component';

@Component({
  selector: 'snt-student-shell',
  standalone: true,
  imports: [RouterOutlet, StudentTopbarComponent, StudentBottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="student-layout layout-student">
      <snt-student-topbar />
      <main class="student-layout__content">
        <router-outlet />
      </main>
      <snt-student-bottom-nav />
    </div>
  `,
  styleUrl: './student-shell.component.scss',
})
export class StudentShellComponent {}
