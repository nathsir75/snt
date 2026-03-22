import {
  Component, Input, Output, EventEmitter,
  inject, signal, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, DestroyRef, OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { InterviewService } from '../placements/placement.service';
import { JobOpeningService } from '../job-openings/job-opening.service';
import { JobOpening } from '../companies/company.models';
import { AuthService } from '../../core/auth/auth.service';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';

@Component({
  selector: 'snt-interview-form',
  standalone: true,
  imports: [FormsModule, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      title="Schedule Interview"
      subtitle="Set up an interview round for a job opening"
      (closed)="cancel.emit()"
    >
      <div class="form-body">
        <div class="field">
          <label class="field-label">Job Opening <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="jobOpeningId">
            <option [ngValue]="null">Select job opening…</option>
            @for (j of jobs(); track j.id) {
              <option [ngValue]="j.id">{{ j.company.name }} — {{ j.title }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label class="field-label">Interview Date & Time <span class="req">*</span></label>
          <input class="field-input" type="datetime-local" [(ngModel)]="interviewDate" />
        </div>
        <div class="field">
          <label class="field-label">Mode <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="mode">
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Location / Link</label>
          <input class="field-input" type="text" placeholder="Venue address or meeting link" [(ngModel)]="location" />
        </div>

        @if (error()) {
          <p class="err-msg">{{ error() }}</p>
        }

        <div class="form-actions">
          <button class="btn btn-secondary" (click)="cancel.emit()" [disabled]="saving()">Cancel</button>
          <button class="btn btn-primary" (click)="submit()" [disabled]="saving() || !jobOpeningId || !interviewDate">
            {{ saving() ? 'Scheduling…' : 'Schedule Interview' }}
          </button>
        </div>
      </div>
    </snt-drawer>
  `,
  styles: [`
    .form-body { display: flex; flex-direction: column; gap: 16px; }
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
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
  `],
})
export class InterviewFormComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Output() saved  = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private readonly svc        = inject(InterviewService);
  private readonly jobSvc     = inject(JobOpeningService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);
  readonly jobs   = signal<JobOpening[]>([]);

  jobOpeningId: number | null = null;
  interviewDate = '';
  mode: 'online' | 'offline' = 'online';
  location = '';

  ngOnInit(): void {
    this.jobSvc.list({ status: 'open' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (j) => this.jobs.set(j), error: () => {} });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.error.set(null);
      this.jobOpeningId = null; this.interviewDate = '';
      this.mode = 'online'; this.location = '';
    }
  }

  submit(): void {
    if (!this.jobOpeningId || !this.interviewDate) return;
    this.saving.set(true);
    this.error.set(null);
    const branchId = this.auth.branchId();
    this.svc.schedule({
      jobOpeningId:  this.jobOpeningId,
      interviewDate: this.interviewDate,
      mode:          this.mode,
      ...(this.location && { location: this.location.trim() }),
      ...(branchId      && { branchId: Number(branchId) }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.saving.set(false); this.saved.emit(); },
        error: (e: Error) => { this.saving.set(false); this.error.set(e.message); },
      });
  }
}
