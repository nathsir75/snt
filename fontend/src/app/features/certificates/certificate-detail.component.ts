import {
  Component, inject, signal, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CertificateService } from './certificate.service';
import { Certificate } from './certificate.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-certificate-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, PageStateComponent, BadgeComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') { <snt-page-state type="loading" /> }
      @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
      @case ('ready') {
        @if (cert(); as c) {
          <div class="detail-layout">

            <div class="detail-header">
              <a routerLink="/certificates" class="back-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                Certificates
              </a>
              <div class="header-actions">
                @if (c.pdfPath) {
                  <a [href]="c.pdfPath" target="_blank" class="btn btn-secondary">⬇ Download PDF</a>
                }
                @if (auth.isSuperAdmin() && c.status === 'issued') {
                  <button class="btn btn-danger" (click)="revokeDialogOpen.set(true)">Revoke</button>
                }
              </div>
            </div>

            <!-- Certificate preview card -->
            <div class="cert-preview">
              <div class="cert-watermark">🎖️</div>
              <div class="cert-header-row">
                <span class="cert-org">SNT Training Institute</span>
                <snt-badge [label]="c.status" [variant]="statusBadge(c.status)" />
              </div>
              <h1 class="cert-title">Certificate of Completion</h1>
              <p class="cert-body">This is to certify that</p>
              <p class="cert-name">{{ c.student.fullName }}</p>
              <p class="cert-body">has successfully completed the course</p>
              <p class="cert-course">{{ c.student.course }}</p>
              <div class="cert-meta-row">
                <div class="cert-meta-item">
                  <span class="cert-meta-label">Certificate No</span>
                  <span class="cert-meta-value mono">{{ c.certificateNo }}</span>
                </div>
                <div class="cert-meta-item">
                  <span class="cert-meta-label">Issue Date</span>
                  <span class="cert-meta-value">{{ c.issueDate | date:'dd MMMM yyyy' }}</span>
                </div>
                <div class="cert-meta-item">
                  <span class="cert-meta-label">Branch</span>
                  <span class="cert-meta-value">{{ c.branch.name }}, {{ c.branch.city }}</span>
                </div>
                <div class="cert-meta-item">
                  <span class="cert-meta-label">Issued By</span>
                  <span class="cert-meta-value">{{ c.issuedBy.name }}</span>
                </div>
              </div>
              <div class="cert-verify-row">
                <span class="cert-verify-label">Verification Code</span>
                <span class="cert-verify-code">{{ c.verificationCode }}</span>
                <a [href]="verifyUrl(c.verificationCode)" target="_blank" class="btn btn-ghost btn-sm">Verify →</a>
              </div>
            </div>

            @if (c.result) {
              <div class="card result-card">
                <p class="result-title">Exam Result</p>
                <div class="result-row">
                  <span class="result-label">Marks</span>
                  <span class="result-value">{{ c.result.marksObtained }} / {{ c.result.maxMarks }}</span>
                </div>
                <div class="result-row">
                  <span class="result-label">Status</span>
                  <snt-badge [label]="c.result.resultStatus" [variant]="c.result.resultStatus === 'pass' ? 'success' : 'danger'" />
                </div>
                @if (c.result.publishedAt) {
                  <div class="result-row">
                    <span class="result-label">Published</span>
                    <span class="result-value">{{ c.result.publishedAt | date:'dd MMM yyyy' }}</span>
                  </div>
                }
              </div>
            }

          </div>
        }
      }
    }

    <snt-confirm-dialog
      [open]="revokeDialogOpen()"
      title="Revoke Certificate"
      [message]="'Revoke ' + (cert()?.certificateNo ?? '') + '? This cannot be undone.'"
      confirmLabel="Revoke"
      (confirm)="doRevoke()"
      (cancel)="revokeDialogOpen.set(false)"
    />
  `,
  styles: [`
    .detail-layout { display: flex; flex-direction: column; gap: 20px; }
    .detail-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .back-link:hover { color: var(--color-primary); }
    .header-actions { display: flex; gap: 8px; }
    /* Certificate preview */
    .cert-preview {
      position: relative; overflow: hidden;
      background: linear-gradient(135deg, #fefce8 0%, #fff 60%, #f0fdf4 100%);
      border: 2px solid #d97706; border-radius: var(--radius-lg);
      padding: 40px 48px; text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
    }
    .cert-watermark {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      font-size: 200px; opacity: .04; pointer-events: none; user-select: none;
    }
    .cert-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .cert-org { font-size: var(--font-size-sm); font-weight: 700; color: #92400e; letter-spacing: .5px; text-transform: uppercase; }
    .cert-title { font-size: 28px; font-weight: 800; color: #78350f; margin-bottom: 20px; letter-spacing: -.5px; }
    .cert-body { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: 4px; }
    .cert-name { font-size: 22px; font-weight: 700; color: var(--color-text); margin-bottom: 8px; }
    .cert-course { font-size: var(--font-size-lg); font-weight: 700; color: #065f46; margin-bottom: 28px; }
    .cert-meta-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; text-align: left; }
    .cert-meta-item { display: flex; flex-direction: column; gap: 2px; }
    .cert-meta-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .cert-meta-value { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .mono { font-family: monospace; }
    .cert-verify-row { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,.7); border: 1px dashed #d97706; border-radius: var(--radius-md); }
    .cert-verify-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-muted); }
    .cert-verify-code { font-family: monospace; font-size: var(--font-size-sm); font-weight: 700; color: #92400e; letter-spacing: 1px; }
    /* Result card */
    .result-card { display: flex; flex-direction: column; gap: 10px; max-width: 360px; }
    .result-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
    .result-row { display: flex; align-items: center; justify-content: space-between; font-size: var(--font-size-sm); }
    .result-label { color: var(--color-text-muted); }
    .result-value { font-weight: 600; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
  `],
})
export class CertificateDetailComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly svc        = inject(CertificateService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth               = inject(AuthService);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly cert     = signal<Certificate | null>(null);

  readonly revokeDialogOpen = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.state.set('loading');
    this.svc.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => { this.cert.set(c); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  doRevoke(): void {
    const c = this.cert();
    if (!c) return;
    this.revokeDialogOpen.set(false);
    this.svc.revoke(c.id, { reason: 'Revoked by administrator' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.load(), error: (e: Error) => alert(e.message) });
  }

  statusBadge(status: string): BadgeVariant {
    return status === 'issued' ? 'success' : 'danger';
  }

  verifyUrl(code: string): string {
    return `/verify-certificate/${code}`;
  }
}
