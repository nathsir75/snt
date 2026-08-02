import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SlicePipe } from '@angular/common';
import { StudentLecturePayload, StudentService } from '../student.service';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type FeedbackStatus = 'clear' | 'need_revision' | 'ask_teacher';

@Component({
  selector: 'snt-student-lecture-player',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lecture-page">
      @if (loading()) {
        <div class="state card">Loading lecture...</div>
      } @else if (error()) {
        <div class="state card state--error">{{ error() }}</div>
      } @else {
        @if (lecture(); as data) {
          <section class="player-shell">
            <div class="player-frame">
              <iframe
                id="student-youtube-player"
                [src]="safeEmbedUrl()"
                title="YouTube lecture player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
          </section>

        <section class="lecture-meta card">
          <div>
            <span class="eyebrow">{{ categoryLabel(data.material.contentCategory) }}</span>
            <h1>{{ data.material.title }}</h1>
            <p>{{ data.material.batch.course.name }} · {{ data.material.batch.name }}</p>
          </div>
          <div class="meta-grid">
            <span><strong>Teacher</strong>{{ data.material.createdBy.name }}</span>
            <span><strong>Lecture date</strong>{{ lectureDate(data.material) }}</span>
            <span><strong>Progress</strong>{{ progressLabel() }}</span>
          </div>
          @if (data.material.description) { <p class="description">{{ data.material.description }}</p> }
        </section>

        <section class="card">
          <div class="section-head"><h2>Previous Recorded Lectures</h2><a routerLink="/student/my-course">View all</a></div>
          <div class="lecture-list">
            @for (item of data.previousLectures; track item.id) {
              <a class="lecture-row" [class.lecture-row--active]="item.active" [routerLink]="['/student/lectures', item.id]">
                <span>{{ item.lectureDate ? (item.lectureDate | slice:0:10) : (item.createdAt | slice:0:10) }}</span>
                <strong>{{ item.title }}</strong>
              </a>
            } @empty {
              <p class="muted">No previous recorded lectures are available yet.</p>
            }
          </div>
        </section>

          <section class="feedback card" [class.feedback--locked]="!canGiveFeedback()">
            <div class="section-head"><h2>Lecture Feedback</h2>@if (!canGiveFeedback()) { <span>Available after completion</span> }</div>
            @if (!canGiveFeedback()) {
              <p class="muted">Finish the lecture to submit feedback for your teacher.</p>
            } @else {
              <div class="rating-row">
                @for (star of [1,2,3,4,5]; track star) {
                  <button type="button" class="star" [class.star--active]="feedback.rating >= star" (click)="feedback.rating = star">{{ star }}</button>
                }
              </div>
              <div class="status-row">
                <button type="button" [class.active]="feedback.clarityStatus === 'clear'" (click)="feedback.clarityStatus = 'clear'">Clear</button>
                <button type="button" [class.active]="feedback.clarityStatus === 'need_revision'" (click)="feedback.clarityStatus = 'need_revision'">Need Revision</button>
                <button type="button" [class.active]="feedback.clarityStatus === 'ask_teacher'" (click)="feedback.clarityStatus = 'ask_teacher'">Ask Teacher</button>
              </div>
              <label>
                <span>Comment</span>
                <textarea class="input" rows="3" [value]="feedback.comment" (input)="feedback.comment = $any($event.target).value" placeholder="Optional note for your teacher"></textarea>
              </label>
              @if (feedbackMessage()) { <p class="feedback-message">{{ feedbackMessage() }}</p> }
              <button class="btn btn-primary" type="button" [disabled]="savingFeedback()" (click)="submitFeedback()">{{ savingFeedback() ? 'Saving...' : 'Submit Feedback' }}</button>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .lecture-page { display: grid; gap: 14px; max-width: 1080px; margin: 0 auto; }
    .player-shell { background: #0f172a; margin: -8px -8px 0; }
    .player-frame { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; }
    iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .lecture-meta { display: grid; gap: 12px; }
    .eyebrow { color: var(--layout-accent, #16a34a); font-size: var(--font-size-xs); font-weight: 800; text-transform: uppercase; }
    h1 { margin: 3px 0 4px; font-size: clamp(20px, 6vw, 32px); line-height: 1.15; }
    .lecture-meta p, .muted { color: var(--color-text-muted); margin: 0; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
    .meta-grid span { display: grid; gap: 3px; padding: 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .meta-grid strong { color: var(--color-text-muted); font-size: var(--font-size-xs); text-transform: uppercase; }
    .description { line-height: 1.5; }
    .section-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
    .section-head h2 { margin: 0; font-size: var(--font-size-lg); }
    .section-head a, .section-head span { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .lecture-list { display: grid; gap: 8px; }
    .lecture-row { display: grid; grid-template-columns: 96px 1fr; gap: 10px; padding: 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); color: inherit; text-decoration: none; }
    .lecture-row span { color: var(--color-text-muted); font-size: var(--font-size-xs); font-weight: 700; }
    .lecture-row--active { border-color: var(--layout-accent, #16a34a); background: var(--layout-accent-light, #dcfce7); }
    .feedback { display: grid; gap: 12px; }
    .feedback--locked { opacity: .85; }
    .rating-row, .status-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .star, .status-row button { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-md); cursor: pointer; }
    .star { width: 42px; height: 38px; font-weight: 800; }
    .star--active, .status-row .active { border-color: var(--layout-accent, #16a34a); background: var(--layout-accent-light, #dcfce7); color: var(--layout-accent, #16a34a); }
    .status-row button { padding: 9px 12px; font-weight: 700; }
    label { display: grid; gap: 6px; color: var(--color-text-muted); font-size: var(--font-size-xs); font-weight: 800; text-transform: uppercase; }
    .input { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px; background: var(--color-surface); font-size: var(--font-size-sm); color: var(--color-text); }
    .feedback-message { margin: 0; color: var(--layout-accent, #16a34a); font-size: var(--font-size-sm); }
    .state { padding: 24px; text-align: center; color: var(--color-text-muted); }
    .state--error { color: var(--color-danger); }
    @media (min-width: 760px) {
      .player-shell { border-radius: var(--radius-lg); overflow: hidden; margin: 0; }
      .lecture-page { gap: 18px; }
    }
    @media (max-width: 380px) {
      .lecture-row { grid-template-columns: 1fr; }
      .meta-grid { grid-template-columns: 1fr; }
      .star { flex: 1; min-width: 44px; }
    }
  `],
})
export class StudentLecturePlayerComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly studentSvc = inject(StudentService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly lecture = signal<StudentLecturePayload | null>(null);
  readonly safeEmbedUrl = signal<SafeResourceUrl | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedbackMessage = signal<string | null>(null);
  readonly savingFeedback = signal(false);
  readonly canGiveFeedback = signal(false);
  feedback: { rating: number; clarityStatus: FeedbackStatus; comment: string } = { rating: 5, clarityStatus: 'clear', comment: '' };

  private materialId = 0;
  private player: any = null;
  private checkpointTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private completed = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.materialId = Number(params.get('id'));
      this.loadLecture();
    });
  }

  ngOnDestroy(): void {
    if (this.checkpointTimer) clearInterval(this.checkpointTimer);
    this.sendCheckpoint('checkpoint');
    try { this.player?.destroy?.(); } catch {}
  }

  submitFeedback(): void {
    if (!this.canGiveFeedback()) return;
    this.savingFeedback.set(true);
    this.studentSvc.submitLectureFeedback(this.materialId, this.feedback).subscribe({
      next: (saved) => {
        this.feedbackMessage.set('Feedback submitted.');
        this.savingFeedback.set(false);
        this.lecture.update((data) => data ? { ...data, feedback: saved } : data);
      },
      error: (err) => {
        this.feedbackMessage.set(err.error?.error ?? 'Could not submit feedback.');
        this.savingFeedback.set(false);
      },
    });
  }

  categoryLabel(category: string): string {
    return category === 'recommended_video' ? 'Teacher recommended video' : 'Recorded lecture';
  }

  lectureDate(material: StudentLecturePayload['material']): string {
    const value = material.lectureDate || material.createdAt;
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  progressLabel(): string {
    const progress = this.lecture()?.latestProgress;
    if (!progress) return 'Not started';
    if (progress.eventType === 'complete') return 'Completed';
    return `${Math.round(progress.percentComplete)}% watched`;
  }

  private loadLecture(): void {
    this.loading.set(true);
    this.error.set(null);
    this.studentSvc.getLecture(this.materialId).subscribe({
      next: (lecture) => {
        this.lecture.set(lecture);
        this.safeEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(lecture.material.youtubeEmbedUrl));
        this.canGiveFeedback.set(lecture.latestProgress?.eventType === 'complete');
        if (lecture.feedback) this.feedback = { rating: lecture.feedback.rating, clarityStatus: lecture.feedback.clarityStatus as FeedbackStatus, comment: lecture.feedback.comment ?? '' };
        this.loading.set(false);
        setTimeout(() => this.initYouTubePlayer(), 0);
      },
      error: (err) => {
        this.error.set(err.error?.error ?? 'Could not load lecture.');
        this.loading.set(false);
      },
    });
  }

  private initYouTubePlayer(): void {
    if (window.YT?.Player) {
      this.createPlayer();
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      this.createPlayer();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  }

  private createPlayer(): void {
    try { this.player?.destroy?.(); } catch {}
    if (!window.YT?.Player) return;
    this.player = new window.YT.Player('student-youtube-player', {
      events: { onStateChange: (event: any) => this.onPlayerState(event) },
    });
    if (this.checkpointTimer) clearInterval(this.checkpointTimer);
    this.checkpointTimer = setInterval(() => this.sendCheckpoint('checkpoint'), 30_000);
  }

  private onPlayerState(event: any): void {
    if (event.data === window.YT?.PlayerState?.PLAYING && !this.started) {
      this.started = true;
      this.sendCheckpoint('start');
    }
    if (event.data === window.YT?.PlayerState?.ENDED) {
      this.completed = true;
      this.canGiveFeedback.set(true);
      this.sendCheckpoint('complete');
    }
  }

  private sendCheckpoint(eventType: 'start' | 'checkpoint' | 'complete'): void {
    if (!this.player || (!this.started && eventType === 'checkpoint')) return;
    const position = Math.floor(Number(this.player.getCurrentTime?.() ?? 0));
    const duration = Math.floor(Number(this.player.getDuration?.() ?? 0)) || null;
    if (eventType === 'checkpoint' && this.completed) return;
    this.studentSvc.recordLectureProgress(this.materialId, { eventType, positionSeconds: position, durationSeconds: duration }).subscribe({
      next: (progress) => this.lecture.update((data) => data ? { ...data, latestProgress: progress } : data),
      error: () => {},
    });
  }
}
