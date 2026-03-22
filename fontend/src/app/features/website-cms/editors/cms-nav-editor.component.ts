import {
  Component, inject, signal, output, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { WebsiteCmsService } from '../website-cms.service';
import { HoPageService, HoPage } from '../ho-page.service';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from './cms-shared.component';

interface NavItem { label: string; path: string; order: number; visible: boolean; linkedPageId?: number | null; }
interface PendingNavItem { label: string; creating: boolean; error: string | null; }
interface RowCreating { index: number; error: string | null; }

const DEFAULT_NAV: NavItem[] = [
  { label: 'Home',                 path: '/home',                 order: 1,  visible: true },
  { label: 'About Us',             path: '/about',                order: 2,  visible: true },
  { label: 'Courses',              path: '/courses',              order: 3,  visible: true },
  { label: 'Placements',           path: '/placements',           order: 4,  visible: true },
  { label: 'Careers',              path: '/careers',              order: 5,  visible: true },
  { label: 'Internships',          path: '/internships',          order: 6,  visible: true },
  { label: 'Corporate Training',   path: '/corporate-training',   order: 7,  visible: true },
  { label: 'College Partnerships', path: '/college-partnerships', order: 8,  visible: true },
  { label: 'Hire Talent',          path: '/hire-talent',          order: 9,  visible: true },
  { label: 'Franchise',            path: '/franchise-model',      order: 10, visible: true },
  { label: 'Branch Locations',     path: '/branch-locations',     order: 11, visible: true },
  { label: 'Contact',              path: '/contact',              order: 12, visible: true },
  { label: 'Become a Partner',     path: '/become-a-partner',     order: 13, visible: true, linkedPageId: null },
];

@Component({
  selector: 'snt-cms-nav-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">
      <snt-cms-section title="Main Navigation Items" icon="🧭" badge="Public website header">
        <p style="font-size:12px;color:#6b7280;margin-bottom:16px">
          Manage the main navigation menu. Toggle visibility, edit labels, and reorder items.
          Changes reflect on the public website header immediately after saving.
        </p>

        @for (item of items(); track $index) {
          <div class="nav-item-row">
            <div class="nav-drag-handle">⠿</div>
            <div class="cms-toggle-inline">
              <input type="checkbox" class="cms-toggle" [(ngModel)]="item.visible" [id]="'nav-vis-' + $index" />
            </div>
            <input class="cms-input nav-label-input" [(ngModel)]="item.label" placeholder="Label" />
            <input class="cms-input nav-path-input" [(ngModel)]="item.path" placeholder="/path" />
            <select class="cms-input nav-page-select" [value]="item.linkedPageId ?? ''" (change)="linkPage($index, $any($event.target).value)">
              <option value="">— no page link —</option>
              @for (p of pages(); track p.id) {
                <option [value]="p.id">{{ p.title }} (/{{ p.slug }})</option>
              }
            </select>

            @if (item.linkedPageId) {
              <button class="nav-action-btn nav-action-edit" (click)="editPage(item.linkedPageId!)" title="Edit linked page">
                ✎ Edit Page
              </button>
            } @else {
              <button
                class="nav-action-btn nav-action-create"
                [disabled]="creatingFor()?.index === $index"
                (click)="createPageForItem($index)"
                title="Create a page for this nav item">
                {{ creatingFor()?.index === $index ? '…' : '＋ Create Page' }}
              </button>
              @if (creatingFor()?.index === $index && creatingFor()?.error) {
                <span class="nav-row-error">{{ creatingFor()!.error }}</span>
              }
            }

            <button class="cms-remove-btn" (click)="removeItem($index)">✕</button>
          </div>
        }

        @if (pending()) {
          <div class="nav-add-form">
            <input
              class="cms-input nav-label-input"
              [(ngModel)]="pending()!.label"
              placeholder="Page label e.g. Blog"
              [disabled]="pending()!.creating"
              (keydown.enter)="confirmAdd()"
              (keydown.escape)="cancelAdd()"
              autofocus />
            <span class="nav-slug-preview">/{{ toSlug(pending()!.label) || '…' }}</span>
            @if (pending()!.error) {
              <span class="nav-add-error">{{ pending()!.error }}</span>
            }
            <button class="cms-add-btn" (click)="confirmAdd()" [disabled]="pending()!.creating || !pending()!.label.trim()">
              {{ pending()!.creating ? 'Creating…' : '✓ Confirm' }}
            </button>
            <button class="cms-remove-btn" (click)="cancelAdd()" [disabled]="pending()!.creating">✕</button>
          </div>
        } @else {
          <button class="cms-add-btn" style="margin-top:8px" (click)="startAdd()">+ Add Nav Item</button>
        }

        <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb">
          <p style="font-size:12px;color:#6b7280;margin-bottom:8px">Quick restore defaults:</p>
          <button class="cms-add-btn" (click)="restoreDefaults()">↺ Restore Default Navigation</button>
        </div>
      </snt-cms-section>

      <snt-cms-save-bar note="Saves navigation to database — public site header updates immediately." (saved)="save()" (cancelled)="reset()" />
    </div>
  `,
  styles: [CMS_INPUT_STYLES + `
    .cms-editor { max-width: 900px; }
    .nav-item-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .nav-drag-handle { color: #9ca3af; cursor: grab; font-size: 16px; flex-shrink: 0; }
    .cms-toggle-inline { flex-shrink: 0; }
    .nav-label-input { max-width: 160px; }
    .nav-path-input { max-width: 140px; }
    .nav-page-select { flex: 1; min-width: 0; }
    .nav-action-btn {
      flex-shrink: 0; padding: 4px 10px; border-radius: 6px;
      font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;
      display: inline-flex; align-items: center; transition: opacity .15s;
    }
    .nav-action-btn:disabled { opacity: .5; cursor: not-allowed; }
    .nav-action-create { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .nav-action-create:hover:not(:disabled) { background: #fde68a; }
    .nav-action-edit { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    .nav-action-edit:hover { background: #a7f3d0; }
    .nav-row-error { font-size: 11px; color: #ef4444; white-space: nowrap; flex-shrink: 0; }
    .nav-add-form { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .nav-slug-preview { font-size: 12px; color: #6b7280; white-space: nowrap; }
    .nav-add-error { font-size: 12px; color: #ef4444; }
  `],
})
export class CmsNavEditorComponent implements OnInit {
  private readonly cms     = inject(WebsiteCmsService);
  private readonly hoPages = inject(HoPageService);
  private readonly router  = inject(Router);
  readonly saved = output<void>();

  readonly items       = signal<NavItem[]>([]);
  readonly pages       = this.hoPages.pages$;  // shared cache with page builder
  readonly pending     = signal<PendingNavItem | null>(null);
  readonly creatingFor = signal<RowCreating | null>(null);

  ngOnInit(): void {
    const stored = this.cms.global().navItems;
    this.items.set(stored?.length ? structuredClone(stored) : structuredClone(DEFAULT_NAV));
    if (!this.hoPages.pages$().length) {
      console.log('[CmsNavEditor] pages$ empty — fetching from API');
      this.hoPages.loadPages().subscribe({ error: () => {} });
    } else {
      console.log('[CmsNavEditor] pages$ already populated —', this.hoPages.pages$().length, 'pages in cache');
    }
  }

  toSlug(label: string): string {
    return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // ── Per-row: create page for an existing unlinked nav item ────────────────

  createPageForItem(index: number): void {
    const item = this.items()[index];
    if (!item || this.creatingFor()?.index === index) return;

    const label = item.label.trim() || 'Untitled';
    const slug  = this.toSlug(label) || 'page-' + Date.now();
    const path  = '/' + slug;

    const existing = this.pages().find(pg => pg.slug === slug);
    const page$    = existing
      ? of(existing)
      : this.hoPages.create({ title: label, slug, pageType: 'custom', status: 'draft' });

    this.creatingFor.set({ index, error: null });

    page$.subscribe({
      next: (page) => {
        if (!existing) this.hoPages.addToCache(page);
        this.items.update(arr => arr.map((it, i) =>
          i === index ? { ...it, linkedPageId: page.id, path } : it
        ));
        this.creatingFor.set(null);
      },
      error: (err) => {
        this.creatingFor.set({ index, error: err?.error?.message ?? 'Failed to create page' });
      },
    });
  }

  editPage(pageId: number): void {
    this.router.navigate(['/ho/page-builder', pageId]);
  }

  // ── Add new nav item flow ─────────────────────────────────────────────────

  startAdd(): void {
    this.pending.set({ label: '', creating: false, error: null });
  }

  cancelAdd(): void {
    this.pending.set(null);
  }

  confirmAdd(): void {
    const p = this.pending();
    if (!p || !p.label.trim() || p.creating) return;

    const label = p.label.trim();
    const slug  = this.toSlug(label);
    const path  = '/' + slug;

    const existing = this.pages().find(pg => pg.slug === slug);
    const page$    = existing
      ? of(existing)
      : this.hoPages.create({ title: label, slug, pageType: 'custom', status: 'draft' });

    this.pending.set({ ...p, creating: true, error: null });

    page$.subscribe({
      next: (page) => {
        if (!existing) this.hoPages.addToCache(page);
        this.items.update(arr => [
          ...arr,
          { label, path, order: arr.length + 1, visible: true, linkedPageId: page.id },
        ]);
        this.pending.set(null);
      },
      error: (err) => {
        this.pending.set({ label, creating: false, error: err?.error?.message ?? 'Failed to create page' });
      },
    });
  }

  // ── Manual page picker ────────────────────────────────────────────────────

  linkPage(index: number, pageId: string): void {
    const id   = pageId ? +pageId : null;
    const page = id ? this.pages().find(p => p.id === id) : null;
    this.items.update(arr => arr.map((item, i) =>
      i === index
        ? { ...item, linkedPageId: id, path: page ? '/' + page.slug : item.path }
        : item
    ));
  }

  // ── List management ───────────────────────────────────────────────────────

  removeItem(i: number): void {
    this.items.update(arr => arr.filter((_, idx) => idx !== i));
  }

  restoreDefaults(): void {
    this.items.set(structuredClone(DEFAULT_NAV));
  }

  save(): void {
    const updated = { ...this.cms.global(), navItems: this.items() };
    this.cms.saveGlobal(updated).subscribe();
    this.saved.emit();
  }

  reset(): void {
    const stored = this.cms.global().navItems;
    this.items.set(stored?.length ? structuredClone(stored) : structuredClone(DEFAULT_NAV));
  }
}
