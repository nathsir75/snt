import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'snt-forbidden',
  standalone: true,
  imports: [PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-state type="forbidden">
      <button class="btn btn-secondary" style="margin-top:8px" (click)="goHome()">
        Back to Dashboard
      </button>
    </snt-page-state>
  `,
})
export class ForbiddenComponent {
  private readonly auth = inject(AuthService);

  goHome(): void {
    const role = this.auth.role();
    if (role) {
      this.auth.navigateHome();
    } else {
      window.location.href = '/auth/login';
    }
  }
}
