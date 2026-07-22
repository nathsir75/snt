import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MentorQaComponent } from '../../mentor-qa/mentor-qa.component';
import { LiveClassService, LiveSession } from '../../live-class/live-class.service';

@Component({
  selector: 'snt-student-mentor-qa-page',
  standalone: true,
  imports: [MentorQaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="qa-page">
      <div class="page-head">
        <h1>Mentor Q&amp;A</h1>
        <p>Ask questions during your current live class.</p>
      </div>

      @if (loading()) {
        <div class="state card">Loading Q&amp;A...</div>
      } @else if (!currentSession()) {
        <div class="state card">No active live class Q&amp;A right now.</div>
      } @else {
        <snt-mentor-qa [liveSessionId]="currentSession()!.id" />
      }
    </section>
  `,
  styles: [`
    .qa-page { display: flex; flex-direction: column; gap: 14px; }
    .page-head h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 800; }
    .page-head p { margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .state { padding: 28px; text-align: center; color: var(--color-text-muted); }
  `],
})
export class StudentMentorQaPageComponent implements OnInit {
  private readonly liveClassSvc = inject(LiveClassService);

  readonly loading = signal(true);
  readonly currentSession = signal<LiveSession | null>(null);

  ngOnInit(): void {
    this.liveClassSvc.getActiveSession().subscribe({
      next: (session) => {
        this.currentSession.set(session);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
