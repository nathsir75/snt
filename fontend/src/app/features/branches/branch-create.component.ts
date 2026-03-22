import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BranchService } from './branch.service';
import { CreateBranchPayload } from './branch.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';

@Component({
  selector: 'snt-branch-create',
  standalone: true,
  imports: [RouterLink, FormsModule, PageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Create New Branch"
      subtitle="Set up a new franchise branch in the SNT network"
      icon="🏢"
    >
      <ng-container slot="actions">
        <a routerLink="/ho/branches" class="btn btn-secondary">← All Branches</a>
      </ng-container>

      @if (enquiryId()) {
        <div class="enquiry-notice">
          📋 Creating branch from approved partner enquiry #{{ enquiryId() }}
        </div>
      }

      <div class="create-card">
        <div class="form-section">
          <p class="form-section-title">Branch Identity</p>
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">Branch Name *</label>
              <input class="form-input" [(ngModel)]="form.name" placeholder="e.g. SNT Education – Pune" />
            </div>
            <div class="form-field">
              <label class="form-label">Branch Code *</label>
              <input class="form-input" [(ngModel)]="form.code" placeholder="e.g. pune" style="text-transform:lowercase" />
              <span class="form-hint">Unique short identifier. Cannot be changed later.</span>
            </div>
          </div>
        </div>

        <div class="form-section">
          <p class="form-section-title">Location</p>
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">City *</label>
              <input class="form-input" [(ngModel)]="form.city" placeholder="City" />
            </div>
            <div class="form-field">
              <label class="form-label">State</label>
              <input class="form-input" [(ngModel)]="form.state" placeholder="State" />
            </div>
          </div>
        </div>

        @if (error()) {
          <div class="form-error-banner">⚠️ {{ error() }}</div>
        }

        <div class="form-actions">
          <a routerLink="/ho/branches" class="btn btn-secondary">Cancel</a>
          <button
            class="btn btn-primary"
            [disabled]="saving()"
            (click)="create()"
          >
            {{ saving() ? 'Creating Branch…' : '🏢 Create Branch' }}
          </button>
        </div>
      </div>
    </snt-page-shell>
  `,
  styles: [`
    .enquiry-notice { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); padding: 12px 16px; font-size: var(--font-size-sm); color: #1e40af; font-weight: 500; }
    .create-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 28px; display: flex; flex-direction: column; gap: 28px; }
    .form-section { display: flex; flex-direction: column; gap: 14px; }
    .form-section-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); border-bottom: 1px solid var(--color-border); padding-bottom: 8px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 5px; }
    .form-full { grid-column: 1 / -1; }
    .form-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .form-input { padding: 9px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; width: 100%; }
    .form-input:focus { border-color: var(--color-primary); }
    .form-textarea { resize: vertical; }
    .form-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .form-error-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); padding: 12px 16px; font-size: var(--font-size-sm); color: var(--color-danger); }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 8px; border-top: 1px solid var(--color-border); }
  `],
})
export class BranchCreateComponent implements OnInit {
  private readonly svc        = inject(BranchService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving    = signal(false);
  readonly error     = signal<string | null>(null);
  readonly enquiryId = signal<number | null>(null);

  form: CreateBranchPayload = {
    name: '', code: '', city: '', state: '',
  };

  ngOnInit(): void {
    const eid = this.route.snapshot.queryParamMap.get('enquiryId');
    if (eid) this.enquiryId.set(Number(eid));
  }

  create(): void {
    if (!this.form.name.trim() || !this.form.code.trim() || !this.form.city.trim()) {
      this.error.set('Please fill in all required fields.');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.svc.create({ ...this.form, code: this.form.code.toLowerCase().trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branch) => {
          this.router.navigate(['/ho/branches', branch.id, 'onboarding']);
        },
        error: (e: Error) => {
          this.error.set(e.message || 'Failed to create branch. Please try again.');
          this.saving.set(false);
        },
      });
  }
}
