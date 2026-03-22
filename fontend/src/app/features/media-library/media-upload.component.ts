import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MediaService } from './media.service';
import { MediaAsset, OwnerScope, UploadCategory, UPLOAD_CATEGORY_OPTIONS } from './media.models';
import { AuthService } from '../../core/auth/auth.service';


@Component({
  selector: 'snt-media-upload',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (inline) {
      <div class="inline-body">
        @if (serverError()) {
          <div class="form-error-banner">{{ serverError() }}</div>
        }
        <div
          class="drop-zone"
          [class.drop-zone-has-file]="selectedFile()"
          (click)="fileInput.click()"
          (dragover)="$event.preventDefault()"
          (drop)="onDrop($event)"
        >
          @if (previewUrl()) {
            <img [src]="previewUrl()!" class="preview-img" alt="Preview" />
          } @else if (selectedFile()) {
            <div class="file-info">
              <span class="file-icon">📄</span>
              <span class="file-name">{{ selectedFile()!.name }}</span>
              <span class="file-size">{{ fileSizeLabel() }}</span>
            </div>
          } @else {
            <div class="drop-hint">
              <span class="drop-icon">☁️</span>
              <p class="drop-text">Click or drag & drop to upload</p>
              <p class="drop-sub">Images, PDFs, PPTs, Documents, Videos</p>
            </div>
          }
          <input #fileInput type="file" class="hidden-input" (change)="onFileChange($event)" />
        </div>
        <form [formGroup]="form">
          <div class="form-row">
            <div class="form-group">
              <label for="uc-inline">Type *</label>
              <select id="uc-inline" formControlName="uploadCategory">
                @for (opt of categoryOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            @if (isSuperAdmin()) {
              <div class="form-group">
                <label for="os-inline">Scope *</label>
                <select id="os-inline" formControlName="ownerScope">
                  <option value="global">Global (all branches)</option>
                  <option value="branch">Branch-specific</option>
                </select>
              </div>
            }
          </div>
          <div class="form-group">
            <label for="title-inline">Title</label>
            <input id="title-inline" formControlName="title" placeholder="Leave blank to use filename" />
          </div>
        </form>
      </div>
      <div class="inline-footer">
        <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="!selectedFile() || uploading()"
          (click)="upload()"
        >
          @if (uploading()) {
            <span class="upload-spinner"></span> Uploading…
          } @else {
            ⬆️ Upload &amp; Select
          }
        </button>
      </div>
    } @else if (open) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Upload Asset">
          <div class="modal-header">
            <h3 class="modal-title">Upload Asset</h3>
            <button class="modal-close" (click)="cancel.emit()" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            @if (serverError()) {
              <div class="form-error-banner">{{ serverError() }}</div>
            }
            <div
              class="drop-zone"
              [class.drop-zone-has-file]="selectedFile()"
              (click)="fileInput.click()"
              (dragover)="$event.preventDefault()"
              (drop)="onDrop($event)"
            >
              @if (previewUrl()) {
                <img [src]="previewUrl()!" class="preview-img" alt="Preview" />
              } @else if (selectedFile()) {
                <div class="file-info">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ selectedFile()!.name }}</span>
                  <span class="file-size">{{ fileSizeLabel() }}</span>
                </div>
              } @else {
                <div class="drop-hint">
                  <span class="drop-icon">☁️</span>
                  <p class="drop-text">Click or drag & drop to upload</p>
                  <p class="drop-sub">Images, PDFs, PPTs, Documents, Videos</p>
                </div>
              }
              <input #fileInput type="file" class="hidden-input" (change)="onFileChange($event)" />
            </div>
            <form [formGroup]="form">
              <div class="form-row">
                <div class="form-group">
                  <label for="uploadCategory">Type *</label>
                  <select id="uploadCategory" formControlName="uploadCategory">
                    @for (opt of categoryOptions; track opt.value) {
                      <option [value]="opt.value">{{ opt.label }}</option>
                    }
                  </select>
                </div>
                @if (isSuperAdmin()) {
                  <div class="form-group">
                    <label for="ownerScope">Scope *</label>
                    <select id="ownerScope" formControlName="ownerScope">
                      <option value="global">Global (all branches)</option>
                      <option value="branch">Branch-specific</option>
                    </select>
                  </div>
                }
              </div>
              <div class="form-group">
                <label for="title">Title</label>
                <input id="title" formControlName="title" placeholder="Leave blank to use filename" />
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!selectedFile() || uploading()"
              (click)="upload()"
            >
              {{ uploading() ? 'Uploading…' : '⬆️ Upload' }}
            </button>
          </div>
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
      width: 100%; max-width: 520px; box-shadow: var(--shadow-lg);
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
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 14px 24px; border-top: 1px solid var(--color-border);
    }
    .drop-zone {
      border: 2px dashed var(--color-border); border-radius: var(--radius-lg);
      min-height: 140px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: border-color .15s; overflow: hidden;
    }
    .drop-zone:hover, .drop-zone-has-file { border-color: var(--color-primary); }
    .drop-hint { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 24px; }
    .drop-icon { font-size: 32px; }
    .drop-text { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .drop-sub  { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .preview-img { width: 100%; max-height: 200px; object-fit: contain; }
    .file-info { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 24px; }
    .file-icon { font-size: 32px; }
    .file-name { font-size: var(--font-size-sm); font-weight: 600; word-break: break-all; text-align: center; }
    .file-size { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .hidden-input { display: none; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--font-size-sm);
    }
    .inline-body { display: flex; flex-direction: column; gap: 14px; padding: 16px 20px; }
    .inline-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 20px; border-top: 1px solid var(--color-border); flex-shrink: 0;
    }
    .upload-spinner {
      display: inline-block; width: 12px; height: 12px;
      border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
      border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class MediaUploadComponent implements OnChanges {
  @Input() open   = false;
  /** When true, renders without backdrop/modal shell — for embedding inside another modal */
  @Input() inline = false;
  @Output() uploaded = new EventEmitter<MediaAsset>();
  @Output() cancel   = new EventEmitter<void>();

  private readonly fb   = inject(FormBuilder);
  private readonly svc  = inject(MediaService);
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = this.auth.isSuperAdmin;
  readonly uploading    = signal(false);
  readonly serverError  = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl   = signal<string | null>(null);

  readonly categoryOptions = UPLOAD_CATEGORY_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    uploadCategory: ['image' as UploadCategory, Validators.required],
    ownerScope:     ['global' as OwnerScope],
    title:          [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    const becameVisible =
      (changes['open']   && this.open)   ||
      (changes['inline'] && this.inline);
    if (becameVisible) {
      this.selectedFile.set(null);
      this.previewUrl.set(null);
      this.serverError.set(null);
      this.form.reset({
        uploadCategory: 'image',
        ownerScope: this.isSuperAdmin() ? 'global' : 'branch',
      });
    }
  }

  fileSizeLabel(): string {
    const f = this.selectedFile();
    if (!f) return '';
    const kb = f.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (file) this.setFile(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File): void {
    this.selectedFile.set(file);
    this.previewUrl.set(null);
    // Auto-detect category from mime
    if (file.type.startsWith('image/')) {
      this.form.patchValue({ uploadCategory: 'image' });
      const reader = new FileReader();
      reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      this.form.patchValue({ uploadCategory: 'pdf' });
    } else if (file.type.includes('presentation')) {
      this.form.patchValue({ uploadCategory: 'ppt' });
    } else if (file.type.startsWith('video/')) {
      this.form.patchValue({ uploadCategory: 'video' });
    } else {
      this.form.patchValue({ uploadCategory: 'document' });
    }
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    this.svc.upload(file, {
      title:          v.title || undefined,
      uploadCategory: v.uploadCategory,
      ownerScope:     this.isSuperAdmin() ? v.ownerScope : 'branch',
      branchId:       this.isSuperAdmin() ? undefined : (this.auth.branchId() != null ? Number(this.auth.branchId()) : undefined),
    }).subscribe({
      next: (result) => {
        this.uploading.set(false);
        this.uploaded.emit(result.asset);
      },
      error: (e: Error) => {
        this.serverError.set(e.message ?? 'Upload failed. Please try again.');
        this.uploading.set(false);
      },
    });
  }
}
