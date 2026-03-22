import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal, computed,
} from '@angular/core';
import { MediaService } from '../../../features/media-library/media.service';
import { MediaAsset, MediaType, MEDIA_TYPE_ICONS } from '../../../features/media-library/media.models';
import { MediaUploadComponent } from '../../../features/media-library/media-upload.component';

type PickerTab = 'browse' | 'upload';

@Component({
  selector: 'snt-media-picker',
  standalone: true,
  imports: [MediaUploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="picker-backdrop" (click)="cancel.emit()">
        <div class="picker-modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Select Media">

          <div class="picker-header">
            <h3 class="picker-title">Select Media</h3>
            <div class="picker-tabs">
              <button class="tab-btn" [class.tab-btn-active]="tab() === 'browse'" (click)="tab.set('browse')">Browse</button>
              <button class="tab-btn" [class.tab-btn-active]="tab() === 'upload'" (click)="switchToUpload()">
                ⬆️ Upload New
              </button>
            </div>
            <button class="picker-close" (click)="cancel.emit()" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          @if (tab() === 'browse') {
            <div class="picker-filters">
              <div class="search-box">
                <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  class="search-input" type="search" placeholder="Search…"
                  [value]="searchTerm()"
                  (input)="searchTerm.set($any($event.target).value)"
                />
              </div>
              <select class="filter-select" [value]="typeFilter()" (change)="typeFilter.set($any($event.target).value)">
                <option value="">All Types</option>
                <option value="image">Images</option>
                <option value="pdf">PDFs</option>
                <option value="ppt">Presentations</option>
                <option value="video">Videos</option>
                <option value="document">Documents</option>
              </select>
            </div>

            <div class="picker-body">
              @if (loading()) {
                <div class="picker-loading">
                  <span class="picker-spinner"></span> Loading assets…
                </div>
              } @else if (!filtered().length) {
                <div class="picker-empty">
                  <span style="font-size:32px">🖼️</span>
                  <p>No assets found.</p>
                  <button class="btn btn-secondary btn-sm" (click)="switchToUpload()">Upload one now</button>
                </div>
              } @else {
                <div class="picker-grid">
                  @for (asset of filtered(); track asset.id) {
                    <button
                      class="picker-item"
                      [class.picker-item-selected]="selected()?.id === asset.id"
                      (click)="select(asset)"
                      (dblclick)="confirm()"
                      [title]="asset.title"
                    >
                      @if (asset.mediaType === 'image') {
                        <img [src]="asset.fileUrl" [alt]="asset.title" class="picker-thumb" loading="lazy" />
                      } @else {
                        <div class="picker-icon">{{ typeIcon(asset.mediaType) }}</div>
                      }
                      <span class="picker-name">{{ asset.title }}</span>
                    </button>
                  }
                </div>
              }
            </div>

            <div class="picker-footer">
              @if (selected()) {
                <div class="selected-info">
                  @if (selected()!.mediaType === 'image') {
                    <img [src]="selected()!.fileUrl" class="selected-thumb" alt="" />
                  }
                  <span class="selected-name">{{ selected()!.title }}</span>
                </div>
              } @else {
                <span class="footer-hint">Click an asset to select, double-click to use</span>
              }
              <div class="footer-actions">
                <button class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
                <button class="btn btn-primary" [disabled]="!selected()" (click)="confirm()">
                  Use This Asset
                </button>
              </div>
            </div>
          }

          @if (tab() === 'upload') {
            <snt-media-upload
              [inline]="true"
              (uploaded)="onUploaded($event)"
              (cancel)="tab.set('browse')"
            />
          }

        </div>
      </div>
    }
  `,
  styles: [`
    .picker-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 400; padding: 16px;
    }
    .picker-modal {
      background: var(--color-surface); border-radius: var(--radius-lg);
      width: 100%; max-width: 760px; max-height: 90vh;
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column;
      animation: modal-in .18s ease;
    }
    .picker-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px; border-bottom: 1px solid var(--color-border); flex-shrink: 0;
    }
    .picker-title { font-size: var(--font-size-md); font-weight: 700; margin-right: auto; }
    .picker-tabs { display: flex; gap: 4px; }
    .tab-btn {
      padding: 5px 12px; border-radius: var(--radius-md);
      font-size: var(--font-size-xs); font-weight: 600;
      color: var(--color-text-muted); transition: all .12s;
    }
    .tab-btn:hover { background: var(--color-bg); }
    .tab-btn-active { background: var(--color-primary-light); color: var(--color-primary); }
    .picker-close {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: var(--radius-md); color: var(--color-text-muted);
    }
    .picker-close:hover { background: var(--color-bg); }
    .picker-filters {
      display: flex; gap: 10px; padding: 12px 20px;
      border-bottom: 1px solid var(--color-border); flex-shrink: 0;
    }
    .search-box { position: relative; flex: 1; }
    .search-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input {
      width: 100%; padding: 6px 8px 6px 28px;
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      font-size: var(--font-size-sm); background: var(--color-bg); outline: none;
    }
    .search-input:focus { border-color: var(--color-primary); }
    .filter-select {
      padding: 6px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; cursor: pointer;
    }
    .picker-body { flex: 1; overflow-y: auto; padding: 16px 20px; min-height: 280px; }
    .picker-loading {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      height: 200px; font-size: var(--font-size-sm); color: var(--color-text-muted);
    }
    .picker-spinner {
      display: inline-block; width: 16px; height: 16px;
      border: 2px solid var(--color-border); border-top-color: var(--color-primary);
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    .picker-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; height: 200px; font-size: var(--font-size-sm); color: var(--color-text-muted);
    }
    .btn-sm { padding: 5px 12px; font-size: var(--font-size-xs); }
    .picker-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;
    }
    .picker-item {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 8px; border: 2px solid var(--color-border); border-radius: var(--radius-md);
      cursor: pointer; transition: all .12s; background: var(--color-bg);
      text-align: center;
    }
    .picker-item:hover { border-color: var(--color-primary); background: var(--color-bg); }
    .picker-item-selected { border-color: var(--color-primary); background: var(--color-primary-light); }
    .picker-thumb { width: 100%; height: 80px; object-fit: cover; border-radius: var(--radius-sm); }
    .picker-icon { font-size: 36px; height: 80px; display: flex; align-items: center; justify-content: center; }
    .picker-name {
      font-size: 10px; color: var(--color-text-muted);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;
    }
    .picker-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 20px; border-top: 1px solid var(--color-border); flex-shrink: 0;
    }
    .selected-info { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
    .selected-thumb { width: 32px; height: 32px; object-fit: cover; border-radius: var(--radius-sm); flex-shrink: 0; }
    .selected-name { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .footer-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); flex: 1; }
    .footer-actions { display: flex; gap: 8px; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class MediaPickerComponent implements OnChanges {
  @Input() open = false;
  /** Optional filter — only show assets of this type */
  @Input() filterType?: MediaType;

  @Output() picked  = new EventEmitter<MediaAsset>();
  @Output() cancel  = new EventEmitter<void>();

  private readonly svc = inject(MediaService);

  readonly tab        = signal<PickerTab>('browse');
  readonly loading    = signal(false);
  readonly all        = signal<MediaAsset[]>([]);
  readonly selected   = signal<MediaAsset | null>(null);
  readonly searchTerm = signal('');
  readonly typeFilter = signal('');

  readonly filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const type = this.typeFilter() || this.filterType || '';
    return this.all().filter((a) => {
      const matchSearch = !term || a.title.toLowerCase().includes(term);
      const matchType   = !type || a.mediaType === type;
      return matchSearch && matchType && a.isActive;
    });
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.tab.set('browse');
      this.selected.set(null);
      this.searchTerm.set('');
      this.typeFilter.set(this.filterType ?? '');
      this.loadAssets();
    }
  }

  private loadAssets(): void {
    this.loading.set(true);
    this.svc.list({ isActive: true }).subscribe({
      next:  (data) => { this.all.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  switchToUpload(): void { this.tab.set('upload'); }

  select(asset: MediaAsset): void { this.selected.set(asset); }

  confirm(): void {
    const asset = this.selected();
    if (asset) this.picked.emit(asset);
  }

  onUploaded(asset: MediaAsset): void {
    // Prepend to list, auto-select, switch back to browse, then immediately confirm
    this.all.update((list) => [asset, ...list]);
    this.selected.set(asset);
    this.tab.set('browse');
    // Small tick so the browse tab renders before emitting
    setTimeout(() => this.picked.emit(asset), 80);
  }

  typeIcon(type: string): string {
    return MEDIA_TYPE_ICONS[type as MediaType] ?? '📎';
  }
}
