import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  HoPageService, HoPage, HoPageSection,
  HO_SECTION_TYPE_LABELS, HO_SECTION_TYPE_ICONS, HoSectionType,
  AddHoSectionPayload, UpdateHoSectionPayload,
} from './ho-page.service';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

type LoadState = 'loading' | 'error' | 'ready';

const SECTION_TYPES: HoSectionType[] = [
  'hero', 'text', 'gallery', 'cta', 'banner', 'stats', 'features', 'testimonials', 'contact', 'collection',
];

@Component({
  selector: 'snt-ho-page-editor',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, PageStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') { <snt-page-state type="loading" /> }
      @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
      @case ('ready') {
        @if (page(); as p) {
          <div class="editor-layout">

            <div class="editor-header">
              <a routerLink="/ho/page-builder" class="back-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                Pages
              </a>
            </div>

            <div class="card page-info-card">
              <div class="page-info-left">
                <h1 class="page-title">{{ p.title }}</h1>
                <div class="page-meta">
                  <span class="slug-pill">/{{ p.slug }}</span>
                  <snt-badge [label]="p.isPublished ? 'Published' : 'Draft'" [variant]="p.isPublished ? 'success' : 'warning'" />
                  <span class="text-muted text-xs">{{ p.pageType }}</span>
                </div>
              </div>
              <div class="page-info-right">
                <a [href]="'/ho-page/' + p.slug" target="_blank" rel="noopener" class="btn btn-secondary">👁 Preview</a>
                <button
                  class="btn"
                  [class.btn-primary]="!p.isPublished"
                  [class.btn-secondary]="p.isPublished"
                  [disabled]="publishing()"
                  (click)="togglePublish(p)"
                >
                  {{ publishing() ? '…' : (p.isPublished ? '⬇️ Unpublish' : '🚀 Publish') }}
                </button>
              </div>
            </div>

            <div class="sections-area">
              <div class="sections-header">
                <h2 class="sections-title">Sections <span class="section-count">({{ sections().length }})</span></h2>
                <button class="btn btn-primary btn-sm" (click)="openAddSection()">+ Add Section</button>
              </div>

              @if (!sections().length) {
                <snt-page-state type="empty" [compact]="true" title="No sections yet" description="Add a section to start building this page." />
              } @else {
                <div class="sections-list">
                  @for (s of sections(); track s.id) {
                    <div class="section-row" [class.section-row-hidden]="!s.isVisible">
                      <div class="section-order-badge">{{ s.order }}</div>
                      <div class="section-type-icon">{{ sectionIcon(s.sectionType) }}</div>
                      <div class="section-info">
                        <span class="section-type-label">{{ sectionLabel(s.sectionType) }}</span>
                        @if (s.title) { <span class="section-title-text">{{ s.title }}</span> }
                      </div>
                      @if (!s.isVisible) { <span class="hidden-badge">Hidden</span> }
                      <div class="section-actions">
                        <button class="btn btn-ghost btn-xs" (click)="moveUp(s)" [disabled]="s.order === 1">↑</button>
                        <button class="btn btn-ghost btn-xs" (click)="moveDown(s)" [disabled]="s.order === maxOrder()">↓</button>
                        <button class="btn btn-ghost btn-xs" (click)="openEditSection(s)">Edit</button>
                        <button class="btn btn-ghost btn-xs btn-danger" (click)="deleteSection(s)">Delete</button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

          </div>
        }
      }
    }

    <!-- Section Editor Modal -->
    @if (sectionEditorOpen()) {
      <div class="modal-backdrop" (click)="sectionEditorOpen.set(false)">
        <div class="modal modal-wide" (click)="$event.stopPropagation()" role="dialog">
          <div class="modal-header">
            <h3 class="modal-title">{{ editingSection() ? 'Edit Section' : 'Add Section' }}</h3>
            <button class="modal-close" (click)="sectionEditorOpen.set(false)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            @if (sectionError()) { <div class="form-error-banner">{{ sectionError() }}</div> }

            @if (!editingSection()) {
              <div class="type-grid">
                @for (t of sectionTypes; track t) {
                  <button type="button" class="type-option" [class.type-option-selected]="selectedType() === t" (click)="selectedType.set(t)">
                    <span class="type-opt-icon">{{ sectionIcon(t) }}</span>
                    <span class="type-opt-label">{{ sectionLabel(t) }}</span>
                  </button>
                }
              </div>
            }

            <form [formGroup]="sectionForm">
              <div class="form-row">
                <div class="form-group">
                  <label>Section Title (internal)</label>
                  <input formControlName="title" placeholder="e.g. Main Hero" />
                </div>
                <div class="form-group">
                  <label>Order *</label>
                  <input type="number" formControlName="order" min="1" />
                </div>
              </div>
              <div class="form-group">
                <label>Content / Config (JSON or text)</label>
                <textarea formControlName="content" rows="5" placeholder='{ "heading": "Welcome" }'></textarea>
                <span class="field-hint">Enter section content as JSON or plain text stored in configJson.</span>
              </div>
              <div class="form-group">
                <label class="toggle-label">
                  <input type="checkbox" formControlName="isVisible" />
                  <span>Visible on page</span>
                </label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="sectionEditorOpen.set(false)">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="savingSection() || (!editingSection() && !selectedType())" (click)="saveSection()">
              {{ savingSection() ? 'Saving…' : (editingSection() ? 'Update Section' : 'Add Section') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .editor-layout { display: flex; flex-direction: column; gap: 20px; }
    .editor-header { margin-bottom: -4px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .back-link:hover { color: var(--color-primary); }
    .page-info-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .page-info-left { display: flex; flex-direction: column; gap: 8px; }
    .page-info-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .page-title { font-size: var(--font-size-xl); font-weight: 700; }
    .page-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .slug-pill { font-family: monospace; font-size: var(--font-size-xs); font-weight: 600; background: var(--color-bg); border: 1px solid var(--color-border); padding: 2px 8px; border-radius: var(--radius-md); color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .sections-area { display: flex; flex-direction: column; gap: 12px; }
    .sections-header { display: flex; align-items: center; justify-content: space-between; }
    .sections-title { font-size: var(--font-size-md); font-weight: 700; }
    .section-count { font-size: var(--font-size-sm); color: var(--color-text-muted); font-weight: 400; }
    .sections-list { display: flex; flex-direction: column; gap: 6px; }
    .section-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .section-row-hidden { opacity: .6; border-style: dashed; }
    .section-order-badge { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; background: var(--color-bg); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--color-text-muted); }
    .section-type-icon { font-size: 18px; flex-shrink: 0; }
    .section-info { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
    .section-type-label { font-size: var(--font-size-sm); font-weight: 600; }
    .section-title-text { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .hidden-badge { font-size: var(--font-size-xs); font-weight: 600; color: #92400e; background: #fef3c7; border: 1px solid #fcd34d; padding: 2px 6px; border-radius: 999px; }
    .section-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .btn-xs { padding: 3px 8px; font-size: var(--font-size-xs); }
    .btn-danger { color: #dc2626; }
    .btn-danger:hover { background: #fee2e2; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; }
    .modal { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-width: 560px; max-height: 90vh; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; animation: modal-in .18s ease; }
    .modal-wide { max-width: 640px; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px 14px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
    .modal-title { font-size: var(--font-size-md); font-weight: 700; }
    .modal-close { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius-md); color: var(--color-text-muted); }
    .modal-close:hover { background: var(--color-bg); }
    .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 24px; border-top: 1px solid var(--color-border); flex-shrink: 0; }
    .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
    .type-option { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; border: 2px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; background: var(--color-bg); }
    .type-option:hover { border-color: var(--color-primary); }
    .type-option-selected { border-color: var(--color-primary); background: var(--color-primary-light); }
    .type-opt-icon { font-size: 20px; }
    .type-opt-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); text-align: center; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: var(--font-size-sm); }
    .field-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; display: block; }
    .form-error-banner { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--font-size-sm); margin-bottom: 16px; }
    textarea { resize: vertical; min-height: 80px; }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class HoPageEditorComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly svc        = inject(HoPageService);
  private readonly fb         = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly state             = signal<LoadState>('loading');
  readonly errorMsg          = signal<string | null>(null);
  readonly page              = signal<HoPage | null>(null);
  readonly sections          = signal<HoPageSection[]>([]);
  readonly publishing        = signal(false);
  readonly sectionEditorOpen = signal(false);
  readonly editingSection    = signal<HoPageSection | null>(null);
  readonly selectedType      = signal<HoSectionType | null>(null);
  readonly savingSection     = signal(false);
  readonly sectionError      = signal<string | null>(null);

  readonly sectionTypes = SECTION_TYPES;

  readonly maxOrder = computed(() => {
    const orders = this.sections().map((s) => s.order);
    return orders.length ? Math.max(...orders) : 0;
  });

  readonly nextOrder = computed(() => this.maxOrder() + 1);

  readonly sectionForm = this.fb.nonNullable.group({
    title:     [''],
    order:     [1, [Validators.required, Validators.min(1)]],
    content:   [''],
    isVisible: [true],
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => this.load(Number(p.get('id'))));
  }

  load(id = Number(this.route.snapshot.paramMap.get('id'))): void {
    console.log('[HoPageEditor] loading pageId:', id);
    this.state.set('loading');
    this.svc.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          console.log('[HoPageEditor] response:', p);
          this.page.set(p);
          this.sections.set([...p.sections].sort((a, b) => a.order - b.order));
          this.state.set('ready');
        },
        error: (e: Error) => {
          console.error('[HoPageEditor] error:', e.message);
          this.errorMsg.set(e.message);
          this.state.set('error');
        },
      });
  }

  togglePublish(p: HoPage): void {
    this.publishing.set(true);
    this.svc.update(p.id, { isPublished: !p.isPublished })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => { this.page.update((cur) => cur ? { ...cur, ...updated } : cur); this.publishing.set(false); },
        error: () => { this.publishing.set(false); },
      });
  }

  openAddSection(): void {
    this.editingSection.set(null);
    this.selectedType.set(null);
    this.sectionForm.reset({ order: this.nextOrder(), isVisible: true });
    this.sectionError.set(null);
    this.sectionEditorOpen.set(true);
  }

  openEditSection(s: HoPageSection): void {
    this.editingSection.set(s);
    this.selectedType.set(s.sectionType);
    this.sectionForm.patchValue({
      title:     s.title ?? '',
      order:     s.order,
      content:   JSON.stringify(s.configJson, null, 2),
      isVisible: s.isVisible,
    });
    this.sectionError.set(null);
    this.sectionEditorOpen.set(true);
  }

  saveSection(): void {
    const pageId = this.page()?.id;
    if (!pageId) return;
    const editing = this.editingSection();
    if (!editing && !this.selectedType()) return;
    if (this.sectionForm.invalid) { this.sectionForm.markAllAsTouched(); return; }

    this.savingSection.set(true);
    this.sectionError.set(null);

    const v = this.sectionForm.getRawValue();
    let configJson: Record<string, unknown> = {};
    try {
      configJson = v.content.trim() ? JSON.parse(v.content) : {};
    } catch {
      configJson = { content: v.content };
    }

    if (editing) {
      const payload: UpdateHoSectionPayload = {
        title:      v.title || undefined,
        order:      Number(v.order),
        configJson,
        isVisible:  v.isVisible,
      };
      this.svc.updateSection(pageId, editing.id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (s) => { this.onSectionSaved(s); },
          error: (e: Error) => { this.sectionError.set(e.message); this.savingSection.set(false); },
        });
    } else {
      const payload: AddHoSectionPayload = {
        sectionType: this.selectedType()!,
        title:       v.title || undefined,
        order:       Number(v.order),
        configJson,
        isVisible:   v.isVisible,
      };
      this.svc.addSection(pageId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (s) => { this.onSectionSaved(s); },
          error: (e: Error) => { this.sectionError.set(e.message); this.savingSection.set(false); },
        });
    }
  }

  private onSectionSaved(s: HoPageSection): void {
    this.savingSection.set(false);
    this.sectionEditorOpen.set(false);
    const idx = this.sections().findIndex((x) => x.id === s.id);
    if (idx >= 0) {
      this.sections.update((list) => list.map((x) => x.id === s.id ? s : x).sort((a, b) => a.order - b.order));
    } else {
      this.sections.update((list) => [...list, s].sort((a, b) => a.order - b.order));
    }
  }

  deleteSection(s: HoPageSection): void {
    const pageId = this.page()?.id;
    if (!pageId) return;
    if (!confirm(`Delete "${s.title ?? this.sectionLabel(s.sectionType)}" section?`)) return;
    this.svc.deleteSection(pageId, s.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.sections.update((list) => list.filter((x) => x.id !== s.id)),
        error: () => {},
      });
  }

  moveUp(s: HoPageSection): void {
    const idx = this.sections().findIndex((x) => x.id === s.id);
    if (idx <= 0) return;
    this.swapOrders(s, this.sections()[idx - 1]);
  }

  moveDown(s: HoPageSection): void {
    const sorted = this.sections();
    const idx = sorted.findIndex((x) => x.id === s.id);
    if (idx >= sorted.length - 1) return;
    this.swapOrders(s, sorted[idx + 1]);
  }

  private swapOrders(a: HoPageSection, b: HoPageSection): void {
    const pageId = this.page()?.id;
    if (!pageId) return;
    const tempOrder = this.maxOrder() + 100;
    this.svc.updateSection(pageId, a.id, { order: tempOrder }).subscribe({
      next: () => {
        this.svc.updateSection(pageId, b.id, { order: a.order }).subscribe({
          next: () => {
            this.svc.updateSection(pageId, a.id, { order: b.order }).subscribe({
              next: () => {
                this.sections.update((list) =>
                  list.map((s) => {
                    if (s.id === a.id) return { ...s, order: b.order };
                    if (s.id === b.id) return { ...s, order: a.order };
                    return s;
                  }).sort((x, y) => x.order - y.order)
                );
              },
              error: () => {},
            });
          },
          error: () => {},
        });
      },
      error: () => {},
    });
  }

  sectionLabel(t: string): string { return HO_SECTION_TYPE_LABELS[t as HoSectionType] ?? t; }
  sectionIcon(t: string): string  { return HO_SECTION_TYPE_ICONS[t as HoSectionType] ?? '📄'; }
}
