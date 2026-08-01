import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { StudentQuizHistory, StudentService } from '../student.service';

@Component({
  selector: 'snt-student-quiz-history',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Quiz History</h1><p>Your date-wise daily revision quiz performance</p></div></div>

    <section class="card filters">
      <label><span>From</span><input class="input" type="date" [(ngModel)]="filters.from" (change)="loadHistory()" /></label>
      <label><span>To</span><input class="input" type="date" [(ngModel)]="filters.to" (change)="loadHistory()" /></label>
      <button class="btn btn-secondary" type="button" (click)="clearFilters()">Clear</button>
    </section>

    @if (loading()) {
      <div class="card empty">Loading quiz history...</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else {
      @if (history(); as data) {
        <section class="metrics">
          <div class="metric card"><span>Total Attempts</span><strong>{{ data.summary.totalAttempts }}</strong></div>
          <div class="metric card"><span>Completed</span><strong>{{ data.summary.completedAttempts }}</strong></div>
          <div class="metric card"><span>Average</span><strong>{{ displayPercent(data.summary.averagePercentage) }}</strong></div>
          <div class="metric card"><span>Best Score</span><strong>{{ displayPercent(data.summary.bestScore) }}</strong></div>
        </section>

      @if (data.summary.latestResult) {
        <section class="card latest">
          <span>Latest Result</span>
          <strong>{{ data.summary.latestResult.title }}</strong>
          <p>{{ displayPercent(data.summary.latestResult.percentage) }} · {{ data.summary.latestResult.resultStatus }} · {{ data.summary.latestResult.quizDate | slice:0:10 }}</p>
        </section>
      }

        <section class="card">
          <div class="section-head"><h2>Date-wise History</h2><span>{{ data.history.length }} attempts</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Quiz</th><th>Batch</th><th>Score</th><th>Percent</th><th>Status</th><th>Submitted</th></tr></thead>
              <tbody>
                @for (row of data.history; track row.attemptId) {
                  <tr>
                    <td>{{ row.quizDate | slice:0:10 }}</td>
                    <td><strong>{{ row.title }}</strong><small>{{ row.topic || 'Daily revision' }}</small></td>
                    <td>{{ row.batch?.name || '-' }}</td>
                    <td>{{ row.score }}/{{ row.totalPoints }}</td>
                    <td>{{ displayPercent(row.percentage) }}</td>
                    <td><span class="pill">{{ row.resultStatus }}</span></td>
                    <td>{{ row.submittedAt ? (row.submittedAt | slice:0:16) : '-' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="7">No quiz attempts found for the selected filters.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    }
  `,
  styles: [`
    .filters { display: grid; grid-template-columns: 160px 160px auto; gap: 12px; align-items: end; margin-bottom: 16px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); }
    .input { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 9px 10px; background: var(--color-surface); font-size: var(--font-size-sm); }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .metric, .latest { display: grid; gap: 6px; }
    .metric span, .latest span, small, .section-head span { color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .metric strong { font-size: var(--font-size-xl); color: var(--layout-accent, #0d9488); }
    .latest { margin-bottom: 16px; }
    .latest strong, .section-head h2 { margin: 0; font-size: var(--font-size-lg); }
    .latest p { margin: 0; color: var(--color-text-muted); }
    .section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .table-wrap { overflow-x: auto; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    th, td { padding: 10px 8px; border-bottom: 1px solid var(--color-border); text-align: left; vertical-align: top; }
    th { color: var(--color-text-muted); font-size: var(--font-size-xs); text-transform: uppercase; }
    .pill { display: inline-flex; border-radius: 999px; padding: 3px 8px; background: var(--layout-accent-light, #ccfbf1); color: var(--layout-accent, #0d9488); font-weight: 700; font-size: var(--font-size-xs); }
    .empty, .error { padding: 18px; color: var(--color-text-muted); }
    .error { color: var(--color-danger); }
    @media (max-width: 720px) { .filters { grid-template-columns: 1fr; } .section-head { align-items: flex-start; flex-direction: column; } }
  `],
})
export class StudentQuizHistoryComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);
  readonly history = signal<StudentQuizHistory | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  filters = { from: '', to: '' };

  ngOnInit(): void { this.loadHistory(); }

  loadHistory(): void {
    this.loading.set(true);
    this.error.set(null);
    this.studentSvc.getDailyQuizHistory(this.filters).subscribe({
      next: (history) => { this.history.set(history); this.loading.set(false); },
      error: (err) => { this.error.set(err.error?.error ?? 'Could not load quiz history.'); this.loading.set(false); },
    });
  }

  clearFilters(): void {
    this.filters = { from: '', to: '' };
    this.loadHistory();
  }

  displayPercent(value: number | null): string { return value === null ? '-' : `${value}%`; }
}
