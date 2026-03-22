import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LmsService } from './lms.service';
import { CourseService } from '../courses/course.service';
import { Course } from '../courses/course.models';
import { Session, ContentItem, CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS } from './lms.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

type LoadState = 'idle' | 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-lms-viewer',
  standalone: true,
  imports: [FormsModule, PageShellComponent, PageStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="LMS"
      subtitle="Browse course content, sessions and learning materials"
      icon="🖥️"
    >
      <ng-container slot="filters">
        <div class="filter-bar">
          <select class="filter-select filter-wide" [(ngModel)]="selectedCourseId" (ngModelChange)="onCourseChange()">
            <option [value]="null">Select a course…</option>
            @for (c of courses(); track c.id) {
              <option [value]="c.id">{{ c.name }} ({{ c.code }})</option>
            }
          </select>
        </div>
      </ng-container>

      @switch (state()) {
        @case ('idle') {
          <snt-page-state type="empty" title="Select a course" description="Choose a course above to browse its learning content." />
        }
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error') {
          <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="loadContent()" />
        }
        @case ('ready') {
          @if (!sessions().length) {
            <snt-page-state type="empty" title="No content available" description="This course has no published content yet." />
          } @else {
            <div class="viewer-layout">

              <!-- Session sidebar -->
              <aside class="session-sidebar">
                <p class="sidebar-label">Sessions</p>
                @for (s of sessions(); track s.id) {
                  <button
                    class="session-btn"
                    [class.session-btn-active]="activeSession()?.id === s.id"
                    (click)="selectSession(s)"
                  >
                    <span class="session-num">{{ s.order }}</span>
                    <span class="session-name">{{ s.title }}</span>
                    @if (s.durationMinutes) {
                      <span class="session-dur">{{ s.durationMinutes }}m</span>
                    }
                  </button>
                }
              </aside>

              <!-- Content panel -->
              <div class="content-panel">
                @if (!activeSession()) {
                  <div class="content-placeholder">
                    <p>Select a session from the left to view its content.</p>
                  </div>
                } @else if (!activeSession()!.contentItems.length) {
                  <snt-page-state type="empty" [compact]="true" title="No items in this session" description="This session has no content items yet." />
                } @else {
                  <!-- Item list -->
                  <div class="items-nav">
                    @for (item of activeSession()!.contentItems; track item.id) {
                      <button
                        class="item-nav-btn"
                        [class.item-nav-btn-active]="activeItem()?.id === item.id"
                        (click)="selectItem(item)"
                      >
                        <span>{{ typeIcon(item.type) }}</span>
                        <span class="item-nav-title">{{ item.title }}</span>
                        @if (item.isPreview) {
                          <snt-badge label="Preview" variant="info" />
                        }
                      </button>
                    }
                  </div>

                  <!-- Content viewer -->
                  @if (activeItem(); as item) {
                    <div class="content-viewer">
                      <div class="viewer-header">
                        <span class="viewer-type-icon">{{ typeIcon(item.type) }}</span>
                        <div>
                          <h2 class="viewer-title">{{ item.title }}</h2>
                          <p class="viewer-type-label">{{ typeLabel(item.type) }}</p>
                        </div>
                      </div>

                      @if (item.type === 'video') {
                        <div class="video-wrapper">
                          @if (safeVideoUrl()) {
                            <iframe
                              [src]="safeVideoUrl()!"
                              class="video-frame"
                              frameborder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowfullscreen
                            ></iframe>
                          } @else {
                            <div class="url-fallback">
                              <p>Cannot embed this video. <a [href]="item.fileUrl" target="_blank" rel="noopener">Open in new tab →</a></p>
                            </div>
                          }
                        </div>
                      } @else if (item.type === 'pdf') {
                        <div class="pdf-wrapper">
                          <iframe [src]="safePdfUrl()!" class="pdf-frame" frameborder="0"></iframe>
                        </div>
                      } @else {
                        <div class="link-viewer">
                          <p class="link-desc">This content is available as an external resource.</p>
                          <a [href]="item.fileUrl" target="_blank" rel="noopener" class="btn btn-primary">
                            Open {{ typeLabel(item.type) }} →
                          </a>
                        </div>
                      }
                    </div>
                  }
                }
              </div>

            </div>
          }
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .filter-bar {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 12px 16px; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    }
    .filter-select {
      padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none; cursor: pointer;
    }
    .filter-wide { min-width: 280px; }
    .viewer-layout { display: grid; grid-template-columns: 260px 1fr; gap: 16px; min-height: 500px; }
    .session-sidebar {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 12px; display: flex; flex-direction: column; gap: 4px;
    }
    .sidebar-label { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--color-text-muted); padding: 4px 8px 8px; }
    .session-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 10px; border-radius: var(--radius-md);
      text-align: left; width: 100%; transition: background .12s;
    }
    .session-btn:hover { background: var(--color-bg); }
    .session-btn-active { background: var(--color-primary-light); }
    .session-num {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      background: var(--color-bg); border: 1px solid var(--color-border);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: var(--color-text-muted);
    }
    .session-btn-active .session-num { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .session-name { flex: 1; font-size: var(--font-size-sm); font-weight: 500; }
    .session-dur { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }
    .content-panel { display: flex; flex-direction: column; gap: 12px; }
    .content-placeholder { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .items-nav { display: flex; flex-direction: column; gap: 4px; }
    .item-nav-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: var(--radius-md);
      background: var(--color-surface); border: 1px solid var(--color-border);
      text-align: left; transition: all .12s;
    }
    .item-nav-btn:hover { border-color: var(--color-primary); }
    .item-nav-btn-active { border-color: var(--color-primary); background: var(--color-primary-light); }
    .item-nav-title { flex: 1; font-size: var(--font-size-sm); font-weight: 500; }
    .content-viewer {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .viewer-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--color-border); }
    .viewer-type-icon { font-size: 24px; }
    .viewer-title { font-size: var(--font-size-md); font-weight: 700; }
    .viewer-type-label { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; }
    .video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; }
    .video-frame { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    .pdf-wrapper { height: 600px; }
    .pdf-frame { width: 100%; height: 100%; }
    .link-viewer { padding: 32px 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
    .link-desc { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .url-fallback { padding: 24px; text-align: center; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .url-fallback a { color: var(--color-primary); }
  `],
})
export class LmsViewerComponent implements OnInit {
  private readonly lmsSvc     = inject(LmsService);
  private readonly courseSvc  = inject(CourseService);
  private readonly sanitizer  = inject(DomSanitizer);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly state         = signal<LoadState>('idle');
  readonly errorMsg      = signal<string | null>(null);
  readonly courses       = signal<Course[]>([]);
  readonly sessions      = signal<Session[]>([]);
  readonly activeSession = signal<Session | null>(null);
  readonly activeItem    = signal<ContentItem | null>(null);

  selectedCourseId = signal<number | null>(null);

  readonly safeVideoUrl = computed((): SafeResourceUrl | null => {
    const item = this.activeItem();
    if (!item || item.type !== 'video') return null;
    const embedUrl = this.toYouTubeEmbed(item.fileUrl);
    return embedUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl) : null;
  });

  readonly safePdfUrl = computed((): SafeResourceUrl | null => {
    const item = this.activeItem();
    if (!item || item.type !== 'pdf') return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(item.fileUrl);
  });

  ngOnInit(): void {
    this.courseSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.courses.set(c), error: () => {} });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('courseId');
        if (id) {
          this.selectedCourseId.set(Number(id));
          this.loadContent();
        }
      });
  }

  onCourseChange(): void {
    if (this.selectedCourseId()) {
      this.router.navigate([], { queryParams: { courseId: this.selectedCourseId() }, queryParamsHandling: 'merge' });
      this.loadContent();
    } else {
      this.state.set('idle');
      this.sessions.set([]);
      this.activeSession.set(null);
      this.activeItem.set(null);
    }
  }

  loadContent(): void {
    const id = this.selectedCourseId();
    if (!id) return;

    this.state.set('loading');
    this.activeSession.set(null);
    this.activeItem.set(null);

    this.lmsSvc.getCourseContent(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.sessions.set(res.sessions);
          this.state.set('ready');
          if (res.sessions.length) this.selectSession(res.sessions[0]);
        },
        error: (e: Error) => {
          this.errorMsg.set(e.message);
          this.state.set('error');
        },
      });
  }

  selectSession(s: Session): void {
    this.activeSession.set(s);
    this.activeItem.set(s.contentItems.length ? s.contentItems[0] : null);
  }

  selectItem(item: ContentItem): void {
    this.activeItem.set(item);
  }

  typeLabel(type: string): string {
    return CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] ?? type;
  }

  typeIcon(type: string): string {
    return CONTENT_TYPE_ICONS[type as keyof typeof CONTENT_TYPE_ICONS] ?? '📎';
  }

  private toYouTubeEmbed(url: string): string | null {
    // Handle youtu.be/ID and youtube.com/watch?v=ID
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    const longMatch = url.match(/[?&]v=([^&]+)/);
    if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
    // Already an embed URL
    if (url.includes('youtube.com/embed/')) return url;
    return null;
  }
}
