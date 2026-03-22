import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import { StudentService, MyCertificate } from '../student.service';

@Component({
  selector: 'snt-student-certificates',
  standalone: true,
  imports: [SlicePipe, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Certificates</h1><p>Your issued certificates</p></div>
    </div>

    @if (loading()) {
      <div class="page-state">Loading certificates…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (certs().length === 0) {
      <div class="card page-state">
        <p>No certificates issued yet.</p>
        <p class="text-muted text-sm">Certificates are issued after passing the final exam.</p>
      </div>
    } @else {
      <div class="certs-grid">
        @for (c of certs(); track c.id) {
          <div class="cert-card card">
            <div class="cert-card__icon">🎖️</div>
            <div class="cert-card__no">{{ c.certificateNo }}</div>
            <div class="cert-card__date text-muted text-sm">Issued {{ c.issueDate | slice:0:10 }}</div>

            <span
              class="badge cert-status"
              [class.badge-success]="c.status === 'issued'"
              [class.badge-danger]="c.status === 'revoked'"
            >{{ c.status | uppercase }}</span>

            <div class="cert-card__score text-muted text-sm">
              Score: {{ c.result.marksObtained }}/{{ c.result.maxMarks }}
              ({{ scorePercent(c) }}%)
            </div>

            <div class="cert-card__verify">
              <span class="cert-card__verify-label">Verification Code</span>
              <code class="cert-card__code">{{ c.verificationCode }}</code>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .certs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .cert-card {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 28px 20px; text-align: center;
    }
    .cert-card__icon { font-size: 40px; }
    .cert-card__no { font-size: var(--font-size-md); font-weight: 700; color: var(--layout-accent, #16a34a); }
    .cert-status { margin: 4px 0; }
    .cert-card__score { margin-top: 4px; }
    .cert-card__verify { margin-top: 12px; width: 100%; background: var(--color-bg); border-radius: var(--radius-md); padding: 10px; }
    .cert-card__verify-label { display: block; font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: .4px; }
    .cert-card__code { font-size: var(--font-size-xs); word-break: break-all; color: var(--color-text-muted); }
  `],
})
export class StudentCertificatesComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly certs   = signal<MyCertificate[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  scorePercent(c: MyCertificate): number {
    return c.result.maxMarks > 0 ? Math.round((c.result.marksObtained / c.result.maxMarks) * 100) : 0;
  }

  ngOnInit(): void {
    this.studentSvc.getMyCertificates().subscribe({
      next:  (d) => { this.certs.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(e.error?.error ?? 'Failed to load certificates'); this.loading.set(false); },
    });
  }
}
