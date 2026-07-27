import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherBatch, BatchSchedule } from '../teacher.service';
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
          <span class="stat-card__label">Assigned Global Batches</span>
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
        <div class="teacher-dashboard__section-title">Global Trainer Dashboard</div>
        <div class="teacher-dashboard__batches">
          @for (batch of batches(); track batch.id) {
            <div class="batch-card card">
              <div class="batch-card__header">
                <div>
                  <div class="batch-card__name">{{ batch.name }}</div>
                  <div class="batch-card__course text-muted text-sm">{{ batch.course.name }}</div>
                  <div class="batch-card__branch text-muted text-sm">{{ batch.branch.name }} · {{ batch.branch.city }}</div>
                </div>
                <span class="badge" [class.badge-success]="batch.isActive" [class.badge-neutral]="!batch.isActive">
                  {{ batch.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <div class="batch-card__meta">
                <span>👥 {{ batch.activeStudents ?? batch._count.batchStudents }} students</span>
                <span>📅 {{ batch.startDate | slice:0:10 }} @if (batch.endDate) { – {{ batch.endDate | slice:0:10 }} }</span>
              </div>

              <div class="batch-card__schedule">
                <span class="section-label">Weekly Schedule</span>
                <strong>{{ scheduleSummary(batch) }}</strong>
                <span class="text-muted text-sm">Next: {{ nextScheduleLabel(batch) }}</span>
              </div>

              <div class="batch-card__roster">
                <span class="section-label">Roster</span>
                @if (!batch.batchStudents?.length) {
                  <span class="text-muted text-sm">No enrolled students</span>
                } @else {
                  @for (student of batch.batchStudents | slice:0:4; track student.id) {
                    <div class="roster-row">
                      <span>{{ student.student.fullName }}</span>
                      <small>{{ student.student.course }} · {{ student.student.branch.name }}</small>
                    </div>
                  }
                }
              </div>

              <div class="batch-card__actions">
                @if (batch.teamsJoinUrl) {
                  <a class="btn btn-primary" [href]="batch.teamsJoinUrl" target="_blank" rel="noopener">Open Teams Class ↗</a>
                } @else {
                  <button class="btn btn-secondary" disabled>Teams link not configured</button>
                }
                <a class="btn btn-ghost" [routerLink]="['/teacher/my-students']" [queryParams]="{ batchId: batch.id }">
                  View Students
                </a>
                <a class="btn btn-ghost" [routerLink]="['/teacher/schedule']" [queryParams]="{ batchId: batch.id }">
                  Schedule
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
          <a routerLink="/teacher/schedule"    class="quick-link card">
            <span class="quick-link__icon">📅</span>
            <span class="quick-link__label">Schedule</span>
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
      flex-wrap: wrap;
    }
    .batch-card__branch { margin-top: 2px; }
    .batch-card__schedule,
    .batch-card__roster {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px;
      margin-bottom: 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
    }
    .section-label {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: .4px;
    }
    .roster-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: var(--font-size-sm);
    }
    .roster-row small { color: var(--color-text-muted); }
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

  scheduleSummary(batch: TeacherBatch): string {
    if (!batch.batchSchedules.length) return 'No schedule set';
    return batch.batchSchedules.map((slot) => this.formatScheduleSlot(slot)).join('; ');
  }

  nextScheduleLabel(batch: TeacherBatch): string {
    if (!batch.batchSchedules.length) return 'No upcoming class';
    const today = new Date().getDay();
    const sorted = [...batch.batchSchedules].sort((a, b) => {
      const dayDeltaA = (a.dayOfWeek - today + 7) % 7;
      const dayDeltaB = (b.dayOfWeek - today + 7) % 7;
      return dayDeltaA - dayDeltaB || a.startTime.localeCompare(b.startTime);
    });
    return this.formatScheduleSlot(sorted[0]);
  }

  private formatScheduleSlot(slot: BatchSchedule): string {
    const start = this.formatTime(slot.startTime);
    const end = this.formatTime(slot.endTime);
    const compactStart = start.period === end.period ? start.time : `${start.time} ${start.period}`;
    return `${slot.dayName} ${compactStart}–${end.time} ${end.period}`;
  }

  private formatTime(value: string): { time: string; period: 'AM' | 'PM' } {
    const [hourRaw, minuteRaw = '00'] = value.split(':');
    const hour24 = Number(hourRaw);
    const minute = Number(minuteRaw);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return { time: `${hour12}:${String(minute).padStart(2, '0')}`, period };
  }
}
