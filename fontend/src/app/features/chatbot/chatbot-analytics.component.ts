import {
  Component, inject, signal, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotAnalytics } from './chatbot.models';

@Component({
  selector: 'snt-chatbot-analytics',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ca-card">
      <div class="ca-header">
        <span class="ca-icon">🤖</span>
        <div>
          <p class="ca-title">Chatbot Analytics</p>
          @if (data()?.generatedAt) {
            <p class="ca-sub">as of {{ data()!.generatedAt | date:'dd MMM, hh:mm a' }}</p>
          }
        </div>
        <button class="ca-refresh" (click)="load()" [disabled]="loading()" title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
            [style.animation]="loading() ? 'ca-spin 1s linear infinite' : 'none'">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      @if (error()) {
        <p class="ca-error">{{ error() }}</p>
      } @else if (!data()) {
        <p class="ca-loading">Loading…</p>
      } @else {
        <!-- KPI row -->
        <div class="ca-kpis">
          <div class="ca-kpi">
            <span class="ca-kpi-val">{{ data()!.totalSessions | number }}</span>
            <span class="ca-kpi-lbl">Sessions</span>
          </div>
          <div class="ca-kpi">
            <span class="ca-kpi-val">{{ data()!.totalMessages | number }}</span>
            <span class="ca-kpi-lbl">Messages</span>
          </div>
          <div class="ca-kpi ca-kpi-accent">
            <span class="ca-kpi-val">{{ data()!.totalLeads | number }}</span>
            <span class="ca-kpi-lbl">Leads</span>
          </div>
        </div>

        <div class="ca-cols">
          <!-- Top intents -->
          <div class="ca-section">
            <p class="ca-section-title">Top Intents (session)</p>
            @if (data()!.topIntents.length) {
              <ul class="ca-list">
                @for (item of data()!.topIntents; track item.intent) {
                  <li class="ca-list-row">
                    <span class="ca-list-label">{{ item.intent }}</span>
                    <span class="ca-list-bar-wrap">
                      <span class="ca-list-bar"
                        [style.width.%]="pct(item.count, data()!.topIntents[0].count)">
                      </span>
                    </span>
                    <span class="ca-list-count">{{ item.count }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="ca-empty">No data yet</p>
            }
          </div>

          <!-- Leads by intent -->
          <div class="ca-section">
            <p class="ca-section-title">Leads by Intent (all-time)</p>
            @if (data()!.leadsByIntent.length) {
              <ul class="ca-list">
                @for (item of data()!.leadsByIntent; track item.intent) {
                  <li class="ca-list-row">
                    <span class="ca-list-label">{{ item.intent }}</span>
                    <span class="ca-list-bar-wrap">
                      <span class="ca-list-bar ca-list-bar-green"
                        [style.width.%]="pct(item.count, data()!.leadsByIntent[0].count)">
                      </span>
                    </span>
                    <span class="ca-list-count">{{ item.count }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="ca-empty">No leads yet</p>
            }
          </div>

          <!-- Top quick replies -->
          <div class="ca-section">
            <p class="ca-section-title">Top Quick Replies (session)</p>
            @if (data()!.topQuickReplies.length) {
              <ul class="ca-list">
                @for (item of data()!.topQuickReplies; track item.label) {
                  <li class="ca-list-row">
                    <span class="ca-list-label">{{ item.label }}</span>
                    <span class="ca-list-bar-wrap">
                      <span class="ca-list-bar ca-list-bar-purple"
                        [style.width.%]="pct(item.count, data()!.topQuickReplies[0].count)">
                      </span>
                    </span>
                    <span class="ca-list-count">{{ item.count }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="ca-empty">No clicks yet</p>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ca-card {
      background: #fff; border-radius: 16px;
      border: 1px solid #e5e7eb;
      padding: 20px 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }

    .ca-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
    }
    .ca-icon { font-size: 22px; line-height: 1; }
    .ca-title { font-size: 15px; font-weight: 700; color: #111827; margin: 0; }
    .ca-sub   { font-size: 11px; color: #9ca3af; margin: 2px 0 0; }
    .ca-refresh {
      margin-left: auto; background: none; border: 1px solid #e5e7eb;
      border-radius: 6px; padding: 5px 7px; cursor: pointer; color: #6b7280;
      display: flex; align-items: center;
      transition: background .15s;
    }
    .ca-refresh:hover:not(:disabled) { background: #f3f4f6; }
    .ca-refresh:disabled { opacity: .4; cursor: not-allowed; }

    @keyframes ca-spin { to { transform: rotate(360deg); } }

    .ca-error   { color: #dc2626; font-size: 13px; }
    .ca-loading { color: #9ca3af; font-size: 13px; }
    .ca-empty   { color: #9ca3af; font-size: 12px; font-style: italic; margin: 4px 0; }

    /* KPI row */
    .ca-kpis {
      display: flex; gap: 12px; margin-bottom: 20px;
    }
    .ca-kpi {
      flex: 1; background: #f8f9ff; border-radius: 10px;
      padding: 12px 14px; display: flex; flex-direction: column; gap: 2px;
      border: 1px solid #e0e7ff;
    }
    .ca-kpi-accent { background: #ede9fe; border-color: #c4b5fd; }
    .ca-kpi-val { font-size: 22px; font-weight: 800; color: #111827; line-height: 1; }
    .ca-kpi-lbl { font-size: 11px; color: #6b7280; font-weight: 500; }

    /* Three-column layout */
    .ca-cols {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
    }
    @media (max-width: 900px) {
      .ca-cols { grid-template-columns: 1fr; }
    }

    .ca-section-title {
      font-size: 11.5px; font-weight: 700; color: #6b7280;
      text-transform: uppercase; letter-spacing: .04em;
      margin: 0 0 10px;
    }

    /* Bar list */
    .ca-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
    .ca-list-row { display: flex; align-items: center; gap: 8px; }
    .ca-list-label {
      width: 130px; font-size: 12px; color: #374151;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;
    }
    .ca-list-bar-wrap {
      flex: 1; height: 6px; background: #f3f4f6; border-radius: 999px; overflow: hidden;
    }
    .ca-list-bar {
      display: block; height: 100%; border-radius: 999px;
      background: #6366f1; transition: width .4s ease;
    }
    .ca-list-bar-green  { background: #22c55e; }
    .ca-list-bar-purple { background: #a855f7; }
    .ca-list-count { font-size: 11px; font-weight: 700; color: #6b7280; width: 28px; text-align: right; flex-shrink: 0; }
  `],
})
export class ChatbotAnalyticsComponent implements OnInit {
  private readonly svc        = inject(ChatbotService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data    = signal<ChatbotAnalytics | null>(null);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getAnalytics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (d) => { this.data.set(d); this.loading.set(false); },
        error: ()  => { this.error.set('Could not load analytics.'); this.loading.set(false); },
      });
  }

  pct(val: number, max: number): number {
    return max > 0 ? Math.round((val / max) * 100) : 0;
  }
}
