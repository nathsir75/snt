import { Request, Response } from 'express';
import { chatbotService } from './service';
import { trackQuickReply } from './analytics';
import { getChatbotSettings, updateChatbotSettings } from './chatbot-settings';
import { ChatRequest, LeadSubmitRequest, ChatContext } from './types';

export const chatbotController = {
  // GET /chatbot/health
  health: (_req: Request, res: Response) => {
    res.json(chatbotService.health());
  },

  // POST /chatbot/message
  message: async (req: Request, res: Response) => {
    try {
      const { sessionId, message } = req.body as Partial<ChatRequest>;
      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId (string) is required' });
      }
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'message (non-empty string) is required' });
      }
      const result = await chatbotService.message({
        sessionId,
        message: message.trim(),
        branchCode: req.body.branchCode ?? undefined,
        context: (req.body.context as ChatContext) ?? undefined,
      });
      res.json(result);
    } catch (err) {
      console.error('[Chatbot] message error stack:', err);
      // Return a structured fallback reply instead of a bare 500
      // so the widget renders a message rather than "Could not reach the server".
      res.status(200).json({
        sessionId: req.body?.sessionId ?? 'unknown',
        reply: {
          text: 'Sorry, I\'m having trouble right now. Please try again in a moment or contact us directly.',
          quickReplies: ['Contact Us', 'Find a Branch'],
          leadIntent: 'fallback',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // POST /chatbot/lead
  submitLead: async (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<LeadSubmitRequest>;

      if (!body.sessionId  || typeof body.sessionId  !== 'string') return res.status(400).json({ error: 'sessionId is required' });
      if (!body.leadIntent || typeof body.leadIntent !== 'string') return res.status(400).json({ error: 'leadIntent is required' });
      if (!body.fullName   || typeof body.fullName   !== 'string') return res.status(400).json({ error: 'fullName is required' });
      if (!body.phone      || typeof body.phone      !== 'string') return res.status(400).json({ error: 'phone is required' });
      if (!body.city       || typeof body.city       !== 'string') return res.status(400).json({ error: 'city is required' });

      const result = await chatbotService.submitLead({
        sessionId:  body.sessionId,
        leadIntent: body.leadIntent,
        fullName:   body.fullName.trim(),
        phone:      body.phone.trim(),
        email:      body.email?.trim(),
        city:       body.city.trim(),
        interest:   body.interest?.trim(),
        sourceCtx: {
          source:        'chatbot',
          sourcePage:    typeof body.sourceCtx?.sourcePage    === 'string' ? body.sourceCtx.sourcePage    : '/',
          sourceContext: body.sourceCtx?.sourceContext === 'branch_website' ? 'branch_website' : 'main_website',
          chatContext:   (body.sourceCtx?.chatContext as ChatContext) ?? 'public_website',
          ...(body.sourceCtx?.branchCode ? { branchCode: body.sourceCtx.branchCode } : {}),
        },
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('[Chatbot] submitLead error:', err);
      res.status(500).json({ error: 'Could not save lead. Please try again.' });
    }
  },
  // GET /chatbot/settings  (public — widget reads on load)
  getSettings: async (_req: Request, res: Response) => {
    try {
      res.json(await getChatbotSettings());
    } catch (err) {
      console.error('[Chatbot] getSettings error stack:', err);
      // getChatbotSettings() already catches DB errors internally and returns defaults.
      // This outer catch only fires for truly unexpected errors — still return defaults.
      res.json({
        enabled: true,
        welcomeMessage: "Hi, I'm the SNT Education assistant. 👋",
        welcomeSubtext: 'How can I help you today? Pick a topic or type your question below.',
        supportContactText: 'Our team is available Mon–Sat, 9 AM – 6 PM.',
        branchAwareEnabled: true,
        leadCaptureEnabled: true,
        quickActions: [],
      });
    }
  },

  // PATCH /chatbot/settings  (super_admin only)
  updateSettings: async (req: Request, res: Response) => {
    try {
      const body = req.body;
      // P2-C: validate shape before writing — prevents corrupt JSON blob in DB
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return res.status(400).json({ error: 'Request body must be a JSON object' });
      }
      if ('enabled'            in body && typeof body.enabled            !== 'boolean') return res.status(400).json({ error: '"enabled" must be a boolean' });
      if ('branchAwareEnabled' in body && typeof body.branchAwareEnabled !== 'boolean') return res.status(400).json({ error: '"branchAwareEnabled" must be a boolean' });
      if ('leadCaptureEnabled' in body && typeof body.leadCaptureEnabled !== 'boolean') return res.status(400).json({ error: '"leadCaptureEnabled" must be a boolean' });
      if ('welcomeMessage'     in body && typeof body.welcomeMessage     !== 'string')  return res.status(400).json({ error: '"welcomeMessage" must be a string' });
      if ('welcomeSubtext'     in body && typeof body.welcomeSubtext     !== 'string')  return res.status(400).json({ error: '"welcomeSubtext" must be a string' });
      if ('supportContactText' in body && typeof body.supportContactText !== 'string')  return res.status(400).json({ error: '"supportContactText" must be a string' });
      if ('quickActions' in body) {
        if (!Array.isArray(body.quickActions)) return res.status(400).json({ error: '"quickActions" must be an array' });
        for (const chip of body.quickActions) {
          if (typeof chip?.label !== 'string' || typeof chip?.message !== 'string') {
            return res.status(400).json({ error: 'Each quickAction must have string "label" and "message"' });
          }
        }
        if (body.quickActions.length > 6) return res.status(400).json({ error: '"quickActions" may not exceed 6 items' });
      }
      const updated = await updateChatbotSettings(body);
      res.json(updated);
    } catch (err) {
      console.error('[Chatbot] updateSettings error:', err);
      res.status(500).json({ error: 'Could not save chatbot settings' });
    }
  },

  // POST /chatbot/quick-reply-click  (fire-and-forget, no auth needed)
  trackQuickReply: (req: Request, res: Response) => {
    const { label } = req.body as { label?: string };
    if (label && typeof label === 'string') trackQuickReply(label.trim());
    res.status(204).send();
  },

  // GET /chatbot/analytics  (admin only — protected by authMiddleware in routes)
  getAnalytics: async (_req: Request, res: Response) => {
    try {
      const data = await chatbotService.getAnalytics();
      res.json(data);
    } catch (err) {
      console.error('[Chatbot] analytics error:', err);
      res.status(500).json({ error: 'Could not load analytics' });
    }
  },
};
