import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'snt-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <section class="auth-card">
        <div class="auth-logo">SNT</div>
        <h1>Create a new password</h1>
        <p class="intro">Use a new password of at least 8 characters.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          @if (message()) {
            <div class="alert-success">{{ message() }}</div>
          }
          @if (error()) {
            <div class="alert-error">{{ error() }}</div>
          }

          <label class="form-group">
            <span>New password</span>
            <input type="password" formControlName="newPassword" autocomplete="new-password" />
          </label>

          <label class="form-group">
            <span>Confirm new password</span>
            <input type="password" formControlName="confirmPassword" autocomplete="new-password" />
          </label>

          <button type="submit" class="btn btn-primary auth-btn" [disabled]="loading() || !token">
            {{ loading() ? 'Updating...' : 'Reset password' }}
          </button>
          <a routerLink="/auth/login" class="back-link">Back to login</a>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%); }
    .auth-card { width: min(100%, 430px); background: var(--color-surface); border-radius: var(--radius-xl); padding: 32px; box-shadow: var(--shadow-lg); }
    .auth-logo { width: 52px; height: 52px; border-radius: var(--radius-lg); display: grid; place-items: center; background: var(--color-primary); color: #fff; font-weight: 800; margin-bottom: 18px; }
    h1 { margin: 0; color: var(--color-text); font-size: var(--font-size-xl); }
    .intro { margin: 8px 0 24px; color: var(--color-text-muted); font-size: var(--font-size-sm); line-height: 1.5; }
    .auth-form { display: grid; gap: 16px; }
    .form-group { display: grid; gap: 7px; font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
    input { width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 11px 12px; font: inherit; color: var(--color-text); background: #fff; }
    .auth-btn { justify-content: center; width: 100%; padding: 11px; }
    .back-link { color: var(--color-primary); font-size: var(--font-size-sm); font-weight: 700; text-decoration: none; text-align: center; }
    .back-link:hover { text-decoration: underline; }
    .alert-success, .alert-error { border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--font-size-sm); font-weight: 600; line-height: 1.5; }
    .alert-success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .alert-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    @media (max-width: 520px) { .auth-page { padding: 16px; align-items: stretch; } .auth-card { padding: 24px; margin: auto 0; } }
  `],
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly loading = signal(false);
  readonly message = signal<string | null>(this.token ? null : 'This reset link is missing a token.');
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.error.set('New password and confirmation do not match.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.message.set(null);

    this.auth.resetPassword({ token: this.token, newPassword: value.newPassword }).subscribe({
      next: (result) => {
        this.message.set(result.message);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Failed to reset password.');
        this.loading.set(false);
      },
    });
  }
}
