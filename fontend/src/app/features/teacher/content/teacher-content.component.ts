import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TeacherService, TeacherBatch, CourseContent, Session } from '../teacher.service';

@Component({
  selector: 'snt-teacher-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>Course Content</h1><p>Published content for your assigned courses</p></div>
    </div>

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
  `],
})
export class TeacherContentComponent implements OnInit {
  private readonly teacherSvc = inject(TeacherService);

  readonly courses         = signal<{ id: number; name: string; code: string }[]>([]);
  readonly courseContent   = signal<CourseContent | null>(null);
  readonly sessions        = signal<Session[]>([]);
  readonly selectedCourseId = signal<number | null>(null);
  readonly expandedSessions = signal<Set<number>>(new Set());
  readonly loading         = signal(false);
  readonly error           = signal<string | null>(null);

  ngOnInit(): void {
    this.teacherSvc.getMyBatches().subscribe({
      next: (batches) => {
        // Deduplicate courses across batches
        const seen = new Map<number, { id: number; name: string; code: string }>();
        batches.forEach((b) => seen.set(b.course.id, b.course));
        const uniqueCourses = [...seen.values()];
        this.courses.set(uniqueCourses);
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
}
