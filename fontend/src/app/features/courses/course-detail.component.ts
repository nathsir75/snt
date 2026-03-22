import {
  Component, inject, signal, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CourseService } from './course.service';
import { Course } from './course.models';
import { AuthService } from '../../core/auth/auth.service';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { CourseFormComponent } from './course-form.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-course-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, PageStateComponent, BadgeComponent, CourseFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') { <snt-page-state type="loading" /> }
      @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
      @case ('ready') {
        @if (course(); as c) {
          <div class="detail-layout">

            <div class="detail-header">
              <a routerLink="/courses" class="back-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                Courses
              </a>
            </div>

            <!-- Main info card -->
            <div class="card info-card">
              <div class="info-card-left">
                <div class="course-icon">📚</div>
                <div>
                  <h1 class="course-title">{{ c.name }}</h1>
                  <div class="course-meta">
                    <span class="code-pill">{{ c.code }}</span>
                    <snt-badge [label]="c.isActive ? 'Active' : 'Inactive'" [variant]="c.isActive ? 'success' : 'neutral'" />
                    <span class="meta-sep">·</span>
                    <span class="text-muted">{{ c.durationMonths }} month{{ c.durationMonths !== 1 ? 's' : '' }}</span>
                    <span class="meta-sep">·</span>
                    <span class="text-muted">Created {{ c.createdAt | date:'dd MMM yyyy' }}</span>
                  </div>
                  @if (c.description) {
                    <p class="course-desc">{{ c.description }}</p>
                  }
                </div>
              </div>
              <div class="info-card-right">
                @if (isSuperAdmin()) {
                  <button class="btn btn-secondary" (click)="openEdit()">✏️ Edit Course</button>
                  <a [routerLink]="['/lms']" [queryParams]="{ courseId: c.id }" class="btn btn-primary">🖥️ Manage Content</a>
                }
              </div>
            </div>

            <!-- Stats row -->
            <div class="stats-row">
              <div class="stat-mini">
                <span class="stat-label">Duration</span>
                <span class="stat-value">{{ c.durationMonths }} months</span>
              </div>
              <div class="stat-mini">
                <span class="stat-label">Status</span>
                <span class="stat-value">{{ c.isActive ? 'Active' : 'Inactive' }}</span>
              </div>
              <div class="stat-mini">
                <span class="stat-label">Code</span>
                <span class="stat-value" style="font-family:monospace">{{ c.code }}</span>
              </div>
              <div class="stat-mini">
                <span class="stat-label">Last Updated</span>
                <span class="stat-value">{{ c.updatedAt | date:'dd MMM yyyy' }}</span>
              </div>
            </div>

            <!-- Sections -->
            <div class="sections-grid">

              <div class="section-card">
                <div class="section-header">
                  <span class="section-icon">🖥️</span>
                  <h3 class="section-title">LMS Content</h3>
                  @if (isSuperAdmin()) {
                    <a [routerLink]="['/lms']" [queryParams]="{ courseId: c.id }" class="btn btn-ghost btn-xs section-action">Manage →</a>
                  } @else {
                    <a [routerLink]="['/lms']" [queryParams]="{ courseId: c.id }" class="btn btn-ghost btn-xs section-action">View →</a>
                  }
                </div>
                <div class="section-body">
                  <p class="section-hint">Sessions, videos, PDFs and learning materials for this course.</p>
                </div>
              </div>

              <div class="section-card">
                <div class="section-header">
                  <span class="section-icon">👥</span>
                  <h3 class="section-title">Active Batches</h3>
                </div>
                <snt-page-state type="empty" [compact]="true" title="Batch data coming soon" description="Batches using this course will appear here." />
              </div>

              <div class="section-card">
                <div class="section-header">
                  <span class="section-icon">🎓</span>
                  <h3 class="section-title">Enrolled Students</h3>
                </div>
                <snt-page-state type="empty" [compact]="true" title="Enrollment data coming soon" description="Student enrollment counts will appear here." />
              </div>

            </div>

          </div>
        }
      }
    }

    @if (isSuperAdmin()) {
      <snt-course-form
        [open]="editDrawerOpen()"
        [course]="course()"
        (saved)="onSaved($event)"
        (cancel)="editDrawerOpen.set(false)"
      />
    }
  `,
  styles: [`
    .detail-layout { display: flex; flex-direction: column; gap: 20px; }
    .detail-header { margin-bottom: -4px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .back-link:hover { color: var(--color-primary); }
    .info-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .info-card-left { display: flex; align-items: flex-start; gap: 16px; flex: 1; }
    .info-card-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
    .course-icon { font-size: 36px; line-height: 1; flex-shrink: 0; margin-top: 2px; }
    .course-title { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); }
    .course-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
    .course-desc { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 8px; max-width: 600px; line-height: 1.6; }
    .code-pill {
      display: inline-block; padding: 2px 8px;
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-xs);
      font-family: monospace; font-weight: 600; color: var(--color-text-muted);
    }
    .meta-sep { color: var(--color-border); }
    .text-muted { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .stat-mini {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 14px 16px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .stat-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .stat-value { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); }
    .sections-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .section-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .section-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-bg); }
    .section-icon { font-size: 18px; }
    .section-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); flex: 1; }
    .section-action { margin-left: auto; }
    .section-body { padding: 14px 16px; }
    .section-hint { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .btn-xs { padding: 3px 8px; font-size: var(--font-size-xs); }
  `],
})
export class CourseDetailComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly svc        = inject(CourseService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSuperAdmin  = this.auth.isSuperAdmin;
  readonly state         = signal<LoadState>('loading');
  readonly errorMsg      = signal<string | null>(null);
  readonly course        = signal<Course | null>(null);
  readonly editDrawerOpen = signal(false);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => this.load(Number(p.get('id'))));
  }

  load(id = Number(this.route.snapshot.paramMap.get('id'))): void {
    this.state.set('loading');
    this.svc.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (c) => { this.course.set(c); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  openEdit(): void { this.editDrawerOpen.set(true); }

  onSaved(c: Course): void {
    this.course.set(c);
    this.editDrawerOpen.set(false);
  }
}
