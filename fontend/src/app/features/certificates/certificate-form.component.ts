import {
  Component, Input, Output, EventEmitter,
  inject, signal, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CertificateService } from './certificate.service';

@Component({
  selector: 'snt-certificate-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="overlay" (click)="cancel.emit()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <p class="dialog-title">Issue Certificate</p>
          <p class="dialog-sub">Enter the Final Exam Result ID for the student who passed.</p>

          <div class="field">
            <label class="field-label">Result ID <span class="req">*</span></label>
            <input
              class="field-input"
              type="number"
              placeholder="e.g. 42"
              [(ngModel)]="resultId"
              min="1"
            />
          </div>

          @if (error()) {
            <p class="err-msg">{{ error() }}</p>
          }

          <div class="dialog-actions">
            <button class="btn btn-secondary" (click)="cancel.emit()" [disabled]="saving()">Cancel</button>
            <button class="btn btn-primary" (click)="submit()" [disabled]="saving() || !resultId">
              {{ saving() ? 'Issuing…' : 'Issue Certificate' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .dialog {
      background: var(--color-surface); border-radius: var(--radius-lg);
      padding: 28px 32px; width: 100%; max-width: 420px;
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 14px;
    }
    .dialog-title { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); }
    .dialog-sub   { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: -8px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .req { color: var(--color-danger); }
    .field-input {
      padding: 8px 12px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none;
    }
    .field-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .err-msg { font-size: var(--font-size-sm); color: var(--color-danger); }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
  `],
})
export class CertificateFormComponent {
  @Input() open = false;
  @Output() issued = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private readonly svc        = inject(CertificateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);

  resultId: number | null = null;

  submit(): void {
    if (!this.resultId) return;
    this.saving.set(true);
    this.error.set(null);
    this.svc.issue({ resultId: this.resultId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.saving.set(false); this.resultId = null; this.issued.emit(); },
        error: (e: Error) => {
          this.saving.set(false);
          this.error.set(this.friendlyError(e.message));
        },
      });
  }

  private friendlyError(msg: string): string {
    const map: Record<string, string> = {
      'Http failure response': 'Server error. Please try again.',
      'NOT_ELIGIBLE_FOR_CERTIFICATE': 'Student has not passed the final exam.',
      'DUPLICATE_CERTIFICATE': 'A certificate has already been issued for this result.',
      'RESULT_NOT_FOUND': 'Result ID not found.',
    };
    for (const [k, v] of Object.entries(map)) {
      if (msg.includes(k)) return v;
    }
    return msg;
  }
}
