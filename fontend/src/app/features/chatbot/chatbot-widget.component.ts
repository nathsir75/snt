import {
  Component, inject, signal, ViewChild, ElementRef, Input,
  ChangeDetectionStrategy, DestroyRef, AfterViewChecked, OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ChatbotService } from './chatbot.service';
import {
  ChatMessage, WidgetState, BotReply, LeadCaptureState, LeadData, LEAD_STEPS,
  PersistedSession, CHAT_SESSION_KEY, ChatbotSettings, ChatContext,
} from './chatbot.models';
import { PublicBranchMeta } from '../public-site/public-site.models';

// Module-level constants only — no mutable state here (P2-B fix)
interface WelcomeChip { label: string; message: string; }

const WELCOME_CHIPS: WelcomeChip[] = [
  { label: '📚 Explore Courses',      message: 'Tell me about your courses'       },
  { label: '🤝 Franchise Enquiry',    message: 'I want to know about franchise'   },
  { label: '💼 Internship Program',   message: 'Tell me about internship programs' },
  { label: '🏢 Corporate Training',   message: 'Tell me about corporate training'  },
  { label: '🎓 College Partnership',  message: 'Tell me about college partnership' },
  { label: '📍 Contact Branch',       message: 'Find a branch near me'             },
];

@Component({
  selector: 'snt-chatbot-widget',
  standalone: true,
  imports: [FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ── Floating launcher ─────────────────────────────────────────────── -->
    @if (settings() === null || settings()!.enabled) {
    <button
      class="cb-fab"
      (click)="toggle()"
      [class.cb-fab-open]="isOpen()"
      [attr.aria-label]="isOpen() ? 'Close chat' : 'Chat with us'"
      [attr.aria-expanded]="isOpen()"
    >
      <span class="cb-fab-icon cb-fab-chat" [class.cb-fab-icon-hidden]="isOpen()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            fill="currentColor"/>
        </svg>
      </span>
      <span class="cb-fab-icon cb-fab-close" [class.cb-fab-icon-hidden]="!isOpen()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </span>
      @if (!isOpen()) { <span class="cb-fab-ring"></span> }
    </button>
    }

    <!-- ── Chat panel ────────────────────────────────────────────────────── -->
    @if (widgetState() !== 'idle') {
      <div
        class="cb-panel"
        [class.cb-panel-minimized]="widgetState() === 'minimized'"
        role="dialog"
        aria-label="SNT Education Chat"
      >

        <!-- Header -->
        <div class="cb-header" (click)="onHeaderClick()">
          <div class="cb-header-left">
            <div class="cb-bot-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z"
                  fill="currentColor"/>
              </svg>
              <span class="cb-online-dot"></span>
            </div>
            <div class="cb-header-text">
              <p class="cb-bot-name">SNT Assistant</p>
              <p class="cb-bot-status">
                @if (widgetState() === 'sending') {
                  <span class="cb-status-typing">typing…</span>
                } @else {
                  <span class="cb-status-dot"></span> Online
                }
              </p>
            </div>
          </div>
          <div class="cb-header-actions">
            <button
              class="cb-header-btn"
              (click)="$event.stopPropagation(); toggleMinimize()"
              [attr.aria-label]="widgetState() === 'minimized' ? 'Expand' : 'Minimize'"
              title="Minimize"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                @if (widgetState() === 'minimized') {
                  <polyline points="18 15 12 9 6 15"/>
                } @else {
                  <polyline points="6 9 12 15 18 9"/>
                }
              </svg>
            </button>
            <button
              class="cb-header-btn"
              (click)="$event.stopPropagation(); close()"
              aria-label="Close chat"
              title="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Body — hidden when minimized -->
        @if (widgetState() !== 'minimized') {

          <!-- Messages -->
          <div class="cb-body" #msgContainer>

            <!-- Empty / welcome state -->
            @if (!messages().length) {
              <div class="cb-welcome">
                <div class="cb-welcome-avatar">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z"
                      fill="currentColor"/>
                  </svg>
                </div>
                <p class="cb-welcome-title">{{ welcomeTitle() }}</p>
                <p class="cb-welcome-sub">{{ welcomeSub() }}</p>
                <div class="cb-welcome-chips">
                  @for (chip of activeQuickChips(); track chip.label) {
                    <button class="cb-chip cb-welcome-chip" (click)="sendQuick(chip.message)">{{ chip.label }}</button>
                  }
                </div>
              </div>
            }

            <!-- Message bubbles -->
            @for (msg of messages(); track msg.id) {

              <!-- System message — centred pill -->
              @if (msg.role === 'system') {
                <div class="cb-system-row">
                  <span class="cb-system-pill">{{ msg.text }}</span>
                  @if (msg.meta?.type === 'suggestions' && msg.meta?.suggestions?.length) {
                    <div class="cb-chips cb-chips-center">
                      @for (chip of msg.meta!.suggestions!; track chip) {
                        <button class="cb-chip" (click)="sendQuick(chip)">{{ chip }}</button>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Bot / user bubble -->
              @if (msg.role !== 'system') {
                <div
                  class="cb-row"
                  [class.cb-row-user]="msg.role === 'user'"
                  [class.cb-row-bot]="msg.role === 'bot'"
                >
                  @if (msg.role === 'bot') {
                    <div class="cb-msg-avatar">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z"
                          fill="currentColor"/>
                      </svg>
                    </div>
                  }
                  <div class="cb-bubble-col">
                    <div
                      class="cb-bubble"
                      [class.cb-bubble-error]="msg.status === 'error'"
                    >{{ msg.text }}</div>
                    @if (msg.role === 'bot' && msg.actionUrl) {
                      <button class="cb-cta-btn" (click)="navigateCta(msg.actionUrl!)">
                        {{ msg.actionLabel || 'Learn More' }}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                          <polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </button>
                    }
                    <div class="cb-meta-row">
                      <span class="cb-time">{{ msg.timestamp | date:'hh:mm a' }}</span>
                      @if (msg.role === 'user') {
                        <span class="cb-tick" [class.cb-tick-sent]="msg.status === 'sent'" [class.cb-tick-error]="msg.status === 'error'">
                          @if (msg.status === 'error') { ✕ }
                          @else if (msg.status === 'sent') { ✓✓ }
                          @else { ✓ }
                        </span>
                      }
                    </div>
                    <!-- Follow-up suggestions after bot reply -->
                    @if (msg.role === 'bot' && msg.meta?.type === 'suggestions' && msg.meta?.suggestions?.length) {
                      <div class="cb-chips">
                        @for (chip of msg.meta!.suggestions!; track chip) {
                          <button class="cb-chip" (click)="sendQuick(chip)">{{ chip }}</button>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

            }

            <!-- Typing indicator -->
            @if (widgetState() === 'sending') {
              <div class="cb-row cb-row-bot">
                <div class="cb-msg-avatar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z"
                      fill="currentColor"/>
                  </svg>
                </div>
                <div class="cb-bubble-col">
                  <div class="cb-bubble cb-bubble-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            }

          </div>

          <!-- Input bar -->
          <div class="cb-footer">
            <div class="cb-input-wrap" [class.cb-input-focused]="inputFocused">
              <input
                #inputEl
                class="cb-input"
                type="text"
                [placeholder]="inputPlaceholder()"
                [(ngModel)]="draft"
                (keydown.enter)="send()"
                (focus)="inputFocused = true"
                (blur)="inputFocused = false"
                [disabled]="widgetState() === 'sending'"
                maxlength="500"
                autocomplete="off"
              />
              @if (draft.length > 400) {
                <span class="cb-char-count">{{ 500 - draft.length }}</span>
              }
            </div>
            <button
              class="cb-send-btn"
              (click)="send()"
              [disabled]="!draft.trim() || widgetState() === 'sending'"
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="currentColor"
                  stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <!-- Powered-by strip -->
          <div class="cb-powered">Powered by <strong>SNT Education</strong></div>

        }
      </div>
    }
  `,
  styles: [`
    /* ── Host ──────────────────────────────────────────────────────────────── */
    :host {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    }

    /* ── FAB launcher ───────────────────────────────────────────────────────── */
    .cb-fab {
      position: relative;
      width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #fff; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(99,102,241,.5);
      display: flex; align-items: center; justify-content: center;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s;
      outline: none;
    }
    .cb-fab:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(99,102,241,.6); }
    .cb-fab:focus-visible { box-shadow: 0 0 0 3px rgba(99,102,241,.4); }
    .cb-fab-open { transform: scale(1.05); }

    /* Icon swap */
    .cb-fab-icon {
      position: absolute; display: flex; align-items: center; justify-content: center;
      transition: opacity .2s, transform .2s;
    }
    .cb-fab-icon-hidden { opacity: 0; transform: rotate(90deg) scale(.6); pointer-events: none; }

    /* Pulse ring */
    .cb-fab-ring {
      position: absolute; inset: -4px; border-radius: 50%;
      border: 2px solid rgba(99,102,241,.5);
      animation: cb-pulse 2.4s ease-out infinite;
    }
    @keyframes cb-pulse {
      0%   { transform: scale(1);   opacity: .7; }
      70%  { transform: scale(1.35); opacity: 0; }
      100% { transform: scale(1.35); opacity: 0; }
    }

    /* ── Panel ──────────────────────────────────────────────────────────────── */
    .cb-panel {
      position: absolute; bottom: 70px; right: 0;
      width: 380px;
      background: #fff; border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08);
      display: flex; flex-direction: column; overflow: hidden;
      animation: cb-enter .22s cubic-bezier(.34,1.56,.64,1);
      transform-origin: bottom right;
    }
    @keyframes cb-enter {
      from { opacity: 0; transform: scale(.88) translateY(16px); }
      to   { opacity: 1; transform: scale(1)   translateY(0); }
    }

    /* Minimized — header only */
    .cb-panel-minimized { border-radius: 16px; }

    /* ── Header ─────────────────────────────────────────────────────────────── */
    .cb-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px;
      background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
      color: #fff; cursor: default; flex-shrink: 0;
      user-select: none;
    }
    .cb-panel-minimized .cb-header { cursor: pointer; border-radius: 16px; }

    .cb-header-left { display: flex; align-items: center; gap: 12px; }

    .cb-bot-avatar {
      position: relative;
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .cb-online-dot {
      position: absolute; bottom: 1px; right: 1px;
      width: 10px; height: 10px; border-radius: 50%;
      background: #22c55e; border: 2px solid #6366f1;
    }

    .cb-header-text { display: flex; flex-direction: column; gap: 1px; }
    .cb-bot-name { font-size: 14px; font-weight: 700; margin: 0; line-height: 1.2; }
    .cb-bot-status {
      font-size: 11px; opacity: .85; margin: 0;
      display: flex; align-items: center; gap: 4px;
    }
    .cb-status-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #86efac; flex-shrink: 0;
    }
    .cb-status-typing { font-style: italic; opacity: .9; }

    .cb-header-actions { display: flex; align-items: center; gap: 4px; }
    .cb-header-btn {
      width: 28px; height: 28px; border-radius: 6px;
      background: rgba(255,255,255,.15); border: none;
      color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .cb-header-btn:hover { background: rgba(255,255,255,.28); }

    /* ── Body / messages ────────────────────────────────────────────────────── */
    .cb-body {
      flex: 1; overflow-y: auto; overflow-x: hidden;
      padding: 16px 14px; min-height: 320px; max-height: 400px;
      display: flex; flex-direction: column; gap: 12px;
      background: #f8f9ff;
      scroll-behavior: smooth;
    }
    .cb-body::-webkit-scrollbar { width: 4px; }
    .cb-body::-webkit-scrollbar-track { background: transparent; }
    .cb-body::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

    /* Welcome state */
    .cb-welcome {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; padding: 20px 12px 8px; gap: 10px;
    }
    .cb-welcome-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(99,102,241,.35);
    }
    .cb-welcome-title { font-size: 15px; font-weight: 700; color: #111827; margin: 0; line-height: 1.4; }
    .cb-welcome-sub { font-size: 12.5px; color: #6b7280; line-height: 1.6; max-width: 280px; margin: 0; }
    .cb-welcome-chips {
      display: flex; flex-wrap: wrap; justify-content: center;
      gap: 8px; margin-top: 4px; width: 100%;
    }
    .cb-welcome-chip {
      font-size: 12px; padding: 7px 13px;
      background: #fff;
      border: 1.5px solid #e0e7ff;
      color: #4338ca;
      border-radius: 999px;
      cursor: pointer;
      transition: all .15s;
      white-space: nowrap;
      box-shadow: 0 1px 4px rgba(99,102,241,.1);
    }
    .cb-welcome-chip:hover {
      background: linear-gradient(135deg, #6366f1, #7c3aed);
      color: #fff; border-color: transparent;
      box-shadow: 0 2px 10px rgba(99,102,241,.35);
      transform: translateY(-1px);
    }

    /* Message rows */
    .cb-row { display: flex; align-items: flex-end; gap: 8px; }
    .cb-row-user { flex-direction: row-reverse; }
    .cb-row-bot  { flex-direction: row; }

    .cb-msg-avatar {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; display: flex; align-items: center; justify-content: center;
      margin-bottom: 18px;
    }

    .cb-bubble-col { display: flex; flex-direction: column; gap: 3px; max-width: 78%; }
    .cb-row-user .cb-bubble-col { align-items: flex-end; }
    .cb-row-bot  .cb-bubble-col { align-items: flex-start; }

    .cb-bubble {
      padding: 10px 14px; border-radius: 18px;
      font-size: 13.5px; line-height: 1.55; word-break: break-word;
    }
    .cb-row-bot  .cb-bubble {
      background: #fff; color: #111827;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .cb-row-user .cb-bubble {
      background: linear-gradient(135deg, #6366f1, #7c3aed);
      color: #fff; border-bottom-right-radius: 4px;
      box-shadow: 0 2px 8px rgba(99,102,241,.3);
    }

    /* System messages */
    .cb-system-row { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 4px 0; }
    .cb-system-pill {
      display: inline-block; padding: 4px 14px; border-radius: 999px;
      background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 600;
      text-align: center;
    }
    .cb-chips-center { justify-content: center; }

    /* Bubble error state */
    .cb-bubble-error { background: #fef2f2 !important; color: #dc2626 !important; border-color: #fecaca !important; }

    /* Message meta row (time + tick) */
    .cb-meta-row { display: flex; align-items: center; gap: 4px; padding: 0 2px; }
    .cb-row-user .cb-meta-row { flex-direction: row-reverse; }

    .cb-time { font-size: 10px; color: #9ca3af; }

    /* Delivery ticks */
    .cb-tick { font-size: 10px; color: #9ca3af; font-weight: 700; letter-spacing: -1px; }
    .cb-tick-sent  { color: #6366f1; }
    .cb-tick-error { color: #ef4444; letter-spacing: 0; }

    /* Typing bubble */
    .cb-bubble-typing {
      display: flex; align-items: center; gap: 4px;
      padding: 12px 16px; min-width: 56px;
    }
    .cb-bubble-typing span {
      width: 7px; height: 7px; border-radius: 50%; background: #9ca3af;
      animation: cb-bounce .9s ease-in-out infinite;
    }
    .cb-bubble-typing span:nth-child(2) { animation-delay: .18s; }
    .cb-bubble-typing span:nth-child(3) { animation-delay: .36s; }
    @keyframes cb-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30%            { transform: translateY(-6px); }
    }

    /* CTA button */
    .cb-cta-btn {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 8px; padding: 8px 16px; border-radius: 8px;
      background: linear-gradient(135deg, #6366f1, #7c3aed);
      color: #fff; font-size: 12.5px; font-weight: 600;
      border: none; cursor: pointer;
      box-shadow: 0 2px 10px rgba(99,102,241,.35);
      transition: transform .15s, box-shadow .15s;
      white-space: nowrap;
    }
    .cb-cta-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(99,102,241,.5);
    }

    /* Quick reply chips */
    .cb-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .cb-chip {
      padding: 5px 12px; border-radius: 999px;
      border: 1.5px solid #6366f1; background: #fff;
      color: #6366f1; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .cb-chip:hover { background: #6366f1; color: #fff; }

    /* ── Footer / input ─────────────────────────────────────────────────────── */
    .cb-footer {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-top: 1px solid #e5e7eb; background: #fff;
      flex-shrink: 0;
    }

    .cb-input-wrap {
      flex: 1; display: flex; align-items: center;
      border: 1.5px solid #e5e7eb; border-radius: 24px;
      padding: 0 14px; background: #f9fafb;
      transition: border-color .15s, box-shadow .15s;
    }
    .cb-input-focused {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,.12);
      background: #fff;
    }
    .cb-input {
      flex: 1; border: none; background: transparent;
      padding: 10px 0; font-size: 13.5px; color: #111827;
      outline: none; min-width: 0;
    }
    .cb-input::placeholder { color: #9ca3af; }
    .cb-input:disabled { opacity: .6; cursor: not-allowed; }
    .cb-char-count { font-size: 10px; color: #f59e0b; font-weight: 600; flex-shrink: 0; }

    .cb-send-btn {
      width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #7c3aed);
      color: #fff; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(99,102,241,.35);
      transition: transform .15s, box-shadow .15s, opacity .15s;
    }
    .cb-send-btn:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 4px 14px rgba(99,102,241,.5);
    }
    .cb-send-btn:disabled { opacity: .4; cursor: not-allowed; box-shadow: none; }

    /* ── Powered-by ─────────────────────────────────────────────────────────── */
    .cb-powered {
      text-align: center; font-size: 10px; color: #9ca3af;
      padding: 5px 0 8px; background: #fff; flex-shrink: 0;
    }
    .cb-powered strong { color: #6366f1; }

    /* ── Mobile ─────────────────────────────────────────────────────────────── */
    @media (max-width: 480px) {
      :host { bottom: 16px; right: 16px; }
      .cb-panel {
        position: fixed; bottom: 0; right: 0; left: 0;
        width: 100%; border-radius: 20px 20px 0 0;
        max-height: 90dvh;
      }
      .cb-body { max-height: calc(90dvh - 200px); }
    }
  `],
})
export class ChatbotWidgetComponent implements OnInit, AfterViewChecked {
  private readonly svc        = inject(ChatbotService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('msgContainer') private msgContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl')      private inputEl!: ElementRef<HTMLInputElement>;

  readonly widgetState = signal<WidgetState>('idle');
  readonly messages    = signal<ChatMessage[]>([]);
  readonly settings    = signal<ChatbotSettings | null>(null);

  readonly welcomeChips = WELCOME_CHIPS;
  @Input() branchCode?: string;
  @Input() branchMeta?: PublicBranchMeta | null;
  /**
   * Which surface this widget is mounted on.
   * Defaults to 'public_website' — safe for all current usages.
   *
   * Extension point: set context="student_portal" when mounting the widget
   * inside the student dashboard shell. The backend will receive this value
   * and can apply student-specific reply rules, lead routing, or analytics.
   *
   * DO NOT set 'student_portal' until the student-portal chatbot feature
   * is fully designed and enabled.
   */
  @Input() context: ChatContext = 'public_website';
  draft        = '';
  inputFocused = false;

  private sessionId: string = crypto.randomUUID();
  private msgSeq     = 0;
  private shouldScroll  = false;
  private leadCapture: LeadCaptureState | null = null;

  private nextMsgId(): string { return `m_${++this.msgSeq}_${Date.now()}`; }

  // ── Session persistence ────────────────────────────────────────────────────
  private save(): void {
    const state = this.widgetState();
    const session: PersistedSession = {
      sessionId:   this.sessionId,
      messages:    this.messages(),
      widgetState: (state === 'sending' || state === 'error') ? 'open' : state,
      leadCapture: this.leadCapture,
      msgSeq:      this.msgSeq,
    };
    try {
      sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(session));
    } catch { /* quota exceeded — silently skip */ }
  }

  ngOnInit(): void {
    // Load settings first, then restore session
    this.svc.getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.settings.set(s), error: () => {} });

    try {
      const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
      if (!raw) return;
      const session: PersistedSession = JSON.parse(raw);
      this.sessionId   = session.sessionId;
      this.msgSeq      = session.msgSeq ?? 0;
      this.leadCapture = session.leadCapture ?? null;
      this.messages.set(session.messages ?? []);
      if (session.widgetState && session.widgetState !== 'idle') {
        this.widgetState.set(session.widgetState);
        this.shouldScroll = true;
      }
    } catch { /* corrupted storage - start fresh */ }
  }

  readonly inputPlaceholder = () => {
    if (!this.leadCapture) return 'Type a message...';
    return LEAD_STEPS[this.leadCapture.stepIndex]?.placeholder ?? 'Type a message...';
  };

  readonly welcomeTitle = () => {
    const s = this.settings();
    if (this.branchMeta) return `Hi! I'm the ${this.branchMeta.name} assistant. 👋`;
    return s?.welcomeMessage ?? "Hi, I'm the SNT Education assistant. 👋";
  };

  readonly welcomeSub = () => {
    const s = this.settings();
    if (this.branchMeta) return `How can I help you today? Ask about courses, admissions, or contact our ${this.branchMeta.city} branch.`;
    return s?.welcomeSubtext ?? 'How can I help you today? Pick a topic or type your question below.';
  };

  readonly activeQuickChips = () => {
    const s = this.settings();
    if (!s?.quickActions?.length) return WELCOME_CHIPS;
    return s.quickActions.map(a => ({ label: a.label, message: a.message }));
  };

  readonly isOpen = () =>
    this.widgetState() === 'open' ||
    this.widgetState() === 'sending' ||
    this.widgetState() === 'minimized';

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ── Panel controls ─────────────────────────────────────────────────────────
  toggle(): void {
    if (this.widgetState() === 'idle') {
      this.widgetState.set('open');
      this.shouldScroll = true;
      setTimeout(() => this.inputEl?.nativeElement.focus(), 50);
    } else {
      this.widgetState.set('idle');
    }
    this.save();
  }

  close(): void { this.widgetState.set('idle'); this.save(); }

  toggleMinimize(): void {
    this.widgetState.update((s) => s === 'minimized' ? 'open' : 'minimized');
    this.save();
  }

  onHeaderClick(): void {
    if (this.widgetState() === 'minimized') { this.widgetState.set('open'); this.save(); }
  }

  // ── Messaging ──────────────────────────────────────────────────────────────
  send(): void {
    const text = this.draft.trim();
    if (!text || this.widgetState() === 'sending') return;

    // ── P2-A: lead capture intercept ─────────────────────────────────────────
    if (this.leadCapture) {
      this.draft = '';
      const lc   = this.leadCapture;
      const step = LEAD_STEPS[lc.stepIndex];

      // Echo user answer as a user bubble
      this.pushUser(text, this.nextMsgId());
      this.shouldScroll = true;

      // Validate
      const err = step.validate(text);
      if (err) {
        this.pushSystem(err, 'error');
        this.save();
        return;
      }

      // Store answer (skip email if user typed 'skip')
      const value = (step.key === 'email' && text.trim().toLowerCase() === 'skip') ? '' : text.trim();
      lc.data = { ...lc.data, [step.key]: value };
      lc.stepIndex++;

      // More steps remaining — ask next question
      if (lc.stepIndex < LEAD_STEPS.length) {
        this.pushSystem(LEAD_STEPS[lc.stepIndex].question, 'info');
        this.save();
        setTimeout(() => this.inputEl?.nativeElement.focus(), 50);
        return;
      }

      // All steps done — submit lead
      this.leadCapture = null;
      this.widgetState.set('sending');
      const data = lc.data as Required<LeadData>;
      const req = {
        sessionId:  this.sessionId,
        leadIntent: lc.intent,
        fullName:   data.fullName  ?? '',
        phone:      data.phone     ?? '',
        email:      data.email     || undefined,
        city:       data.city      ?? '',
        interest:   data.interest  || undefined,
        sourceCtx:  this.svc.buildSourceCtx(this.branchCode, this.context),
      };
      this.svc.submitLead(req)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.pushSystem(res.message, 'info');
            this.widgetState.set('open');
            this.shouldScroll = true;
            this.save();
            setTimeout(() => this.inputEl?.nativeElement.focus(), 50);
          },
          error: () => {
            this.pushSystem('Could not submit your details. Please try again or contact us directly.', 'error');
            this.widgetState.set('open');
            this.shouldScroll = true;
            this.save();
          },
        });
      return;
    }
    // ── end lead capture intercept ────────────────────────────────────────────

    const userMsgId = this.nextMsgId();
    this.pushUser(text, userMsgId);
    this.draft = '';
    this.widgetState.set('sending');
    this.shouldScroll = true;

    this.svc.send({ sessionId: this.sessionId, message: text, branchCode: this.branchCode, context: this.context })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.markSent(userMsgId);
          // If backend signals lead capture, start the flow
          if (res.reply.isLeadCapture && res.reply.leadIntent) {
            this.leadCapture = { intent: res.reply.leadIntent, stepIndex: 0, data: {} };
            this.pushBot(res.reply);
            // Ask first step question
            this.pushSystem(LEAD_STEPS[0].question, 'info');
          } else {
            this.pushBot(res.reply);
          }
          this.widgetState.set('open');
          this.shouldScroll = true;
          this.save();
          setTimeout(() => this.inputEl?.nativeElement.focus(), 50);
        },
        error: (err) => {
          console.error('[Chatbot] send error:', err);
          this.markError(userMsgId);
          this.pushSystem('Could not reach the server. Please try again.', 'error');
          this.widgetState.set('open');
          this.shouldScroll = true;
          this.save();
        },
      });
  }

  sendQuick(text: string): void {
    if (this.widgetState() === 'sending') return;
    this.svc.trackQuickReply(text);
    this.draft = text;
    this.send();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  navigateCta(url: string): void {
    this.close();
    this.router.navigateByUrl(url);
  }

  private pushUser(text: string, id: string): void {
    this.messages.update((m) => [
      ...m,
      { id, role: 'user', text, timestamp: new Date().toISOString(), status: 'sending' },
    ]);
  }

  private pushBot(reply: BotReply): void {
    this.messages.update((m) => [
      ...m,
      {
        id: this.nextMsgId(), role: 'bot', text: reply.text, timestamp: new Date().toISOString(),
        ...(reply.quickReplies?.length ? { meta: { type: 'suggestions' as const, suggestions: reply.quickReplies } } : {}),
        ...(reply.actionUrl   ? { actionUrl:   reply.actionUrl   } : {}),
        ...(reply.actionLabel ? { actionLabel: reply.actionLabel } : {}),
      },
    ]);
  }

  private pushSystem(text: string, type: 'info' | 'suggestions' | 'error' = 'info', suggestions?: string[]): void {
    this.messages.update((m) => [
      ...m,
      {
        id: this.nextMsgId(), role: 'system', text, timestamp: new Date().toISOString(),
        meta: { type, ...(suggestions?.length ? { suggestions } : {}) },
      },
    ]);
  }

  private markSent(id: string): void {
    this.messages.update((m) =>
      m.map((msg) => msg.id === id ? { ...msg, status: 'sent' as const } : msg)
    );
  }

  private markError(id: string): void {
    this.messages.update((m) =>
      m.map((msg) => msg.id === id ? { ...msg, status: 'error' as const } : msg)
    );
  }

  private scrollToBottom(): void {
    const el = this.msgContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
