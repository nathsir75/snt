import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal, computed,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LmsService } from './lms.service';
import { ContentItem, ContentItemType, CONTENT_TYPE_LABELS } from './lms.models';

@Component({
  selector: 'snt-content-item-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Add Content Item">

          <div class="modal-header">
            <div>
              <h3 class="modal-title">Add Content Item</h3>
              @if (sessionTitle) {
                <p class="modal-subtitle">{{ sessionTitle }}</p>
              }
            </div>
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

            <div class="type-selector">
              @for (t of contentTypes; track t.value) {
                <label class="type-option" [class.type-option-selected]="f['type'].value === t.value">
                  <input type="radio" formControlName="type" [value]="t.value" />
                  <span class="type-icon">{{ t.icon }}</span>
                  <span class="type-label">{{ t.label }}</span>
                </label>
              }
            </div>

            <div class="form-group">
              <label for="title">Title *</label>
              <input id="title" formControlName="title" [placeholder]="titlePlaceholder()" />
              @if (f['title'].invalid && f['title'].touched) {
                <span class="field-error">Title is required</span>
              }
            </div>

            <div class="form-group">
              <label for="fileUrl">{{ urlLabel() }} *</label>
              <input id="fileUrl" formControlName="fileUrl" [placeholder]="urlPlaceholder()" />
              @if (f['fileUrl'].invalid && f['fileUrl'].touched) {
                <span class="field-error">{{ urlLabel() }} is required</span>
              }
            </div>

            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" formControlName="isPreview" />
                <span>Free preview (visible without enrollment)</span>
              </label>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="loading()">
                {{ loading() ? 'Adding…' : 'Add Item' }}
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
      width: 100%; max-width: 480px; box-shadow: var(--shadow-lg);
      animation: modal-in .18s ease;
    }
    .modal-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 18px 24px 14px; border-bottom: 1px solid var(--color-border);
    }
    .modal-title { font-size: var(--font-size-md); font-weight: 700; }
    .modal-subtitle { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 2px; }
    .modal-close {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: var(--radius-md); color: var(--color-text-muted); flex-shrink: 0;
    }
    .modal-close:hover { background: var(--color-bg); }
    .modal-body { padding: 20px 24px; }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding-top: 16px; margin-top: 4px; border-top: 1px solid var(--color-border);
    }
    .type-selector { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; }
    .type-option {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 10px 6px; border: 2px solid var(--color-border);
      border-radius: var(--radius-md); cursor: pointer; transition: all .12s;
      background: var(--color-bg);
    }
    .type-option input[type=radio] { display: none; }
    .type-option-selected { border-color: var(--color-primary); background: var(--color-primary-light); }
    .type-icon { font-size: 20px; }
    .type-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); text-align: center; }
    .type-option-selected .type-label { color: var(--color-primary); }
    .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: var(--font-size-sm); }
    .toggle-label input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class ContentItemFormComponent implements OnChanges {
  @Input() open = false;
  @Input() sessionId: number | null = null;
  @Input() sessionTitle: string | null = null;

  @Output() added  = new EventEmitter<ContentItem>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(LmsService);

  readonly loading     = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly contentTypes = [
    { value: 'video' as ContentItemType, label: CONTENT_TYPE_LABELS.video, icon: '▶️' },
    { value: 'pdf'   as ContentItemType, label: CONTENT_TYPE_LABELS.pdf,   icon: '📄' },
    { value: 'ppt'   as ContentItemType, label: CONTENT_TYPE_LABELS.ppt,   icon: '📊' },
    { value: 'lab'   as ContentItemType, label: CONTENT_TYPE_LABELS.lab,   icon: '🧪' },
  ];

  readonly form = this.fb.nonNullable.group({
    type:      ['video' as ContentItemType, Validators.required],
    title:     ['', Validators.required],
    fileUrl:   ['', Validators.required],
    isPreview: [false],
  });

  get f() { return this.form.controls; }

  urlLabel(): string {
    const t = this.form.value.type;
    return t === 'video' ? 'YouTube URL' : 'File URL';
  }

  urlPlaceholder(): string {
    const t = this.form.value.type;
    if (t === 'video') return 'https://www.youtube.com/watch?v=…';
    if (t === 'pdf')   return 'https://example.com/document.pdf';
    if (t === 'ppt')   return 'https://example.com/slides.pptx';
    return 'https://example.com/lab-instructions';
  }

  titlePlaceholder(): string {
    const t = this.form.value.type;
    if (t === 'video') return 'e.g. Introduction to HTML';
    if (t === 'pdf')   return 'e.g. Chapter 1 Notes';
    if (t === 'ppt')   return 'e.g. Week 1 Slides';
    return 'e.g. Hands-on Exercise 1';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.form.reset({ type: 'video', isPreview: false });
      this.serverError.set(null);
    }
  }

  submit(): void {
    if (this.form.invalid || !this.sessionId) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    this.svc.addContentItem({
      sessionId: this.sessionId,
      type:      v.type,
      title:     v.title,
      fileUrl:   v.fileUrl,
      isPreview: v.isPreview,
    }).subscribe({
      next:  (item) => { this.loading.set(false); this.added.emit(item); },
      error: (e: Error) => { this.serverError.set(e.message); this.loading.set(false); },
    });
  }
}
