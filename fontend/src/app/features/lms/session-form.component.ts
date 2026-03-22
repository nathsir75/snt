import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LmsService } from './lms.service';
import { Session } from './lms.models';

@Component({
  selector: 'snt-session-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Add Session">

          <div class="modal-header">
            <h3 class="modal-title">Add Session</h3>
            <button class="modal-close" (click)="cancel.emit()" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="modal-body">

            @if (serverError()) {
              <div class="form-error-banner">{{ serverError() }}</div>
            }

            <div class="form-group">
              <label for="title">Session Title *</label>
              <input id="title" formControlName="title" placeholder="e.g. Introduction, Module 1 — Basics" />
              @if (f['title'].invalid && f['title'].touched) {
                <span class="field-error">Session title is required</span>
              }
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="order">Order *</label>
                <input id="order" type="number" formControlName="order" min="1" [placeholder]="nextOrder.toString()" />
                @if (f['order'].invalid && f['order'].touched) {
                  <span class="field-error">Order must be ≥ 1</span>
                }
              </div>
              <div class="form-group">
                <label for="durationMinutes">Duration (min)</label>
                <input id="durationMinutes" type="number" formControlName="durationMinutes" placeholder="e.g. 60" min="1" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="loading()">
                {{ loading() ? 'Adding…' : 'Add Session' }}
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
      width: 100%; max-width: 440px; box-shadow: var(--shadow-lg);
      animation: modal-in .18s ease;
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px 14px; border-bottom: 1px solid var(--color-border);
    }
    .modal-title { font-size: var(--font-size-md); font-weight: 700; }
    .modal-close {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: var(--radius-md); color: var(--color-text-muted);
    }
    .modal-close:hover { background: var(--color-bg); }
    .modal-body { padding: 20px 24px; }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding-top: 16px; margin-top: 4px; border-top: 1px solid var(--color-border);
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class SessionFormComponent implements OnChanges {
  @Input() open = false;
  @Input() courseContentId: number | null = null;
  @Input() nextOrder = 1;

  @Output() added  = new EventEmitter<Session>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(LmsService);

  readonly loading     = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title:           ['', Validators.required],
    order:           [1, [Validators.required, Validators.min(1)]],
    durationMinutes: [null as number | null],
  });

  get f() { return this.form.controls; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.form.reset({ order: this.nextOrder });
      this.serverError.set(null);
    }
    if (changes['nextOrder']) {
      this.form.patchValue({ order: this.nextOrder });
    }
  }

  submit(): void {
    if (this.form.invalid || !this.courseContentId) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    this.svc.addSession({
      courseContentId: this.courseContentId,
      title:           v.title,
      order:           Number(v.order),
      durationMinutes: v.durationMinutes ?? undefined,
    }).subscribe({
      next:  (s) => { this.loading.set(false); this.added.emit(s); },
      error: (e: Error) => {
        const msg = e.message === 'SESSION_ORDER_CONFLICT'
          ? `Order ${v.order} is already taken. Use a different order number.`
          : e.message;
        this.serverError.set(msg);
        this.loading.set(false);
      },
    });
  }
}
