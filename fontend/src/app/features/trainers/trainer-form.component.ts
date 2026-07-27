import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { BranchOption, Trainer } from './trainer.models';
import { TrainerService } from './trainer.service';

@Component({
  selector: 'snt-trainer-form',
  standalone: true,
  imports: [FormsModule, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      title="Add Trainer"
      [subtitle]="lockedBranchName || 'Create a trainer profile'"
      (closed)="cancel.emit()"
    >
      @if (serverError()) {
        <div class="form-error-banner">{{ serverError() }}</div>
      }

      <div class="form-stack">
        <div class="form-group">
          <label for="trainerName">Full Name *</label>
          <input
            id="trainerName"
            class="form-control"
            type="text"
            [(ngModel)]="fullName"
            placeholder="e.g. Priya Sharma"
            [disabled]="loading()"
          />
          @if (submitted() && !fullName.trim()) {
            <span class="field-error">Full name is required</span>
          }
        </div>

        <div class="form-group">
          <label for="trainerBranch">Branch *</label>
          @if (lockedBranchId) {
            <input
              id="trainerBranch"
              class="form-control"
              type="text"
              [value]="lockedBranchName || 'Your branch'"
              disabled
            />
          } @else {
            <select
              id="trainerBranch"
              class="form-control"
              [(ngModel)]="branchId"
              [disabled]="loading() || !branches.length"
            >
              <option [ngValue]="null">Select a branch...</option>
              @for (branch of branches; track branch.id) {
                <option [ngValue]="branch.id">{{ branch.name }} - {{ branch.city }}</option>
              }
            </select>
          }
          @if (submitted() && !resolvedBranchId()) {
            <span class="field-error">Branch is required</span>
          }
        </div>

        <div class="form-group">
          <label for="trainerType">Trainer Type</label>
          <select
            id="trainerType"
            class="form-control"
            [(ngModel)]="trainerType"
            [disabled]="loading() || !!lockedBranchId"
          >
            <option value="local">Franchise / Local Trainer</option>
            <option value="global">Head Office Global Trainer</option>
          </select>
        </div>

        <div class="form-group">
          <label for="trainerEmail">Email</label>
          <input
            id="trainerEmail"
            class="form-control"
            type="email"
            [(ngModel)]="email"
            placeholder="trainer@example.com"
            [disabled]="loading()"
          />
          @if (submitted() && email.trim() && !emailValid()) {
            <span class="field-error">Enter a valid email address</span>
          }
        </div>

        <div class="form-group">
          <label for="trainerMobile">Mobile</label>
          <input
            id="trainerMobile"
            class="form-control"
            type="tel"
            [(ngModel)]="mobile"
            placeholder="Phone number"
            [disabled]="loading()"
          />
        </div>

        <div class="form-group">
          <label for="trainerSpecialization">Specialization</label>
          <input
            id="trainerSpecialization"
            class="form-control"
            type="text"
            [(ngModel)]="specialization"
            placeholder="e.g. Java Full Stack"
            [disabled]="loading()"
          />
        </div>
      </div>

      <div class="drawer-footer">
        <button type="button" class="btn btn-secondary" (click)="cancel.emit()" [disabled]="loading()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="submit()" [disabled]="loading()">
          {{ loading() ? 'Saving...' : 'Save Trainer' }}
        </button>
      </div>
    </snt-drawer>
  `,
  styles: [`
    .form-stack { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .form-control {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-text);
      font-size: var(--font-size-sm);
      outline: none;
    }
    .form-control:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .form-control:disabled { opacity: .65; cursor: not-allowed; }
    .field-error { color: #dc2626; font-size: var(--font-size-xs); }
    .form-error-banner {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-size: var(--font-size-sm);
      margin-bottom: 16px;
    }
    .drawer-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 18px;
      margin-top: 20px;
      border-top: 1px solid var(--color-border);
    }
  `],
})
export class TrainerFormComponent implements OnChanges {
  @Input() open = false;
  @Input() branches: BranchOption[] = [];
  @Input() lockedBranchId: number | null = null;
  @Input() lockedBranchName: string | null = null;

  @Output() saved = new EventEmitter<Trainer>();
  @Output() cancel = new EventEmitter<void>();

  private readonly trainerSvc = inject(TrainerService);

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal<string | null>(null);

  fullName = '';
  branchId: number | null = null;
  email = '';
  mobile = '';
  specialization = '';
  trainerType: 'local' | 'global' = 'local';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  resolvedBranchId(): number | null {
    return this.lockedBranchId ?? this.branchId;
  }

  emailValid(): boolean {
    const value = this.email.trim();
    return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);

    const branchId = this.resolvedBranchId();
    if (!this.fullName.trim() || !branchId || !this.emailValid()) return;

    this.loading.set(true);
    this.trainerSvc.create({
      fullName: this.fullName.trim(),
      branchId,
      email: this.email.trim() || undefined,
      mobile: this.mobile.trim() || undefined,
      specialization: this.specialization.trim() || undefined,
      trainerType: this.trainerType,
    }).subscribe({
      next: (trainer) => {
        this.loading.set(false);
        this.saved.emit(trainer);
      },
      error: (error: Error) => {
        this.serverError.set(error.message || 'Could not save trainer');
        this.loading.set(false);
      },
    });
  }

  private reset(): void {
    this.fullName = '';
    this.branchId = this.lockedBranchId;
    this.email = '';
    this.mobile = '';
    this.specialization = '';
    this.trainerType = this.lockedBranchId ? 'local' : 'local';
    this.loading.set(false);
    this.submitted.set(false);
    this.serverError.set(null);
  }
}
