import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { APP_ROUTES } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/auth/auth.service';

/**
 * On app boot, if a token exists in localStorage, call /auth/me to:
 *  - Validate the token is still valid
 *  - Refresh the stored user object (role/branch may have changed)
 * Errors are swallowed — the user simply stays unauthenticated.
 */
function sessionRestoreFactory(auth: AuthService) {
  return () =>
    new Promise<void>((resolve) => {
      if (!auth.getToken()) { resolve(); return; }
      auth.restoreSession().subscribe({ next: () => resolve(), error: () => resolve() });
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(APP_ROUTES, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    {
      provide:    APP_INITIALIZER,
      useFactory: sessionRestoreFactory,
      deps:       [AuthService],
      multi:      true,
    },
  ],
};
