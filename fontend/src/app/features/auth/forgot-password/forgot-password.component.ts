import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'snt-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <section class="auth-card">
        <div class="auth-logo">SNT</div>
        <h1>Reset your password</h1>
        <p class="intro">Enter your login email. If an active account exists, we will send a secure reset link.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          @if (message()) {
            <div class="alert-success">
              {{ message() }}
              @if (devResetUrl()) {
                <a [href]="devResetUrl()" class="dev-link">Open dev reset link</a>
              }
            </div>
          }
          @if (error()) {
            <div class="alert-error">{{ error() }}</div>
          }

          <label class="form-group">
            <span>Email address</span>
            <input type="email" formControlName="email" autocomplete="email" />
          </label>

          <button type="submit" class="btn btn-primary auth-btn" [disabled]="loading()">
            {{ loading() ? 'Sending...' : 'Send reset link' }}
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
    .back-link, .dev-link { color: var(--color-primary); font-size: var(--font-size-sm); font-weight: 700; text-decoration: none; text-align: center; }
    .back-link:hover, .dev-link:hover { text-decoration: underline; }
    .alert-success, .alert-error { border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--font-size-sm); font-weight: 600; line-height: 1.5; }
    .alert-success { background: #dcfce7; color: #166534; border: 1px solid #86efac; display: grid; gap: 8px; }
    .alert-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    @media (max-width: 520px) { .auth-page { padding: 16px; align-items: stretch; } .auth-card { padding: 24px; margin: auto 0; } }
  `],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly devResetUrl = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.message.set(null);
    this.devResetUrl.set(null);

    this.auth.requestPasswordReset(this.form.getRawValue().email).subscribe({
      next: (result) => {
        this.message.set(result.message);
        this.devResetUrl.set(result.devResetUrl ?? null);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Unable to process this request.');
        this.loading.set(false);
      },
    });
  }
}
