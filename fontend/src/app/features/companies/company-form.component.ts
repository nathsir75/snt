import {
  Component, Input, Output, EventEmitter,
  inject, signal, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CompanyService } from './company.service';
import { Company } from './company.models';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';

@Component({
  selector: 'snt-company-form',
  standalone: true,
  imports: [FormsModule, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      [title]="editMode ? 'Edit Company' : 'Add Company'"
      subtitle="Hiring partner company details"
      (closed)="cancel.emit()"
    >
      <div class="form-body">
        <div class="field">
          <label class="field-label">Company Name <span class="req">*</span></label>
          <input class="field-input" type="text" placeholder="e.g. Infosys Ltd." [(ngModel)]="name" />
        </div>
        <div class="field">
          <label class="field-label">Industry</label>
          <input class="field-input" type="text" placeholder="e.g. IT Services" [(ngModel)]="industry" />
        </div>
        <div class="field">
          <label class="field-label">Contact Person</label>
          <input class="field-input" type="text" placeholder="HR Manager name" [(ngModel)]="contactPerson" />
        </div>
        <div class="field">
          <label class="field-label">Contact Email</label>
          <input class="field-input" type="email" placeholder="hr@company.com" [(ngModel)]="contactEmail" />
        </div>
        <div class="field">
          <label class="field-label">Contact Phone</label>
          <input class="field-input" type="tel" placeholder="+91 98765 43210" [(ngModel)]="contactPhone" />
        </div>
        <div class="field">
          <label class="field-label">Location</label>
          <input class="field-input" type="text" placeholder="City, State" [(ngModel)]="location" />
        </div>

        @if (error()) {
          <p class="err-msg">{{ error() }}</p>
        }

        <div class="form-actions">
          <button class="btn btn-secondary" (click)="cancel.emit()" [disabled]="saving()">Cancel</button>
          <button class="btn btn-primary" (click)="submit()" [disabled]="saving() || !name.trim()">
            {{ saving() ? 'Saving…' : (editMode ? 'Update' : 'Add Company') }}
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
export class CompanyFormComponent implements OnChanges {
  @Input() open = false;
  @Input() editCompany: Company | null = null;
  @Output() saved  = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private readonly svc        = inject(CompanyService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);

  name = ''; industry = ''; contactPerson = '';
  contactEmail = ''; contactPhone = ''; location = '';

  get editMode(): boolean { return !!this.editCompany; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.error.set(null);
      if (this.editCompany) {
        const c = this.editCompany;
        this.name = c.name; this.industry = c.industry ?? '';
        this.contactPerson = c.contactPerson ?? ''; this.contactEmail = c.contactEmail ?? '';
        this.contactPhone = c.contactPhone ?? ''; this.location = c.location ?? '';
      } else {
        this.name = ''; this.industry = ''; this.contactPerson = '';
        this.contactEmail = ''; this.contactPhone = ''; this.location = '';
      }
    }
  }

  submit(): void {
    if (!this.name.trim()) return;
    this.saving.set(true);
    this.error.set(null);
    const payload = {
      name: this.name.trim(),
      ...(this.industry      && { industry:      this.industry.trim() }),
      ...(this.contactPerson && { contactPerson: this.contactPerson.trim() }),
      ...(this.contactEmail  && { contactEmail:  this.contactEmail.trim() }),
      ...(this.contactPhone  && { contactPhone:  this.contactPhone.trim() }),
      ...(this.location      && { location:      this.location.trim() }),
    };
    this.svc.create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.saving.set(false); this.saved.emit(); },
        error: (e: Error) => { this.saving.set(false); this.error.set(e.message); },
      });
  }
}
