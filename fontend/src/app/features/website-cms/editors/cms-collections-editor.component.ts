import {
  Component, inject, signal, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteCmsService } from '../website-cms.service';
import {
  SiteCollectionItem, SiteCollectionType, SITE_COLLECTION_DEFS,
} from '../website-cms.models';
import { CmsSectionComponent, CMS_INPUT_STYLES } from './cms-shared.component';

@Component({
  selector: 'snt-cms-collections-editor',
  standalone: true,
  imports: [FormsModule, SlicePipe, CmsSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">

      <!-- Type tabs -->
      <div class="type-tabs">
        @for (def of defs; track def.type) {
          <button
            class="type-tab"
            [class.type-tab-active]="activeType() === def.type"
            (click)="switchType(def.type)"
          >
            <span>{{ def.icon }}</span>
            <span>{{ def.label }}</span>
          </button>
        }
      </div>

      <!-- Active type header -->
      <div class="col-header">
        <div>
          <h3 class="col-title">{{ activeDef()?.label }}</h3>
          <p class="col-sub">{{ items().length }} items · {{ publishedCount() }} published</p>
        </div>
        <button class="btn-add" (click)="openForm()">+ Add Item</button>
      </div>

      <!-- Items list -->
      @if (loading()) {
        <div class="loading-state">Loading…</div>
      } @else if (!items().length) {
        <div class="empty-state">
          <p>No {{ activeDef()?.label }} items yet.</p>
          <button class="btn-add" (click)="openForm()">+ Add First Item</button>
        </div>
      } @else {
        <div class="items-list">
          @for (item of items(); track item.id) {
            <div class="item-row" [class.item-published]="item.isPublished">
              @if (item.imageUrl) {
                <img [src]="item.imageUrl" class="item-thumb" alt="" />
              } @else {
                <div class="item-thumb-placeholder">{{ activeDef()?.icon }}</div>
              }
              <div class="item-info">
                <p class="item-title">{{ item.title }}</p>
                <p class="item-meta">{{ item.summary | slice:0:80 }}{{ (item.summary?.length ?? 0) > 80 ? '…' : '' }}</p>
              </div>
              <div class="item-actions">
                <span class="badge" [class.badge-pub]="item.isPublished" [class.badge-draft]="!item.isPublished">
                  {{ item.isPublished ? 'Published' : 'Draft' }}
                </span>
                <button class="btn-icon" (click)="togglePublish(item)" title="Toggle publish">
                  {{ item.isPublished ? '🔒' : '✅' }}
                </button>
                <button class="btn-icon" (click)="editItem(item)" title="Edit">✏️</button>
                <button class="btn-icon btn-danger" (click)="deleteItem(item)" title="Delete">🗑️</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Form drawer -->
      @if (showForm()) {
        <div class="form-overlay" (click)="closeForm()"></div>
        <div class="form-drawer">
          <div class="form-drawer-header">
            <h3>{{ editingItem() ? 'Edit' : 'Add' }} {{ activeDef()?.label }} Item</h3>
            <button class="btn-close" (click)="closeForm()">✕</button>
          </div>
          <div class="form-drawer-body">
            <div class="form-field">
              <label class="form-label">Title *</label>
              <input class="cms-input" [(ngModel)]="form.title" placeholder="Item title" />
            </div>
            <div class="form-field">
              <label class="form-label">Slug *</label>
              <input class="cms-input" [(ngModel)]="form.slug" placeholder="url-friendly-slug" />
            </div>
            <div class="form-field">
              <label class="form-label">Summary</label>
              <textarea class="cms-textarea" [(ngModel)]="form.summary" rows="3" placeholder="Short description"></textarea>
            </div>
            <div class="form-field">
              <label class="form-label">Image URL</label>
              <input class="cms-input" [(ngModel)]="form.imageUrl" placeholder="https://..." />
            </div>
            <div class="form-field">
              <label class="form-label">Full Content</label>
              <textarea class="cms-textarea" [(ngModel)]="form.content" rows="5" placeholder="Full content (optional)"></textarea>
            </div>

            <!-- Type-specific meta fields -->
            @switch (activeType()) {
              @case ('course') {
                <div class="form-row">
                  <div class="form-field">
                    <label class="form-label">Duration</label>
                    <input class="cms-input" [(ngModel)]="form.meta['duration']" placeholder="6 months" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Mode</label>
                    <select class="cms-input" [(ngModel)]="form.meta['mode']">
                      <option value="offline">Offline</option>
                      <option value="online">Online</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                <div class="form-field">
                  <label class="form-label">Highlights (comma-separated)</label>
                  <input class="cms-input" [(ngModel)]="form.meta['highlights']" placeholder="Placement support, Certificate, LMS access" />
                </div>
              }
              @case ('placement') {
                <div class="form-row">
                  <div class="form-field">
                    <label class="form-label">Student Name</label>
                    <input class="cms-input" [(ngModel)]="form.meta['studentName']" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Company</label>
                    <input class="cms-input" [(ngModel)]="form.meta['company']" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-field">
                    <label class="form-label">Role</label>
                    <input class="cms-input" [(ngModel)]="form.meta['role']" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Package (LPA)</label>
                    <input class="cms-input" [(ngModel)]="form.meta['package']" placeholder="6.5 LPA" />
                  </div>
                </div>
              }
              @case ('career') {
                <div class="form-row">
                  <div class="form-field">
                    <label class="form-label">Location</label>
                    <input class="cms-input" [(ngModel)]="form.meta['location']" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Job Type</label>
                    <select class="cms-input" [(ngModel)]="form.meta['jobType']">
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>
                </div>
                <div class="form-field">
                  <label class="form-label">Experience Required</label>
                  <input class="cms-input" [(ngModel)]="form.meta['experience']" placeholder="2–5 years" />
                </div>
              }
              @case ('internship') {
                <div class="form-row">
                  <div class="form-field">
                    <label class="form-label">Duration</label>
                    <input class="cms-input" [(ngModel)]="form.meta['duration']" placeholder="3 months" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Mode</label>
                    <select class="cms-input" [(ngModel)]="form.meta['mode']">
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                <div class="form-field">
                  <label class="form-label">Eligibility</label>
                  <input class="cms-input" [(ngModel)]="form.meta['eligibility']" placeholder="B.Tech / BCA / MCA" />
                </div>
              }
              @case ('branch_location') {
                <div class="form-row">
                  <div class="form-field">
                    <label class="form-label">City</label>
                    <input class="cms-input" [(ngModel)]="form.meta['city']" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">State</label>
                    <input class="cms-input" [(ngModel)]="form.meta['state']" />
                  </div>
                </div>
                <div class="form-field">
                  <label class="form-label">Contact Phone</label>
                  <input class="cms-input" [(ngModel)]="form.meta['phone']" />
                </div>
                <div class="form-field">
                  <label class="form-label">Branch Code</label>
                  <input class="cms-input" [(ngModel)]="form.meta['branchCode']" />
                </div>
              }
              @case ('faq') {
                <div class="form-field">
                  <label class="form-label">Answer</label>
                  <textarea class="cms-textarea" [(ngModel)]="form.meta['answer']" rows="4" placeholder="FAQ answer"></textarea>
                </div>
                <div class="form-field">
                  <label class="form-label">Category</label>
                  <input class="cms-input" [(ngModel)]="form.meta['category']" placeholder="General / Courses / Franchise" />
                </div>
              }
              @case ('testimonial') {
                <div class="form-row">
                  <div class="form-field">
                    <label class="form-label">Person Name</label>
                    <input class="cms-input" [(ngModel)]="form.meta['name']" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Role / Company</label>
                    <input class="cms-input" [(ngModel)]="form.meta['roleCompany']" placeholder="Software Engineer, Infosys" />
                  </div>
                </div>
                <div class="form-field">
                  <label class="form-label">Type</label>
                  <select class="cms-input" [(ngModel)]="form.meta['type']">
                    <option value="student">Student</option>
                    <option value="partner">Partner</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              }
            }

            <div class="form-row" style="margin-top:8px">
              <div class="form-field">
                <label class="form-label">Display Order</label>
                <input class="cms-input" type="number" [(ngModel)]="form.displayOrder" />
              </div>
              <div class="form-field" style="justify-content:flex-end;padding-top:20px">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                  <input type="checkbox" [(ngModel)]="form.isPublished" />
                  <span style="font-size:13px;font-weight:600;color:#374151">Publish immediately</span>
                </label>
              </div>
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>
          <div class="form-drawer-footer">
            <button class="btn-cancel" (click)="closeForm()">Cancel</button>
            <button class="btn-save" [disabled]="saving()" (click)="saveItem()">
              {{ saving() ? 'Saving…' : (editingItem() ? 'Update Item' : 'Add Item') }}
            </button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [CMS_INPUT_STYLES + `
    .cms-editor { max-width: 960px; }
    .type-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
    .type-tab { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 600; color: #374151; cursor: pointer; transition: all .12s; }
    .type-tab:hover { background: #f3f4f6; }
    .type-tab-active { background: #eef2ff; border-color: #6366f1; color: #6366f1; }
    .col-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .col-title { font-size: 16px; font-weight: 800; color: #111827; }
    .col-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .btn-add { padding: 8px 16px; background: #6366f1; color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-add:hover { background: #4f46e5; }
    .loading-state, .empty-state { text-align: center; padding: 48px; color: #6b7280; }
    .items-list { display: flex; flex-direction: column; gap: 8px; }
    .item-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; transition: border-color .12s; }
    .item-row:hover { border-color: #6366f1; }
    .item-published { border-left: 3px solid #059669; }
    .item-thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
    .item-thumb-placeholder { width: 48px; height: 48px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .item-info { flex: 1; min-width: 0; }
    .item-title { font-size: 14px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-meta { font-size: 12px; color: #6b7280; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 10px; }
    .badge-pub { background: #d1fae5; color: #059669; }
    .badge-draft { background: #f3f4f6; color: #6b7280; }
    .btn-icon { padding: 6px 8px; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background .12s; }
    .btn-icon:hover { background: #e5e7eb; }
    .btn-danger:hover { background: #fee2e2; }
    .form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 200; }
    .form-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 520px; background: #fff; z-index: 201; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,.12); }
    .form-drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
    .form-drawer-header h3 { font-size: 16px; font-weight: 800; color: #111827; }
    .btn-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280; padding: 4px 8px; border-radius: 6px; }
    .btn-close:hover { background: #f3f4f6; }
    .form-drawer-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
    .form-drawer-footer { padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; }
    .form-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
    .form-label { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .4px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-error { font-size: 13px; color: #dc2626; margin-bottom: 8px; }
    .btn-save { flex: 1; padding: 10px; background: #059669; color: #fff; border: none; border-radius: 7px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .btn-save:hover:not(:disabled) { background: #047857; }
    .btn-save:disabled { opacity: .6; cursor: not-allowed; }
    .btn-cancel { padding: 10px 20px; background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; border-radius: 7px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-cancel:hover { background: #e5e7eb; }
    @media (max-width: 600px) { .form-drawer { width: 100%; } }
  `],
})
export class CmsCollectionsEditorComponent implements OnInit {
  private readonly cms = inject(WebsiteCmsService);

  readonly defs = SITE_COLLECTION_DEFS;
  readonly activeType = signal<SiteCollectionType>('course');
  readonly items = signal<SiteCollectionItem[]>([]);
  readonly loading = signal(false);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly editingItem = signal<SiteCollectionItem | null>(null);

  form: {
    title: string; slug: string; summary: string; content: string;
    imageUrl: string; displayOrder: number; isPublished: boolean;
    meta: Record<string, string>;
  } = this.emptyForm();

  readonly activeDef = () => this.defs.find(d => d.type === this.activeType());
  readonly publishedCount = () => this.items().filter(i => i.isPublished).length;

  ngOnInit(): void { this.loadItems(); }

  switchType(type: SiteCollectionType): void {
    this.activeType.set(type);
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.cms.listCollections(this.activeType()).subscribe({
      next: (items) => { this.items.set(items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    this.editingItem.set(null);
    this.form = this.emptyForm();
    this.formError.set(null);
    this.showForm.set(true);
  }

  editItem(item: SiteCollectionItem): void {
    this.editingItem.set(item);
    this.form = {
      title: item.title,
      slug: item.slug,
      summary: item.summary ?? '',
      content: item.content ?? '',
      imageUrl: item.imageUrl ?? '',
      displayOrder: item.displayOrder,
      isPublished: item.isPublished,
      meta: { ...(item.metaJson as Record<string, string>) },
    };
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); this.editingItem.set(null); }

  saveItem(): void {
    if (!this.form.title.trim() || !this.form.slug.trim()) {
      this.formError.set('Title and slug are required.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);

    const payload: Partial<SiteCollectionItem> = {
      collectionType: this.activeType(),
      title: this.form.title,
      slug: this.form.slug,
      summary: this.form.summary || null,
      content: this.form.content || null,
      imageUrl: this.form.imageUrl || null,
      displayOrder: this.form.displayOrder,
      isPublished: this.form.isPublished,
      metaJson: this.form.meta,
    };

    const editing = this.editingItem();
    const obs = editing
      ? this.cms.updateCollection(editing.id, payload)
      : this.cms.createCollection(payload);

    obs.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.loadItems(); },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.error ?? 'Failed to save item.');
      },
    });
  }

  togglePublish(item: SiteCollectionItem): void {
    this.cms.togglePublishCollection(item.id).subscribe({
      next: (updated) => {
        this.items.update(arr => arr.map(i => i.id === updated.id ? updated : i));
      },
    });
  }

  deleteItem(item: SiteCollectionItem): void {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    this.cms.deleteCollection(item.id).subscribe({
      next: () => this.items.update(arr => arr.filter(i => i.id !== item.id)),
    });
  }

  private emptyForm() {
    return { title: '', slug: '', summary: '', content: '', imageUrl: '', displayOrder: 0, isPublished: false, meta: {} as Record<string, string> };
  }
}
