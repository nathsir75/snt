import {
  Component, inject, signal, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CertificateService } from './certificate.service';
import { CertVerifyResult } from './certificate.models';

type VerifyState = 'idle' | 'loading' | 'valid' | 'revoked' | 'not_found' | 'error';

@Component({
  selector: 'snt-certificate-verify',
  standalone: true,
  imports: [FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="verify-page">
      <div class="verify-container">

        <div class="verify-brand">
          <span class="verify-logo">🎖️</span>
          <div>
            <h1 class="verify-brand-name">SNT Training Institute</h1>
            <p class="verify-brand-sub">Certificate Verification Portal</p>
          </div>
        </div>

        <div class="verify-card">
          <h2 class="verify-card-title">Verify Certificate Authenticity</h2>
          <p class="verify-card-desc">Enter the verification code printed on the certificate to confirm its validity.</p>

          <div class="verify-input-row">
            <input
              class="verify-input"
              type="text"
              placeholder="Enter verification code (e.g. A1B2C3D4E5F6…)"
              [(ngModel)]="code"
              (keydown.enter)="verify()"
            />
            <button class="btn btn-primary verify-btn" (click)="verify()" [disabled]="state() === 'loading' || !code.trim()">
              {{ state() === 'loading' ? 'Checking…' : 'Verify' }}
            </button>
          </div>

          @switch (state()) {
            @case ('loading') {
              <div class="verify-status verify-status-loading">
                <div class="spinner"></div>
                <span>Verifying certificate…</span>
              </div>
            }
            @case ('valid') {
              @if (result(); as r) {
                <div class="verify-result verify-result-valid">
                  <div class="result-icon">✅</div>
                  <div class="result-badge valid-badge">VALID CERTIFICATE</div>
                  <div class="result-grid">
                    <div class="result-field">
                      <span class="result-field-label">Student Name</span>
                      <span class="result-field-value">{{ r.studentName }}</span>
                    </div>
                    <div class="result-field">
                      <span class="result-field-label">Course</span>
                      <span class="result-field-value">{{ r.course }}</span>
                    </div>
                    <div class="result-field">
                      <span class="result-field-label">Certificate No</span>
                      <span class="result-field-value mono">{{ r.certificateNo }}</span>
                    </div>
                    <div class="result-field">
                      <span class="result-field-label">Issue Date</span>
                      <span class="result-field-value">{{ r.issueDate | date:'dd MMMM yyyy' }}</span>
                    </div>
                  </div>
                  <p class="result-footer">This certificate was issued by SNT Training Institute and is authentic.</p>
                </div>
              }
            }
            @case ('revoked') {
              @if (result(); as r) {
                <div class="verify-result verify-result-revoked">
                  <div class="result-icon">🚫</div>
                  <div class="result-badge revoked-badge">CERTIFICATE REVOKED</div>
                  <div class="result-grid">
                    <div class="result-field">
                      <span class="result-field-label">Student Name</span>
                      <span class="result-field-value">{{ r.studentName }}</span>
                    </div>
                    <div class="result-field">
                      <span class="result-field-label">Course</span>
                      <span class="result-field-value">{{ r.course }}</span>
                    </div>
                    <div class="result-field">
                      <span class="result-field-label">Certificate No</span>
                      <span class="result-field-value mono">{{ r.certificateNo }}</span>
                    </div>
                  </div>
                  <p class="result-footer revoked-footer">This certificate has been revoked and is no longer valid.</p>
                </div>
              }
            }
            @case ('not_found') {
              <div class="verify-result verify-result-invalid">
                <div class="result-icon">❌</div>
                <div class="result-badge invalid-badge">NOT FOUND</div>
                <p class="result-footer">No certificate found with this verification code. Please check and try again.</p>
              </div>
            }
            @case ('error') {
              <div class="verify-result verify-result-invalid">
                <div class="result-icon">⚠️</div>
                <p class="result-footer">Something went wrong. Please try again.</p>
              </div>
            }
          }
        </div>

        <p class="verify-footer-note">
          This portal is provided by SNT Training Institute for certificate authenticity verification.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .verify-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .verify-container {
      width: 100%; max-width: 600px;
      display: flex; flex-direction: column; gap: 24px;
    }
    .verify-brand {
      display: flex; align-items: center; gap: 14px;
    }
    .verify-logo { font-size: 40px; }
    .verify-brand-name { font-size: 20px; font-weight: 800; color: #fff; }
    .verify-brand-sub  { font-size: 13px; color: rgba(255,255,255,.6); margin-top: 2px; }
    .verify-card {
      background: #fff; border-radius: 16px;
      padding: 36px 40px; box-shadow: 0 20px 60px rgba(0,0,0,.3);
      display: flex; flex-direction: column; gap: 20px;
    }
    .verify-card-title { font-size: 20px; font-weight: 800; color: #1e293b; }
    .verify-card-desc  { font-size: 14px; color: #64748b; line-height: 1.6; margin-top: -12px; }
    .verify-input-row  { display: flex; gap: 10px; }
    .verify-input {
      flex: 1; padding: 10px 14px;
      border: 2px solid #e2e8f0; border-radius: 10px;
      font-size: 14px; outline: none; font-family: monospace;
      transition: border-color .15s;
    }
    .verify-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }
    .verify-btn { padding: 10px 20px; border-radius: 10px; white-space: nowrap; }
    .verify-status-loading {
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; color: #64748b; padding: 16px 0;
    }
    .spinner {
      width: 20px; height: 20px; border: 2px solid #e2e8f0;
      border-top-color: #3b82f6; border-radius: 50%;
      animation: spin .7s linear infinite; flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    /* Result states */
    .verify-result { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 24px; border-radius: 12px; text-align: center; }
    .verify-result-valid   { background: #f0fdf4; border: 2px solid #86efac; }
    .verify-result-revoked { background: #fff7ed; border: 2px solid #fdba74; }
    .verify-result-invalid { background: #fef2f2; border: 2px solid #fca5a5; }
    .result-icon { font-size: 40px; }
    .result-badge {
      padding: 4px 16px; border-radius: 999px;
      font-size: 12px; font-weight: 800; letter-spacing: 1px;
    }
    .valid-badge   { background: #dcfce7; color: #166534; }
    .revoked-badge { background: #ffedd5; color: #9a3412; }
    .invalid-badge { background: #fee2e2; color: #991b1b; }
    .result-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      width: 100%; text-align: left;
    }
    .result-field { display: flex; flex-direction: column; gap: 2px; }
    .result-field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #94a3b8; }
    .result-field-value { font-size: 14px; font-weight: 600; color: #1e293b; }
    .mono { font-family: monospace; }
    .result-footer { font-size: 13px; color: #64748b; line-height: 1.6; }
    .revoked-footer { color: #9a3412; }
    .verify-footer-note { font-size: 12px; color: rgba(255,255,255,.4); text-align: center; }
  `],
})
export class CertificateVerifyComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly svc        = inject(CertificateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state  = signal<VerifyState>('idle');
  readonly result = signal<CertVerifyResult | null>(null);

  code = '';

  ngOnInit(): void {
    // Pre-fill code from route param if navigated directly
    const paramCode = this.route.snapshot.paramMap.get('code');
    if (paramCode) {
      this.code = paramCode;
      this.verify();
    }
  }

  verify(): void {
    const trimmed = this.code.trim();
    if (!trimmed) return;
    this.state.set('loading');
    this.result.set(null);
    this.svc.verify(trimmed)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.result.set(r);
          this.state.set(r.status === 'revoked' ? 'revoked' : 'valid');
        },
        error: (e: { status?: number }) => {
          this.state.set(e.status === 404 ? 'not_found' : 'error');
        },
      });
  }
}
