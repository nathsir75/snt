import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'snt-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="password-page">
      <section class="password-card">
        <div class="password-logo">SNT</div>
        <h1>Change your password</h1>
        <p class="intro">This temporary password must be replaced before you continue.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="password-form">
          @if (error()) {
            <div class="alert-error">{{ error() }}</div>
          }

          <label class="form-group">
            <span>Current temporary password</span>
            <input type="password" formControlName="currentPassword" autocomplete="current-password" />
          </label>

          <label class="form-group">
            <span>New password</span>
            <input type="password" formControlName="newPassword" autocomplete="new-password" />
            <small>Use at least 8 characters. Do not reuse the temporary password.</small>
          </label>

          <label class="form-group">
            <span>Confirm new password</span>
            <input type="password" formControlName="confirmPassword" autocomplete="new-password" />
          </label>

          <button type="submit" class="btn btn-primary password-btn" [disabled]="loading()">
            {{ loading() ? 'Updating...' : 'Update password' }}
          </button>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .password-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%);
    }

    .password-card {
      width: min(100%, 430px);
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      padding: 32px;
      box-shadow: var(--shadow-lg);
    }

    .password-logo {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-lg);
      display: grid;
      place-items: center;
      background: var(--color-primary);
      color: #fff;
      font-weight: 800;
      margin-bottom: 18px;
    }

    h1 {
      margin: 0;
      color: var(--color-text);
      font-size: var(--font-size-xl);
    }

    .intro {
      margin: 8px 0 24px;
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .password-form {
      display: grid;
      gap: 16px;
    }

    .form-group {
      display: grid;
      gap: 7px;
      font-size: var(--font-size-sm);
      font-weight: 700;
      color: var(--color-text);
    }

    input {
      width: 100%;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 11px 12px;
      font: inherit;
      color: var(--color-text);
      background: #fff;
    }

    small {
      color: var(--color-text-muted);
      font-weight: 500;
      line-height: 1.4;
    }

    .password-btn {
      justify-content: center;
      width: 100%;
      padding: 11px;
      margin-top: 4px;
    }

    .alert-error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-size: var(--font-size-sm);
      font-weight: 600;
    }

    @media (max-width: 520px) {
      .password-page { padding: 16px; align-items: stretch; }
      .password-card { padding: 24px; margin: auto 0; }
    }
  `],
})
export class ChangePasswordComponent {
  private readonly fb   = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
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

    this.auth.changePassword({
      currentPassword: value.currentPassword,
      newPassword: value.newPassword,
    }).subscribe({
      next: () => this.auth.navigateHome(),
      error: (err: Error) => {
        this.error.set(err.message || 'Failed to update password.');
        this.loading.set(false);
      },
    });
  }
}
