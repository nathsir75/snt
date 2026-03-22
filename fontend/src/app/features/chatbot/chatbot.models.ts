// ── Core types ────────────────────────────────────────────────────────────────

export type MessageRole   = 'user' | 'bot' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'error';

/**
 * ChatContext identifies which surface the widget is running on.
 *
 * Current values:
 *   public_website  — main SNT marketing site (default, active)
 *   branch_website  — individual branch micro-site (active)
 *   student_portal  — student dashboard (reserved — NOT enabled yet)
 *
 * Extension point: pass as @Input() context on ChatbotWidgetComponent.
 * The service forwards it to the backend so per-context logic can be
 * applied without changing the widget API.
 */
export type ChatContext = 'public_website' | 'branch_website' | 'student_portal';

export interface ChatMessage {
  id:           string;
  role:         MessageRole;
  text:         string;
  timestamp:    string;
  status?:      MessageStatus;
  meta?:        MessageMeta;
  actionUrl?:   string;
  actionLabel?: string;
}

export interface MessageMeta {
  type:         'info' | 'suggestions' | 'error';
  suggestions?: string[];
}

// ── API shapes ────────────────────────────────────────────────────────────────

export interface ChatRequest {
  sessionId:   string;
  message:     string;
  branchCode?: string;      // set when widget is on a branch website
  context?:    ChatContext;  // which surface sent this message; defaults to 'public_website'
}

export interface BotReply {
  text:           string;
  quickReplies:   string[];
  leadIntent:     string;
  actionUrl?:     string;
  actionLabel?:   string;
  isLeadCapture?: boolean;
  nextQuestion?:  string;
}

export interface ChatResponse {
  sessionId: string;
  reply:     BotReply;
  timestamp: string;
}

// ── Lead submission ───────────────────────────────────────────────────────────

export interface LeadSourceContext {
  source:        'chatbot';
  sourcePage:    string;                              // Angular route path at submission time
  sourceContext: 'main_website' | 'branch_website';  // legacy field — kept for DB compat
  /**
   * Structured context replacing the legacy sourceContext string.
   * Extension point: backend routes student_portal leads differently
   * once that surface is enabled.
   */
  chatContext?:  ChatContext;
  branchCode?:   string;                             // populated on branch websites only
}

export interface LeadSubmitRequest {
  sessionId:  string;
  leadIntent: string;
  fullName:   string;
  phone:      string;
  email?:     string;
  city:       string;
  interest?:  string;
  sourceCtx:  LeadSourceContext;
}

export interface LeadSubmitResponse {
  ok:       true;
  recordId: number;
  message:  string;
}

// ── Widget UI state ───────────────────────────────────────────────────────────

export type WidgetState = 'idle' | 'open' | 'minimized' | 'sending' | 'error';

// ── Lead capture flow ─────────────────────────────────────────────────────────

export type LeadFieldKey = 'fullName' | 'phone' | 'email' | 'city' | 'interest';

export interface LeadField {
  key:         LeadFieldKey;
  question:    string;
  placeholder: string;
  optional:    boolean;
  validate:    (v: string) => string | null;  // null = valid
}

export type LeadData = Partial<Record<LeadFieldKey, string>>;

export interface LeadCaptureState {
  intent:    string;
  stepIndex: number;
  data:      LeadData;
}

export const LEAD_STEPS: LeadField[] = [
  {
    key:         'fullName',
    question:    "What's your full name?",
    placeholder: 'Enter your full name…',
    optional:    false,
    validate:    (v) => v.trim().length >= 2 ? null : 'Please enter your full name.',
  },
  {
    key:         'phone',
    question:    "What's your phone number?",
    placeholder: 'Enter your 10-digit mobile number…',
    optional:    false,
    validate:    (v) => /^[6-9]\d{9}$/.test(v.trim()) ? null : 'Please enter a valid 10-digit Indian mobile number.',
  },
  {
    key:         'email',
    question:    "Your email address? (optional — type 'skip' to continue)",
    placeholder: 'Enter your email or type skip…',
    optional:    true,
    validate:    (v) => {
      const t = v.trim().toLowerCase();
      if (t === 'skip' || t === '') return null;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? null : 'Please enter a valid email or type skip.';
    },
  },
  {
    key:         'city',
    question:    "Which city are you based in?",
    placeholder: 'Enter your city…',
    optional:    false,
    validate:    (v) => v.trim().length >= 2 ? null : 'Please enter your city.',
  },
  {
    key:         'interest',
    question:    "Anything specific you'd like us to know — course preference, timing, or questions?",
    placeholder: 'Type your message or interest…',
    optional:    true,
    validate:    (_) => null,
  },
];

// ── Session persistence ───────────────────────────────────────────────────────

export const CHAT_SESSION_KEY = 'snt_chat_session';

export interface PersistedSession {
  sessionId:    string;
  messages:     ChatMessage[];
  widgetState:  Exclude<WidgetState, 'sending' | 'error'>; // transient states not persisted
  leadCapture:  LeadCaptureState | null;
  msgSeq:       number;
}

// ── Local reply engine types ──────────────────────────────────────────────────

export interface LocalReplyResult {
  reply:        string;
  suggestions?: string[];
}

// -- Analytics ----------------------------------------------------------------

export interface IntentCount    { intent: string; count: number; }
export interface QuickReplyCount { label: string;  count: number; }

export interface ChatbotAnalytics {
  totalMessages:   number;
  totalSessions:   number;
  totalLeads:      number;
  leadsByIntent:   IntentCount[];
  topIntents:      IntentCount[];
  topQuickReplies: QuickReplyCount[];
  generatedAt:     string;
}

// -- Chatbot Settings ---------------------------------------------------------

export interface ChatbotQuickAction {
  label:   string;
  message: string;
}

export interface ChatbotSettings {
  enabled:             boolean;
  welcomeMessage:      string;
  welcomeSubtext:      string;
  supportContactText:  string;
  branchAwareEnabled:  boolean;
  leadCaptureEnabled:  boolean;
  quickActions:        ChatbotQuickAction[];
}
