import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { StudentService, StudentProfile } from '../student.service';
import { AuthService } from '../../../core/auth/auth.service';

type DashState = 'loading' | 'ready' | 'not_linked' | 'error';

@Component({
  selector: 'snt-student-dashboard',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="student-dashboard">

      @switch (state()) {

        @case ('loading') {
          <div class="dash-state">
            <div class="dash-spinner"></div>
            <p class="text-muted text-sm">Loading your profile…</p>
          </div>
        }

        <!-- Case 2: user exists but no student record linked yet -->
        @case ('not_linked') {
          <div class="dash-state dash-state-onboarding">
            <div class="dash-state-icon">🎓</div>
            <h2 class="dash-state-title">Your student profile is being prepared</h2>
            <p class="dash-state-sub">
              Your account is active, but your academic profile is not fully linked yet.
              Please contact your branch office.
            </p>
            <div class="dash-state-actions">
              <button class="btn btn-primary" (click)="reload()">Refresh</button>
              <a routerLink="/student/alerts" class="btn btn-secondary">Alerts</a>
              <button class="btn btn-ghost" (click)="logout()">Logout</button>
            </div>
          </div>
        }

        <!-- Unexpected error -->
        @case ('error') {
          <div class="dash-state dash-state-error">
            <div class="dash-state-icon">⚠️</div>
            <h2 class="dash-state-title">Could not load dashboard</h2>
            <p class="dash-state-sub">{{ errorMsg() }}</p>
            <button class="btn btn-primary" (click)="reload()">Try Again</button>
          </div>
        }

        <!-- Case 1: profile loaded -->
        @case ('ready') {
          <!-- Welcome banner -->
          <div class="welcome-card card">
            <div class="welcome-card__avatar">{{ initials() }}</div>
            <div class="welcome-card__info">
              <h1 class="welcome-card__name">{{ profile()!.fullName }}</h1>
              <p class="text-muted text-sm">{{ profile()!.branch.name }}, {{ profile()!.branch.city }}</p>
            </div>
          </div>

          <!-- Info pills -->
          <div class="info-pills">
            <div class="info-pill">
              <span class="info-pill__label">Course</span>
              <span class="info-pill__value">{{ profile()!.course }}</span>
            </div>
            @if (profile()!.activeBatch) {
              <div class="info-pill">
                <span class="info-pill__label">Batch</span>
                <span class="info-pill__value">{{ profile()!.activeBatch!.batchName }}</span>
              </div>
              <div class="info-pill">
                <span class="info-pill__label">Joined</span>
                <span class="info-pill__value">{{ profile()!.activeBatch!.joinedAt | slice:0:10 }}</span>
              </div>
            }
            <div class="info-pill">
              <span class="info-pill__label">Admission</span>
              <span class="info-pill__value">{{ profile()!.admissionDate | slice:0:10 }}</span>
            </div>
            <div class="info-pill">
              <span class="info-pill__label">Branch</span>
              <span class="info-pill__value">{{ profile()!.branch.name }}</span>
            </div>
          </div>

          <!-- No batch warning -->
          @if (!profile()!.activeBatch) {
            <div class="card dash-no-batch">
              <span class="dash-no-batch-icon">📋</span>
              <div>
                <p class="dash-no-batch-title">Not assigned to a batch yet</p>
                <p class="text-muted text-sm">Contact your branch admin to get enrolled in a batch.</p>
              </div>
            </div>
          }

          <!-- Quick links -->
          <div class="section-title">Quick Access</div>
          <div class="quick-links">
            @if (isSndtwu()) {
              <a routerLink="/student/live-class"       class="quick-link card"><span class="quick-link__icon">🎥</span><span class="quick-link__label">Live Class</span></a>
              <a routerLink="/student/recorded-classes" class="quick-link card"><span class="quick-link__icon">▶️</span><span class="quick-link__label">Recorded Classes</span></a>
              <a routerLink="/student/study-material"   class="quick-link card"><span class="quick-link__icon">📄</span><span class="quick-link__label">Study Material</span></a>
              <a routerLink="/student/mentor-qa"        class="quick-link card"><span class="quick-link__icon">💬</span><span class="quick-link__label">Mentor Q&A</span></a>
            } @else {
              <a routerLink="/student/my-course"     class="quick-link card"><span class="quick-link__icon">📚</span><span class="quick-link__label">My Course</span></a>
              <a routerLink="/student/my-attendance" class="quick-link card"><span class="quick-link__icon">✅</span><span class="quick-link__label">Attendance</span></a>
              <a routerLink="/student/schedule"      class="quick-link card"><span class="quick-link__icon">📅</span><span class="quick-link__label">Schedule</span></a>
              <a routerLink="/student/fees"          class="quick-link card"><span class="quick-link__icon">💰</span><span class="quick-link__label">Fees</span></a>
              <a routerLink="/student/results"       class="quick-link card"><span class="quick-link__icon">🏆</span><span class="quick-link__label">Results</span></a>
              <a routerLink="/student/certificates"  class="quick-link card"><span class="quick-link__icon">🎖️</span><span class="quick-link__label">Certificates</span></a>
              <a routerLink="/student/placements"    class="quick-link card"><span class="quick-link__icon">🚀</span><span class="quick-link__label">Placements</span></a>
              <a routerLink="/student/alerts"        class="quick-link card"><span class="quick-link__icon">🔔</span><span class="quick-link__label">Alerts</span></a>
              <a routerLink="/student/profile"       class="quick-link card"><span class="quick-link__icon">👤</span><span class="quick-link__label">Profile</span></a>
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .student-dashboard { display: flex; flex-direction: column; gap: 20px; }

    /* States */
    .dash-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 55vh; gap: 14px; text-align: center; padding: 32px 20px;
    }
    .dash-state-onboarding { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: var(--radius-xl); }
    .dash-state-error { background: #fff5f5; border-radius: var(--radius-xl); }
    .dash-state-icon { font-size: 52px; }
    .dash-state-title { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); }
    .dash-state-sub { font-size: var(--font-size-sm); color: var(--color-text-muted); max-width: 400px; line-height: 1.6; }
    .dash-state-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
    .dash-spinner {
      width: 32px; height: 32px;
      border: 3px solid var(--color-border);
      border-top-color: var(--layout-accent, #16a34a);
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }

    /* Welcome card */
    .welcome-card { display: flex; align-items: center; gap: 16px; padding: 20px; }
    .welcome-card__avatar {
      width: 52px; height: 52px; border-radius: 50%;
      background: var(--layout-accent, #16a34a); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 700; flex-shrink: 0;
    }
    .welcome-card__name { font-size: var(--font-size-xl); font-weight: 700; margin-bottom: 2px; }

    /* Info pills */
    .info-pills { display: flex; gap: 10px; flex-wrap: wrap; }
    .info-pill {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 8px 14px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .info-pill__label { font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .4px; }
    .info-pill__value { font-size: var(--font-size-sm); font-weight: 600; }

    /* No batch */
    .dash-no-batch {
      display: flex; align-items: center; gap: 14px; padding: 16px 20px;
      border-left: 3px solid var(--color-warning, #f59e0b);
    }
    .dash-no-batch-icon { font-size: 24px; flex-shrink: 0; }
    .dash-no-batch-title { font-weight: 600; font-size: var(--font-size-sm); }

    /* Quick links */
    .section-title { font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--color-text-muted); }
    .quick-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; }
    .quick-link {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 20px 12px; text-align: center; cursor: pointer;
      transition: box-shadow .15s, transform .15s;
    }
    .quick-link:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .quick-link__icon { font-size: 24px; }
    .quick-link__label { font-size: var(--font-size-sm); font-weight: 500; }

    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class StudentDashboardComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);
  private readonly auth       = inject(AuthService);

  readonly state    = signal<DashState>('loading');
  readonly profile  = signal<StudentProfile | null>(null);
  readonly errorMsg = signal<string | null>(null);
  readonly isSndtwu = computed(() => this.auth.currentUser()?.branch?.code?.toUpperCase() === 'SNDTWU');

  readonly initials = computed(() => {
    const name = this.profile()?.fullName ?? '';
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.errorMsg.set(null);

    this.studentSvc.getMyProfile().subscribe({
      next: (res) => {
        if (!res.linked) {
          this.state.set('not_linked');
          return;
        }
        this.profile.set(res);
        this.state.set('ready');
      },
      error: (e: { error?: { error?: string }; status?: number }) => {
        this.errorMsg.set(e.error?.error ?? 'An unexpected error occurred. Please try again.');
        this.state.set('error');
      },
    });
  }

  reload(): void { this.load(); }

  logout(): void { this.auth.logout(); }
}
