import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';

type MentorQuestion = {
  id: number;
  liveSessionId: number;
  studentId: number;
  questionText: string;
  answerText: string | null;
  answeredByUserId: number | null;
  createdAt: string;
  answeredAt: string | null;
  student: {
    id: number;
    fullName: string;
    email: string;
  };
  answeredBy: {
    id: number;
    name: string;
    email: string;
  } | null;
};

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'snt-mentor-qa',
  standalone: true,
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mentor-qa" aria-label="Mentor Q&A">
      <header class="mentor-qa__header">
        <div>
          <h2>Mentor Q&amp;A</h2>
          <p>{{ questions().length }} सवाल</p>
        </div>
        @if (isPolling()) {
          <span class="mentor-qa__sync">Live</span>
        }
      </header>

      <div class="mentor-qa__messages">
        @if (state() === 'loading' && !questions().length) {
          <div class="mentor-qa__state">Loading...</div>
        } @else if (state() === 'error' && !questions().length) {
          <div class="mentor-qa__state mentor-qa__state--error">{{ errorMessage() }}</div>
        } @else if (!questions().length) {
          <div class="mentor-qa__state">अभी कोई सवाल नहीं है</div>
        } @else {
          @for (question of questions(); track question.id) {
            <article class="mentor-qa__thread">
              <div class="mentor-qa__bubble mentor-qa__bubble--student">
                <div class="mentor-qa__meta">
                  <strong>{{ question.student.fullName }}</strong>
                  <time>{{ question.createdAt | date:'shortTime' }}</time>
                </div>
                <p>{{ question.questionText }}</p>
              </div>

              @if (question.answerText) {
                <div class="mentor-qa__bubble mentor-qa__bubble--mentor">
                  <div class="mentor-qa__meta">
                    <strong>{{ question.answeredBy?.name || 'Mentor' }}</strong>
                    @if (question.answeredAt) {
                      <time>{{ question.answeredAt | date:'shortTime' }}</time>
                    }
                  </div>
                  <p>{{ question.answerText }}</p>
                </div>
              } @else if (canAnswer()) {
                <form class="mentor-qa__answer" (ngSubmit)="answerQuestion(question.id)">
                  <input
                    type="text"
                    name="answer-{{ question.id }}"
                    [(ngModel)]="answerDrafts[question.id]"
                    [disabled]="answeringId() === question.id"
                    autocomplete="off"
                  />
                  <button type="submit" [disabled]="answeringId() === question.id || !answerDraft(question.id)">
                    Reply
                  </button>
                </form>
              }
            </article>
          }
        }
      </div>

      @if (canAsk()) {
        <form class="mentor-qa__composer" (ngSubmit)="sendQuestion()">
          <input
            type="text"
            name="questionText"
            [(ngModel)]="questionDraft"
            [disabled]="sending()"
            autocomplete="off"
          />
          <button type="submit" [disabled]="sending() || !trimmedQuestion()">
            Send
          </button>
        </form>
      }
    </section>
  `,
  styles: [`
    .mentor-qa {
      display: flex;
      flex-direction: column;
      min-height: 420px;
      max-height: 640px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    .mentor-qa__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg);
    }

    .mentor-qa__header h2 {
      margin: 0;
      color: var(--color-text);
      font-size: var(--font-size-lg);
      font-weight: 800;
      letter-spacing: 0;
    }

    .mentor-qa__header p {
      margin: 2px 0 0;
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      font-weight: 700;
    }

    .mentor-qa__sync {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 3px 9px;
      border-radius: 999px;
      background: #dcfce7;
      color: #166534;
      font-size: var(--font-size-xs);
      font-weight: 800;
    }

    .mentor-qa__messages {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 0;
      padding: 16px;
      overflow-y: auto;
      background: #f8fafc;
    }

    .mentor-qa__thread {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mentor-qa__bubble {
      max-width: min(82%, 560px);
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: #fff;
      color: var(--color-text);
      word-break: break-word;
    }

    .mentor-qa__bubble--student {
      align-self: flex-start;
      border-bottom-left-radius: var(--radius-sm);
    }

    .mentor-qa__bubble--mentor {
      align-self: flex-end;
      border-color: #bfdbfe;
      border-bottom-right-radius: var(--radius-sm);
      background: #eff6ff;
    }

    .mentor-qa__meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 5px;
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
    }

    .mentor-qa__meta strong {
      color: var(--color-text);
      font-weight: 800;
    }

    .mentor-qa__meta time {
      white-space: nowrap;
    }

    .mentor-qa__bubble p {
      margin: 0;
      font-size: var(--font-size-sm);
      line-height: 1.45;
    }

    .mentor-qa__state {
      margin: auto;
      padding: 20px;
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      text-align: center;
    }

    .mentor-qa__state--error {
      color: var(--color-danger);
    }

    .mentor-qa__composer,
    .mentor-qa__answer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
    }

    .mentor-qa__composer {
      padding: 12px;
      border-top: 1px solid var(--color-border);
      background: var(--color-bg);
    }

    .mentor-qa__answer {
      align-self: flex-end;
      width: min(82%, 560px);
    }

    .mentor-qa__composer input,
    .mentor-qa__answer input {
      width: 100%;
      min-width: 0;
      min-height: 38px;
      padding: 8px 11px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: #fff;
      color: var(--color-text);
      font-size: var(--font-size-sm);
      outline: none;
    }

    .mentor-qa__composer input:focus,
    .mentor-qa__answer input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, .1);
    }

    .mentor-qa__composer button,
    .mentor-qa__answer button {
      min-height: 38px;
      padding: 0 14px;
      border: 0;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: #fff;
      font-size: var(--font-size-sm);
      font-weight: 800;
      cursor: pointer;
    }

    .mentor-qa__composer button:disabled,
    .mentor-qa__answer button:disabled,
    .mentor-qa__composer input:disabled,
    .mentor-qa__answer input:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    @media (max-width: 640px) {
      .mentor-qa {
        min-height: 360px;
        max-height: 560px;
        border-radius: var(--radius-md);
      }

      .mentor-qa__messages {
        padding: 12px;
      }

      .mentor-qa__bubble,
      .mentor-qa__answer {
        max-width: 92%;
        width: 92%;
      }

      .mentor-qa__composer {
        grid-template-columns: minmax(0, 1fr) 68px;
      }
    }
  `],
})
export class MentorQaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly liveSessionId = input.required<number>();
  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly questions = signal<MentorQuestion[]>([]);
  readonly sending = signal(false);
  readonly answeringId = signal<number | null>(null);
  readonly isPolling = signal(false);

  questionDraft = '';
  answerDrafts: Record<number, string> = {};

  readonly canAsk = computed(() => this.auth.isStudent());
  readonly canAnswer = computed(() => this.auth.isTeacher());

  ngOnInit(): void {
    this.loadQuestions();
    this.pollTimer = setInterval(() => this.loadQuestions(true), 10_000);

    this.destroyRef.onDestroy(() => {
      if (this.pollTimer) clearInterval(this.pollTimer);
    });
  }

  loadQuestions(background = false): void {
    if (!background) this.state.set('loading');
    this.isPolling.set(background);

    this.api.get<MentorQuestion[]>('/mentor-qa/questions', { liveSessionId: this.liveSessionId() })
      .pipe(
        finalize(() => this.isPolling.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (questions) => {
          this.questions.set(questions);
          this.state.set('ready');
          this.errorMessage.set(null);
        },
        error: (error) => {
          console.error('[MentorQA] Failed to load questions:', error);
          this.errorMessage.set('सवाल लोड नहीं हो पाए');
          this.state.set('error');
        },
      });
  }

  sendQuestion(): void {
    const questionText = this.trimmedQuestion();
    if (!questionText || this.sending()) return;

    this.sending.set(true);
    this.api.post<MentorQuestion>('/mentor-qa/questions', {
      liveSessionId: this.liveSessionId(),
      questionText,
    })
      .pipe(
        finalize(() => this.sending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (question) => {
          this.questionDraft = '';
          this.questions.update((questions) => [...questions, question]);
          this.state.set('ready');
        },
        error: (error) => {
          console.error('[MentorQA] Failed to send question:', error);
          this.errorMessage.set('सवाल भेजा नहीं जा सका');
          this.state.set('error');
        },
      });
  }

  answerQuestion(questionId: number): void {
    const answerText = this.answerDraft(questionId);
    if (!answerText || this.answeringId()) return;

    this.answeringId.set(questionId);
    this.api.patch<MentorQuestion>(`/mentor-qa/questions/${questionId}/answer`, { answerText })
      .pipe(
        finalize(() => this.answeringId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.answerDrafts[questionId] = '';
          this.questions.update((questions) => questions.map((q) => q.id === updated.id ? updated : q));
        },
        error: (error) => {
          console.error('[MentorQA] Failed to answer question:', error);
          this.errorMessage.set('उत्तर भेजा नहीं जा सका');
          this.state.set('error');
        },
      });
  }

  answerDraft(questionId: number): string {
    return (this.answerDrafts[questionId] ?? '').trim();
  }

  trimmedQuestion(): string {
    return this.questionDraft.trim();
  }
}
