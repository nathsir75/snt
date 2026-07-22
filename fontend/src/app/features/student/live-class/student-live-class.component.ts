import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LiveClassPlayerComponent } from '../../live-class/live-class-player.component';
import { AttendanceStatusBadgeComponent } from '../../live-class/attendance-status-badge.component';
import { MentorQaComponent } from '../../mentor-qa/mentor-qa.component';
import { LiveClassService, LiveSession, StudentLiveSessionsResponse } from '../../live-class/live-class.service';

@Component({
  selector: 'snt-student-live-class',
  standalone: true,
  imports: [DatePipe, LiveClassPlayerComponent, AttendanceStatusBadgeComponent, MentorQaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="live-page">
      <div class="page-head">
        <div>
          <h1>Live Class</h1>
          <p>{{ sessions()?.batch?.name || 'Your current class' }}</p>
        </div>
      </div>

      @if (loading()) {
        <div class="state card">Loading live class...</div>
      } @else if (error()) {
        <div class="state card state-error">{{ error() }}</div>
      } @else if (!currentSession()) {
        <div class="state card">No live class is active right now.</div>
      } @else {
        <div class="live-grid">
          <div class="player-column">
            <div class="card session-card">
              <div>
                <h2>{{ currentSession()!.title }}</h2>
                <p>{{ currentSession()!.scheduledAt | date:'medium' }} | {{ currentSession()!.durationMinutes }} min</p>
              </div>
              <snt-attendance-status-badge [liveSessionId]="currentSession()!.id" />
            </div>
            <snt-live-class-player
              [liveSessionId]="currentSession()!.id"
              [youtubeVideoId]="currentSession()!.youtubeVideoId"
            />
          </div>
          <snt-mentor-qa [liveSessionId]="currentSession()!.id" />
        </div>
      }
    </section>
  `,
  styles: [`
    .live-page { display: flex; flex-direction: column; gap: 16px; }
    .page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-head h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 800; }
    .page-head p { margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .state { padding: 28px; text-align: center; color: var(--color-text-muted); }
    .state-error { color: var(--color-danger); }
    .live-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 420px); gap: 16px; align-items: start; }
    .player-column { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .session-card { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 16px; }
    .session-card h2 { margin: 0; font-size: var(--font-size-md); font-weight: 800; }
    .session-card p { margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs); }
    @media (max-width: 900px) { .live-grid { grid-template-columns: 1fr; } }
  `],
})
export class StudentLiveClassComponent implements OnInit {
  private readonly liveClassSvc = inject(LiveClassService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly sessions = signal<StudentLiveSessionsResponse | null>(null);
  readonly currentSession = signal<LiveSession | null>(null);

  ngOnInit(): void {
    this.liveClassSvc.getStudentSessions().subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.currentSession.set(data.currentLiveSession);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load live class.');
        this.loading.set(false);
      },
    });
  }
}
