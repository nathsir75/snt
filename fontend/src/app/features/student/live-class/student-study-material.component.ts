import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { StudentService, StudentSession } from '../student.service';

@Component({
  selector: 'snt-student-study-material',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="material-page">
      <div class="page-head">
        <h1>Study Material</h1>
        <p>PDF, PPT, video links and practice material from your course.</p>
      </div>

      @if (loading()) {
        <div class="state card">Loading study material...</div>
      } @else if (error()) {
        <div class="state card state-error">{{ error() }}</div>
      } @else if (!sessions().length) {
        <div class="state card">No study material available yet.</div>
      } @else {
        <div class="session-list">
          @for (session of sessions(); track session.id) {
            <article class="card material-session">
              <h2>{{ session.title }}</h2>
              @if (!session.contentItems.length) {
                <p class="empty">No items added.</p>
              } @else {
                <div class="material-list">
                  @for (item of session.contentItems; track item.id) {
                    <a class="material-item" [href]="item.fileUrl" target="_blank" rel="noopener">
                      <span>{{ iconFor(item.type) }}</span>
                      <strong>{{ item.title }}</strong>
                      <small>{{ item.type }}</small>
                    </a>
                  }
                </div>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .material-page, .session-list { display: flex; flex-direction: column; gap: 14px; }
    .page-head h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 800; }
    .page-head p, .empty { margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .state { padding: 28px; text-align: center; color: var(--color-text-muted); }
    .state-error { color: var(--color-danger); }
    .material-session { padding: 16px; }
    .material-session h2 { margin: 0 0 12px; font-size: var(--font-size-md); font-weight: 800; }
    .material-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
    .material-item { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 8px; align-items: center; padding: 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text); text-decoration: none; }
    .material-item:hover { border-color: var(--layout-accent, #16a34a); box-shadow: var(--shadow-sm); }
    .material-item span { font-size: 20px; }
    .material-item strong { overflow-wrap: anywhere; font-size: var(--font-size-sm); }
    .material-item small { grid-column: 2; color: var(--color-text-muted); font-size: var(--font-size-xs); text-transform: uppercase; }
  `],
})
export class StudentStudyMaterialComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly sessions = signal<StudentSession[]>([]);

  ngOnInit(): void {
    this.studentSvc.getMyProfile().subscribe({
      next: (profile) => {
        if (!profile.linked || !profile.activeBatch) {
          this.loading.set(false);
          return;
        }

        this.studentSvc.getCourseContent(profile.activeBatch.course.id).subscribe({
          next: (content) => {
            this.sessions.set(content.sessions);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Could not load study material.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Could not load your student profile.');
        this.loading.set(false);
      },
    });
  }

  iconFor(type: string): string {
    return type === 'pdf' ? '📄' : type === 'ppt' ? '📊' : type === 'video' ? '▶️' : '🧪';
  }
}
