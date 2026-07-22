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
    @if (canManage()) {
      <snt-lms-manage />
    } @else {
      <snt-lms-viewer />
    }
  `,
})
export class LmsComponent {
  private readonly auth = inject(AuthService);

  readonly canManage = () => (
    this.auth.isSuperAdmin() || this.auth.isBranchAdmin() || this.auth.isTeacher()
  );
}
