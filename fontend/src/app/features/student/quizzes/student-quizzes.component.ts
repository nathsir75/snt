import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentDailyQuiz, StudentService } from '../student.service';

@Component({
  selector: 'snt-student-quizzes',
  standalone: true,
  imports: [SlicePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Daily Revision Quiz</h1><p>One timed attempt for your active batch</p></div></div>
    @if (!attempt()) {
      <div class="quiz-list">
        @for (quiz of quizzes(); track quiz.id) {
          <div class="quiz-card card">
            <div><strong>{{ quiz.title }}</strong><small>{{ quiz.topic || 'Daily revision' }} · {{ quiz._count.questions }} questions · {{ quiz.durationMinutes }} min attempt</small><small>Open {{ quiz.scheduledAt | slice:0:16 }} to {{ quiz.closesAt | slice:0:16 }}</small></div>
            @if (quiz.attempt?.submittedAt) { <span class="score">Score {{ quiz.attempt?.score }}/{{ quiz.attempt?.totalPoints }}</span> }
            @else { <button class="btn btn-primary" (click)="start(quiz)">Start</button> }
          </div>
        }
      </div>
    } @else {
      <section class="card attempt">
        <div class="attempt__head"><div><h2>{{ attempt().quiz.title }}</h2><p>{{ attempt().quiz.topic }}</p></div><strong>{{ remaining() }}</strong></div>
        @for (q of attempt().questions; track q.id; let i = $index) {
          <div class="question">
            <div class="question-title"><small>{{ typeLabel(q.questionType) }}</small><strong>{{ i + 1 }}. {{ q.prompt }}</strong></div>
            @if (q.imageUrl) { <img class="question-image" [src]="q.imageUrl" alt="Question reference" /> }

            @if (q.questionType === 'mcq' || q.questionType === 'true_false') {
              @for (opt of q.options; track opt.id) {
                <label class="option"><input type="radio" [name]="'q' + q.id" (change)="answer(q.id, opt.id)" /> {{ opt.text }}</label>
              }
            }

            @if (q.questionType === 'ordering') {
              <div class="assist">Arrange the items in the correct sequence.</div>
              <div class="order-list">
                @for (item of orderingAnswer(q.id); track item; let oi = $index) {
                  <div class="order-item"><span>{{ oi + 1 }}</span><strong>{{ optionText(q, item) }}</strong><button class="btn btn-secondary btn-sm" type="button" (click)="moveOrder(q.id, oi, -1)">Up</button><button class="btn btn-secondary btn-sm" type="button" (click)="moveOrder(q.id, oi, 1)">Down</button></div>
                }
              </div>
            }

            @if (q.questionType === 'matching') {
              <div class="assist">Choose the matching item for each row.</div>
              <div class="match-list">
                @for (opt of q.options; track opt.id) {
                  <label class="match-row"><span>{{ opt.text }}</span><select class="input" [ngModel]="matchingAnswer(q.id, opt.id)" (ngModelChange)="match(q.id, opt.id, $event)"><option [ngValue]="null">Select match</option>@for (choice of q.matchOptions; track choice.id) { <option [ngValue]="choice.id">{{ choice.text }}</option> }</select></label>
                }
              </div>
            }
          </div>
        }
        <div class="actions"><button class="btn btn-primary" (click)="submit()">Submit Quiz</button></div>
      </section>
    }
    @if (result(); as r) {
      <section class="card result"><h2>Result: {{ r.attempt.score }}/{{ r.attempt.totalPoints }}</h2><p>Status: {{ r.attempt.status }}</p></section>
    }
    @if (error()) { <div class="error">{{ error() }}</div> }
  `,
  styles: [`
    .quiz-list { display: grid; gap: 12px; }
    .quiz-card { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
    small { display: block; color: var(--color-text-muted); margin-top: 4px; }
    .score { color: var(--color-success); font-weight: 800; }
    .attempt { display: grid; gap: 14px; }
    .attempt__head { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
    .attempt__head h2 { margin: 0; }
    .attempt__head strong { color: var(--color-danger); font-size: var(--font-size-xl); }
    .question { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; display: grid; gap: 10px; }
    .question-title { display: grid; gap: 4px; }
    .question-image { max-width: 100%; max-height: 260px; border: 1px solid var(--color-border); border-radius: var(--radius-md); object-fit: contain; }
    .option { display: block; padding: 8px; border-radius: var(--radius-sm); }
    .assist { color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .order-list, .match-list { display: grid; gap: 8px; }
    .order-item { display: grid; grid-template-columns: 28px 1fr auto auto; gap: 8px; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 8px; }
    .order-item span { display: grid; place-items: center; height: 28px; border-radius: 999px; background: var(--color-background-subtle); }
    .match-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, .8fr); gap: 10px; align-items: center; }
    .input { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 9px 10px; background: var(--color-surface); font-size: var(--font-size-sm); min-width: 0; }
    .actions { display: flex; justify-content: flex-end; }
    .error { color: var(--color-danger); margin-top: 12px; }
    .result { margin-top: 14px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    @media (max-width: 720px) { .quiz-card, .order-item, .match-row { grid-template-columns: 1fr; } }
  `],
})
export class StudentQuizzesComponent implements OnInit, OnDestroy {
  private readonly studentSvc = inject(StudentService);
  readonly quizzes = signal<StudentDailyQuiz[]>([]);
  readonly attempt = signal<any | null>(null);
  readonly result = signal<any | null>(null);
  readonly error = signal<string | null>(null);
  readonly remaining = signal('');
  private answers: Record<string, any> = {};
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void { this.studentSvc.getDailyQuizzes().subscribe((quizzes) => this.quizzes.set(quizzes)); }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  typeLabel(type: string): string { return ({ mcq: 'MCQ', true_false: 'True/False', ordering: 'Ordering', matching: 'Matching' } as Record<string, string>)[type] ?? 'Question'; }

  start(quiz: StudentDailyQuiz): void {
    this.studentSvc.startDailyQuiz(quiz.id).subscribe({
      next: (data) => { this.attempt.set(data); this.result.set(null); this.answers = {}; this.initializeAnswers(data.questions); this.startTimer(); },
      error: (err) => this.error.set(err.error?.error ?? 'Could not start quiz.'),
    });
  }

  answer(questionId: number, optionId: number): void { this.answers[String(questionId)] = optionId; }
  orderingAnswer(questionId: number): number[] { return this.answers[String(questionId)] ?? []; }
  matchingAnswer(questionId: number, optionId: number): number | null { return this.answers[String(questionId)]?.[String(optionId)] ?? null; }
  match(questionId: number, optionId: number, matchId: number | null): void {
    const current = this.answers[String(questionId)] ?? {};
    current[String(optionId)] = matchId;
    this.answers[String(questionId)] = current;
  }
  optionText(question: any, optionId: number): string { return question.options.find((option: any) => option.id === optionId)?.text ?? ''; }
  moveOrder(questionId: number, index: number, delta: number): void {
    const current = [...this.orderingAnswer(questionId)];
    const next = index + delta;
    if (next < 0 || next >= current.length) return;
    [current[index], current[next]] = [current[next], current[index]];
    this.answers[String(questionId)] = current;
  }

  submit(): void {
    const attempt = this.attempt();
    if (!attempt) return;
    this.studentSvc.submitDailyQuizAttempt(attempt.attempt.id, this.answers).subscribe((result) => { this.result.set(result); this.attempt.set(null); if (this.timer) clearInterval(this.timer); });
  }

  private initializeAnswers(questions: any[]): void {
    for (const question of questions) {
      if (question.questionType === 'ordering') this.answers[String(question.id)] = question.options.map((option: any) => option.id);
      if (question.questionType === 'matching') this.answers[String(question.id)] = {};
    }
  }

  private startTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      const attempt = this.attempt();
      if (!attempt) return;
      const ms = new Date(attempt.attempt.expiresAt).getTime() - Date.now();
      if (ms <= 0) { this.remaining.set('00:00'); this.submit(); return; }
      const min = Math.floor(ms / 60000).toString().padStart(2, '0');
      const sec = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
      this.remaining.set(`${min}:${sec}`);
    }, 500);
  }
}
