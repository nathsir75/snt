import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe, SlicePipe } from '@angular/common';
import { BranchContentService } from '../branch-content.service';
import { CollectionItem, CollectionType, COLLECTION_DEFS } from '../branch-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from '../../../features/website-cms/editors/cms-shared.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { MediaPickerComponent } from '../../../shared/components/media-picker/media-picker.component';
import { MediaAsset } from '../../media-library/media.models';

type FormMode = 'list' | 'create' | 'edit';

@Component({
  selector: 'snt-bcms-collections-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS, FormsModule, DatePipe, SlicePipe, BadgeComponent, MediaPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">

      <!-- Collection type tabs -->
      <div class="coll-tabs">
        @for (def of collDefs; track def.type) {
          <button class="coll-tab" [class.coll-tab-active]="activeType() === def.type" (click)="switchType(def.type)">
            {{ def.icon }} {{ def.label }}
          </button>
        }
      </div>

      @if (mode() === 'list') {
        <!-- List view -->
        <div class="coll-header">
          <h3 class="coll-title">{{ activeDef()?.label }}</h3>
          <button class="cms-add-btn" (click)="openCreate()">+ Add {{ activeDef()?.label?.slice(0,-1) }}</button>
        </div>

        @if (loading()) {
          <div class="coll-loading">Loading…</div>
        } @else if (!items().length) {
          <div class="coll-empty">
            <span style="font-size:40px">{{ activeDef()?.icon }}</span>
            <p>No {{ activeDef()?.label?.toLowerCase() }} yet. Add your first one!</p>
          </div>
        } @else {
          <div class="coll-list">
            @for (item of items(); track item.id) {
              <div class="coll-item-row">
                @if (item.imageUrl) {
                  <img [src]="item.imageUrl" [alt]="item.title" class="coll-item-thumb" />
                } @else {
                  <div class="coll-item-thumb-placeholder">{{ activeDef()?.icon }}</div>
                }
                <div class="coll-item-info">
                  <span class="coll-item-title">{{ item.title }}</span>
                  @if (item.summary) {
                    <span class="coll-item-summary">{{ item.summary | slice:0:80 }}{{ item.summary.length > 80 ? '…' : '' }}</span>
                  }
                  <span class="coll-item-date">{{ item.createdAt | date:'dd MMM yyyy' }}</span>
                </div>
                <snt-badge [label]="item.isPublished ? 'Published' : 'Draft'" [variant]="item.isPublished ? 'success' : 'warning'" />
                <div class="coll-item-actions">
                  <button class="cms-add-btn" (click)="openEdit(item)">Edit</button>
                  <button class="cms-add-btn" [style.color]="item.isPublished ? '#dc2626' : '#059669'"
                    (click)="togglePublish(item)">
                    {{ item.isPublished ? 'Unpublish' : 'Publish' }}
                  </button>
                  <button class="cms-remove-btn" (click)="deleteItem(item)">✕</button>
                </div>
              </div>
            }
          </div>
        }
      }

      @if (mode() === 'create' || mode() === 'edit') {
        <!-- Form view -->
        <div class="coll-form-header">
          <button class="cms-add-btn" (click)="mode.set('list')">← Back</button>
          <h3 class="coll-title">{{ mode() === 'create' ? 'Add' : 'Edit' }} {{ activeDef()?.label?.slice(0,-1) }}</h3>
        </div>

        @if (formError()) {
          <div class="form-error-banner">{{ formError() }}</div>
        }

        <div class="coll-form">
          <snt-cms-field label="Title *">
            <input class="cms-input" [(ngModel)]="form.title" placeholder="Enter title" />
          </snt-cms-field>

          <snt-cms-field label="Image">
            <div style="display:flex;gap:8px">
              <input class="cms-input" [(ngModel)]="form.imageUrl" placeholder="https://..." style="flex:1" />
              <button class="cms-add-btn" (click)="pickerOpen.set(true)">🖼️ Pick</button>
            </div>
            @if (form.imageUrl) {
              <img [src]="form.imageUrl" alt="Preview" style="height:80px;margin-top:8px;border-radius:6px;border:1px solid #e5e7eb;object-fit:cover" />
            }
          </snt-cms-field>

          <snt-cms-field label="Summary / Short Description">
            <textarea class="cms-textarea" [(ngModel)]="form.summary" rows="2" placeholder="Brief description…"></textarea>
          </snt-cms-field>

          @if (activeType() !== 'gallery' && activeType() !== 'client') {
            <snt-cms-field label="Full Content">
              <textarea class="cms-textarea" [(ngModel)]="form.content" rows="5" placeholder="Full content, details…"></textarea>
            </snt-cms-field>
          }

          <!-- Type-specific meta fields -->
          @if (activeType() === 'project') {
            <div class="cms-row">
              <snt-cms-field label="Tech / Domain">
                <input class="cms-input" [(ngModel)]="form.meta['tech']" placeholder="e.g. Web Development" />
              </snt-cms-field>
              <snt-cms-field label="Featured">
                <div class="cms-toggle-row">
                  <input type="checkbox" class="cms-toggle" [(ngModel)]="form.meta['featured']" id="feat-chk" />
                  <label class="cms-toggle-label" for="feat-chk">Mark as featured</label>
                </div>
              </snt-cms-field>
            </div>
          }

          @if (activeType() === 'activity') {
            <snt-cms-field label="Event Date">
              <input class="cms-input" type="date" [(ngModel)]="form.meta['eventDate']" />
            </snt-cms-field>
          }

          @if (activeType() === 'news') {
            <snt-cms-field label="Publish Date">
              <input class="cms-input" type="date" [(ngModel)]="form.meta['publishDate']" />
            </snt-cms-field>
          }

          @if (activeType() === 'award') {
            <snt-cms-field label="Year">
              <input class="cms-input" type="number" [(ngModel)]="form.meta['year']" placeholder="2024" />
            </snt-cms-field>
          }

          @if (activeType() === 'gallery') {
            <snt-cms-field label="Category">
              <input class="cms-input" [(ngModel)]="form.meta['category']" placeholder="e.g. Events, Campus" />
            </snt-cms-field>
          }

          @if (activeType() === 'client') {
            <div class="cms-row">
              <snt-cms-field label="Category">
                <input class="cms-input" [(ngModel)]="form.meta['category']" placeholder="e.g. Corporate, SME" />
              </snt-cms-field>
              <snt-cms-field label="Website">
                <input class="cms-input" [(ngModel)]="form.meta['website']" placeholder="https://client.com" />
              </snt-cms-field>
            </div>
          }

          <snt-cms-field label="Display Order">
            <input class="cms-input" type="number" [(ngModel)]="form.displayOrder" min="1" placeholder="1" />
          </snt-cms-field>

          <div class="coll-form-actions">
            <button class="cms-add-btn" style="background:#f3f4f6;color:#374151" (click)="mode.set('list')">Cancel</button>
            <button class="cms-add-btn" style="background:#16a34a;color:#fff" [disabled]="saving()" (click)="saveForm()">
              {{ saving() ? 'Saving…' : (mode() === 'create' ? 'Create' : 'Save Changes') }}
            </button>
          </div>
        </div>
      }

    </div>

    <snt-media-picker [open]="pickerOpen()" filterType="image"
      (picked)="onPicked($event)" (cancel)="pickerOpen.set(false)" />
  `,
  styles: [CMS_INPUT_STYLES + `
    .cms-editor { max-width: 960px; }
    .coll-tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px; padding-bottom: 0; }
    .coll-tab {
      padding: 8px 14px; border-radius: 8px 8px 0 0; font-size: 13px; font-weight: 600;
      color: #6b7280; background: transparent; border: none; cursor: pointer; transition: all .12s;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
    }
    .coll-tab:hover { color: #111827; background: #f9fafb; }
    .coll-tab-active { color: #16a34a; border-bottom-color: #16a34a; background: #f0fdf4; }
    .coll-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .coll-title { font-size: 16px; font-weight: 700; color: #111827; }
    .coll-loading { padding: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
    .coll-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; text-align: center; color: #6b7280; font-size: 14px; }
    .coll-list { display: flex; flex-direction: column; gap: 8px; }
    .coll-item-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; background: #fff; border: 1px solid #e5e7eb;
      border-radius: 10px; transition: box-shadow .12s;
    }
    .coll-item-row:hover { box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .coll-item-thumb { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
    .coll-item-thumb-placeholder {
      width: 56px; height: 56px; border-radius: 8px; flex-shrink: 0;
      background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 22px;
    }
    .coll-item-info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .coll-item-title { font-size: 14px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .coll-item-summary { font-size: 12px; color: #6b7280; }
    .coll-item-date { font-size: 11px; color: #9ca3af; }
    .coll-item-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .coll-form-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .coll-form { display: flex; flex-direction: column; gap: 16px; }
    .coll-form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; }
    .form-error-banner { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 12px; }
  `],
})
export class BcmsCollectionsEditorComponent implements OnInit {
  private readonly svc        = inject(BranchContentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly collDefs   = COLLECTION_DEFS;
  readonly activeType = signal<CollectionType>('project');
  readonly mode       = signal<FormMode>('list');
  readonly items      = signal<CollectionItem[]>([]);
  readonly loading    = signal(false);
  readonly saving     = signal(false);
  readonly formError  = signal<string | null>(null);
  readonly pickerOpen = signal(false);

  private editingId: number | null = null;

  form: {
    title: string; summary: string; content: string;
    imageUrl: string; displayOrder: number;
    meta: Record<string, unknown>;
  } = this.blankForm();

  readonly activeDef = () => this.collDefs.find(d => d.type === this.activeType());

  ngOnInit(): void { this.loadItems(); }

  switchType(type: CollectionType): void {
    this.activeType.set(type);
    this.mode.set('list');
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.svc.list(this.activeType())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.items.set(data); this.loading.set(false); },
        error: () => { this.loading.set(false); },
      });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.blankForm();
    this.formError.set(null);
    this.mode.set('create');
  }

  openEdit(item: CollectionItem): void {
    this.editingId = item.id;
    this.form = {
      title:        item.title,
      summary:      item.summary ?? '',
      content:      item.content ?? '',
      imageUrl:     item.imageUrl ?? '',
      displayOrder: item.displayOrder,
      meta:         { ...(item.metaJson as Record<string, unknown>) },
    };
    this.formError.set(null);
    this.mode.set('edit');
  }

  saveForm(): void {
    if (!this.form.title.trim()) { this.formError.set('Title is required'); return; }
    this.saving.set(true);
    this.formError.set(null);

    const payload = {
      title:        this.form.title.trim(),
      summary:      this.form.summary || undefined,
      content:      this.form.content || undefined,
      imageUrl:     this.form.imageUrl || undefined,
      displayOrder: this.form.displayOrder || undefined,
      metaJson:     this.form.meta,
    };

    const call$ = this.editingId
      ? this.svc.update(this.editingId, payload)
      : this.svc.create({ collectionType: this.activeType(), ...payload });

    call$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (item) => {
        this.saving.set(false);
        if (this.editingId) {
          this.items.update(list => list.map(i => i.id === item.id ? item : i));
        } else {
          this.items.update(list => [item, ...list]);
        }
        this.mode.set('list');
      },
      error: (e: Error) => { this.formError.set(e.message || 'Failed to save'); this.saving.set(false); },
    });
  }

  togglePublish(item: CollectionItem): void {
    this.svc.update(item.id, { isPublished: !item.isPublished })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.items.update(list => list.map(i => i.id === updated.id ? updated : i)),
        error: () => {},
      });
  }

  deleteItem(item: CollectionItem): void {
    if (!confirm(`Delete "${item.title}"?`)) return;
    this.svc.delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.items.update(list => list.filter(i => i.id !== item.id)),
        error: () => {},
      });
  }

  onPicked(asset: MediaAsset): void {
    this.form.imageUrl = asset.fileUrl;
    this.pickerOpen.set(false);
  }

  private blankForm() {
    return { title: '', summary: '', content: '', imageUrl: '', displayOrder: 1, meta: {} as Record<string, unknown> };
  }
}
