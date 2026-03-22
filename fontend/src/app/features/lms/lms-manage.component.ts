import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LmsService } from './lms.service';
import { CourseService } from '../courses/course.service';
import { Course } from '../courses/course.models';
import {
  CourseContentMeta, Session, ContentItem,
  CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS,
} from './lms.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { SessionFormComponent } from './session-form.component';
import { ContentItemFormComponent } from './content-item-form.component';

type LoadState = 'idle' | 'loading' | 'error' | 'ready' | 'no-content';

@Component({
  selector: 'snt-lms-manage',
  standalone: true,
  imports: [
    FormsModule, DatePipe,
    PageShellComponent, PageStateComponent, BadgeComponent,
    SessionFormComponent, ContentItemFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="LMS — Content Manager"
      subtitle="Build course content: sessions, videos, PDFs and learning materials"
      icon="🖥️"
    >
      <ng-container slot="actions">
        @if (courseContent() && !courseContent()!.isPublished) {
          <button class="btn btn-secondary" [disabled]="publishing()" (click)="publish()">
            {{ publishing() ? 'Publishing…' : '🚀 Publish' }}
          </button>
        }
        @if (courseContent()?.isPublished) {
          <span class="published-badge">✅ Published</span>
        }
      </ng-container>

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
          <snt-page-state type="empty" title="Select a course" description="Choose a course above to manage its LMS content." />
        }
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error') {
          <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="loadContent()" />
        }
        @case ('no-content') {
          <snt-page-state
            type="empty"
            title="No content created yet"
            description="Create the content structure for this course to start adding sessions."
            actionLabel="Initialize Content"
            (action)="initContent()"
          />
        }
        @case ('ready') {
          <div class="lms-layout">

            <!-- Course content header -->
            <div class="content-header card">
              <div>
                <h2 class="content-title">{{ courseContent()!.title }}</h2>
                @if (courseContent()!.description) {
                  <p class="content-desc">{{ courseContent()!.description }}</p>
                }
              </div>
              <div class="content-header-right">
                <snt-badge
                  [label]="courseContent()!.isPublished ? 'Published' : 'Draft'"
                  [variant]="courseContent()!.isPublished ? 'success' : 'warning'"
                />
                <span class="text-muted text-xs">{{ sessions().length }} session{{ sessions().length !== 1 ? 's' : '' }}</span>
              </div>
            </div>

            <!-- Sessions list -->
            <div class="sessions-area">
              <div class="sessions-header">
                <h3 class="sessions-title">Sessions</h3>
                <button class="btn btn-primary btn-sm" (click)="openAddSession()">+ Add Session</button>
              </div>

              @if (!sessions().length) {
                <snt-page-state type="empty" [compact]="true" title="No sessions yet" description="Add the first session to start building content." />
              } @else {
                <div class="sessions-list">
                  @for (session of sessions(); track session.id) {
                    <div class="session-card" [class.session-card-expanded]="expandedSessionId() === session.id">

                      <div class="session-row" (click)="toggleSession(session.id)">
                        <div class="session-order">{{ session.order }}</div>
                        <div class="session-info">
                          <span class="session-title">{{ session.title }}</span>
                          @if (session.durationMinutes) {
                            <span class="session-duration">{{ session.durationMinutes }} min</span>
                          }
                        </div>
                        <span class="session-item-count">{{ session.contentItems.length }} item{{ session.contentItems.length !== 1 ? 's' : '' }}</span>
                        <svg class="session-chevron" [class.session-chevron-open]="expandedSessionId() === session.id"
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>

                      @if (expandedSessionId() === session.id) {
                        <div class="session-content">

                          @if (!session.contentItems.length) {
                            <p class="no-items-hint">No content items yet. Add a video, PDF, or other material.</p>
                          } @else {
                            <div class="items-list">
                              @for (item of session.contentItems; track item.id) {
                                <div class="item-row">
                                  <span class="item-type-icon">{{ typeIcon(item.type) }}</span>
                                  <div class="item-info">
                                    <span class="item-title">{{ item.title }}</span>
                                    <span class="item-type-label">{{ typeLabel(item.type) }}</span>
                                  </div>
                                  @if (item.isPreview) {
                                    <snt-badge label="Preview" variant="info" />
                                  }
                                  <button class="btn btn-ghost btn-xs item-delete" (click)="deleteItem(session, item)" title="Delete">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                                    </svg>
                                  </button>
                                </div>
                              }
                            </div>
                          }

                          <button class="btn btn-ghost btn-sm add-item-btn" (click)="openAddItem(session)">
                            + Add Content Item
                          </button>

                        </div>
                      }

                    </div>
                  }
                </div>
              }
            </div>

          </div>
        }
      }
    </snt-page-shell>

    <snt-session-form
      [open]="sessionFormOpen()"
      [courseContentId]="courseContent()?.id ?? null"
      [nextOrder]="nextSessionOrder()"
      (added)="onSessionAdded($event)"
      (cancel)="sessionFormOpen.set(false)"
    />

    <snt-content-item-form
      [open]="itemFormOpen()"
      [sessionId]="addingToSession()?.id ?? null"
      [sessionTitle]="addingToSession()?.title ?? null"
      (added)="onItemAdded($event)"
      (cancel)="itemFormOpen.set(false)"
    />
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
    .published-badge { font-size: var(--font-size-sm); font-weight: 600; color: #059669; }
    .lms-layout { display: flex; flex-direction: column; gap: 20px; }
    .content-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .content-title { font-size: var(--font-size-lg); font-weight: 700; }
    .content-desc { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 4px; }
    .content-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .sessions-area { display: flex; flex-direction: column; gap: 12px; }
    .sessions-header { display: flex; align-items: center; justify-content: space-between; }
    .sessions-title { font-size: var(--font-size-md); font-weight: 700; }
    .sessions-list { display: flex; flex-direction: column; gap: 8px; }
    .session-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .session-card-expanded { border-color: var(--color-primary); }
    .session-row {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; cursor: pointer;
      transition: background .12s;
    }
    .session-row:hover { background: var(--color-bg); }
    .session-order {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: var(--color-bg); border: 1px solid var(--color-border);
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-muted);
    }
    .session-info { flex: 1; display: flex; align-items: center; gap: 10px; }
    .session-title { font-size: var(--font-size-sm); font-weight: 600; }
    .session-duration { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .session-item-count { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }
    .session-chevron { color: var(--color-text-muted); transition: transform .2s; flex-shrink: 0; }
    .session-chevron-open { transform: rotate(180deg); }
    .session-content { padding: 0 16px 16px; border-top: 1px solid var(--color-border); }
    .no-items-hint { font-size: var(--font-size-sm); color: var(--color-text-muted); padding: 12px 0 8px; }
    .items-list { display: flex; flex-direction: column; gap: 4px; padding: 12px 0 8px; }
    .item-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; background: var(--color-bg);
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
    }
    .item-type-icon { font-size: 16px; flex-shrink: 0; }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .item-title { font-size: var(--font-size-sm); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-type-label { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .item-delete { color: var(--color-text-muted); padding: 4px; }
    .item-delete:hover { color: #dc2626; }
    .add-item-btn { margin-top: 4px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .btn-xs { padding: 3px 8px; font-size: var(--font-size-xs); }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: var(--font-size-xs); }
  `],
})
export class LmsManageComponent implements OnInit {
  private readonly lmsSvc     = inject(LmsService);
  private readonly courseSvc  = inject(CourseService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly state        = signal<LoadState>('idle');
  readonly errorMsg     = signal<string | null>(null);
  readonly courses      = signal<Course[]>([]);
  readonly courseContent = signal<CourseContentMeta | null>(null);
  readonly sessions     = signal<Session[]>([]);
  readonly publishing   = signal(false);

  readonly expandedSessionId = signal<number | null>(null);
  readonly sessionFormOpen   = signal(false);
  readonly itemFormOpen      = signal(false);
  readonly addingToSession   = signal<Session | null>(null);

  selectedCourseId: number | null = null;

  readonly nextSessionOrder = computed(() => {
    const orders = this.sessions().map((s) => s.order);
    return orders.length ? Math.max(...orders) + 1 : 1;
  });

  ngOnInit(): void {
    this.courseSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.courses.set(c), error: () => {} });

    // Support ?courseId= query param from course detail page
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('courseId');
        if (id) {
          this.selectedCourseId = Number(id);
          this.loadContent();
        }
      });
  }

  onCourseChange(): void {
    if (this.selectedCourseId) {
      this.router.navigate([], { queryParams: { courseId: this.selectedCourseId }, queryParamsHandling: 'merge' });
      this.loadContent();
    } else {
      this.state.set('idle');
      this.courseContent.set(null);
      this.sessions.set([]);
    }
  }

  loadContent(): void {
    const id = this.selectedCourseId;
    if (!id) return;

    this.state.set('loading');
    this.lmsSvc.getCourseContent(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.courseContent.set(res.courseContent);
          this.sessions.set(res.sessions);
          this.state.set('ready');
        },
        error: (e: Error) => {
          if (e.message.includes('not found') || e.message.includes('NOT_FOUND') || e.message.includes('404')) {
            this.state.set('no-content');
          } else {
            this.errorMsg.set(e.message || 'Something went wrong');
            this.state.set('error');
          }
        },
      });
  }

  initContent(): void {
    const id = this.selectedCourseId;
    const course = this.courses().find((c) => c.id === id);
    if (!id || !course) return;

    this.lmsSvc.createCourseContent({
      courseId: id,
      title:    course.name,
      description: course.description ?? undefined,
    }).subscribe({
      next: () => this.loadContent(),
      error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
    });
  }

  publish(): void {
    const cc = this.courseContent();
    if (!cc) return;
    this.publishing.set(true);
    this.lmsSvc.publishCourseContent(cc.id).subscribe({
      next: (updated) => { this.courseContent.set(updated); this.publishing.set(false); },
      error: (e: Error) => { this.errorMsg.set(e.message); this.publishing.set(false); },
    });
  }

  toggleSession(id: number): void {
    this.expandedSessionId.update((cur) => cur === id ? null : id);
  }

  openAddSession(): void { this.sessionFormOpen.set(true); }

  openAddItem(session: Session): void {
    this.addingToSession.set(session);
    this.itemFormOpen.set(true);
  }

  onSessionAdded(session: Session): void {
    this.sessionFormOpen.set(false);
    this.sessions.update((list) => [...list, { ...session, contentItems: [] }].sort((a, b) => a.order - b.order));
    this.expandedSessionId.set(session.id);
  }

  onItemAdded(item: ContentItem): void {
    this.itemFormOpen.set(false);
    this.sessions.update((list) =>
      list.map((s) =>
        s.id === item.sessionId
          ? { ...s, contentItems: [...s.contentItems, item] }
          : s
      )
    );
  }

  deleteItem(session: Session, item: ContentItem): void {
    this.lmsSvc.deleteContentItem(item.id).subscribe({
      next: () => {
        this.sessions.update((list) =>
          list.map((s) =>
            s.id === session.id
              ? { ...s, contentItems: s.contentItems.filter((i) => i.id !== item.id) }
              : s
          )
        );
      },
      error: () => {},
    });
  }

  typeLabel(type: string): string {
    return CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] ?? type;
  }

  typeIcon(type: string): string {
    return CONTENT_TYPE_ICONS[type as keyof typeof CONTENT_TYPE_ICONS] ?? '📎';
  }
}
