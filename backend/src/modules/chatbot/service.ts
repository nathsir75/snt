import { ChatRequest, ChatResponse, ChatHealthResult, MessageResponse, LeadSubmitRequest, LeadSubmitResponse, ChatbotAnalytics, ChatContext } from './types';
import { detectLeadIntent } from './lead-intents';
import { matchIntent, FALLBACK } from './rules';
import { siteEnquiriesService } from '../site-enquiries/siteEnquiries.service';
import { enquiryService } from '../enquiries/enquiry.service';
import { branchesService } from '../branches/branches.service';
import { trackMessage, getInProcessCounters } from './analytics';
import { getChatbotSettings } from './chatbot-settings';
import prisma from '../../db/prisma';

// Maps chatbot leadIntent -> SiteEnquiry.enquiryType
const INTENT_TO_ENQUIRY_TYPE: Record<string, string> = {
  course_enquiry:      'course_enquiry',
  franchise_enquiry:   'partner',
  internship_enquiry:  'internship',
  college_partnership: 'college',
  corporate_training:  'corporate',
  contact_request:     'contact',
};

// Intents that should also create a branch Enquiry record when branchCode is present
const BRANCH_ENQUIRY_INTENTS = new Set(['course_enquiry', 'contact_request']);

export const chatbotService = {
  health: (): ChatHealthResult => {
    return { ok: true, module: 'chatbot' };
  },

  message: async (req: ChatRequest): Promise<MessageResponse> => {
    const settings = await getChatbotSettings();
    // Extension point: per-context settings overrides can be applied here.
    // e.g. if (req.context === 'student_portal') { /* load student-specific settings */ }

    // Master kill-switch
    if (!settings.enabled) {
      return {
        sessionId: req.sessionId,
        reply: {
          ...FALLBACK,
          text: settings.supportContactText || 'Our chat is currently unavailable. Please contact us directly.',
          quickReplies: [],
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Resolve branch context only when branchAwareEnabled
    let branch: Awaited<ReturnType<typeof branchesService.getPublicMetaByCode>> | null = null;
    if (req.branchCode && settings.branchAwareEnabled) {
      branch = await branchesService.getPublicMetaByCode(req.branchCode);
    }

    // Lead intent pre-pass
    const leadReply = detectLeadIntent(req.message);
    if (leadReply) {
      const reply = { ...leadReply };
      if (branch) {
        reply.text = `${reply.text}\n\n📍 You're chatting with **${branch.name}** (${branch.city}).`;
      }
      if (!settings.leadCaptureEnabled) {
        delete reply.isLeadCapture;
        delete reply.nextQuestion;
      }
      trackMessage(req.sessionId, reply.leadIntent);
      console.log('[Chatbot] LEAD session:', req.sessionId, '| intent:', reply.leadIntent, '| branch:', req.branchCode ?? 'HO', '| context:', req.context ?? 'public_website');
      return { sessionId: req.sessionId, reply, timestamp: new Date().toISOString() };
    }

    // FAQ engine
    let faqReply = matchIntent(req.message);

    // Personalise branch-specific intents
    if (branch) {
      if (faqReply.leadIntent === 'branch' || faqReply.leadIntent === 'contact') {
        const lines: string[] = [`📍 You're on the **${branch.name}** website (${branch.city}).`];
        if (branch.phone)        lines.push(`📞 Phone: ${branch.phone}`);
        if (branch.email)        lines.push(`📧 Email: ${branch.email}`);
        if (branch.address)      lines.push(`🏢 Address: ${branch.address}`);
        if (branch.workingHours) lines.push(`🕐 Hours: ${branch.workingHours}`);
        if (branch.mapLink)      lines.push(`🗺️ [View on Map](${branch.mapLink})`);
        faqReply = { ...faqReply, text: lines.join('\n') };
      } else if (faqReply.leadIntent === 'greeting') {
        faqReply = {
          ...faqReply,
          text: `Hello! 👋 Welcome to **${branch.name}** — ${branch.city}. I'm here to help you with courses, admissions, and more. What would you like to know?`,
        };
      }
    }

    trackMessage(req.sessionId, faqReply.leadIntent);
    console.log('[Chatbot] FAQ  session:', req.sessionId, '| intent:', faqReply.leadIntent, '| branch:', req.branchCode ?? 'HO', '| context:', req.context ?? 'public_website');
    return { sessionId: req.sessionId, reply: faqReply, timestamp: new Date().toISOString() };
  },

  submitLead: async (req: LeadSubmitRequest): Promise<LeadSubmitResponse> => {
    const enquiryType = INTENT_TO_ENQUIRY_TYPE[req.leadIntent] ?? 'contact';
    // Extension point: student_portal leads could be routed differently here.
    // e.g. if (req.sourceCtx.chatContext === 'student_portal') { /* write to student support table */ }

    // Always create a SiteEnquiry (HO-level CRM)
    const siteRecord = await siteEnquiriesService.submit({
      enquiryType,
      fullName: req.fullName,
      phone:    req.phone,
      email:    req.email,
      subject:  req.leadIntent,
      message:  req.interest,
      metaJson: {
        sessionId:     req.sessionId,
        city:          req.city,
        leadIntent:    req.leadIntent,
        source:        req.sourceCtx.source,
        sourcePage:    req.sourceCtx.sourcePage,
        sourceContext: req.sourceCtx.sourceContext,
        chatContext:   req.sourceCtx.chatContext ?? 'public_website',
        ...(req.sourceCtx.branchCode ? { branchCode: req.sourceCtx.branchCode } : {}),
      },
    });

    // Also create a branch Enquiry record when branchCode is present
    let branchRecordId: number | null = null;
    if (req.sourceCtx.branchCode && BRANCH_ENQUIRY_INTENTS.has(req.leadIntent)) {
      try {
        const branch = await branchesService.getByCode(req.sourceCtx.branchCode);
        if (branch) {
          const branchEnquiry = await enquiryService.createEnquiry({
            fullName:       req.fullName,
            mobile:         req.phone,
            email:          req.email,
            city:           req.city,
            courseInterest: req.interest ?? req.leadIntent,
            source:         'chatbot',
            branchId:       branch.id,
            remarks:        `Chatbot lead — intent: ${req.leadIntent}, page: ${req.sourceCtx.sourcePage}`,
          });
          branchRecordId = branchEnquiry.id;
          console.log(`[Chatbot] Branch enquiry created — id=${branchEnquiry.id} branch=${branch.name}`);
        }
      } catch (err) {
        console.warn('[Chatbot] Branch enquiry creation failed (non-fatal):', err);
      }
    }

    console.log(`[Chatbot] Lead saved — siteId=${siteRecord.id} branchId=${branchRecordId ?? 'n/a'} type=${enquiryType} branch=${req.sourceCtx.branchCode ?? 'HO'}`);
    return {
      ok:       true,
      recordId: siteRecord.id,
      message:  "Thank you! We've received your details and will be in touch shortly.",
    };
  },

  reply: async (req: ChatRequest): Promise<ChatResponse> => chatbotService.message(req),

  getAnalytics: async (): Promise<ChatbotAnalytics> => {
    const chatbotLeads = await prisma.siteEnquiry.findMany({
      where:  { metaJson: { path: ['source'], equals: 'chatbot' } },
      select: { metaJson: true },
    });

    const intentMap = new Map<string, number>();
    for (const row of chatbotLeads) {
      const meta = row.metaJson as Record<string, unknown> | null;
      const intent = typeof meta?.leadIntent === 'string' ? meta.leadIntent : 'unknown';
      intentMap.set(intent, (intentMap.get(intent) ?? 0) + 1);
    }

    const leadsByIntent = [...intentMap.entries()]
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count);

    const counters = getInProcessCounters();

    return {
      ...counters,
      totalLeads:  chatbotLeads.length,
      leadsByIntent,
      generatedAt: new Date().toISOString(),
    };
  },
};
