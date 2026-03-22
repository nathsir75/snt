import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { DatePipe } from '@angular/common';
import { MediaService } from './media.service';
import { MediaAsset, MediaType, MEDIA_TYPE_ICONS } from './media.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { MediaUploadComponent } from './media-upload.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-media-library',
  standalone: true,
  imports: [
    DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent, MediaUploadComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Media Library"
      subtitle="Manage images, documents, and media assets used across the platform"
      icon="🖼️"
    >
      <ng-container slot="actions">
        <button class="btn btn-primary" (click)="uploadOpen.set(true)">+ Upload Asset</button>
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <div class="search-box">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="search-input" type="search" placeholder="Search by name…" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" />
          </div>
          <select class="filter-select" [value]="typeFilter()" (change)="typeFilter.set($any($event.target).value)">
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="pdf">PDFs</option>
            <option value="ppt">Presentations</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
          </select>
          @if (searchTerm() || typeFilter()) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} asset{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state
              type="empty"
              [title]="searchTerm() || typeFilter() ? 'No matching assets' : 'No media assets'"
              [description]="searchTerm() || typeFilter() ? 'Try adjusting your search or filters.' : 'Upload images or documents to use in courses, LMS content, and page builder.'"
              [actionLabel]="!searchTerm() && !typeFilter() ? '+ Upload Asset' : ''"
              (action)="uploadOpen.set(true)"
            />
          } @else {
            <div class="media-grid">
              @for (asset of filtered(); track asset.id) {
                <div class="media-card" [class.media-card-inactive]="!asset.isActive">

                  <div class="media-thumb">
                    @if (asset.mediaType === 'image') {
                      <img [src]="asset.fileUrl" [alt]="asset.title" class="thumb-img" loading="lazy" />
                    } @else {
                      <div class="thumb-icon">{{ typeIcon(asset.mediaType) }}</div>
                    }
                    @if (!asset.isActive) {
                      <div class="inactive-overlay">Deactivated</div>
                    }
                  </div>

                  <div class="media-info">
                    <p class="media-title" [title]="asset.title">{{ asset.title }}</p>
                    <div class="media-meta">
                      <snt-badge [label]="asset.mediaType" [variant]="typeBadge(asset.mediaType)" />
                      @if (asset.fileSizeKb) {
                        <span class="meta-size">{{ sizeLabel(asset.fileSizeKb) }}</span>
                      }
                    </div>
                    <p class="media-date">{{ asset.createdAt | date:'dd MMM yyyy' }}</p>
                  </div>

                  <div class="media-actions">
                    <a [href]="asset.fileUrl" target="_blank" rel="noopener" class="btn btn-ghost btn-xs" title="Open">↗</a>
                    @if (canDelete(asset)) {
                      <button class="btn btn-ghost btn-xs btn-danger" (click)="deleteAsset(asset)" title="Delete">🗑</button>
                    }
                  </div>

                </div>
              }
            </div>
          }
        }
      }
    </snt-page-shell>

    <snt-media-upload
      [open]="uploadOpen()"
      (uploaded)="onUploaded($event)"
      (cancel)="uploadOpen.set(false)"
    />
  `,
  styles: [`
    .filter-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%;
      padding: 12px 16px; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    }
    .search-box { position: relative; flex: 1; min-width: 200px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input {
      width: 100%; padding: 7px 10px 7px 32px;
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      font-size: var(--font-size-sm); background: var(--color-bg); outline: none;
    }
    .search-input:focus { border-color: var(--color-primary); }
    .filter-select {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; cursor: pointer;
    }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .media-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); overflow: hidden;
      display: flex; flex-direction: column;
      transition: box-shadow .15s;
    }
    .media-card:hover { box-shadow: var(--shadow-md); }
    .media-card-inactive { opacity: .55; }
    .media-thumb {
      position: relative; height: 120px; background: var(--color-bg);
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .thumb-img { width: 100%; height: 100%; object-fit: cover; }
    .thumb-icon { font-size: 40px; }
    .inactive-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: var(--font-size-xs); font-weight: 700;
    }
    .media-info { padding: 10px 12px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .media-title {
      font-size: var(--font-size-xs); font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .media-meta { display: flex; align-items: center; gap: 6px; }
    .meta-size { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .media-date { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .media-actions {
      display: flex; gap: 4px; padding: 6px 10px;
      border-top: 1px solid var(--color-border); background: var(--color-bg);
    }
    .btn-xs { padding: 3px 8px; font-size: var(--font-size-xs); }
    .btn-danger { color: #dc2626; }
    .btn-danger:hover { background: #fee2e2; }
  `],
})
export class MediaLibraryComponent implements OnInit {
  private readonly svc        = inject(MediaService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSuperAdmin = this.auth.isSuperAdmin;
  readonly state        = signal<LoadState>('loading');
  readonly errorMsg     = signal<string | null>(null);
  readonly all          = signal<MediaAsset[]>([]);
  readonly uploadOpen   = signal(false);

  // Plain strings kept for ngModel two-way binding; signals used for computed() tracking
  readonly searchTerm = signal('');
  readonly typeFilter = signal('');

  readonly filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const type = this.typeFilter();
    return this.all().filter((a) => {
      const matchSearch = !term || a.title.toLowerCase().includes(term);
      const matchType   = !type || a.mediaType === type;
      return matchSearch && matchType && a.isActive;
    });
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.list({ isActive: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (data) => { this.all.set(data); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message ?? 'Failed to load media assets'); this.state.set('error'); },
      });
  }

  onUploaded(asset: MediaAsset): void {
    this.uploadOpen.set(false);
    this.all.update((list) => [asset, ...list]);
  }

  deleteAsset(asset: MediaAsset): void {
    if (!confirm(`Delete "${asset.title}"? This cannot be undone.`)) return;
    const delete$ = asset.providerType === 'local'
      ? this.svc.deleteFile(asset.id)
      : this.svc.deactivate(asset.id);
    (delete$ as Observable<unknown>).subscribe({
      next:  () => this.all.update((list) => list.filter((a) => a.id !== asset.id)),
      error: (e: Error) => alert(`Delete failed: ${e.message}`),
    });
  }

  canDelete(asset: MediaAsset): boolean {
    if (this.isSuperAdmin()) return true;
    return asset.ownerScope === 'branch';
  }

  typeIcon(type: string): string {
    return MEDIA_TYPE_ICONS[type as MediaType] ?? '📎';
  }

  typeBadge(type: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      image: 'success', pdf: 'danger', ppt: 'warning', video: 'primary', document: 'neutral',
    };
    return map[type] ?? 'neutral';
  }

  sizeLabel(kb: number): string {
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
  }

  onFilterChange(): void {} // computed() reacts to signal changes automatically
  clearFilters(): void { this.searchTerm.set(''); this.typeFilter.set(''); }
}
