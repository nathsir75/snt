import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { StudentService, StudentProfile, StudentBatchMaterial } from '../student.service';
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

          @if (profile()!.activeBatch) {
            <section class="learning-grid">
              <div class="learning-card learning-card--featured card">
                <div class="learning-card__head">
                  <span>Latest Recorded Lecture</span>
                  <a routerLink="/student/my-course">View all</a>
                </div>
                @if (materialsLoading()) {
                  <p class="text-muted text-sm">Loading teacher materials...</p>
                } @else if (latestLecture()) {
                  <a class="feature-link" [href]="materialUrl(latestLecture()!)" target="_blank" rel="noopener noreferrer">
                    <span class="feature-link__date">Recorded lecture — {{ materialDate(latestLecture()!) }}</span>
                    <strong>{{ latestLecture()!.title }}</strong>
                    @if (latestLecture()!.description) { <small>{{ latestLecture()!.description }}</small> }
                  </a>
                } @else {
                  <p class="text-muted text-sm">No recorded lecture has been published yet.</p>
                }
              </div>

              <div class="learning-card card">
                <div class="learning-card__head">
                  <span>Previous Lectures</span>
                  <a routerLink="/student/my-course">View all</a>
                </div>
                @if (previousLectures().length === 0) {
                  <p class="text-muted text-sm">Previous lecture history will appear here.</p>
                } @else {
                  <div class="compact-list">
                    @for (item of previousLectures() | slice:0:4; track item.id) {
                      <a [href]="materialUrl(item)" target="_blank" rel="noopener noreferrer">
                        <span>{{ materialDate(item) }}</span>
                        <strong>{{ item.title }}</strong>
                      </a>
                    }
                  </div>
                }
              </div>

              <div class="learning-card card">
                <div class="learning-card__head">
                  <span>Teacher Recommended Training Videos</span>
                  <a routerLink="/student/my-course">View all</a>
                </div>
                @if (recommendedVideos().length === 0) {
                  <p class="text-muted text-sm">Recommended videos from your teacher will appear here.</p>
                } @else {
                  <div class="compact-list">
                    @for (item of recommendedVideos() | slice:0:4; track item.id) {
                      <a [href]="materialUrl(item)" target="_blank" rel="noopener noreferrer">
                        <span>{{ materialTypeLabel(item) }}</span>
                        <strong>{{ item.title }}</strong>
                      </a>
                    }
                  </div>
                }
              </div>

              <div class="learning-card card">
                <div class="learning-card__head">
                  <span>Study Resources</span>
                  <a routerLink="/student/my-course">View all</a>
                </div>
                @if (studyResources().length === 0) {
                  <p class="text-muted text-sm">PPT, PDF and documents shared by your teacher will appear here.</p>
                } @else {
                  <div class="compact-list">
                    @for (item of studyResources() | slice:0:5; track item.id) {
                      <a [href]="materialUrl(item)" target="_blank" rel="noopener noreferrer">
                        <span>{{ materialTypeLabel(item) }}</span>
                        <strong>{{ item.title }}</strong>
                      </a>
                    }
                  </div>
                }
              </div>
            </section>
          }

          <!-- Quick links -->
          <div class="section-title">Quick Access</div>
          <div class="quick-links">
            <a routerLink="/student/my-course"     class="quick-link card"><span class="quick-link__icon">📚</span><span class="quick-link__label">My Course</span></a>
            <a routerLink="/student/quizzes"       class="quick-link card"><span class="quick-link__icon">?</span><span class="quick-link__label">Daily Quiz</span></a>
            <a routerLink="/student/my-attendance" class="quick-link card"><span class="quick-link__icon">✅</span><span class="quick-link__label">Attendance</span></a>
            <a routerLink="/student/schedule"      class="quick-link card"><span class="quick-link__icon">📅</span><span class="quick-link__label">Schedule</span></a>
            <a routerLink="/student/fees"          class="quick-link card"><span class="quick-link__icon">💰</span><span class="quick-link__label">Fees</span></a>
            <a routerLink="/student/results"       class="quick-link card"><span class="quick-link__icon">🏆</span><span class="quick-link__label">Results</span></a>
            <a routerLink="/student/certificates"  class="quick-link card"><span class="quick-link__icon">🎖️</span><span class="quick-link__label">Certificates</span></a>
            <a routerLink="/student/placements"    class="quick-link card"><span class="quick-link__icon">🚀</span><span class="quick-link__label">Placements</span></a>
            <a routerLink="/student/alerts"        class="quick-link card"><span class="quick-link__icon">🔔</span><span class="quick-link__label">Alerts</span></a>
            <a routerLink="/student/profile"       class="quick-link card"><span class="quick-link__icon">👤</span><span class="quick-link__label">Profile</span></a>
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
    .learning-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .learning-card { min-height: 150px; display: flex; flex-direction: column; gap: 10px; }
    .learning-card--featured { border-left: 3px solid var(--layout-accent, #16a34a); }
    .learning-card__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .learning-card__head span { font-size: var(--font-size-sm); font-weight: 800; color: var(--color-text); }
    .learning-card__head a { font-size: var(--font-size-xs); font-weight: 700; color: var(--layout-accent, #16a34a); text-decoration: none; white-space: nowrap; }
    .feature-link { display: flex; flex-direction: column; gap: 5px; padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); color: inherit; text-decoration: none; background: var(--color-bg); }
    .feature-link:hover, .compact-list a:hover { border-color: var(--layout-accent, #16a34a); }
    .feature-link__date { font-size: var(--font-size-xs); color: var(--layout-accent, #16a34a); font-weight: 800; }
    .feature-link strong { font-size: var(--font-size-md); }
    .feature-link small { color: var(--color-text-muted); line-height: 1.35; }
    .compact-list { display: flex; flex-direction: column; gap: 8px; }
    .compact-list a { display: grid; grid-template-columns: 92px 1fr; gap: 10px; align-items: center; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); color: inherit; text-decoration: none; }
    .compact-list span { color: var(--color-text-muted); font-size: var(--font-size-xs); font-weight: 700; }
    .compact-list strong { font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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

    @media (max-width: 760px) {
      .learning-grid { grid-template-columns: 1fr; }
      .compact-list a { grid-template-columns: 82px 1fr; }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class StudentDashboardComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);
  private readonly auth       = inject(AuthService);

  readonly state    = signal<DashState>('loading');
  readonly profile  = signal<StudentProfile | null>(null);
  readonly materials = signal<StudentBatchMaterial[]>([]);
  readonly materialsLoading = signal(false);
  readonly errorMsg = signal<string | null>(null);

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
        if (res.activeBatch) this.loadMaterials(res.activeBatch.batchId);
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

  readonly recordedLectures = computed(() => this.materials()
    .filter((item) => item.contentCategory === 'recorded_lecture')
    .sort((a, b) => this.sortMaterialDateDesc(a, b)));

  readonly latestLecture = computed(() => this.recordedLectures()[0] ?? null);
  readonly previousLectures = computed(() => this.recordedLectures().slice(1));
  readonly recommendedVideos = computed(() => this.materials()
    .filter((item) => item.contentCategory === 'recommended_video')
    .sort((a, b) => this.sortMaterialDateDesc(a, b)));
  readonly studyResources = computed(() => this.materials()
    .filter((item) => item.contentCategory === 'study_resource')
    .sort((a, b) => this.sortMaterialDateDesc(a, b)));

  materialUrl(item: StudentBatchMaterial): string {
    return item.externalUrl || item.fileUrl || item.mediaAsset?.fileUrl || '#';
  }

  materialDate(item: StudentBatchMaterial): string {
    const value = item.lectureDate || item.createdAt;
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  materialTypeLabel(item: StudentBatchMaterial): string {
    if (item.materialType === 'link') return 'Video link';
    return item.materialType.toUpperCase();
  }

  private loadMaterials(batchId: number): void {
    this.materialsLoading.set(true);
    this.studentSvc.getBatchMaterials(batchId).subscribe({
      next: (items) => { this.materials.set(items); this.materialsLoading.set(false); },
      error: () => { this.materials.set([]); this.materialsLoading.set(false); },
    });
  }

  private sortMaterialDateDesc(a: StudentBatchMaterial, b: StudentBatchMaterial): number {
    const left = new Date(a.lectureDate || a.createdAt).getTime();
    const right = new Date(b.lectureDate || b.createdAt).getTime();
    return right - left;
  }
}
