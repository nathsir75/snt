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
      } @else if (teamsMeeting()) {
        <div class="teams-card card">
          <div>
            <span class="teams-eyebrow">Microsoft Teams live class</span>
            <h2>{{ teamsMeeting()!.batchName }}</h2>
            <p>Today's scheduled class: {{ teamsMeeting()!.startTime }}–{{ teamsMeeting()!.endTime }} IST</p>
          </div>
          <a class="btn btn-primary teams-join" [href]="teamsMeeting()!.joinUrl" target="_blank" rel="noopener noreferrer">
            Join Live Class ↗
          </a>
        </div>
      } @else if (!currentSession() && upcomingTeamsMeeting()) {
        <div class="teams-card card">
          <div>
            <span class="teams-eyebrow">Next scheduled live class</span>
            <h2>{{ upcomingTeamsMeeting()!.batchName }}</h2>
            <p>{{ upcomingTeamsMeeting()!.dayName }}, {{ upcomingTeamsMeeting()!.date | date:'mediumDate' }} · {{ upcomingTeamsMeeting()!.startTime }}–{{ upcomingTeamsMeeting()!.endTime }} IST</p>
          </div>
          <a class="btn btn-primary teams-join" [href]="upcomingTeamsMeeting()!.joinUrl" target="_blank" rel="noopener noreferrer">
            Join Scheduled Class ↗
          </a>
        </div>
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
    .teams-card { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 22px; }
    .teams-eyebrow { color: #635bff; font-size: var(--font-size-xs); font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
    .teams-card h2 { margin: 7px 0 4px; font-size: var(--font-size-lg); }
    .teams-card p { margin: 0; color: var(--color-text-muted); }
    .teams-join { white-space: nowrap; }
    @media (max-width: 600px) { .teams-card { align-items: flex-start; flex-direction: column; } }
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
  readonly teamsMeeting = signal<StudentLiveSessionsResponse['currentTeamsMeeting']>(null);
  readonly upcomingTeamsMeeting = signal<StudentLiveSessionsResponse['upcomingTeamsMeeting']>(null);

  ngOnInit(): void {
    this.liveClassSvc.getStudentSessions().subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.currentSession.set(data.currentLiveSession);
        this.teamsMeeting.set(data.currentTeamsMeeting);
        this.upcomingTeamsMeeting.set(data.upcomingTeamsMeeting);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load live class.');
        this.loading.set(false);
      },
    });
  }
}
