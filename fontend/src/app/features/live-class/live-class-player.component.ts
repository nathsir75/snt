import { ChangeDetectionStrategy, Component, DestroyRef, computed, input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LiveClassService, PlaybackState } from './live-class.service';

type YouTubeMessage = {
  event?: string;
  info?: number;
};

const YOUTUBE_STATES: Record<number, PlaybackState | null> = {
  1: 'playing',
  2: 'paused',
  0: 'paused',
};

@Component({
  selector: 'snt-live-class-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player-shell">
      @if (safeVideoUrl()) {
        <iframe
          [src]="safeVideoUrl()!"
          class="player-frame"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      }
    </div>
  `,
  styles: [`
    .player-shell {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      overflow: hidden;
    }

    .player-frame {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  `],
})
export class LiveClassPlayerComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly liveClassService = inject(LiveClassService);
  private readonly destroyRef = inject(DestroyRef);
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private playbackState: PlaybackState = 'paused';

  readonly liveSessionId = input.required<number>();
  readonly youtubeVideoId = input.required<string>();

  readonly safeVideoUrl = computed((): SafeResourceUrl | null => {
    const videoId = this.youtubeVideoId().trim();
    if (!videoId) return null;

    const origin = encodeURIComponent(window.location.origin);
    const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&origin=${origin}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  });

  constructor() {
    window.addEventListener('message', this.handleYouTubeMessage);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('message', this.handleYouTubeMessage);
      this.stopHeartbeat();
    });
  }

  private readonly handleYouTubeMessage = (event: MessageEvent): void => {
    if (!event.origin.includes('youtube.com')) return;

    const message = this.parseYouTubeMessage(event.data);
    if (message?.event !== 'onStateChange' || typeof message.info !== 'number') return;

    const nextState = YOUTUBE_STATES[message.info];
    if (!nextState || nextState === this.playbackState) return;

    this.playbackState = nextState;
    if (nextState === 'playing') {
      this.startHeartbeat();
    } else {
      this.sendHeartbeat('paused');
      this.stopHeartbeat();
    }
  };

  private parseYouTubeMessage(data: unknown): YouTubeMessage | null {
    if (typeof data === 'object' && data !== null) return data as YouTubeMessage;
    if (typeof data !== 'string') return null;

    try {
      return JSON.parse(data) as YouTubeMessage;
    } catch {
      return null;
    }
  }

  private startHeartbeat(): void {
    this.sendHeartbeat('playing');
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat('playing');
    }, 20_000);
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatTimer) return;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private sendHeartbeat(playbackState: PlaybackState): void {
    this.liveClassService.sendHeartbeat(this.liveSessionId(), playbackState).subscribe({
      error: (error) => console.error('[LiveClassPlayer] Heartbeat failed:', error),
    });
  }
}
