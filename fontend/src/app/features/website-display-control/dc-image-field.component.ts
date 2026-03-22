import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { MediaPickerComponent } from '../../shared/components/media-picker/media-picker.component';
import { MediaAsset } from '../media-library/media.models';
import { DcImageRef, EMPTY_IMAGE_REF } from './display-control.models';

@Component({
  selector: 'snt-dc-image-field',
  standalone: true,
  imports: [MediaPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="img-field">
      <div class="img-preview-row">
        @if (value.fileUrl) {
          <div class="img-preview-wrap">
            <img [src]="value.fileUrl" [alt]="value.mediaAssetTitle || label" class="img-preview" />
            <div class="img-preview-overlay">
              <button class="img-action-btn img-replace-btn" (click)="pickerOpen.set(true)" title="Replace image">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Replace
              </button>
              <button class="img-action-btn img-remove-btn" (click)="remove()" title="Remove image">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Remove
              </button>
            </div>
          </div>
          <div class="img-meta">
            <span class="img-title">{{ value.mediaAssetTitle || 'External image' }}</span>
            <span class="img-url">{{ value.fileUrl }}</span>
          </div>
        } @else {
          <button class="img-empty-btn" (click)="pickerOpen.set(true)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>{{ label ? 'Pick ' + label : 'Pick Image' }}</span>
          </button>
        }
      </div>

      @if (hint) {
        <p class="img-hint">{{ hint }}</p>
      }
    </div>

    <snt-media-picker
      [open]="pickerOpen()"
      filterType="image"
      (picked)="onPicked($event)"
      (cancel)="pickerOpen.set(false)"
    />
  `,
  styles: [`
    .img-field { display: flex; flex-direction: column; gap: 6px; }

    .img-preview-row { display: flex; align-items: flex-start; gap: 12px; }

    .img-preview-wrap {
      position: relative; width: 120px; height: 72px; flex-shrink: 0;
      border-radius: 8px; overflow: hidden;
      border: 1px solid #e5e7eb; background: #f8fafc;
    }
    .img-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
    .img-preview-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,.55);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px; opacity: 0; transition: opacity .15s;
    }
    .img-preview-wrap:hover .img-preview-overlay { opacity: 1; }

    .img-action-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 600;
      cursor: pointer; border: none; transition: background .12s;
    }
    .img-replace-btn { background: rgba(255,255,255,.9); color: #374151; }
    .img-replace-btn:hover { background: #fff; }
    .img-remove-btn  { background: rgba(220,38,38,.85); color: #fff; }
    .img-remove-btn:hover { background: #dc2626; }

    .img-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
    .img-title { font-size: 12px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .img-url   { font-size: 11px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .img-empty-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; border: 2px dashed #d1d5db; border-radius: 8px;
      background: #f9fafb; color: #6b7280; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all .12s; width: 100%;
    }
    .img-empty-btn:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }

    .img-hint { font-size: 11px; color: #9ca3af; margin: 0; }
  `],
})
export class DcImageFieldComponent {
  @Input({ required: true }) value!: DcImageRef;
  @Input() label = '';
  @Input() hint  = '';
  @Output() changed = new EventEmitter<DcImageRef>();

  readonly pickerOpen = signal(false);

  onPicked(asset: MediaAsset): void {
    this.pickerOpen.set(false);
    this.changed.emit({
      fileUrl:         asset.fileUrl,
      mediaAssetId:    asset.id,
      mediaAssetTitle: asset.title,
    });
  }

  remove(): void {
    this.changed.emit({ ...EMPTY_IMAGE_REF });
  }
}
