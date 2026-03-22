import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PageService } from './page.service';
import { Page, PageType, PAGE_TYPE_OPTIONS } from './page.models';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'snt-page-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Page">

          <div class="modal-header">
            <h3 class="modal-title">{{ page ? 'Edit Page' : 'New Page' }}</h3>
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
              <label for="title">Page Title *</label>
              <input id="title" formControlName="title" placeholder="e.g. Home Page" (input)="onTitleInput()" />
              @if (f['title'].invalid && f['title'].touched) {
                <span class="field-error">Title is required</span>
              }
            </div>

            <div class="form-group">
              <label for="slug">Slug *</label>
              <input id="slug" formControlName="slug" placeholder="e.g. home" />
              <span class="field-hint">URL-friendly identifier. Must be unique per branch.</span>
              @if (f['slug'].invalid && f['slug'].touched) {
                <span class="field-error">Slug is required</span>
              }
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="pageType">Page Type</label>
                <select id="pageType" formControlName="pageType">
                  @for (opt of pageTypeOptions; track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              </div>
              @if (isSuperAdmin()) {
                <div class="form-group">
                  <label for="branchId">Branch ID *</label>
                  <input id="branchId" type="number" formControlName="branchId" placeholder="Branch ID" />
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="loading()">
                {{ loading() ? 'Saving…' : (page ? 'Update Page' : 'Create Page') }}
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
    .field-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; display: block; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class PageFormComponent implements OnChanges {
  @Input() open = false;
  @Input() page: Page | null = null;

  @Output() saved  = new EventEmitter<Page>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb   = inject(FormBuilder);
  private readonly svc  = inject(PageService);
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin  = this.auth.isSuperAdmin;
  readonly loading       = signal(false);
  readonly serverError   = signal<string | null>(null);
  readonly pageTypeOptions = PAGE_TYPE_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    title:    ['', Validators.required],
    slug:     ['', Validators.required],
    pageType: ['custom' as PageType],
    branchId: [this.auth.branchId() ?? 0],
  });

  get f() { return this.form.controls; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['page'] && this.page) {
      this.form.patchValue({
        title:    this.page.title,
        slug:     this.page.slug,
        pageType: this.page.pageType,
        branchId: this.page.branchId,
      });
    }
    if (changes['open'] && this.open && !this.page) {
      this.form.reset({ pageType: 'custom', branchId: this.auth.branchId() ?? 0 });
      this.serverError.set(null);
    }
  }

  onTitleInput(): void {
    if (!this.page) {
      const slug = this.form.value.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ?? '';
      this.form.patchValue({ slug });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    const call$ = this.page
      ? this.svc.update(this.page.id, { title: v.title, slug: v.slug, pageType: v.pageType })
      : this.svc.create({
          title:    v.title,
          slug:     v.slug,
          pageType: v.pageType,
          branchId: Number(v.branchId),
        });

    call$.subscribe({
      next:  (p) => { this.loading.set(false); this.saved.emit(p); },
      error: (e: Error) => { this.serverError.set(e.message); this.loading.set(false); },
    });
  }
}
