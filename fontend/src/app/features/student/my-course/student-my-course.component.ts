import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import {
  StudentService,
  StudentProfile,
  StudentCourseContent,
  StudentSession,
  ContentItem,
  StudentBatchMaterial,
} from '../student.service';

const TYPE_ICON: Record<string, string> = {
  video:   '🎬',
  pdf:     '📄',
  ppt:     '📊',
  mindmap: '🗺️',
  lab:     '🧪',
};

@Component({
  selector: 'snt-student-my-course',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="my-course">

      <!-- Loading / error / no-batch states -->
      @if (loading()) {
        <div class="page-state">Loading your course…</div>
      } @else if (error()) {
        <div class="page-state page-state--error">{{ error() }}</div>
      } @else if (!profile()?.activeBatch) {
        <div class="card page-state">
          <p>You are not enrolled in any active batch yet.</p>
          <p class="text-muted text-sm">Contact your branch admin to get assigned to a batch.</p>
        </div>
      } @else if (!courseContent()) {
        <div class="card page-state">
          <p>Course content for <strong>{{ profile()!.activeBatch!.course.name }}</strong> has not been published yet.</p>
          <p class="text-muted text-sm">Check back later or contact your teacher.</p>
        </div>
      } @else {

        <!-- Course header -->
        <div class="course-header card">
          <div class="course-header__badge">{{ profile()!.activeBatch!.course.code }}</div>
          <div>
            <h1 class="course-header__title">{{ courseContent()!.title }}</h1>
            <p class="text-muted text-sm">{{ profile()!.activeBatch!.batchName }}</p>
            @if (courseContent()!.description) {
              <p class="course-header__desc">{{ courseContent()!.description }}</p>
            }
          </div>
          <div class="course-header__stats">
            <span>{{ sessions().length }} sessions</span>
            <span>{{ totalItems() }} items</span>
          </div>
        </div>

        <!-- Session list -->
        @if (sessions().length === 0) {
          <div class="page-state">No sessions added yet.</div>
        } @else {
          <div class="sessions">
            @for (session of sessions(); track session.id; let i = $index) {
              <div class="session-card card">

                <!-- Session header — click to expand -->
                <div class="session-card__header" (click)="toggleSession(session.id)">
                  <div class="session-card__left">
                    <span class="session-card__num">{{ i + 1 }}</span>
                    <div>
                      <div class="session-card__title">{{ session.title }}</div>
                      @if (session.durationMinutes) {
                        <span class="text-muted text-sm">{{ session.durationMinutes }} min</span>
                      }
                    </div>
                  </div>
                  <div class="session-card__right">
                    <span class="session-card__count text-muted text-sm">{{ session.contentItems.length }} items</span>
                    <span class="session-card__chevron">{{ expanded().has(session.id) ? '▲' : '▼' }}</span>
                  </div>
                </div>

                <!-- Content items -->
                @if (expanded().has(session.id)) {
                  <div class="content-items">
                    @if (session.contentItems.length === 0) {
                      <p class="text-muted text-sm" style="padding: 8px 0">No items in this session yet.</p>
                    }
                    @for (item of session.contentItems; track item.id) {
                      <a
                        class="content-item"
                        [href]="item.fileUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span class="content-item__icon">{{ typeIcon(item.type) }}</span>
                        <div class="content-item__info">
                          <span class="content-item__title">{{ item.title }}</span>
                          <span class="content-item__type text-muted text-sm">{{ item.type | uppercase }}</span>
                        </div>
                        <span class="content-item__arrow">↗</span>
                      </a>
                    }
                  </div>
                }

              </div>
            }
          </div>
        }

        <section class="materials card">
          <div class="materials__header">
            <h2>Study materials</h2>
            <span>{{ materials().length }} item{{ materials().length === 1 ? '' : 's' }}</span>
          </div>
          @if (materialsLoading()) {
            <p class="text-muted text-sm">Loading materials...</p>
          } @else if (materials().length === 0) {
            <p class="text-muted text-sm">No study materials have been published for your batch yet.</p>
          } @else {
            <div class="material-list">
              @for (item of materials(); track item.id) {
                <a class="material-link" [href]="materialUrl(item)" target="_blank" rel="noopener noreferrer">
                  <span class="content-item__icon">{{ typeIcon(item.materialType) }}</span>
                  <span class="material-link__body">
                    <strong>{{ item.title }}</strong>
                    @if (item.description) { <small>{{ item.description }}</small> }
                  </span>
                  <span class="content-item__arrow">↗</span>
                </a>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .my-course { display: flex; flex-direction: column; gap: 16px; }
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }

    .course-header {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .course-header__badge {
      display: inline-block;
      background: var(--layout-accent, #16a34a);
      color: #fff;
      border-radius: var(--radius-sm);
      padding: 2px 10px;
      font-size: var(--font-size-xs);
      font-weight: 700;
      letter-spacing: .5px;
      width: fit-content;
    }
    .course-header__title { font-size: var(--font-size-xl); font-weight: 700; margin-bottom: 2px; }
    .course-header__desc { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 4px; }
    .course-header__stats {
      display: flex;
      gap: 16px;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: 4px;
    }

    .sessions { display: flex; flex-direction: column; gap: 8px; }

    .session-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      padding: 4px 0;
    }
    .session-card__left { display: flex; align-items: center; gap: 12px; }
    .session-card__num {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: var(--layout-accent-light, #dcfce7);
      color: var(--layout-accent, #16a34a);
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-xs); font-weight: 700;
      flex-shrink: 0;
    }
    .session-card__title { font-weight: 600; font-size: var(--font-size-md); }
    .session-card__right { display: flex; align-items: center; gap: 10px; }
    .session-card__chevron { color: var(--color-text-muted); font-size: var(--font-size-xs); }

    .content-items {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .content-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-bg);
      transition: background .12s, border-color .12s;
      text-decoration: none;
      color: inherit;
    }
    .content-item:hover {
      background: var(--color-surface);
      border-color: var(--layout-accent, #16a34a);
    }
    .content-item__icon { font-size: 20px; flex-shrink: 0; }
    .content-item__info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .content-item__title { font-size: var(--font-size-sm); font-weight: 500; }
    .content-item__type { font-size: var(--font-size-xs); }
    .content-item__arrow { color: var(--layout-accent, #16a34a); font-size: var(--font-size-sm); flex-shrink: 0; }
    .materials { margin-top: 8px; }
    .materials__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .materials__header h2 { margin: 0; font-size: var(--font-size-lg); }
    .materials__header span { color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .material-list { display: flex; flex-direction: column; gap: 8px; }
    .material-link { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); color: inherit; text-decoration: none; }
    .material-link:hover { border-color: var(--layout-accent, #16a34a); background: var(--color-bg); }
    .material-link__body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .material-link__body small { color: var(--color-text-muted); }
  `],
})
export class StudentMyCourseComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly profile       = signal<StudentProfile | null>(null);
  readonly courseContent = signal<StudentCourseContent | null>(null);
  readonly sessions      = signal<StudentSession[]>([]);
  readonly materials     = signal<StudentBatchMaterial[]>([]);
  readonly expanded      = signal<Set<number>>(new Set());
  readonly loading       = signal(true);
  readonly materialsLoading = signal(false);
  readonly error         = signal<string | null>(null);

  readonly totalItems = () => this.sessions().reduce((s, sess) => s + sess.contentItems.length, 0);

  typeIcon(type: string): string {
    return TYPE_ICON[type] ?? '📎';
  }

  ngOnInit(): void {
    this.studentSvc.getMyProfile().subscribe({
      next: (res) => {
        if (!res.linked) { this.loading.set(false); return; }
        this.profile.set(res);
        const courseId = res.activeBatch?.course.id ?? null;
        if (!courseId) { this.loading.set(false); return; }

        // courseId is derived server-side from the student's batch enrollment.
        // The backend will 403 if the student tries any other courseId.
        this.loadMaterials(res.activeBatch!.batchId);
        this.studentSvc.getCourseContent(courseId).subscribe({
          next: (data) => {
            this.courseContent.set(data.courseContent);
            this.sessions.set(data.sessions);
            // Auto-expand first session
            if (data.sessions.length > 0) {
              this.expanded.set(new Set([data.sessions[0].id]));
            }
            this.loading.set(false);
          },
          error: (e) => {
            // 404 = not published yet — not an error to show as red
            if (e.status === 404) { this.loading.set(false); return; }
            this.error.set(e.error?.error ?? 'Failed to load course content');
            this.loading.set(false);
          },
        });
      },
      error: (e) => {
        this.error.set(e.error?.error ?? 'Failed to load profile');
        this.loading.set(false);
      },
    });
  }

  toggleSession(id: number): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  materialUrl(item: StudentBatchMaterial): string {
    return item.fileUrl || item.externalUrl || item.mediaAsset?.fileUrl || '#';
  }

  private loadMaterials(batchId: number): void {
    this.materialsLoading.set(true);
    this.studentSvc.getBatchMaterials(batchId).subscribe({
      next: (items) => { this.materials.set(items); this.materialsLoading.set(false); },
      error: () => { this.materials.set([]); this.materialsLoading.set(false); },
    });
  }
}
