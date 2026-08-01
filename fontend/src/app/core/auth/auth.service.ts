import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from './auth.models';
import { User, ROLES, homeRouteForRole } from '../models/user.model';
import { AuthRedirectService } from './auth-redirect.service';

const TOKEN_KEY = 'snt_token';
const USER_KEY  = 'snt_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http         = inject(HttpClient);
  private readonly router       = inject(Router);
  private readonly authRedirect = inject(AuthRedirectService);

  private readonly _currentUser = signal<User | null>(this.loadUser());

  readonly currentUser   = this._currentUser.asReadonly();
  readonly isLoggedIn    = computed(() => !!this._currentUser());
  readonly role          = computed(() => this._currentUser()?.role ?? null);
  readonly scope         = computed(() => this._currentUser()?.scope ?? 'branch');
  readonly branchId      = computed(() => this._currentUser()?.branchId ?? null);

  // Granular role checks
  readonly isSuperAdmin  = computed(() => this.role() === ROLES.SUPER_ADMIN);
  readonly isBranchAdmin = computed(() => this.role() === ROLES.BRANCH_ADMIN);
  readonly isCounselor   = computed(() => this.role() === ROLES.COUNSELOR);
  readonly isTeacher     = computed(() => this.role() === ROLES.TEACHER);
  readonly isStudent     = computed(() => this.role() === ROLES.STUDENT);

  // Group checks
  readonly isHoUser     = computed(() => this.isSuperAdmin() || this.scope() === 'global');
  readonly isBranchUser = computed(() => this.isBranchAdmin() || this.isCounselor());

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this._currentUser.set(res.user);
        })
      );
  }

  /**
   * Called after a successful login — delegates to AuthRedirectService
   * so returnUrl / branchCode query params are respected.
   */
  redirectAfterLogin(): void {
    const role = this.role();
    if (!role) { this.router.navigate(['/auth/login']); return; }
    this.authRedirect.redirectAfterLogin(role);
  }

  /**
   * Navigates to the role home unconditionally (no returnUrl check).
   * Use for: logout recovery, manual "go home" actions.
   */
  navigateHome(): void {
    const role = this.role();
    if (!role) { this.router.navigate(['/auth/login']); return; }
    this.router.navigate([homeRouteForRole(role)]);
  }

  /**
   * Re-validates the stored token against /auth/me.
   * Call once in app initializer to refresh stale localStorage user data.
   */
  restoreSession(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(
        tap((user) => {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          this._currentUser.set(user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
