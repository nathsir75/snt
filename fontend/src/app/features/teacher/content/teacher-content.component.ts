import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TeacherService, TeacherBatch, CourseContent, Session, BatchMaterial } from '../teacher.service';
import { MediaService } from '../../media-library/media.service';
import { UploadCategory } from '../../media-library/media.models';

type MaterialMode = 'upload' | 'link';
type ContentCategory = 'recorded_lecture' | 'recommended_video' | 'study_resource';

@Component({
  selector: 'snt-teacher-content',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>Study Materials</h1><p>Publish batch-specific resources for your assigned students</p></div>
    </div>

    <section class="material-panel card">
      <div class="material-panel__header">
        <div>
          <h2>{{ editingMaterialId() ? 'Edit material' : 'Publish material' }}</h2>
          <p>Students only see published materials for their active enrolled batch.</p>
        </div>
      </div>

      <div class="material-form">
        <label class="field field--wide">
          <span>Batch *</span>
          <select class="input" [(ngModel)]="materialForm.batchId" (ngModelChange)="loadMaterialsForSelectedBatch()" [disabled]="!!editingMaterialId()">
            <option [ngValue]="null">Select assigned batch</option>
            @for (batch of batches(); track batch.id) {
              <option [ngValue]="batch.id">{{ batch.name }} - {{ batch.course.name }} ({{ batch.branch.name }})</option>
            }
          </select>
        </label>

        <label class="field">
          <span>Title *</span>
          <input class="input" [(ngModel)]="materialForm.title" placeholder="Example: Week 2 practice worksheet" />
        </label>

        <label class="field">
          <span>Content category *</span>
          <select class="input" [(ngModel)]="materialForm.contentCategory">
            <option value="recorded_lecture">Recorded lecture</option>
            <option value="recommended_video">Recommended training video</option>
            <option value="study_resource">Study resource</option>
          </select>
          <small>{{ categoryHelpText() }}</small>
        </label>

        <label class="field">
          <span>{{ materialForm.contentCategory === 'recorded_lecture' ? 'Lecture date *' : 'Lecture date' }}</span>
          <input class="input" type="date" [(ngModel)]="materialForm.lectureDate" />
          <small>Use the class/recording date, not the publish date.</small>
        </label>

        @if (materialMode() === 'upload') {
          <label class="field">
            <span>Type</span>
            <select class="input" [(ngModel)]="materialForm.materialType">
              <option value="pdf">PDF</option>
              <option value="ppt">Presentation</option>
              <option value="document">Document</option>
              <option value="video">Video</option>
              <option value="image">Image</option>
            </select>
          </label>
        }

        <label class="field field--wide">
          <span>Description</span>
          <textarea class="input" rows="3" [(ngModel)]="materialForm.description" placeholder="Short note for students"></textarea>
        </label>

        <div class="mode-toggle">
          <button class="mode-btn" [class.mode-btn--active]="materialMode() === 'upload'" (click)="materialMode.set('upload')" type="button">Upload file</button>
          <button class="mode-btn" [class.mode-btn--active]="materialMode() === 'link'" (click)="materialMode.set('link')" type="button">YouTube Unlisted link</button>
        </div>

        @if (materialMode() === 'upload') {
          <label class="field field--wide">
            <span>{{ editingMaterialId() ? 'Replacement file' : 'File *' }}</span>
            <input class="input" type="file" (change)="onFileSelected($event)" />
            <small>{{ editingMaterialId() ? 'Choose a file only when replacing the current uploaded file.' : 'Supported by type: PDF, PPT, document, image, or video.' }}</small>
          </label>
        } @else {
          <label class="field field--wide">
            <span>YouTube Unlisted link *</span>
            <input class="input" [(ngModel)]="materialForm.externalUrl" placeholder="https://youtu.be/..." />
            <small>Upload the video in YouTube Studio as Unlisted, then paste the share URL here.</small>
          </label>
        }
      </div>

      @if (materialError()) {
        <div class="form-error">{{ materialError() }}</div>
      }

      <div class="material-actions">
        @if (editingMaterialId()) {
          <button class="btn btn-secondary" type="button" (click)="cancelEdit()">Cancel Edit</button>
        }
        <button class="btn btn-primary" [disabled]="savingMaterial()" (click)="saveMaterial()">
          {{ savingMaterial() ? 'Saving...' : (editingMaterialId() ? 'Save Changes' : 'Publish Material') }}
        </button>
      </div>
    </section>

    <section class="materials-list card">
      <div class="list-header">
        <h2>Batch materials</h2>
        <span>{{ materials().length }} item{{ materials().length === 1 ? '' : 's' }}</span>
      </div>
      @if (!materialForm.batchId) {
        <p class="text-muted text-sm">Select a batch to review its materials.</p>
      } @else if (materialsLoading()) {
        <p class="text-muted text-sm">Loading materials...</p>
      } @else if (materials().length === 0) {
        <p class="text-muted text-sm">No materials published for this batch yet.</p>
      } @else {
        <div class="material-items">
          @for (item of materials(); track item.id) {
            <div class="material-item" [class.material-item--muted]="!item.isPublished">
              <span class="material-item__type">{{ item.materialType }}</span>
              <span class="material-item__body">
                <a [href]="materialUrl(item)" target="_blank" rel="noopener">{{ item.title }}</a>
                <small>{{ categoryLabel(item.contentCategory) }}@if (item.lectureDate) { — {{ formatDate(item.lectureDate) }} }</small>
                @if (item.description) { <small>{{ item.description }}</small> }
              </span>
              <span class="material-item__status" [class.material-item__status--off]="!item.isPublished">{{ item.isPublished ? 'Published' : 'Unpublished' }}</span>
              <div class="material-item__actions">
                <button class="btn btn-secondary btn-xs" type="button" (click)="startEdit(item)">Edit</button>
                <button class="btn btn-secondary btn-xs" type="button" (click)="togglePublished(item)">
                  {{ item.isPublished ? 'Unpublish' : 'Publish' }}
                </button>
                <button class="btn btn-danger btn-xs" type="button" (click)="requestArchive(item)">Archive</button>
              </div>
            </div>
          }
        </div>
      }
    </section>

    @if (archiveTarget(); as target) {
      <div class="confirm-backdrop">
        <div class="confirm-box">
          <h3>Archive material?</h3>
          <p>{{ target.title }} will be hidden from students. The material row is kept for history.</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" type="button" (click)="archiveTarget.set(null)">Cancel</button>
            <button class="btn btn-danger" type="button" (click)="archiveMaterial()">Archive</button>
          </div>
        </div>
      </div>
    }

    <!-- Course tabs (one per unique course across batches) -->
    <div class="course-tabs">
      @for (course of courses(); track course.id) {
        <button
          class="course-tab"
          [class.course-tab--active]="selectedCourseId() === course.id"
          (click)="selectCourse(course.id)"
        >{{ course.name }}</button>
      }
    </div>

    @if (loading()) {
      <div class="page-state">Loading content…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (!selectedCourseId()) {
      <div class="page-state">Select a course above.</div>
    } @else if (!courseContent()) {
      <div class="card page-state">No published content for this course yet.</div>
    } @else {
      <div class="content-header card">
        <div class="content-header__title">{{ courseContent()!.title }}</div>
        @if (courseContent()!.description) {
          <p class="text-muted text-sm">{{ courseContent()!.description }}</p>
        }
      </div>

      @if (sessions().length === 0) {
        <div class="page-state">No sessions added yet.</div>
      } @else {
        <div class="sessions-list">
          @for (session of sessions(); track session.id) {
            <div class="session-card card">
              <div class="session-card__header" (click)="toggleSession(session.id)">
                <div class="session-card__title">
                  <span class="session-card__order">{{ session.order }}</span>
                  {{ session.title }}
                </div>
                <div class="session-card__meta">
                  @if (session.durationMinutes) {
                    <span class="text-muted text-sm">{{ session.durationMinutes }} min</span>
                  }
                  <span class="session-card__toggle">{{ expandedSessions().has(session.id) ? '▲' : '▼' }}</span>
                </div>
              </div>

              @if (expandedSessions().has(session.id)) {
                <div class="session-card__items">
                  @if (session.contentItems.length === 0) {
                    <p class="text-muted text-sm" style="padding: 8px 0">No items in this session.</p>
                  }
                  @for (item of session.contentItems; track item.id) {
                    <div class="content-item">
                      <span class="content-item__type badge badge-info">{{ item.type }}</span>
                      <a class="content-item__title" [href]="item.fileUrl" target="_blank" rel="noopener">
                        {{ item.title }}
                      </a>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .material-panel, .materials-list { margin-bottom: 18px; }
    .material-panel__header h2, .list-header h2 { font-size: var(--font-size-lg); margin: 0 0 4px; }
    .material-panel__header p { color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0 0 16px; }
    .material-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); }
    .field--wide { grid-column: span 2; }
    .field small { text-transform: none; font-weight: 500; color: var(--color-text-muted); }
    .input { width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 9px 10px; background: var(--color-surface); font-size: var(--font-size-sm); }
    .mode-toggle { display: flex; align-items: end; gap: 8px; }
    .mode-btn { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-md); padding: 9px 12px; cursor: pointer; }
    .mode-btn--active { border-color: var(--layout-accent, #0d9488); background: var(--layout-accent-light, #ccfbf1); color: var(--layout-accent, #0d9488); font-weight: 700; }
    .material-actions { margin-top: 14px; display: flex; justify-content: flex-end; }
    .btn-xs { padding: 4px 8px; font-size: var(--font-size-xs); }
    .form-error { margin-top: 12px; padding: 10px 12px; border: 1px solid #fecaca; border-radius: var(--radius-md); background: #fef2f2; color: var(--color-danger); font-size: var(--font-size-sm); }
    .list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .list-header span { color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .material-items { display: flex; flex-direction: column; gap: 8px; }
    .material-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); color: inherit; text-decoration: none; }
    .material-item:hover { border-color: var(--layout-accent, #0d9488); }
    .material-item--muted { opacity: .72; background: var(--color-bg); }
    .material-item__type { min-width: 78px; text-transform: uppercase; font-size: var(--font-size-xs); font-weight: 700; color: var(--layout-accent, #0d9488); }
    .material-item__body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .material-item__body a { color: var(--layout-accent, #0d9488); font-weight: 700; text-decoration: none; }
    .material-item__body a:hover { text-decoration: underline; }
    .material-item__body small { color: var(--color-text-muted); }
    .material-item__status { font-size: var(--font-size-xs); color: var(--color-success); }
    .material-item__status--off { color: var(--color-text-muted); }
    .material-item__actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .confirm-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, .36); z-index: 300; display: grid; place-items: center; padding: 20px; }
    .confirm-box { width: min(420px, 100%); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 18px; }
    .confirm-box h3 { margin: 0 0 8px; font-size: var(--font-size-lg); }
    .confirm-box p { margin: 0; color: var(--color-text-muted); font-size: var(--font-size-sm); line-height: 1.45; }
    .confirm-actions { margin-top: 18px; display: flex; justify-content: flex-end; gap: 8px; }
    .course-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .course-tab {
      padding: 6px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      transition: all .15s;
    }
    .course-tab:hover { border-color: var(--layout-accent, #0d9488); }
    .course-tab--active { background: var(--layout-accent, #0d9488); color: #fff; border-color: var(--layout-accent, #0d9488); }
    .content-header { margin-bottom: 16px; }
    .content-header__title { font-size: var(--font-size-lg); font-weight: 700; margin-bottom: 4px; }
    .sessions-list { display: flex; flex-direction: column; gap: 8px; }
    .session-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .session-card__title { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .session-card__order {
      width: 26px; height: 26px;
      background: var(--layout-accent-light, #ccfbf1);
      color: var(--layout-accent, #0d9488);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-xs);
      font-weight: 700;
      flex-shrink: 0;
    }
    .session-card__meta { display: flex; align-items: center; gap: 12px; }
    .session-card__toggle { color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .session-card__items { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 8px; }
    .content-item { display: flex; align-items: center; gap: 10px; }
    .content-item__title { font-size: var(--font-size-sm); color: var(--layout-accent, #0d9488); text-decoration: underline; }
    @media (max-width: 720px) { .field--wide { grid-column: auto; } .material-item { align-items: flex-start; flex-direction: column; } .material-item__actions { justify-content: flex-start; } }
  `],
})
export class TeacherContentComponent implements OnInit {
  private readonly teacherSvc = inject(TeacherService);
  private readonly mediaSvc = inject(MediaService);

  readonly batches         = signal<TeacherBatch[]>([]);
  readonly courses         = signal<{ id: number; name: string; code: string }[]>([]);
  readonly courseContent   = signal<CourseContent | null>(null);
  readonly sessions        = signal<Session[]>([]);
  readonly selectedCourseId = signal<number | null>(null);
  readonly expandedSessions = signal<Set<number>>(new Set());
  readonly loading         = signal(false);
  readonly error           = signal<string | null>(null);
  readonly materialMode    = signal<MaterialMode>('upload');
  readonly materials       = signal<BatchMaterial[]>([]);
  readonly materialsLoading = signal(false);
  readonly savingMaterial  = signal(false);
  readonly materialError   = signal<string | null>(null);
  readonly editingMaterialId = signal<number | null>(null);
  readonly archiveTarget   = signal<BatchMaterial | null>(null);
  selectedFile: File | null = null;
  materialForm: {
    batchId: number | null;
    title: string;
    description: string;
    materialType: UploadCategory | 'link';
    externalUrl: string;
    contentCategory: ContentCategory;
    lectureDate: string;
  } = { batchId: null, title: '', description: '', materialType: 'pdf', externalUrl: '', contentCategory: 'study_resource', lectureDate: '' };

  ngOnInit(): void {
    this.teacherSvc.getMyBatches().subscribe({
      next: (batches) => {
        this.batches.set(batches);
        // Deduplicate courses across batches
        const seen = new Map<number, { id: number; name: string; code: string }>();
        batches.forEach((b) => seen.set(b.course.id, b.course));
        const uniqueCourses = [...seen.values()];
        this.courses.set(uniqueCourses);
        if (batches.length > 0) {
          this.materialForm.batchId = batches[0].id;
          this.loadMaterialsForSelectedBatch();
        }
        if (uniqueCourses.length > 0) this.selectCourse(uniqueCourses[0].id);
      },
    });
  }

  selectCourse(courseId: number): void {
    this.selectedCourseId.set(courseId);
    this.loading.set(true);
    this.error.set(null);
    this.courseContent.set(null);
    this.sessions.set([]);
    this.teacherSvc.getCourseContent(courseId).subscribe({
      next: (data) => {
        this.courseContent.set(data.courseContent);
        this.sessions.set(data.sessions);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message === 'Course content not found or not yet published'
          ? 'No published content for this course yet.'
          : err.message);
        this.loading.set(false);
      },
    });
  }

  toggleSession(id: number): void {
    this.expandedSessions.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  loadMaterialsForSelectedBatch(): void {
    if (!this.materialForm.batchId) {
      this.materials.set([]);
      return;
    }
    this.materialsLoading.set(true);
    this.teacherSvc.getMaterialsByBatch(this.materialForm.batchId).subscribe({
      next: (items) => { this.materials.set(items); this.materialsLoading.set(false); },
      error: () => { this.materials.set([]); this.materialsLoading.set(false); },
    });
  }

  saveMaterial(): void {
    this.materialError.set(null);
    if (!this.materialForm.batchId || !this.materialForm.title.trim()) {
      this.materialError.set('Select a batch and enter a title.');
      return;
    }
    if (this.materialForm.contentCategory === 'recorded_lecture' && !this.materialForm.lectureDate) {
      this.materialError.set('Lecture date is required for recorded lectures.');
      return;
    }
    const editing = this.editingMaterial();
    const replacingLinkWithFile = !!editing && editing.materialType === 'link' && this.materialMode() === 'upload';
    if (this.materialMode() === 'upload' && !this.selectedFile && (!editing || replacingLinkWithFile)) {
      this.materialError.set('Choose a file to upload.');
      return;
    }
    if (this.materialMode() === 'link' && !this.isYouTubeUrl(this.materialForm.externalUrl)) {
      this.materialError.set('Enter a valid YouTube URL.');
      return;
    }

    const batch = this.batches().find((item) => item.id === this.materialForm.batchId);
    if (!batch) {
      this.materialError.set('Selected batch is not available.');
      return;
    }

    this.savingMaterial.set(true);

    const save = (mediaAssetId?: number | null) => {
      const payload = {
        batchId: this.materialForm.batchId!,
        title: this.materialForm.title.trim(),
        description: this.materialForm.description.trim() || undefined,
        materialType: this.materialMode() === 'link' ? 'link' : this.materialForm.materialType,
        contentCategory: this.materialForm.contentCategory,
        lectureDate: this.materialForm.lectureDate || null,
        mediaAssetId: mediaAssetId,
        externalUrl: this.materialMode() === 'link' ? this.materialForm.externalUrl.trim() : null,
        isPublished: true,
      };
      const request = editing
        ? this.teacherSvc.updateMaterial(editing.id, payload)
        : this.teacherSvc.createMaterial({ ...payload, mediaAssetId: mediaAssetId ?? null });

      request.subscribe({
        next: (item) => {
          this.materials.update((items) => editing
            ? items.map((existing) => existing.id === item.id ? item : existing)
            : [item, ...items]);
          this.resetMaterialForm();
          this.savingMaterial.set(false);
        },
        error: (err) => {
          this.materialError.set(err.error?.error ?? 'Failed to publish material.');
          this.savingMaterial.set(false);
        },
      });
    };

    if (this.materialMode() === 'link') {
      save(null);
      return;
    }

    if (editing && !this.selectedFile) {
      save(undefined);
      return;
    }

    this.mediaSvc.upload(this.selectedFile!, {
      title: this.materialForm.title.trim(),
      uploadCategory: this.materialForm.materialType as UploadCategory,
      ownerScope: 'branch',
      branchId: batch.branch.id,
    }).subscribe({
      next: (result) => save(result.asset.id),
      error: (err) => {
        this.materialError.set(err.error?.error ?? 'Failed to upload file.');
        this.savingMaterial.set(false);
      },
    });
  }

  materialUrl(item: BatchMaterial): string {
    return item.fileUrl || item.externalUrl || item.mediaAsset?.fileUrl || '#';
  }

  startEdit(item: BatchMaterial): void {
    this.editingMaterialId.set(item.id);
    this.materialError.set(null);
    this.selectedFile = null;
    this.materialMode.set(item.materialType === 'link' ? 'link' : 'upload');
    this.materialForm = {
      batchId: item.batchId,
      title: item.title,
      description: item.description ?? '',
      materialType: item.materialType === 'link' ? 'video' : item.materialType as UploadCategory,
      externalUrl: item.externalUrl ?? '',
      contentCategory: item.contentCategory,
      lectureDate: this.toDateInputValue(item.lectureDate),
    };
  }

  cancelEdit(): void {
    this.resetMaterialForm();
  }

  togglePublished(item: BatchMaterial): void {
    this.materialError.set(null);
    this.teacherSvc.setMaterialPublished(item.id, !item.isPublished).subscribe({
      next: (updated) => this.materials.update((items) => items.map((existing) => existing.id === updated.id ? updated : existing)),
      error: (err) => this.materialError.set(err.error?.error ?? 'Failed to update publish status.'),
    });
  }

  requestArchive(item: BatchMaterial): void {
    this.archiveTarget.set(item);
  }

  archiveMaterial(): void {
    const target = this.archiveTarget();
    if (!target) return;
    this.materialError.set(null);
    this.teacherSvc.archiveMaterial(target.id).subscribe({
      next: () => {
        this.materials.update((items) => items.filter((item) => item.id !== target.id));
        if (this.editingMaterialId() === target.id) this.resetMaterialForm();
        this.archiveTarget.set(null);
      },
      error: (err) => {
        this.materialError.set(err.error?.error ?? 'Failed to archive material.');
        this.archiveTarget.set(null);
      },
    });
  }

  private editingMaterial(): BatchMaterial | null {
    const id = this.editingMaterialId();
    return id ? this.materials().find((item) => item.id === id) ?? null : null;
  }

  private resetMaterialForm(): void {
    const batchId = this.materialForm.batchId;
    this.editingMaterialId.set(null);
    this.selectedFile = null;
    this.materialMode.set('upload');
    this.materialForm = { batchId, title: '', description: '', materialType: 'pdf', externalUrl: '', contentCategory: 'study_resource', lectureDate: '' };
  }

  categoryLabel(category: string): string {
    const labels: Record<string, string> = {
      recorded_lecture: 'Recorded lecture',
      recommended_video: 'Recommended training video',
      study_resource: 'Study resource',
    };
    return labels[category] ?? 'Study resource';
  }

  categoryHelpText(): string {
    if (this.materialForm.contentCategory === 'recorded_lecture') return 'Use this for online class recordings and add the lecture date.';
    if (this.materialForm.contentCategory === 'recommended_video') return 'Use this for teacher-recommended training videos.';
    return 'Use this for PPT, PDF, notes, documents and worksheets.';
  }

  formatDate(value: string | null): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private toDateInputValue(value: string | null): string {
    if (!value) return '';
    return value.slice(0, 10);
  }

  private isYouTubeUrl(value: string): boolean {
    try {
      const url = new URL(value.trim());
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
    } catch {
      return false;
    }
  }
}
