// ── Chatbot domain types ──────────────────────────────────────────────────────

export type MessageRole = 'user' | 'bot';

/**
 * ChatContext identifies which surface the widget is running on.
 *
 * Current values:
 *   public_website  — main SNT marketing site (default, active)
 *   branch_website  — individual branch micro-site (active)
 *   student_portal  — student dashboard (reserved — NOT enabled yet)
 *
 * Extension point: add new values here and handle them in service.ts
 * message() and submitLead() to customise behaviour per context.
 */
export type ChatContext = 'public_website' | 'branch_website' | 'student_portal';

export interface ChatMessage {
  role: MessageRole;
  text: string;
  timestamp: string; // ISO
}

export interface ChatRequest {
  sessionId:   string;
  message:     string;
  branchCode?: string;      // set when widget is on a branch website
  /**
   * Which surface sent this message.
   * Defaults to 'public_website' when omitted (backwards-compatible).
   * Extension point: service.ts can gate features per context.
   */
  context?:    ChatContext;
}

// Supported lead intent identifiers
export type LeadIntentType =
  | 'course_enquiry'
  | 'franchise_enquiry'
  | 'internship_enquiry'
  | 'college_partnership'
  | 'corporate_training'
  | 'contact_request'
  | 'fallback';

// Structured bot reply — replaces plain string
export interface BotReply {
  text:           string;
  quickReplies:   string[];        // tappable follow-up chips
  leadIntent:     string;          // matched intent name, e.g. 'franchise'
  actionUrl?:     string;          // optional deep-link CTA path
  actionLabel?:   string;          // CTA button label, e.g. 'View Courses'
  isLeadCapture?: boolean;         // true → frontend shifts to lead-capture mode
  nextQuestion?:  string;          // first question to ask in lead-capture flow
}

export interface ChatResponse {
  sessionId: string;
  reply:     BotReply;
  timestamp: string;
}

export interface ChatHealthResult {
  ok: true;
  module: 'chatbot';
}

// Shape returned by POST /message
export interface MessageResponse {
  sessionId:  string;
  reply:      BotReply;
  timestamp:  string;
}

// ── Lead submission ───────────────────────────────────────────────────────────

export interface LeadSourceContext {
  source:        'chatbot';                                              // always 'chatbot' for widget leads
  sourcePage:    string;                                                 // URL path at time of submission
  sourceContext: 'main_website' | 'branch_website';                     // which site the widget is on (legacy field — kept for DB compat)
  /**
   * Structured context replacing the legacy sourceContext string.
   * Extension point: add routing logic in service.ts submitLead()
   * when student_portal leads need different CRM handling.
   */
  chatContext?:  ChatContext;
  branchCode?:   string;                                                 // set only on branch websites
}

export interface LeadSubmitRequest {
  sessionId:  string;
  leadIntent: string;   // e.g. 'course_enquiry'
  fullName:   string;
  phone:      string;
  email?:     string;
  city:       string;
  interest?:  string;   // free-text interest / message
  sourceCtx:  LeadSourceContext;
}

export interface LeadSubmitResponse {
  ok:        true;
  recordId:  number;
  message:   string;
}

// ── Chatbot Settings ─────────────────────────────────────────────────────────────────

export interface ChatbotQuickAction {
  label:   string;   // display text shown on chip, e.g. '📚 Explore Courses'
  message: string;   // text sent as user message when chip is clicked
}

export interface ChatbotSettings {
  enabled:             boolean;             // master on/off switch
  welcomeMessage:      string;              // first line in welcome state
  welcomeSubtext:      string;              // second line in welcome state
  supportContactText:  string;              // shown in contact/fallback replies
  branchAwareEnabled:  boolean;             // personalise replies using branch context
  leadCaptureEnabled:  boolean;             // show lead capture flow after intent match
  quickActions:        ChatbotQuickAction[]; // welcome screen chips (max 6)
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface IntentCount  { intent: string; count: number; }
export interface QuickReplyCount { label: string; count: number; }

export interface ChatbotAnalytics {
  // In-process counters (reset on server restart)
  totalMessages:    number;
  totalSessions:    number;
  // DB-derived (persistent)
  totalLeads:       number;
  leadsByIntent:    IntentCount[];
  // In-process top lists
  topIntents:       IntentCount[];
  topQuickReplies:  QuickReplyCount[];
  generatedAt:      string;
}
