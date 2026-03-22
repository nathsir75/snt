// ── Chatbot Settings ──────────────────────────────────────────────────────────
// Stored as SiteSettings.chatbotJson — a single JSON blob on the HO settings row.
// No new table needed; follows the same pattern as announcementBar / seoDefaults.

import prisma from '../../db/prisma';
import { ChatbotSettings } from './types';

// ── Settings cache (P2-D) ─────────────────────────────────────────────────────
// Avoids a DB round-trip on every POST /message.
// TTL is intentionally short (30 s) so admin changes propagate quickly.
let _cache: ChatbotSettings | null = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 30_000;

function invalidateCache(): void { _cache = null; _cacheAt = 0; }

export const CHATBOT_DEFAULTS: ChatbotSettings = {
  enabled:             true,
  welcomeMessage:      "Hi, I'm the SNT Education assistant. 👋",
  welcomeSubtext:      'How can I help you today? Pick a topic or type your question below.',
  supportContactText:  'Our team is available Mon–Sat, 9 AM – 6 PM.',
  branchAwareEnabled:  true,
  leadCaptureEnabled:  true,
  quickActions: [
    { label: '📚 Explore Courses',     message: 'Tell me about your courses'        },
    { label: '🤝 Franchise Enquiry',   message: 'I want to know about franchise'    },
    { label: '💼 Internship Program',  message: 'Tell me about internship programs' },
    { label: '🏢 Corporate Training',  message: 'Tell me about corporate training'  },
    { label: '🎓 College Partnership', message: 'Tell me about college partnership' },
    { label: '📍 Contact Branch',      message: 'Find a branch near me'             },
  ],
};

function parseChatbotJson(raw: unknown): ChatbotSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...CHATBOT_DEFAULTS };
  const obj = raw as Record<string, unknown>;
  return {
    enabled:            typeof obj['enabled']            === 'boolean' ? obj['enabled']            : CHATBOT_DEFAULTS.enabled,
    welcomeMessage:     typeof obj['welcomeMessage']     === 'string'  ? obj['welcomeMessage']     : CHATBOT_DEFAULTS.welcomeMessage,
    welcomeSubtext:     typeof obj['welcomeSubtext']     === 'string'  ? obj['welcomeSubtext']     : CHATBOT_DEFAULTS.welcomeSubtext,
    supportContactText: typeof obj['supportContactText'] === 'string'  ? obj['supportContactText'] : CHATBOT_DEFAULTS.supportContactText,
    branchAwareEnabled: typeof obj['branchAwareEnabled'] === 'boolean' ? obj['branchAwareEnabled'] : CHATBOT_DEFAULTS.branchAwareEnabled,
    leadCaptureEnabled: typeof obj['leadCaptureEnabled'] === 'boolean' ? obj['leadCaptureEnabled'] : CHATBOT_DEFAULTS.leadCaptureEnabled,
    quickActions:       Array.isArray(obj['quickActions'])             ? obj['quickActions'] as ChatbotSettings['quickActions'] : CHATBOT_DEFAULTS.quickActions,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getChatbotSettings(): Promise<ChatbotSettings> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) return _cache;
  try {
    const row = await prisma.siteSettings.findFirst({ select: { chatbotJson: true } });
    _cache   = parseChatbotJson(row?.chatbotJson);
    _cacheAt = Date.now();
    return _cache;
  } catch (err) {
    console.error('[ChatbotSettings] getChatbotSettings() DB error — returning defaults. Stack:', err);
    // Do NOT cache the fallback — let the next request retry the DB.
    return { ...CHATBOT_DEFAULTS };
  }
}

export async function updateChatbotSettings(patch: Partial<ChatbotSettings>): Promise<ChatbotSettings> {
  const current = await getChatbotSettings();
  const merged: ChatbotSettings = { ...current, ...patch };

  // Upsert the singleton SiteSettings row
  const existing = await prisma.siteSettings.findFirst({ select: { id: true } });
  if (existing) {
    await prisma.siteSettings.update({
      where: { id: existing.id },
      data:  { chatbotJson: merged as object },
    });
  } else {
    await prisma.siteSettings.create({
      data: { chatbotJson: merged as object },
    });
  }

  invalidateCache(); // force next read to hit DB
  return merged;
}
