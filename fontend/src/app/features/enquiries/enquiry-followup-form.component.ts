import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { EnquiryService } from './enquiry.service';
import { FollowUp, FollowUpActionType, FollowUpStatusAfter } from './enquiry.models';

@Component({
  selector: 'snt-followup-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Add Follow-up">

          <div class="modal__header">
            <h3 class="modal__title">Add Follow-up</h3>
            <button class="modal__close" (click)="cancel.emit()" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="modal__body">

            @if (serverError()) {
              <div class="form-error-banner">{{ serverError() }}</div>
            }

            <div class="form-group">
              <label for="actionType">Action Type *</label>
              <select id="actionType" formControlName="actionType">
                <option value="">Select action</option>
                <option value="call">📞 Call</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="email">📧 Email</option>
                <option value="visit">🏢 Visit</option>
                <option value="note">📝 Note</option>
              </select>
              @if (f['actionType'].invalid && f['actionType'].touched) {
                <span class="field-error">Action type is required</span>
              }
            </div>

            <div class="form-group">
              <label for="remarks">Remarks *</label>
              <textarea id="remarks" formControlName="remarks" rows="3" placeholder="What happened during this follow-up?"></textarea>
              @if (f['remarks'].invalid && f['remarks'].touched) {
                <span class="field-error">Remarks are required</span>
              }
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="statusAfterAction">Update Status</label>
                <select id="statusAfterAction" formControlName="statusAfterAction">
                  <option value="">No change</option>
                  <option value="contacted">Contacted</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div class="form-group">
                <label for="nextFollowUpDate">Next Follow-up Date</label>
                <input id="nextFollowUpDate" type="datetime-local" formControlName="nextFollowUpDate" />
              </div>
            </div>

            <div class="modal__footer">
              <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="loading()">
                {{ loading() ? 'Saving…' : 'Add Follow-up' }}
              </button>
            </div>

          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 300; padding: 16px;
    }
    .modal {
      background: var(--color-surface); border-radius: var(--radius-lg);
      width: 100%; max-width: 520px; box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column;
      animation: modal-in .18s ease;
    }
    .modal__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 16px; border-bottom: 1px solid var(--color-border);
    }
    .modal__title { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); }
    .modal__close {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: var(--radius-md);
      color: var(--color-text-muted);
      &:hover { background: var(--color-bg); }
    }
    .modal__body { padding: 20px 24px; }
    .modal__footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding-top: 16px; margin-top: 4px;
      border-top: 1px solid var(--color-border);
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    textarea { resize: vertical; min-height: 80px; }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class FollowUpFormComponent implements OnChanges {
  @Input() open = false;
  @Input({ required: true }) enquiryId!: number;

  @Output() saved  = new EventEmitter<FollowUp>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(EnquiryService);

  readonly loading     = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    actionType:        ['', Validators.required],
    remarks:           ['', Validators.required],
    statusAfterAction: [''],
    nextFollowUpDate:  [''],
  });

  get f() { return this.form.controls; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.form.reset();
      this.serverError.set(null);
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    this.svc.createFollowUp({
      enquiryId:         this.enquiryId,
      actionType:        v.actionType as FollowUpActionType,
      remarks:           v.remarks,
      statusAfterAction: v.statusAfterAction ? v.statusAfterAction as FollowUpStatusAfter : undefined,
      nextFollowUpDate:  v.nextFollowUpDate || undefined,
    }).subscribe({
      next: (fu) => { this.loading.set(false); this.saved.emit(fu); },
      error: (e: Error) => { this.serverError.set(e.message); this.loading.set(false); },
    });
  }
}
