import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ChatRequest, ChatResponse, BotReply, LocalReplyResult, LeadSubmitRequest, LeadSubmitResponse, LeadSourceContext, ChatbotAnalytics, ChatbotSettings, ChatContext } from './chatbot.models';

// ── Keyword → reply map ───────────────────────────────────────────────────────
// Each entry: array of trigger keywords, reply text, optional follow-up chips.
// First match wins (top-to-bottom).

interface ReplyRule {
  keywords:    string[];
  reply:       string;
  suggestions?: string[];
}

const REPLY_RULES: ReplyRule[] = [
  {
    keywords: ['course', 'courses', 'program', 'programs', 'learn', 'study', 'training'],
    reply: 'We offer industry-focused courses in Full Stack Development, Data Science, Digital Marketing, Cloud Computing, and more. Each program includes live projects and placement support.',
    suggestions: ['Course duration?', 'Course fees?', 'Online or offline?'],
  },
  {
    keywords: ['enroll', 'admission', 'join', 'register', 'apply', 'start'],
    reply: 'Enrolling is easy! Visit your nearest SNT branch or fill out the enquiry form on our website. Our counselors will guide you through the process.',
    suggestions: ['Find a branch', 'Talk to a counselor', 'Fees & scholarships'],
  },
  {
    keywords: ['placement', 'placements', 'job', 'jobs', 'hire', 'salary', 'lpa', 'package'],
    reply: 'SNT has a strong placement record with 500+ hiring partners. Our students have been placed at top companies with packages ranging from 3 LPA to 18 LPA.',
    suggestions: ['Hiring partners', 'Placement stats', 'Success stories'],
  },
  {
    keywords: ['branch', 'branches', 'location', 'locations', 'city', 'near', 'address', 'centre', 'center'],
    reply: 'SNT Education has 50+ branches across India. You can find your nearest branch on our Locations page or call our helpline.',
    suggestions: ['View all locations', 'Contact helpline'],
  },
  {
    keywords: ['fee', 'fees', 'cost', 'price', 'pricing', 'scholarship', 'emi', 'installment'],
    reply: 'Course fees vary by program and location. We offer flexible EMI options and merit-based scholarships. Contact your nearest branch for exact pricing.',
    suggestions: ['Apply for scholarship', 'EMI options', 'Find a branch'],
  },
  {
    keywords: ['duration', 'long', 'months', 'weeks', 'hours', 'time'],
    reply: 'Course durations range from 3 months (short-term certifications) to 12 months (full-stack programs). Weekend and fast-track batches are also available.',
    suggestions: ['View courses', 'Batch schedule'],
  },
  {
    keywords: ['online', 'offline', 'hybrid', 'remote', 'classroom'],
    reply: 'We offer both classroom and online learning modes. Hybrid batches are available at select branches so you can switch between modes as needed.',
    suggestions: ['Online courses', 'Find a branch'],
  },
  {
    keywords: ['certificate', 'certification', 'degree', 'diploma'],
    reply: 'All SNT courses come with an industry-recognized certificate upon completion. You can verify any certificate at snt.edu/verify-certificate.',
    suggestions: ['Verify a certificate', 'View courses'],
  },
  {
    keywords: ['franchise', 'partner', 'franchise model', 'business', 'invest'],
    reply: 'Interested in partnering with SNT? We offer a proven franchise model with full operational support, training, and marketing assistance.',
    suggestions: ['Franchise details', 'Become a partner', 'Talk to us'],
  },
  {
    keywords: ['contact', 'phone', 'email', 'call', 'helpline', 'support', 'help'],
    reply: 'You can reach us via the Contact page on our website, or call our helpline. Our support team is available Mon–Sat, 9 AM to 6 PM.',
    suggestions: ['Go to Contact page', 'Find a branch'],
  },
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste'],
    reply: 'Hello! 👋 Great to hear from you. How can I help you today?',
    suggestions: ['Explore courses', 'Find a branch', 'Placement info'],
  },
  {
    keywords: ['thank', 'thanks', 'thankyou', 'thank you', 'great', 'awesome', 'perfect'],
    reply: "You're welcome! 😊 Is there anything else I can help you with?",
    suggestions: ['Explore courses', 'Contact us'],
  },
  {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'done'],
    reply: 'Goodbye! Feel free to chat anytime. Best of luck on your learning journey! 🎓',
    suggestions: [],
  },
];

const FALLBACK: LocalReplyResult = {
  reply: "I'm not sure about that yet, but our team can help! Please visit the Contact page or reach out to your nearest branch.",
  suggestions: ['Contact us', 'Find a branch', 'Explore courses'],
};

// Simulated network delay range (ms) — makes it feel realistic
const DELAY_MIN = 600;
const DELAY_MAX = 1400;

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly api    = inject(ApiService);
  private readonly router = inject(Router);

  // Builds source context from current router state.
  // branchCode is passed in by the widget when hosted on a branch website.
  // context identifies the surface — defaults to 'public_website'.
  // Extension point: pass 'student_portal' here when enabling the widget
  // in the student dashboard to route leads differently on the backend.
  buildSourceCtx(branchCode?: string, context: ChatContext = 'public_website'): LeadSourceContext {
    return {
      source:        'chatbot',
      sourcePage:    this.router.url,
      sourceContext: branchCode ? 'branch_website' : 'main_website',
      chatContext:   context,
      ...(branchCode ? { branchCode } : {}),
    };
  }

  // ── Local reply (no backend) ───────────────────────────────────────────────
  // Returns an Observable that emits after a realistic delay.
  localReply(message: string): Observable<LocalReplyResult> {
    const lower = message.toLowerCase().trim();
    const match = REPLY_RULES.find((rule) =>
      rule.keywords.some((kw) => lower.includes(kw))
    );
    const result: LocalReplyResult = match
      ? { reply: match.reply, suggestions: match.suggestions }
      : FALLBACK;

    const ms = DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN);
    return of(result).pipe(delay(ms));
  }

  // ── Live API ───────────────────────────────────────────────────────────────
  send(req: ChatRequest): Observable<ChatResponse> {
    return this.api.post<ChatResponse>('/chatbot/message', req);
  }

  submitLead(req: LeadSubmitRequest): Observable<LeadSubmitResponse> {
    return this.api.post<LeadSubmitResponse>('/chatbot/lead', req);
  }

  trackQuickReply(label: string): void {
    // Fire-and-forget — ignore errors, never block the UI
    this.api.post<void>('/chatbot/quick-reply-click', { label }).subscribe({ error: () => {} });
  }

  getAnalytics(): Observable<ChatbotAnalytics> {
    return this.api.get<ChatbotAnalytics>('/chatbot/analytics');
  }

  getSettings(): Observable<ChatbotSettings> {
    return this.api.get<ChatbotSettings>('/chatbot/settings');
  }

  updateSettings(payload: Partial<ChatbotSettings>): Observable<ChatbotSettings> {
    return this.api.patch<ChatbotSettings>('/chatbot/settings', payload);
  }
}
