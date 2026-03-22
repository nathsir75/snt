import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PageService } from './page.service';
import {
  PageSection, SectionType,
  SECTION_TYPE_LABELS, SECTION_TYPE_ICONS,
} from './page.models';
import { MediaPickerComponent } from '../../shared/components/media-picker/media-picker.component';
import { MediaAsset } from '../media-library/media.models';

const SECTION_TYPES: SectionType[] = [
  'hero', 'text', 'gallery', 'cta', 'banner', 'stats', 'features', 'testimonials', 'contact', 'collection',
];

@Component({
  selector: 'snt-section-editor',
  standalone: true,
  imports: [ReactiveFormsModule, MediaPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div class="modal modal-wide" (click)="$event.stopPropagation()" role="dialog" aria-label="Section Editor">

          <div class="modal-header">
            <h3 class="modal-title">
              {{ section ? 'Edit Section' : 'Add Section' }}
              @if (selectedType()) {
                <span class="type-badge">{{ typeIcon(selectedType()!) }} {{ typeLabel(selectedType()!) }}</span>
              }
            </h3>
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

            <!-- Type selector (only for new sections) -->
            @if (!section) {
              <div class="type-grid">
                @for (t of sectionTypes; track t) {
                  <button
                    type="button"
                    class="type-option"
                    [class.type-option-selected]="selectedType() === t"
                    (click)="selectType(t)"
                  >
                    <span class="type-opt-icon">{{ typeIcon(t) }}</span>
                    <span class="type-opt-label">{{ typeLabel(t) }}</span>
                  </button>
                }
              </div>
            }

            <form [formGroup]="form">
              <div class="form-row">
                <div class="form-group">
                  <label for="sectionTitle">Section Title (internal)</label>
                  <input id="sectionTitle" formControlName="sectionTitle" placeholder="e.g. Main Hero" />
                </div>
                <div class="form-group">
                  <label for="order">Order *</label>
                  <input id="order" type="number" formControlName="order" min="1" />
                </div>
              </div>

              <!-- Dynamic fields per type -->
              @switch (selectedType()) {
                @case ('hero') {
                  <div class="form-group">
                    <label>Heading *</label>
                    <input formControlName="heading" placeholder="Welcome to Our Institute" />
                  </div>
                  <div class="form-group">
                    <label>Subheading</label>
                    <input formControlName="subheading" placeholder="Empowering students since 2010" />
                  </div>
                  <div class="form-group">
                    <label>Background Image URL</label>
                    <div class="url-row">
                      <input formControlName="imageUrl" placeholder="https://…" />
                      <button type="button" class="btn btn-secondary btn-sm" (click)="openPicker('imageUrl')">🖼️ Pick</button>
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>CTA Button Label</label>
                      <input formControlName="ctaLabel" placeholder="Enroll Now" />
                    </div>
                    <div class="form-group">
                      <label>CTA Button URL</label>
                      <input formControlName="ctaUrl" placeholder="/courses" />
                    </div>
                  </div>
                }
                @case ('text') {
                  <div class="form-group">
                    <label>Content *</label>
                    <textarea formControlName="content" rows="5" placeholder="Enter your text content here…"></textarea>
                  </div>
                  <div class="form-group">
                    <label>Alignment</label>
                    <select formControlName="alignment">
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                }
                @case ('gallery') {
                  <div class="form-group">
                    <label>Image URLs (one per line)</label>
                    <textarea formControlName="galleryImages" rows="5" placeholder="https://image1.jpg&#10;https://image2.jpg"></textarea>
                    <span class="field-hint">Enter one image URL per line</span>
                  </div>
                }
                @case ('cta') {
                  <div class="form-group">
                    <label>Heading *</label>
                    <input formControlName="heading" placeholder="Ready to start your journey?" />
                  </div>
                  <div class="form-group">
                    <label>Subheading</label>
                    <input formControlName="subheading" placeholder="Join thousands of students" />
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Button Label *</label>
                      <input formControlName="ctaLabel" placeholder="Get Started" />
                    </div>
                    <div class="form-group">
                      <label>Button URL *</label>
                      <input formControlName="ctaUrl" placeholder="/contact" />
                    </div>
                  </div>
                }
                @case ('banner') {
                  <div class="form-group">
                    <label>Banner Text *</label>
                    <input formControlName="bannerText" placeholder="🎉 Admissions open for 2025 batch!" />
                  </div>
                  <div class="form-group">
                    <label>Background Image URL</label>
                    <div class="url-row">
                      <input formControlName="imageUrl" placeholder="https://…" />
                      <button type="button" class="btn btn-secondary btn-sm" (click)="openPicker('imageUrl')">🖼️ Pick</button>
                    </div>
                  </div>
                }
                @case ('stats') {
                  <div class="form-group">
                    <label>Section Heading</label>
                    <input formControlName="heading" placeholder="Our Achievements" />
                  </div>
                  <div class="form-group">
                    <label>Stats (one per line: Label|Value, e.g. Students Trained|5000+)</label>
                    <textarea formControlName="statsItems" rows="5" placeholder="Students Trained|5000+&#10;Courses Offered|20+&#10;Placement Rate|95%&#10;Years of Excellence|10+"></textarea>
                    <span class="field-hint">Format: Label|Value — one per line</span>
                  </div>
                }
                @case ('features') {
                  <div class="form-group">
                    <label>Section Heading</label>
                    <input formControlName="heading" placeholder="Why Choose Us" />
                  </div>
                  <div class="form-group">
                    <label>Feature Cards (one per line: Icon|Title|Description)</label>
                    <textarea formControlName="featuresItems" rows="6" placeholder="🎓|Expert Faculty|Industry professionals with 10+ years&#10;💼|Placement Support|100% placement assistance&#10;📚|Practical Training|Hands-on project-based learning"></textarea>
                    <span class="field-hint">Format: Icon|Title|Description — one per line</span>
                  </div>
                }
                @case ('testimonials') {
                  <div class="form-group">
                    <label>Section Heading</label>
                    <input formControlName="heading" placeholder="What Our Students Say" />
                  </div>
                  <div class="form-group">
                    <label>Testimonials (one per line: Name|Role|Quote)</label>
                    <textarea formControlName="testimonialsItems" rows="6" placeholder="Rahul Sharma|Web Developer|This course changed my career completely!&#10;Priya Patel|Data Analyst|Best institute in the city for practical training."></textarea>
                    <span class="field-hint">Format: Name|Role|Quote — one per line</span>
                  </div>
                }
                @case ('contact') {
                  <div class="form-group">
                    <label>Section Heading</label>
                    <input formControlName="heading" placeholder="Get In Touch" />
                  </div>
                  <div class="form-group">
                    <label>Subheading / Description</label>
                    <input formControlName="subheading" placeholder="We'd love to hear from you" />
                  </div>
                  <div class="form-group">
                    <label>Show Enquiry Form</label>
                    <label class="toggle-label">
                      <input type="checkbox" formControlName="showForm" />
                      <span>Display contact/enquiry form on this section</span>
                    </label>
                  </div>
                }
                @case ('collection') {
                  <div class="form-group">
                    <label>Section Heading</label>
                    <input formControlName="heading" placeholder="Our Projects" />
                  </div>
                  <div class="form-group">
                    <label>Collection Type *</label>
                    <select formControlName="collectionType">
                      <option value="">— Select type —</option>
                      <option value="project">Projects</option>
                      <option value="activity">Activities</option>
                      <option value="news">News</option>
                      <option value="gallery">Gallery</option>
                      <option value="award">Awards</option>
                      <option value="client">Clients</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Max Items to Show</label>
                    <input type="number" formControlName="collectionLimit" min="1" max="50" placeholder="6" />
                  </div>
                }
                @default {
                  <div class="form-group">
                    <label>Content / Notes</label>
                    <textarea formControlName="content" rows="4" placeholder="Configure this section…"></textarea>
                  </div>
                }
              }

              <div class="form-group">
                <label class="toggle-label">
                  <input type="checkbox" formControlName="isVisible" />
                  <span>Visible on page</span>
                </label>
              </div>
            </form>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="loading() || !selectedType()" (click)="submit()">
              {{ loading() ? 'Saving…' : (section ? 'Update Section' : 'Add Section') }}
            </button>
          </div>

        </div>
      </div>
    }

    <snt-media-picker
      [open]="pickerOpen()"
      filterType="image"
      (picked)="onMediaPicked($event)"
      (cancel)="pickerOpen.set(false)"
    />
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 300; padding: 16px;
    }
    .modal {
      background: var(--color-surface); border-radius: var(--radius-lg);
      width: 100%; max-width: 560px; max-height: 90vh;
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column;
      animation: modal-in .18s ease;
    }
    .modal-wide { max-width: 640px; }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px 14px; border-bottom: 1px solid var(--color-border); flex-shrink: 0;
    }
    .modal-title { font-size: var(--font-size-md); font-weight: 700; display: flex; align-items: center; gap: 10px; }
    .type-badge {
      font-size: var(--font-size-xs); font-weight: 600;
      background: var(--color-primary-light); color: var(--color-primary);
      padding: 2px 8px; border-radius: 999px;
    }
    .modal-close {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: var(--radius-md); color: var(--color-text-muted);
    }
    .modal-close:hover { background: var(--color-bg); }
    .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 14px 24px; border-top: 1px solid var(--color-border); flex-shrink: 0;
    }
    .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
    .type-option {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 10px 6px; border: 2px solid var(--color-border);
      border-radius: var(--radius-md); cursor: pointer; transition: all .12s;
      background: var(--color-bg);
    }
    .type-option:hover { border-color: var(--color-primary); }
    .type-option-selected { border-color: var(--color-primary); background: var(--color-primary-light); }
    .type-opt-icon { font-size: 20px; }
    .type-opt-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); text-align: center; }
    .type-option-selected .type-opt-label { color: var(--color-primary); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .url-row { display: flex; gap: 8px; }
    .url-row input { flex: 1; }
    .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: var(--font-size-sm); }
    .toggle-label input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; }
    .field-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; display: block; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    textarea { resize: vertical; min-height: 80px; }
    @keyframes modal-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class SectionEditorComponent implements OnChanges {
  @Input() open = false;
  @Input() pageId: number | null = null;
  @Input() section: PageSection | null = null;
  @Input() nextOrder = 1;

  @Output() saved  = new EventEmitter<PageSection>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(PageService);

  readonly loading      = signal(false);
  readonly serverError  = signal<string | null>(null);
  readonly selectedType = signal<SectionType | null>(null);
  readonly pickerOpen   = signal(false);

  private pickerTargetField = '';

  readonly sectionTypes = SECTION_TYPES;

  readonly form = this.fb.nonNullable.group({
    sectionTitle:  [''],
    order:         [1, [Validators.required, Validators.min(1)]],
    isVisible:     [true],
    // Hero / Banner / CTA
    heading:       [''],
    subheading:    [''],
    imageUrl:      [''],
    ctaLabel:      [''],
    ctaUrl:        [''],
    // Text
    content:       [''],
    alignment:     ['left'],
    // Gallery
    galleryImages: [''],
    // Banner
    bannerText:    [''],
    // Stats
    statsItems:    [''],
    // Features
    featuresItems: [''],
    // Testimonials
    testimonialsItems: [''],
    // Contact
    showForm:      [true],
    // Collection
    collectionType:  [''],
    collectionLimit: [6],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.serverError.set(null);
      if (this.section) {
        this.selectedType.set(this.section.sectionType);
        this.patchFromSection(this.section);
      } else {
        this.selectedType.set(null);
        this.form.reset({ order: this.nextOrder, isVisible: true, alignment: 'left' });
      }
    }
    if (changes['nextOrder'] && !this.section) {
      this.form.patchValue({ order: this.nextOrder });
    }
  }

  private patchFromSection(s: PageSection): void {
    const c = s.configJson;
    this.form.patchValue({
      sectionTitle:  s.title ?? '',
      order:         s.order,
      isVisible:     s.isVisible,
      heading:       (c['heading'] as string) ?? '',
      subheading:    (c['subheading'] as string) ?? '',
      imageUrl:      (c['imageUrl'] as string) ?? '',
      ctaLabel:      (c['ctaLabel'] as string) ?? '',
      ctaUrl:        (c['ctaUrl'] as string) ?? '',
      content:       (c['content'] as string) ?? '',
      alignment:     (c['alignment'] as string) ?? 'left',
      galleryImages: Array.isArray(c['images'])
        ? (c['images'] as { url: string }[]).map((i) => i.url).join('\n')
        : '',
      bannerText:    (c['text'] as string) ?? '',
      statsItems:    Array.isArray(c['stats'])
        ? (c['stats'] as { label: string; value: string }[]).map(s => `${s.label}|${s.value}`).join('\n')
        : '',
      featuresItems: Array.isArray(c['features'])
        ? (c['features'] as { icon: string; title: string; description: string }[]).map(f => `${f.icon}|${f.title}|${f.description}`).join('\n')
        : '',
      testimonialsItems: Array.isArray(c['testimonials'])
        ? (c['testimonials'] as { name: string; role: string; quote: string }[]).map(t => `${t.name}|${t.role}|${t.quote}`).join('\n')
        : '',
      showForm:      (c['showForm'] as boolean) ?? true,
      collectionType:  (c['collectionType'] as string) ?? '',
      collectionLimit: (c['limit'] as number) ?? 6,
    });
  }

  selectType(t: SectionType): void { this.selectedType.set(t); }

  typeLabel(t: SectionType): string { return SECTION_TYPE_LABELS[t]; }
  typeIcon(t: SectionType): string  { return SECTION_TYPE_ICONS[t]; }

  openPicker(field: string): void {
    this.pickerTargetField = field;
    this.pickerOpen.set(true);
  }

  onMediaPicked(asset: MediaAsset): void {
    this.pickerOpen.set(false);
    if (this.pickerTargetField === 'imageUrl') {
      this.form.patchValue({ imageUrl: asset.fileUrl });
    }
  }

  private buildConfigJson(): Record<string, unknown> {
    const v = this.form.getRawValue();
    const t = this.selectedType();
    switch (t) {
      case 'hero':
        return { heading: v.heading, subheading: v.subheading || undefined, imageUrl: v.imageUrl || undefined, ctaLabel: v.ctaLabel || undefined, ctaUrl: v.ctaUrl || undefined };
      case 'text':
        return { content: v.content, alignment: v.alignment };
      case 'gallery':
        return { images: v.galleryImages.split('\n').filter(Boolean).map((url) => ({ url: url.trim() })) };
      case 'cta':
        return { heading: v.heading, subheading: v.subheading || undefined, buttonLabel: v.ctaLabel, buttonUrl: v.ctaUrl };
      case 'banner':
        return { text: v.bannerText, imageUrl: v.imageUrl || undefined };
      case 'stats':
        return {
          heading: v.heading || undefined,
          stats: v.statsItems.split('\n').filter(Boolean).map(line => {
            const [label, value] = line.split('|');
            return { label: (label ?? '').trim(), value: (value ?? '').trim() };
          }),
        };
      case 'features':
        return {
          heading: v.heading || undefined,
          features: v.featuresItems.split('\n').filter(Boolean).map(line => {
            const [icon, title, description] = line.split('|');
            return { icon: (icon ?? '').trim(), title: (title ?? '').trim(), description: (description ?? '').trim() };
          }),
        };
      case 'testimonials':
        return {
          heading: v.heading || undefined,
          testimonials: v.testimonialsItems.split('\n').filter(Boolean).map(line => {
            const [name, role, quote] = line.split('|');
            return { name: (name ?? '').trim(), role: (role ?? '').trim(), quote: (quote ?? '').trim() };
          }),
        };
      case 'contact':
        return { heading: v.heading || undefined, subheading: v.subheading || undefined, showForm: v.showForm };
      case 'collection':
        return { heading: v.heading || undefined, collectionType: v.collectionType, limit: Number(v.collectionLimit) || 6 };
      default:
        return { content: v.content };
    }
  }

  submit(): void {
    if (!this.selectedType() || !this.pageId) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();
    const configJson = this.buildConfigJson();

    const call$ = this.section
      ? this.svc.updateSection(this.section.id, {
          title:      v.sectionTitle || undefined,
          order:      Number(v.order),
          configJson,
          isVisible:  v.isVisible,
        })
      : this.svc.addSection(this.pageId, {
          sectionType: this.selectedType()!,
          title:       v.sectionTitle || undefined,
          order:       Number(v.order),
          configJson,
          isVisible:   v.isVisible,
        });

    call$.subscribe({
      next:  (s) => { this.loading.set(false); this.saved.emit(s); },
      error: (e: Error) => {
        const msg = e.message === 'SECTION_ORDER_CONFLICT'
          ? `Order ${v.order} is already taken. Use a different order.`
          : e.message;
        this.serverError.set(msg);
        this.loading.set(false);
      },
    });
  }
}
