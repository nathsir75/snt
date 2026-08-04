import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { homeRouteForRole } from '../models/user.model';

export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    if (auth.mustChangePassword() && !state.url.startsWith('/auth/change-password')) {
      return router.createUrlTree(['/auth/change-password']);
    }
    return true;
  }

  // Preserve the attempted URL so login can redirect back after success
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Prevents already-authenticated users from reaching /auth/login.
 * Redirects them to their role-appropriate home instead.
 */
export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const role   = auth.role();

  if (!role) return true;
  if (auth.mustChangePassword()) return router.createUrlTree(['/auth/change-password']);

  return router.createUrlTree([homeRouteForRole(role)]);
};
