import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { LmsManageComponent } from './lms-manage.component';
import { LmsViewerComponent } from './lms-viewer.component';

@Component({
  selector: 'snt-lms',
  standalone: true,
  imports: [LmsManageComponent, LmsViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isSuperAdmin()) {
      <snt-lms-manage />
    } @else {
      <snt-lms-viewer />
    }
  `,
})
export class LmsComponent {
  readonly isSuperAdmin = inject(AuthService).isSuperAdmin;
}
