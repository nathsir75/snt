import {
  Component, inject, signal,
  ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { BranchContextService } from '../../../core/services/branch-context.service';

@Component({
  selector: 'snt-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-page">
      <div class="login-card">

        <div class="login-card__header">
          <div class="login-logo">SNT</div>
          <h1>SNT Education</h1>

          @if (branchName()) {
            <div class="login-branch-badge">
              <span class="login-branch-dot"></span>
              {{ branchName() }}
            </div>
          }

          <p>{{ branchName() ? 'Sign in to your student or staff account' : 'Sign in to continue' }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="login-card__form">
          @if (error()) {
            <div class="alert-error">{{ error() }}</div>
          }

          <div class="form-group">
            <label for="email">Email address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="you@snteducation.com"
              autocomplete="email"
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="field-error">Valid email is required</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="field-error">Password is required</span>
            }
          </div>

          <button
            type="submit"
            class="btn btn-primary login-btn"
            [disabled]="loading()"
          >
            {{ loading() ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>

        @if (branchCode()) {
          <div class="login-back-row">
            <a [href]="'/b/' + branchCode()" class="login-back-link">
              ← Back to {{ branchName() || branchCode() }} website
            </a>
          </div>
        }

      </div>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly fb         = inject(FormBuilder);
  private readonly auth       = inject(AuthService);
  private readonly route      = inject(ActivatedRoute);
  private readonly branchCtx  = inject(BranchContextService);

  readonly loading    = signal(false);
  readonly error      = signal<string | null>(null);
  readonly branchCode = signal<string>('');
  readonly branchName = signal<string>('');

  readonly form = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('branchCode') ?? '';
    if (!code) return;

    this.branchCode.set(code);

    // Resolve branch name for display
    this.branchCtx.resolve(code).subscribe({
      next: (b) => { if (b) this.branchName.set(b.name); },
      error: () => {},
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next:  () => this.auth.redirectAfterLogin(),
      error: (err: { error?: { error?: string }; message?: string }) => {
        const msg = err.error?.error ?? err.message ?? 'Login failed';
        this.error.set(
          msg === 'User not found' || msg === 'Invalid credentials'
            ? 'Invalid email or password'
            : msg,
        );
        this.loading.set(false);
      },
    });
  }
}
