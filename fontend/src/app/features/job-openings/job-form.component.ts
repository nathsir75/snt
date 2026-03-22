import {
  Component, Input, Output, EventEmitter,
  inject, signal, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, DestroyRef, OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { JobOpeningService } from './job-opening.service';
import { CompanyService } from '../companies/company.service';
import { Company } from '../companies/company.models';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';

@Component({
  selector: 'snt-job-form',
  standalone: true,
  imports: [FormsModule, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      title="Post Job Opening"
      subtitle="Create a new job opening for a hiring partner"
      (closed)="cancel.emit()"
    >
      <div class="form-body">
        <div class="field">
          <label class="field-label">Company <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="companyId">
            <option [ngValue]="null">Select company…</option>
            @for (c of companies(); track c.id) {
              <option [ngValue]="c.id">{{ c.name }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label class="field-label">Job Title <span class="req">*</span></label>
          <input class="field-input" type="text" placeholder="e.g. Software Engineer" [(ngModel)]="title" />
        </div>
        <div class="field">
          <label class="field-label">Location</label>
          <input class="field-input" type="text" placeholder="City or Remote" [(ngModel)]="location" />
        </div>
        <div class="field">
          <label class="field-label">Salary Package (₹ LPA)</label>
          <input class="field-input" type="number" placeholder="e.g. 6" [(ngModel)]="salaryPackage" min="0" />
        </div>
        <div class="field">
          <label class="field-label">Required Skills</label>
          <input class="field-input" type="text" placeholder="e.g. Java, Spring Boot, SQL" [(ngModel)]="requiredSkills" />
        </div>
        <div class="field">
          <label class="field-label">Description</label>
          <textarea class="field-input field-textarea" placeholder="Job description, responsibilities…" [(ngModel)]="description" rows="4"></textarea>
        </div>

        @if (error()) {
          <p class="err-msg">{{ error() }}</p>
        }

        <div class="form-actions">
          <button class="btn btn-secondary" (click)="cancel.emit()" [disabled]="saving()">Cancel</button>
          <button class="btn btn-primary" (click)="submit()" [disabled]="saving() || !companyId || !title.trim()">
            {{ saving() ? 'Posting…' : 'Post Opening' }}
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
    .field-textarea { resize: vertical; min-height: 80px; }
    .err-msg { font-size: var(--font-size-sm); color: var(--color-danger); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
  `],
})
export class JobFormComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Output() saved  = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private readonly svc        = inject(JobOpeningService);
  private readonly companySvc = inject(CompanyService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving    = signal(false);
  readonly error     = signal<string | null>(null);
  readonly companies = signal<Company[]>([]);

  companyId: number | null = null;
  title = ''; location = ''; requiredSkills = ''; description = '';
  salaryPackage: number | null = null;

  ngOnInit(): void {
    this.companySvc.list(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.companies.set(c), error: () => {} });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.error.set(null);
      this.companyId = null; this.title = ''; this.location = '';
      this.requiredSkills = ''; this.description = ''; this.salaryPackage = null;
    }
  }

  submit(): void {
    if (!this.companyId || !this.title.trim()) return;
    this.saving.set(true);
    this.error.set(null);
    const payload = {
      companyId: this.companyId,
      title: this.title.trim(),
      ...(this.location       && { location:       this.location.trim() }),
      ...(this.requiredSkills && { requiredSkills: this.requiredSkills.trim() }),
      ...(this.description    && { description:    this.description.trim() }),
      ...(this.salaryPackage  && { salaryPackage:  this.salaryPackage }),
    };
    this.svc.create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.saving.set(false); this.saved.emit(); },
        error: (e: Error) => { this.saving.set(false); this.error.set(e.message); },
      });
  }
}
