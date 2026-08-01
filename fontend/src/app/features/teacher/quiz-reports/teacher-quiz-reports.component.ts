import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { TeacherBatch, TeacherQuizReport, TeacherService } from '../teacher.service';

@Component({
  selector: 'snt-teacher-quiz-reports',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>Quiz Analytics</h1><p>Date-wise performance and participation for assigned batches</p></div>
    </div>

    <section class="card filters">
      <label><span>Batch</span><select class="input" [(ngModel)]="filters.batchId" (change)="loadReport()"><option [ngValue]="null">All assigned batches</option>@for (batch of batches(); track batch.id) { <option [ngValue]="batch.id">{{ batch.name }} - {{ batch.course.name }}</option> }</select></label>
      <label><span>From</span><input class="input" type="date" [(ngModel)]="filters.from" (change)="loadReport()" /></label>
      <label><span>To</span><input class="input" type="date" [(ngModel)]="filters.to" (change)="loadReport()" /></label>
      <button class="btn btn-secondary" type="button" (click)="clearFilters()">Clear</button>
    </section>

    @if (loading()) {
      <div class="card empty">Loading quiz analytics...</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else {
      @if (report(); as data) {
        <section class="metrics">
          <div class="metric card"><span>Total Quizzes</span><strong>{{ data.summary.totalQuizzesPublished }}</strong></div>
          <div class="metric card"><span>Completed Attempts</span><strong>{{ data.summary.completedAttempts }}/{{ data.summary.possibleAttempts }}</strong></div>
          <div class="metric card"><span>Participation</span><strong>{{ data.summary.participationRate }}%</strong></div>
          <div class="metric card"><span>Class Average</span><strong>{{ displayPercent(data.summary.classAveragePercentage) }}</strong></div>
        </section>

      <section class="card">
        <div class="section-head"><h2>Quiz Performance</h2><span>{{ data.quizzes.length }} quizzes</span></div>
        <div class="quiz-list">
          @for (quiz of data.quizzes; track quiz.id) {
            <article class="quiz-block">
              <div class="quiz-block__head">
                <div><strong>{{ quiz.title }}</strong><small>{{ quiz.topic || 'Daily revision' }} · {{ quiz.batch.name }} · {{ quiz.quizDate | slice:0:10 }}</small></div>
                <div class="quiz-block__metrics"><span>{{ quiz.summary.completedAttempts }}/{{ quiz.summary.enrolledStudents }} completed</span><span>{{ displayPercent(quiz.summary.averagePercentage) }} avg</span></div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Score</th><th>Percent</th><th>Status</th><th>Submitted</th></tr></thead>
                  <tbody>
                    @for (row of quiz.students; track row.studentId) {
                      <tr>
                        <td><strong>{{ row.fullName }}</strong><small>{{ row.mobile || row.email || '' }}</small></td>
                        <td>{{ row.score === null ? '-' : row.score + '/' + row.totalPoints }}</td>
                        <td>{{ displayPercent(row.percentage) }}</td>
                        <td><span class="pill" [class.pill--muted]="row.status === 'not_attempted'">{{ row.resultStatus }}</span></td>
                        <td>{{ row.submittedAt ? (row.submittedAt | slice:0:16) : '-' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </article>
          } @empty {
            <div class="empty">No quiz results found for the selected filters.</div>
          }
        </div>
      </section>

        <section class="card">
          <div class="section-head"><h2>Student Trends</h2><span>{{ data.students.length }} students</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Attempted</th><th>Average</th><th>Latest Result</th><th>Trend</th></tr></thead>
              <tbody>
                @for (student of data.students; track student.id) {
                  <tr>
                    <td><strong>{{ student.fullName }}</strong><small>{{ student.mobile || student.email || '' }}</small></td>
                    <td>{{ student.attempted }}/{{ student.assignedQuizzes }} <small>{{ student.participationRate }}%</small></td>
                    <td>{{ displayPercent(student.averagePercentage) }}</td>
                    <td>@if (student.latest) { {{ student.latest.title }}<small>{{ displayPercent(student.latest.percentage) }} · {{ student.latest.submittedAt ? (student.latest.submittedAt | slice:0:16) : student.latest.status }}</small> } @else { - }</td>
                    <td><span class="trend" [class.trend--up]="(student.trend ?? 0) > 0" [class.trend--down]="(student.trend ?? 0) < 0">{{ student.trend === null ? '-' : signed(student.trend) + '%' }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="5">No student performance data found.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    }
  `,
  styles: [`
    .filters { display: grid; grid-template-columns: minmax(240px, 1fr) 160px 160px auto; gap: 12px; align-items: end; margin-bottom: 16px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); }
    .input { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 9px 10px; background: var(--color-surface); font-size: var(--font-size-sm); }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .metric { display: grid; gap: 6px; }
    .metric span, small, .section-head span { color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .metric strong { font-size: var(--font-size-xl); color: var(--layout-accent, #0d9488); }
    .section-head, .quiz-block__head, .quiz-block__metrics { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .section-head h2 { margin: 0; font-size: var(--font-size-lg); }
    .quiz-list { display: grid; gap: 14px; margin-top: 12px; }
    .quiz-block { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; display: grid; gap: 12px; }
    .quiz-block__metrics { color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    th, td { padding: 10px 8px; border-bottom: 1px solid var(--color-border); text-align: left; vertical-align: top; }
    th { color: var(--color-text-muted); font-size: var(--font-size-xs); text-transform: uppercase; }
    .pill { display: inline-flex; border-radius: 999px; padding: 3px 8px; background: var(--layout-accent-light, #ccfbf1); color: var(--layout-accent, #0d9488); font-weight: 700; font-size: var(--font-size-xs); }
    .pill--muted { background: var(--color-background-subtle); color: var(--color-text-muted); }
    .trend { font-weight: 800; color: var(--color-text-muted); }
    .trend--up { color: var(--color-success); }
    .trend--down { color: var(--color-danger); }
    .empty, .error { padding: 18px; color: var(--color-text-muted); }
    .error { color: var(--color-danger); }
    @media (max-width: 820px) { .filters { grid-template-columns: 1fr; } .section-head, .quiz-block__head, .quiz-block__metrics { align-items: flex-start; flex-direction: column; } }
  `],
})
export class TeacherQuizReportsComponent implements OnInit {
  private readonly teacherSvc = inject(TeacherService);
  readonly batches = signal<TeacherBatch[]>([]);
  readonly report = signal<TeacherQuizReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  filters = { batchId: null as number | null, from: '', to: '' };

  ngOnInit(): void {
    this.teacherSvc.getMyBatches().subscribe((batches) => this.batches.set(batches));
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    this.error.set(null);
    this.teacherSvc.getDailyQuizReport(this.filters).subscribe({
      next: (report) => { this.report.set(report); this.loading.set(false); },
      error: (err) => { this.error.set(err.error?.error ?? 'Could not load quiz analytics.'); this.loading.set(false); },
    });
  }

  clearFilters(): void {
    this.filters = { batchId: null, from: '', to: '' };
    this.loadReport();
  }

  displayPercent(value: number | null): string { return value === null ? '-' : `${value}%`; }
  signed(value: number): string { return value > 0 ? `+${value}` : String(value); }
}
