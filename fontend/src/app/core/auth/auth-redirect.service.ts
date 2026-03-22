import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Role, homeRouteForRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthRedirectService {
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  /**
   * Navigate to the correct destination after a successful login.
   *
   * Priority:
   *  1. `returnUrl` query param — safe same-origin path
   *  2. Role-based default home route
   *
   * `branchCode` is captured but does NOT override the role destination —
   * it was only used to show branch context on the login page.
   * Branch users always land on their role home (/branch/dashboard etc.)
   * which is already scoped to their branch via the JWT branchId.
   */
  redirectAfterLogin(role: Role): void {
    const params     = this.route.snapshot.queryParamMap;
    const returnUrl  = params.get('returnUrl');
    const branchCode = params.get('branchCode');

    if (returnUrl && this.isSafeReturnUrl(returnUrl)) {
      console.log(`[AuthRedirect] returnUrl → ${returnUrl}`);
      this.router.navigateByUrl(returnUrl);
      return;
    }

    const destination = homeRouteForRole(role);
    console.log(`[AuthRedirect] role=${role} branchCode=${branchCode ?? 'none'} → ${destination}`);
    this.router.navigate([destination]);
  }

  /**
   * Build a login URL that preserves the current path as returnUrl.
   * Used by authGuard.
   */
  buildLoginUrlWithReturn(currentPath: string): unknown[] {
    return ['/auth/login', { queryParams: { returnUrl: currentPath } }];
  }

  /**
   * Build a login URL with branchCode context.
   * Used by branch public site "Login" buttons.
   */
  buildBranchLoginUrl(branchCode: string): string {
    return `/auth/login?branchCode=${encodeURIComponent(branchCode)}`;
  }

  private isSafeReturnUrl(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }
}
