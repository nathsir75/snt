import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherBatch } from '../teacher.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'snt-teacher-dashboard',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="teacher-dashboard">

      <!-- Welcome -->
      <div class="teacher-dashboard__welcome">
        <div>
          <h1>Welcome back, {{ userName() }}</h1>
          <p class="text-muted">{{ branchName() }}</p>
        </div>
      </div>

      <!-- Stats row -->
      <div class="teacher-dashboard__stats">
        <div class="stat-card">
          <span class="stat-card__value">{{ batches().length }}</span>
          <span class="stat-card__label">Assigned Batches</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__value">{{ totalStudents() }}</span>
          <span class="stat-card__label">Total Students</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__value">{{ activeBatches() }}</span>
          <span class="stat-card__label">Active Batches</span>
        </div>
      </div>

      <!-- Loading / error -->
      @if (loading()) {
        <div class="teacher-dashboard__loading">Loading your batches…</div>
      } @else if (error()) {
        <div class="teacher-dashboard__error">{{ error() }}</div>
      } @else if (batches().length === 0) {
        <div class="teacher-dashboard__empty card">
          <p>You have no batches assigned yet.</p>
          <p class="text-muted text-sm">Contact your branch admin to get assigned to a batch.</p>
        </div>
      } @else {

        <!-- Batch cards -->
        <div class="teacher-dashboard__section-title">Your Batches</div>
        <div class="teacher-dashboard__batches">
          @for (batch of batches(); track batch.id) {
            <div class="batch-card card">
              <div class="batch-card__header">
                <div>
                  <div class="batch-card__name">{{ batch.name }}</div>
                  <div class="batch-card__course text-muted text-sm">{{ batch.course.name }}</div>
                </div>
                <span class="badge" [class.badge-success]="batch.isActive" [class.badge-neutral]="!batch.isActive">
                  {{ batch.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <div class="batch-card__meta">
                <span>👥 {{ batch.activeStudents ?? batch._count.batchStudents }} students</span>
                <span>📅 Started {{ batch.startDate | slice:0:10 }}</span>
              </div>

              <div class="batch-card__actions">
                <a class="btn btn-secondary" [routerLink]="['/teacher/attendance']" [queryParams]="{ batchId: batch.id }">
                  Mark Attendance
                </a>
                <a class="btn btn-ghost" [routerLink]="['/teacher/my-students']" [queryParams]="{ batchId: batch.id }">
                  View Students
                </a>
              </div>
            </div>
          }
        </div>

        <!-- Quick links -->
        <div class="teacher-dashboard__section-title">Quick Actions</div>
        <div class="teacher-dashboard__quick-links">
          <a routerLink="/teacher/my-batches"  class="quick-link card">
            <span class="quick-link__icon">👥</span>
            <span class="quick-link__label">My Batches</span>
          </a>
          <a routerLink="/teacher/attendance"  class="quick-link card">
            <span class="quick-link__icon">✅</span>
            <span class="quick-link__label">Attendance</span>
          </a>
          <a routerLink="/teacher/schedule"    class="quick-link card">
            <span class="quick-link__icon">📅</span>
            <span class="quick-link__label">Schedule</span>
          </a>
          <a routerLink="/teacher/content"     class="quick-link card">
            <span class="quick-link__icon">🖥️</span>
            <span class="quick-link__label">Content</span>
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    .teacher-dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .teacher-dashboard__welcome h1 {
      font-size: var(--font-size-xl);
      font-weight: 700;
    }
    .teacher-dashboard__stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
    }
    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: var(--shadow-sm);
    }
    .stat-card__value {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--layout-accent, #0d9488);
    }
    .stat-card__label {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .teacher-dashboard__section-title {
      font-size: var(--font-size-sm);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: var(--color-text-muted);
    }
    .teacher-dashboard__batches {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .batch-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .batch-card__name { font-weight: 600; font-size: var(--font-size-md); }
    .batch-card__meta {
      display: flex;
      gap: 16px;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-bottom: 16px;
    }
    .batch-card__actions { display: flex; gap: 8px; }
    .teacher-dashboard__quick-links {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }
    .quick-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 12px;
      text-align: center;
      transition: box-shadow .15s, transform .15s;
      cursor: pointer;
      &:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    }
    .quick-link__icon { font-size: 24px; }
    .quick-link__label { font-size: var(--font-size-sm); font-weight: 500; }
    .teacher-dashboard__loading,
    .teacher-dashboard__error,
    .teacher-dashboard__empty {
      padding: 32px;
      text-align: center;
      color: var(--color-text-muted);
    }
    .teacher-dashboard__error { color: var(--color-danger); }
  `],
})
export class TeacherDashboardComponent implements OnInit {
  private readonly teacherSvc = inject(TeacherService);
  private readonly auth       = inject(AuthService);

  readonly batches  = signal<TeacherBatch[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);

  readonly userName  = () => this.auth.currentUser()?.name ?? '';
  readonly branchName = () => this.auth.currentUser()?.branch?.name ?? '';

  readonly totalStudents = () =>
    this.batches().reduce((sum, b) => sum + (b.activeStudents ?? b._count.batchStudents), 0);

  readonly activeBatches = () =>
    this.batches().filter((b) => b.isActive).length;

  ngOnInit(): void {
    this.teacherSvc.getMyBatches().subscribe({
      next:  (data) => { this.batches.set(data); this.loading.set(false); },
      error: (err)  => { this.error.set(err.message); this.loading.set(false); },
    });
  }
}
