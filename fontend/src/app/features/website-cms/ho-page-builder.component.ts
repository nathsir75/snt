import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HoPageService, HoPage, CreateHoPagePayload, HO_PAGE_TYPE_OPTIONS } from './ho-page.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-ho-page-builder',
  standalone: true,
  imports: [RouterLink, DatePipe, ReactiveFormsModule, PageShellComponent, PageStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="HO Page Builder"
      subtitle="Create and manage Head Office website pages"
      icon="🏗️"
    >
      <ng-container slot="actions">
        <button class="btn btn-primary" (click)="formOpen.set(true)">+ New Page</button>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!pages().length) {
            <snt-page-state
              type="empty"
              title="No HO pages yet"
              description="Create your first Head Office website page."
              actionLabel="+ New Page"
              (action)="formOpen.set(true)"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Slug</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of pages(); track p.id) {
                    <tr>
                      <td class="font-medium">{{ p.title }}</td>
                      <td><span class="slug-pill">/{{ p.slug }}</span></td>
                      <td class="text-muted">{{ p.pageType }}</td>
                      <td>
                        <snt-badge [label]="p.isPublished ? 'Published' : 'Draft'" [variant]="p.isPublished ? 'success' : 'warning'" />
                      </td>
                      <td class="text-muted">{{ p.updatedAt | date:'dd MMM yyyy' }}</td>
                      <td>
                        <div class="row-actions">
                          <a [routerLink]="['/ho/page-builder', p.id]" class="btn btn-ghost btn-sm">Edit →</a>
                          <a [href]="'/ho-site/' + p.slug + (p.isPublished ? '' : '?preview=1')" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Preview ↗</a>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </snt-page-shell>

    <!-- New Page Modal -->
    @if (formOpen()) {
      <div class="modal-backdrop" (click)="formOpen.set(false)">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog">
          <div class="modal-header">
            <h3 class="modal-title">New HO Page</h3>
            <button class="modal-close" (click)="formOpen.set(false)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="createPage()" class="modal-body">
            @if (createError()) {
              <div class="form-error-banner">{{ createError() }}</div>
            }
            <div class="form-group">
              <label for="title">Page Title *</label>
              <input id="title" formControlName="title" placeholder="e.g. About Us" (input)="onTitleInput()" />
            </div>
            <div class="form-group">
              <label for="slug">Slug *</label>
              <input id="slug" formControlName="slug" placeholder="e.g. about" />
              <span class="field-hint">Used in URL: snteducation.com/<strong>{{ form.value.slug || 'slug' }}</strong></span>
            </div>
            <div class="form-group">
              <label for="pageType">Page Type</label>
              <select id="pageType" formControlName="pageType">
                @for (opt of pageTypeOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="formOpen.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="creating()">
                {{ creating() ? 'Creating…' : 'Create Page' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .slug-pill {
      font-family: monospace; font-size: var(--font-size-xs); font-weight: 600;
      background: var(--color-bg); border: 1px solid var(--color-border);
      padding: 2px 8px; border-radius: var(--radius-md); color: var(--color-text-muted);
    }
    .row-actions { display: flex; gap: 4px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .text-muted { color: var(--color-text-muted); }
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 300; padding: 16px;
    }
    .modal {
      background: var(--color-surface); border-radius: var(--radius-lg);
      width: 100%; max-width: 460px; box-shadow: var(--shadow-lg);
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
    .field-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; display: block; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class HoPageBuilderComponent implements OnInit {
  private readonly svc        = inject(HoPageService);
  private readonly fb         = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly state       = signal<LoadState>('loading');
  readonly errorMsg    = signal<string | null>(null);
  readonly pages       = this.svc.pages$;  // shared cache — nav editor writes here too
  readonly formOpen    = signal(false);
  readonly creating    = signal(false);
  readonly createError = signal<string | null>(null);

  readonly pageTypeOptions = HO_PAGE_TYPE_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    title:    ['', Validators.required],
    slug:     ['', Validators.required],
    pageType: ['custom'],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    console.log('[HoPageBuilder] load() — calling GET /site-pages');
    this.svc.loadPages()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  () => {
          console.log('[HoPageBuilder] load() — ready, pages in cache:', this.svc.pages$().length);
          this.state.set('ready');
        },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  onTitleInput(): void {
    const slug = (this.form.value.title ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.form.patchValue({ slug });
  }

  createPage(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.creating.set(true);
    this.createError.set(null);
    const v = this.form.getRawValue();
    const payload: CreateHoPagePayload = { title: v.title, slug: v.slug, pageType: v.pageType };
    this.svc.create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.svc.addToCache(p);
          this.formOpen.set(false);
          this.form.reset({ pageType: 'custom' });
          this.creating.set(false);
        },
        error: (e: Error) => {
          this.createError.set(e.message.includes('409') || e.message.includes('Slug') ? 'Slug already exists. Choose a different slug.' : e.message);
          this.creating.set(false);
        },
      });
  }
}
