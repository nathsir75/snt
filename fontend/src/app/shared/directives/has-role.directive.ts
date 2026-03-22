import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { Role } from '../../core/models/user.model';

@Directive({
  selector: '[sntHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private readonly auth = inject(AuthService);
  private readonly tpl  = inject(TemplateRef);
  private readonly vcr  = inject(ViewContainerRef);

  private allowedRoles: Role[] = [];

  @Input() set sntHasRole(roles: Role | Role[]) {
    this.allowedRoles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  constructor() {
    effect(() => {
      this.auth.currentUser(); // track signal
      this.updateView();
    });
  }

  private updateView(): void {
    const user = this.auth.currentUser();
    this.vcr.clear();
    if (user && this.allowedRoles.includes(user.role)) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}
