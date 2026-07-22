import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models/user.model';

const SNDTWU_BRANCH_CODE = 'SNDTWU';

export const roleGuard = (allowedRoles: Role[]): CanActivateFn =>
  () => {
    const auth   = inject(AuthService);
    const router = inject(Router);
    const user   = auth.currentUser();

    if (!user) return router.createUrlTree(['/auth/login']);
    if (allowedRoles.includes(user.role)) return true;

    return router.createUrlTree(['/forbidden']);
  };

export const blockSndtwuStudentGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (user?.role === 'student' && user.branch?.code?.toUpperCase() === SNDTWU_BRANCH_CODE) {
    return router.createUrlTree(['/student/dashboard']);
  }

  return true;
};
