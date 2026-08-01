import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { TeacherService, TeacherBatch, DailyQuizSummary } from '../teacher.service';
import { MediaService } from '../../media-library/media.service';

type QuizTemplate = 'quick10' | 'standard15' | 'custom';
type QuestionType = 'mcq' | 'true_false' | 'ordering' | 'matching';

interface QuizQuestionForm {
  prompt: string;
  questionType: QuestionType;
  imageUrl: string | null;
  mediaAssetId: number | null;
  correctBoolean: 'true' | 'false';
  options: { text: string; matchText?: string; isCorrect: boolean }[];
}

@Component({
  selector: 'snt-teacher-quizzes',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>Daily Revision Quizzes</h1><p>Build timed quizzes with MCQ, true/false, ordering and matching activities</p></div>
    </div>

    <section class="card quiz-form">
      <div class="template-row">
        <button class="template-btn" [class.template-btn--active]="template() === 'quick10'" (click)="applyTemplate('quick10')" type="button">Quick Revision<br><small>10 standard MCQs</small></button>
        <button class="template-btn" [class.template-btn--active]="template() === 'standard15'" (click)="applyTemplate('standard15')" type="button">Standard<br><small>15 standard MCQs</small></button>
        <button class="template-btn" [class.template-btn--active]="template() === 'custom'" (click)="applyTemplate('custom')" type="button">Custom<br><small>Mix question types</small></button>
      </div>

      <div class="grid">
        <label><span>Batch *</span><select class="input" [(ngModel)]="form.batchId"><option [ngValue]="null">Select batch</option>@for (b of batches(); track b.id) { <option [ngValue]="b.id">{{ b.name }} - {{ b.course.name }} ({{ b.branch.name }})</option> }</select></label>
        <label><span>Title *</span><input class="input" [(ngModel)]="form.title" placeholder="Daily revision quiz" /></label>
        <label><span>Topic</span><input class="input" [(ngModel)]="form.topic" placeholder="Last lecture topic" /></label>
        <label><span>Lecture date</span><input class="input" type="date" [(ngModel)]="form.lectureDate" /></label>
        <label><span>Availability starts *</span><input class="input" type="datetime-local" [(ngModel)]="form.scheduledAt" /></label>
        <label><span>Availability ends *</span><input class="input" type="datetime-local" [(ngModel)]="form.closesAt" /></label>
        <label><span>Attempt duration *</span><input class="input" type="number" min="1" max="60" [(ngModel)]="form.durationMinutes" /><small>Teacher configurable from 1-60 minutes. Default is 10.</small></label>
      </div>

      <div class="builder">
        <aside class="question-nav">
          @for (q of questions(); track $index; let i = $index) {
            <button type="button" [class.active]="activeQuestion() === i" (click)="activeQuestion.set(i)">Q{{ i + 1 }}<small>{{ typeLabel(q.questionType) }}</small></button>
          }
          <button type="button" class="add" (click)="addQuestion()">+</button>
        </aside>

        @if (currentQuestion(); as q) {
          <div class="question-editor">
            <div class="editor-head">
              <h2>Question {{ activeQuestion() + 1 }}</h2>
              <div>
                <button class="btn btn-secondary btn-sm" type="button" (click)="moveQuestion(-1)">Up</button>
                <button class="btn btn-secondary btn-sm" type="button" (click)="moveQuestion(1)">Down</button>
                <button class="btn btn-danger btn-sm" type="button" (click)="removeQuestion()">Remove</button>
              </div>
            </div>

            <label><span>Question type</span><select class="input" [(ngModel)]="q.questionType" (ngModelChange)="setQuestionType(q, $event)"><option value="mcq">MCQ - four options</option><option value="true_false">True / False</option><option value="ordering">Ordering / sequence</option><option value="matching">Matching pairs</option></select></label>
            <label><span>Question text *</span><textarea class="input" rows="3" [(ngModel)]="q.prompt" placeholder="Type the question or instruction"></textarea></label>

            <label><span>Optional question image</span><input class="input" type="file" accept="image/*" (change)="uploadQuestionImage($event)" /><small>Use diagrams, screenshots or reference images. Upload is scoped to the selected batch branch.</small></label>
            @if (q.imageUrl) { <img class="question-image" [src]="q.imageUrl" alt="Question reference" /> }

            @if (q.questionType === 'mcq') {
              <div class="options-head"><span>Four answer options</span><small>Select the single correct answer.</small></div>
              <div class="options">
                @for (opt of q.options; track $index; let oi = $index) {
                  <label class="option"><input type="radio" [name]="'correct-' + activeQuestion()" [checked]="opt.isCorrect" (change)="setCorrect(oi)" /><input class="input" [(ngModel)]="opt.text" [placeholder]="'Option ' + (oi + 1)" /></label>
                }
              </div>
            }

            @if (q.questionType === 'true_false') {
              <div class="choice-row">
                <label class="choice"><input type="radio" [name]="'tf-' + activeQuestion()" value="true" [(ngModel)]="q.correctBoolean" /> True</label>
                <label class="choice"><input type="radio" [name]="'tf-' + activeQuestion()" value="false" [(ngModel)]="q.correctBoolean" /> False</label>
              </div>
            }

            @if (q.questionType === 'ordering') {
              <div class="options-head"><span>Correct sequence</span><button class="btn btn-secondary btn-sm" type="button" [disabled]="q.options.length >= 8" (click)="addSequenceItem()">Add Item</button></div>
              <div class="options">
                @for (opt of q.options; track $index; let oi = $index) {
                  <label class="sequence-item"><span>{{ oi + 1 }}</span><input class="input" [(ngModel)]="opt.text" [placeholder]="'Step ' + (oi + 1)" /><button class="btn btn-secondary btn-sm" type="button" (click)="moveOption(oi, -1)">Up</button><button class="btn btn-secondary btn-sm" type="button" (click)="moveOption(oi, 1)">Down</button>@if (q.options.length > 2) { <button class="btn btn-ghost btn-sm" type="button" (click)="removeOption(oi)">Remove</button> }</label>
                }
              </div>
            }

            @if (q.questionType === 'matching') {
              <div class="options-head"><span>Matching pairs</span><button class="btn btn-secondary btn-sm" type="button" [disabled]="q.options.length >= 8" (click)="addMatchPair()">Add Pair</button></div>
              <div class="options">
                @for (opt of q.options; track $index; let oi = $index) {
                  <label class="match-item"><input class="input" [(ngModel)]="opt.text" placeholder="Prompt item" /><input class="input" [(ngModel)]="opt.matchText" placeholder="Matching answer" />@if (q.options.length > 2) { <button class="btn btn-ghost btn-sm" type="button" (click)="removeOption(oi)">Remove</button> }</label>
                }
              </div>
            }
          </div>

          <div class="preview">
            <h2>Preview</h2>
            <div class="preview-card">
              <small>{{ typeLabel(q.questionType) }}</small>
              <strong>{{ q.prompt || 'Question text appears here' }}</strong>
              @if (q.imageUrl) { <img [src]="q.imageUrl" alt="Question preview" /> }
              @if (q.questionType === 'true_false') {
                <div class="preview-option">True</div><div class="preview-option">False</div>
              } @else {
                @for (opt of q.options; track $index; let oi = $index) {
                  <div class="preview-option">{{ q.questionType === 'matching' ? (opt.text || 'Prompt') + ' -> ' + (opt.matchText || 'Match') : opt.text || 'Item ' + (oi + 1) }}</div>
                }
              }
            </div>
          </div>
        }
      </div>

      @if (error()) { <div class="error">{{ error() }}</div> }
      <div class="actions"><button class="btn btn-primary" [disabled]="saving()" (click)="createQuiz()">{{ saving() ? 'Saving...' : 'Create Quiz' }}</button></div>
    </section>

    <section class="card">
      <h2 class="list-title">Recent quizzes</h2>
      <div class="quiz-list">
        @for (quiz of quizzes(); track quiz.id) {
          <div class="quiz-row">
            <div><strong>{{ quiz.title }}</strong><small>{{ quiz.batch.name }} · {{ quiz._count.questions }} questions · {{ quiz.durationMinutes }} min attempt</small></div>
            <span>{{ quiz.scheduledAt | slice:0:16 }} to {{ quiz.closesAt | slice:0:16 }}</span>
            <button class="btn btn-danger btn-sm" (click)="archiveQuiz(quiz)">Archive</button>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .quiz-form { margin-bottom: 18px; }
    .template-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .template-btn { min-width: 160px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); padding: 10px 12px; text-align: left; cursor: pointer; font-weight: 800; }
    .template-btn small, .preview-card small, label small { color: var(--color-text-muted); font-weight: 600; text-transform: none; }
    .template-btn--active { border-color: var(--layout-accent, #0d9488); background: var(--layout-accent-light, #ccfbf1); color: var(--layout-accent, #0d9488); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); }
    .input { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 9px 10px; background: var(--color-surface); font-size: var(--font-size-sm); min-width: 0; }
    .builder { margin-top: 18px; display: grid; grid-template-columns: 112px minmax(0, 1.35fr) minmax(260px, .8fr); gap: 14px; align-items: start; }
    .question-nav { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .question-nav button { border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); padding: 7px 0; cursor: pointer; font-weight: 800; }
    .question-nav button small { display: block; font-size: 9px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; }
    .question-nav button.active { background: var(--layout-accent, #0d9488); color: white; border-color: var(--layout-accent, #0d9488); }
    .question-nav button.active small { color: white; }
    .question-nav .add { color: var(--layout-accent, #0d9488); }
    .question-editor, .preview { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; display: grid; gap: 12px; }
    .editor-head, .options-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    .editor-head h2, .preview h2, .list-title { margin: 0; font-size: var(--font-size-lg); }
    .question-image, .preview-card img { max-width: 100%; max-height: 220px; border-radius: var(--radius-md); border: 1px solid var(--color-border); object-fit: contain; }
    .options { display: grid; gap: 8px; }
    .option { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 8px; text-transform: none; }
    .choice-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .choice { flex-direction: row; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px 12px; text-transform: none; color: var(--color-text); }
    .sequence-item { display: grid; grid-template-columns: 28px 1fr auto auto auto; align-items: center; gap: 8px; text-transform: none; }
    .sequence-item span { display: grid; place-items: center; height: 28px; border-radius: 999px; background: var(--color-background-subtle); color: var(--color-text); }
    .match-item { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: center; gap: 8px; text-transform: none; }
    .preview-card { display: grid; gap: 10px; }
    .preview-option { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
    .actions { display: flex; justify-content: flex-end; margin-top: 16px; }
    .error { margin-top: 12px; color: var(--color-danger); font-size: var(--font-size-sm); }
    .quiz-list { display: grid; gap: 8px; margin-top: 12px; }
    .quiz-row { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px; }
    .quiz-row small { display: block; color: var(--color-text-muted); margin-top: 3px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    @media (max-width: 980px) { .builder, .quiz-row, .match-item, .sequence-item { grid-template-columns: 1fr; } .question-nav { grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); } }
  `],
})
export class TeacherQuizzesComponent implements OnInit {
  private readonly teacherSvc = inject(TeacherService);
  private readonly mediaSvc = inject(MediaService);
  readonly batches = signal<TeacherBatch[]>([]);
  readonly quizzes = signal<DailyQuizSummary[]>([]);
  readonly questions = signal<QuizQuestionForm[]>([]);
  readonly activeQuestion = signal(0);
  readonly template = signal<QuizTemplate>('quick10');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  form = { batchId: null as number | null, title: 'Daily Revision Quiz', topic: '', lectureDate: '', scheduledAt: '', closesAt: '', durationMinutes: 10 };

  ngOnInit(): void {
    this.teacherSvc.getMyBatches().subscribe((batches) => this.batches.set(batches));
    this.loadQuizzes();
    this.applyTemplate('quick10');
  }

  loadQuizzes(): void { this.teacherSvc.getDailyQuizzes().subscribe((quizzes) => this.quizzes.set(quizzes)); }
  typeLabel(type: QuestionType): string { return ({ mcq: 'MCQ', true_false: 'True/False', ordering: 'Ordering', matching: 'Matching' })[type]; }

  applyTemplate(template: QuizTemplate): void {
    this.template.set(template);
    if (template === 'quick10') this.setQuestionCount(10);
    if (template === 'standard15') this.setQuestionCount(15);
    if (template === 'custom' && this.questions().length === 0) this.setQuestionCount(1);
  }

  currentQuestion(): QuizQuestionForm | null { return this.questions()[this.activeQuestion()] ?? null; }
  addQuestion(): void { if (this.questions().length < 15) this.questions.update((items) => [...items, this.blankQuestion()]); this.activeQuestion.set(this.questions().length - 1); this.template.set('custom'); }
  removeQuestion(): void { if (this.questions().length <= 1) return; const index = this.activeQuestion(); this.questions.update((items) => items.filter((_, i) => i !== index)); this.activeQuestion.set(Math.max(0, index - 1)); this.template.set('custom'); }
  moveQuestion(delta: number): void {
    const index = this.activeQuestion();
    const next = index + delta;
    if (next < 0 || next >= this.questions().length) return;
    this.questions.update((items) => { const copy = [...items]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy; });
    this.activeQuestion.set(next);
  }

  setQuestionType(question: QuizQuestionForm, type: QuestionType): void {
    question.questionType = type;
    if (type === 'mcq') question.options = this.defaultMcqOptions();
    if (type === 'true_false') { question.correctBoolean = 'true'; question.options = []; }
    if (type === 'ordering') question.options = [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }];
    if (type === 'matching') question.options = [{ text: '', matchText: '', isCorrect: false }, { text: '', matchText: '', isCorrect: false }];
    this.template.set('custom');
  }

  setCorrect(optionIndex: number): void { const q = this.currentQuestion(); if (q) q.options.forEach((opt, i) => opt.isCorrect = i === optionIndex); }
  addSequenceItem(): void { const q = this.currentQuestion(); if (q && q.options.length < 8) q.options.push({ text: '', isCorrect: false }); }
  addMatchPair(): void { const q = this.currentQuestion(); if (q && q.options.length < 8) q.options.push({ text: '', matchText: '', isCorrect: false }); }
  removeOption(index: number): void { const q = this.currentQuestion(); if (!q || q.options.length <= 2) return; q.options.splice(index, 1); if (q.questionType === 'mcq' && !q.options.some((o) => o.isCorrect)) q.options[0].isCorrect = true; }
  moveOption(index: number, delta: number): void {
    const q = this.currentQuestion();
    if (!q) return;
    const next = index + delta;
    if (next < 0 || next >= q.options.length) return;
    [q.options[index], q.options[next]] = [q.options[next], q.options[index]];
  }

  uploadQuestionImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const question = this.currentQuestion();
    const batch = this.batches().find((item) => item.id === this.form.batchId);
    if (!file || !question) return;
    if (!batch) { this.error.set('Select a batch before uploading a question image.'); return; }
    this.mediaSvc.upload(file, { title: `Quiz question ${this.activeQuestion() + 1}`, uploadCategory: 'image', ownerScope: 'branch', branchId: batch.branch.id }).subscribe({
      next: (result) => { question.mediaAssetId = result.asset.id; question.imageUrl = result.asset.fileUrl; this.error.set(null); },
      error: (err) => this.error.set(err.error?.error ?? 'Failed to upload question image.'),
    });
  }

  createQuiz(): void {
    this.error.set(null);
    const questions = this.questions().filter((q) => q.prompt.trim()).map((q) => ({
      prompt: q.prompt.trim(),
      questionType: q.questionType,
      mediaAssetId: q.mediaAssetId,
      correctBoolean: q.correctBoolean,
      options: q.options.map((o) => ({ text: o.text.trim(), matchText: (o.matchText ?? '').trim(), isCorrect: o.isCorrect })),
    }));
    if (!this.form.batchId || !this.form.title.trim() || !this.form.scheduledAt || !this.form.closesAt || questions.length === 0) { this.error.set('Batch, title, timing and at least one valid question are required.'); return; }
    const invalid = questions.find((q) => !this.validQuestion(q));
    if (invalid) { this.error.set('Check every question: MCQ needs exactly 4 options, True/False needs one correct value, and ordering/matching need at least 2 valid items.'); return; }
    this.saving.set(true);
    this.teacherSvc.createDailyQuiz({ ...this.form, questions }).subscribe({
      next: (quiz) => { this.quizzes.update((items) => [quiz, ...items]); this.saving.set(false); this.applyTemplate(this.template()); },
      error: (err) => { this.error.set(err.error?.error ?? 'Failed to create quiz.'); this.saving.set(false); },
    });
  }

  archiveQuiz(quiz: DailyQuizSummary): void {
    if (!confirm(`Archive quiz "${quiz.title}"?`)) return;
    this.teacherSvc.archiveDailyQuiz(quiz.id).subscribe(() => this.quizzes.update((items) => items.filter((item) => item.id !== quiz.id)));
  }

  private setQuestionCount(count: number): void {
    this.questions.set(Array.from({ length: count }, () => this.blankQuestion()));
    this.activeQuestion.set(0);
  }

  private blankQuestion(): QuizQuestionForm {
    return { prompt: '', questionType: 'mcq', imageUrl: null, mediaAssetId: null, correctBoolean: 'true', options: this.defaultMcqOptions() };
  }

  private defaultMcqOptions(): { text: string; isCorrect: boolean }[] {
    return [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }];
  }

  private validQuestion(q: { questionType: QuestionType; correctBoolean: string; options: { text: string; matchText?: string; isCorrect: boolean }[] }): boolean {
    if (q.questionType === 'true_false') return q.correctBoolean === 'true' || q.correctBoolean === 'false';
    if (q.questionType === 'mcq') return q.options.length === 4 && q.options.every((o) => o.text) && q.options.filter((o) => o.isCorrect).length === 1;
    if (q.questionType === 'ordering') return q.options.length >= 2 && q.options.length <= 8 && q.options.every((o) => o.text);
    return q.options.length >= 2 && q.options.length <= 8 && q.options.every((o) => o.text && o.matchText);
  }
}
