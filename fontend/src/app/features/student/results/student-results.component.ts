import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import { StudentService, MyResult } from '../student.service';

@Component({
  selector: 'snt-student-results',
  standalone: true,
  imports: [SlicePipe, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Results</h1><p>Your final exam results</p></div>
    </div>

    @if (loading()) {
      <div class="page-state">Loading results…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (results().length === 0) {
      <div class="card page-state">No results published yet.</div>
    } @else {
      <div class="results-list">
        @for (r of results(); track r.id) {
          <div class="result-card card">
            <div class="result-card__top">
              <div>
                <div class="result-card__hall">
                  Hall Ticket: <strong>{{ r.registration.hallTicketNo ?? 'N/A' }}</strong>
                </div>
                @if (r.registration.examDate) {
                  <div class="text-muted text-sm">Exam: {{ r.registration.examDate | slice:0:10 }}</div>
                }
              </div>
              <span
                class="badge result-badge"
                [class.badge-success]="r.resultStatus === 'pass'"
                [class.badge-danger]="r.resultStatus === 'fail'"
                [class.badge-neutral]="r.resultStatus === 'absent'"
              >{{ r.resultStatus | uppercase }}</span>
            </div>

            <div class="result-card__score">
              <div class="score-circle" [class.score-circle--pass]="r.resultStatus === 'pass'" [class.score-circle--fail]="r.resultStatus === 'fail'">
                <span class="score-circle__marks">{{ r.marksObtained }}</span>
                <span class="score-circle__max">/ {{ r.maxMarks }}</span>
              </div>
              <div class="score-meta">
                <div class="score-percent">{{ scorePercent(r) }}%</div>
                <div class="text-muted text-sm">Published {{ r.publishedAt | slice:0:10 }}</div>
                @if (r.remarks) {
                  <div class="text-muted text-sm">{{ r.remarks }}</div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .results-list { display: flex; flex-direction: column; gap: 12px; }
    .result-card__top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .result-card__hall { font-size: var(--font-size-sm); margin-bottom: 2px; }
    .result-badge { font-size: var(--font-size-sm); padding: 4px 12px; }
    .result-card__score { display: flex; align-items: center; gap: 20px; }
    .score-circle {
      width: 72px; height: 72px; border-radius: 50%;
      border: 3px solid var(--color-border);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .score-circle--pass { border-color: #16a34a; }
    .score-circle--fail { border-color: #dc2626; }
    .score-circle__marks { font-size: var(--font-size-lg); font-weight: 700; line-height: 1; }
    .score-circle__max   { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .score-percent { font-size: var(--font-size-xl); font-weight: 700; color: var(--layout-accent, #16a34a); }
  `],
})
export class StudentResultsComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly results = signal<MyResult[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  scorePercent(r: MyResult): number {
    return r.maxMarks > 0 ? Math.round((r.marksObtained / r.maxMarks) * 100) : 0;
  }

  ngOnInit(): void {
    this.studentSvc.getMyResults().subscribe({
      next:  (d) => { this.results.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(e.error?.error ?? 'Failed to load results'); this.loading.set(false); },
    });
  }
}
