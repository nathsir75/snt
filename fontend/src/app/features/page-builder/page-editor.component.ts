import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageService } from './page.service';
import { PageWithSections, PageSection, SECTION_TYPE_LABELS, SECTION_TYPE_ICONS } from './page.models';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { SectionEditorComponent } from './section-editor.component';
import { AuthService } from '../../core/auth/auth.service';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-page-editor',
  standalone: true,
  imports: [RouterLink, PageStateComponent, BadgeComponent, SectionEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') { <snt-page-state type="loading" /> }
      @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
      @case ('ready') {
        @if (page(); as p) {
          <div class="editor-layout">

            <div class="editor-header">
              <a [routerLink]="backLink" class="back-link">
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
                  <span class="text-muted text-xs">{{ p.branch.name }}</span>
                </div>
              </div>
              <div class="page-info-right">
                <a [href]="previewUrl(p)" target="_blank" rel="noopener" class="btn btn-secondary">👁 Preview</a>
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

            <!-- Sections -->
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
                      <div class="section-drag-handle">⠿</div>
                      <div class="section-order-badge">{{ s.order }}</div>
                      <div class="section-type-icon">{{ sectionIcon(s.sectionType) }}</div>
                      <div class="section-info">
                        <span class="section-type-label">{{ sectionLabel(s.sectionType) }}</span>
                        @if (s.title) {
                          <span class="section-title-text">{{ s.title }}</span>
                        }
                      </div>
                      @if (!s.isVisible) {
                        <span class="hidden-badge">Hidden</span>
                      }
                      <div class="section-actions">
                        <button class="btn btn-ghost btn-xs" (click)="moveUp(s)" [disabled]="s.order === 1" title="Move up">↑</button>
                        <button class="btn btn-ghost btn-xs" (click)="moveDown(s)" [disabled]="s.order === maxOrder()" title="Move down">↓</button>
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

    <snt-section-editor
      [open]="sectionEditorOpen()"
      [pageId]="page()?.id ?? null"
      [section]="editingSection()"
      [nextOrder]="nextSectionOrder()"
      (saved)="onSectionSaved($event)"
      (cancel)="sectionEditorOpen.set(false)"
    />
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
    .slug-pill {
      font-family: monospace; font-size: var(--font-size-xs); font-weight: 600;
      background: var(--color-bg); border: 1px solid var(--color-border);
      padding: 2px 8px; border-radius: var(--radius-md); color: var(--color-text-muted);
    }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
    .sections-area { display: flex; flex-direction: column; gap: 12px; }
    .sections-header { display: flex; align-items: center; justify-content: space-between; }
    .sections-title { font-size: var(--font-size-md); font-weight: 700; }
    .section-count { font-size: var(--font-size-sm); color: var(--color-text-muted); font-weight: 400; }
    .sections-list { display: flex; flex-direction: column; gap: 6px; }
    .section-row {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      transition: box-shadow .12s;
    }
    .section-row:hover { box-shadow: var(--shadow-sm); }
    .section-row-hidden { opacity: .6; border-style: dashed; }
    .section-drag-handle { color: var(--color-text-muted); cursor: grab; font-size: 16px; flex-shrink: 0; }
    .section-order-badge {
      width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
      background: var(--color-bg); border: 1px solid var(--color-border);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: var(--color-text-muted);
    }
    .section-type-icon { font-size: 18px; flex-shrink: 0; }
    .section-info { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
    .section-type-label { font-size: var(--font-size-sm); font-weight: 600; }
    .section-title-text { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .hidden-badge {
      font-size: var(--font-size-xs); font-weight: 600; color: #92400e;
      background: #fef3c7; border: 1px solid #fcd34d;
      padding: 2px 6px; border-radius: 999px;
    }
    .section-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .btn-xs { padding: 3px 8px; font-size: var(--font-size-xs); }
    .btn-danger { color: #dc2626; }
    .btn-danger:hover { background: #fee2e2; }
  `],
})
export class PageEditorComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly svc        = inject(PageService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // Back link depends on role
  get backLink(): string {
    const role = this.auth.role();
    if (role === 'branch_admin' || role === 'counselor') return '/branch/page-builder';
    return '/ho/page-builder';
  }

  readonly state          = signal<LoadState>('loading');
  readonly errorMsg       = signal<string | null>(null);
  readonly page           = signal<PageWithSections | null>(null);
  readonly sections       = signal<PageSection[]>([]);
  readonly publishing     = signal(false);
  readonly sectionEditorOpen = signal(false);
  readonly editingSection    = signal<PageSection | null>(null);

  readonly nextSectionOrder = computed(() => {
    const orders = this.sections().map((s) => s.order);
    return orders.length ? Math.max(...orders) + 1 : 1;
  });

  readonly maxOrder = computed(() => {
    const orders = this.sections().map((s) => s.order);
    return orders.length ? Math.max(...orders) : 0;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => this.load(Number(p.get('id'))));
  }

  load(id = Number(this.route.snapshot.paramMap.get('id'))): void {
    this.state.set('loading');
    this.svc.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.page.set(p);
          this.sections.set([...p.sections].sort((a, b) => a.order - b.order));
          this.state.set('ready');
        },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  previewUrl(p: PageWithSections): string {
    return `/b/${p.branch.code}/${p.slug}`;
  }

  togglePublish(p: PageWithSections): void {
    this.publishing.set(true);
    this.svc.update(p.id, { isPublished: !p.isPublished })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.page.update((cur) => cur ? { ...cur, ...updated } : cur);
          this.publishing.set(false);
        },
        error: () => { this.publishing.set(false); },
      });
  }

  openAddSection(): void { this.editingSection.set(null); this.sectionEditorOpen.set(true); }
  openEditSection(s: PageSection): void { this.editingSection.set(s); this.sectionEditorOpen.set(true); }

  onSectionSaved(s: PageSection): void {
    this.sectionEditorOpen.set(false);
    const idx = this.sections().findIndex((x) => x.id === s.id);
    if (idx >= 0) {
      this.sections.update((list) => list.map((x) => x.id === s.id ? s : x).sort((a, b) => a.order - b.order));
    } else {
      this.sections.update((list) => [...list, s].sort((a, b) => a.order - b.order));
    }
  }

  deleteSection(s: PageSection): void {
    if (!confirm(`Delete "${s.title ?? SECTION_TYPE_LABELS[s.sectionType]}" section?`)) return;
    this.svc.deleteSection(s.id).subscribe({
      next: () => this.sections.update((list) => list.filter((x) => x.id !== s.id)),
      error: () => {},
    });
  }

  moveUp(s: PageSection): void {
    const sorted = this.sections();
    const idx = sorted.findIndex((x) => x.id === s.id);
    if (idx <= 0) return;
    const prev = sorted[idx - 1];
    this.swapOrders(s, prev);
  }

  moveDown(s: PageSection): void {
    const sorted = this.sections();
    const idx = sorted.findIndex((x) => x.id === s.id);
    if (idx >= sorted.length - 1) return;
    const next = sorted[idx + 1];
    this.swapOrders(s, next);
  }

  private swapOrders(a: PageSection, b: PageSection): void {
    const aOrder = a.order;
    const bOrder = b.order;
    // Use a temp order to avoid conflict
    const tempOrder = Math.max(...this.sections().map((s) => s.order)) + 100;

    this.svc.updateSection(a.id, { order: tempOrder }).subscribe({
      next: () => {
        this.svc.updateSection(b.id, { order: aOrder }).subscribe({
          next: () => {
            this.svc.updateSection(a.id, { order: bOrder }).subscribe({
              next: (updatedA) => {
                this.sections.update((list) =>
                  list.map((s) => {
                    if (s.id === a.id) return { ...s, order: bOrder };
                    if (s.id === b.id) return { ...s, order: aOrder };
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

  sectionLabel(t: string): string { return SECTION_TYPE_LABELS[t as keyof typeof SECTION_TYPE_LABELS] ?? t; }
  sectionIcon(t: string): string  { return SECTION_TYPE_ICONS[t as keyof typeof SECTION_TYPE_ICONS] ?? '📄'; }
}
