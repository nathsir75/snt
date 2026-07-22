import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LiveClassPlayerComponent } from '../../live-class/live-class-player.component';
import { LiveClassService, LiveSession } from '../../live-class/live-class.service';

@Component({
  selector: 'snt-student-recorded-classes',
  standalone: true,
  imports: [DatePipe, LiveClassPlayerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="recorded-page">
      <div class="page-head">
        <h1>Recorded Classes</h1>
        <p>Watch previous sessions from your batch.</p>
      </div>

      @if (loading()) {
        <div class="state card">Loading recorded classes...</div>
      } @else if (selected()) {
        <div class="player-wrap">
          <button class="btn btn-ghost" (click)="selected.set(null)">Back to recordings</button>
          <div class="card session-card">
            <h2>{{ selected()!.title }}</h2>
            <p>{{ selected()!.scheduledAt | date:'mediumDate' }} | {{ selected()!.durationMinutes }} min</p>
          </div>
          <snt-live-class-player [liveSessionId]="selected()!.id" [youtubeVideoId]="selected()!.youtubeVideoId" />
        </div>
      } @else if (!recordings().length) {
        <div class="state card">No recorded classes available.</div>
      } @else {
        <div class="recording-grid">
          @for (session of recordings(); track session.id) {
            <button class="recording-card card" (click)="selected.set(session)">
              <span class="recording-icon">▶</span>
              <strong>{{ session.title }}</strong>
              <small>{{ session.scheduledAt | date:'mediumDate' }} | {{ session.durationMinutes }} min</small>
            </button>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .recorded-page, .player-wrap { display: flex; flex-direction: column; gap: 14px; }
    .page-head h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 800; }
    .page-head p, .session-card p { margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .state { padding: 28px; text-align: center; color: var(--color-text-muted); }
    .recording-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .recording-card { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 16px; text-align: left; cursor: pointer; }
    .recording-card:hover { box-shadow: var(--shadow-md); }
    .recording-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--layout-accent-light, #dcfce7); color: var(--layout-accent, #16a34a); font-weight: 800; }
    .recording-card strong, .session-card h2 { margin: 0; font-size: var(--font-size-md); font-weight: 800; }
    .recording-card small { color: var(--color-text-muted); font-size: var(--font-size-xs); }
  `],
})
export class StudentRecordedClassesComponent implements OnInit {
  private readonly liveClassSvc = inject(LiveClassService);

  readonly loading = signal(true);
  readonly recordings = signal<LiveSession[]>([]);
  readonly selected = signal<LiveSession | null>(null);

  ngOnInit(): void {
    this.liveClassSvc.getStudentSessions().subscribe({
      next: (data) => {
        this.recordings.set(data.recordedSessions);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
