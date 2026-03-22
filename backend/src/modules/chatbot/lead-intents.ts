// ── Lead Intent Detection ─────────────────────────────────────────────────────
// Runs BEFORE the FAQ engine. Detects strong conversion signals — phrases that
// indicate the user wants to take action, not just browse information.
//
// Each rule carries:
//   signals      — high-intent keyword phrases (multi-word checked first)
//   leadIntent   — canonical intent identifier
//   ackText      — warm acknowledgement shown immediately
//   nextQuestion — first qualifying question to open the lead-capture flow
//   quickReplies — chips shown alongside the next question
//   actionUrl    — optional page to deep-link from the CTA chip

import { BotReply, LeadIntentType } from './types';

export interface LeadIntentRule {
  leadIntent:   LeadIntentType;
  signals:      string[];       // ordered: longer phrases first to avoid partial shadowing
  ackText:      string;
  nextQuestion: string;
  quickReplies: string[];
  actionUrl?:   string;
  actionLabel?: string;
}

export const LEAD_INTENT_RULES: LeadIntentRule[] = [
  {
    leadIntent: 'course_enquiry',
    signals: [
      'i want to enroll', 'i want to join', 'i want to register',
      'how do i enroll', 'how do i join', 'how do i register',
      'want to apply', 'want to start a course', 'want to learn',
      'enroll me', 'sign me up', 'i am interested in a course',
      'interested in joining', 'interested in course',
      'admission', 'enroll', 'register for course',
    ],
    ackText:      "Great choice! 🎓 I'd love to help you get started with the right course.",
    nextQuestion: "Which area are you most interested in? (e.g. Web Development, Data Science, Digital Marketing, Cloud, or something else?)",
    quickReplies: ['Web Development', 'Data Science', 'Digital Marketing', 'Cloud Computing', 'Other'],
    actionUrl:    '/courses',
    actionLabel:  'Browse All Courses',
  },
  {
    leadIntent: 'franchise_enquiry',
    signals: [
      'i want to open a franchise', 'i want to start a franchise',
      'interested in franchise', 'want to become a franchisee',
      'how to become a partner', 'want to open a centre',
      'want to open a center', 'franchise enquiry', 'franchise inquiry',
      'want to invest in snt', 'business opportunity',
      'i want to partner', 'become a franchise',
    ],
    ackText:      "Excellent! 🤝 Our franchise model has helped 50+ entrepreneurs build successful education centres.",
    nextQuestion: "To connect you with our partnership team, could you share which city or region you're looking to open a centre in?",
    quickReplies: ['North India', 'South India', 'East India', 'West India', 'Other Region'],
    actionUrl:    '/franchise',
    actionLabel:  'Become a Partner',
  },
  {
    leadIntent: 'internship_enquiry',
    signals: [
      'i want an internship', 'looking for internship', 'apply for internship',
      'how to apply for internship', 'internship application',
      'want to do internship', 'need an internship',
      'i am a student looking', 'fresh graduate looking',
      'want live project', 'want industrial training',
    ],
    ackText:      "Awesome! 💼 Our internship program is a great way to build real-world skills.",
    nextQuestion: "What's your current status — are you a student, a recent graduate, or a working professional looking to upskill?",
    quickReplies: ['Current Student', 'Recent Graduate', 'Working Professional'],
    actionUrl:    '/internship',
    actionLabel:  'Apply for Internship',
  },
  {
    leadIntent: 'college_partnership',
    signals: [
      'i represent a college', 'i represent a university', 'i am from a college',
      'our institution wants', 'want to sign mou', 'want to tie up',
      'college wants to partner', 'university partnership',
      'academic collaboration', 'campus training enquiry',
      'want to collaborate with snt', 'institutional partnership',
    ],
    ackText:      "Wonderful! 🎓 We'd love to explore a partnership with your institution.",
    nextQuestion: "Could you tell me the name of your institution and the city it's located in? Our academic team will reach out to you directly.",
    quickReplies: ['Share Institution Details', 'Schedule a Call', 'Send Email'],
    actionUrl:    '/college-partnership',
    actionLabel:  'Request a Partnership',
  },
  {
    leadIntent: 'corporate_training',
    signals: [
      'we need training for our team', 'training for employees',
      'corporate training enquiry', 'want to train our staff',
      'upskill our workforce', 'reskill our team',
      'employee development program', 'b2b training',
      'training for our company', 'enterprise training',
      'i represent a company', 'hr looking for training',
    ],
    ackText:      "Perfect! 🏢 We design custom training programs that fit your team's exact needs.",
    nextQuestion: "How many employees are you looking to train, and what domain are you focused on? (e.g. Tech, Soft Skills, Leadership, Digital Tools)",
    quickReplies: ['Under 50 Employees', '50–200 Employees', '200+ Employees', 'Not Sure Yet'],
    actionUrl:    '/corporate-training',
    actionLabel:  'Request a Training Proposal',
  },
  {
    leadIntent: 'contact_request',
    signals: [
      'i want to talk to someone', 'connect me with a counselor',
      'can someone call me', 'please call me', 'i need a callback',
      'want to speak to an advisor', 'talk to a human',
      'connect me with your team', 'i need help from a person',
      'speak to someone', 'get in touch with me',
    ],
    ackText:      "Of course! 📞 Our counselors are available Mon–Sat, 9 AM – 6 PM.",
    nextQuestion: "Could you share your name and the best time to reach you? We'll have a counselor call you back shortly.",
    quickReplies: ['Morning (9–12)', 'Afternoon (12–3)', 'Evening (3–6)'],
    actionUrl:    '/contact',
    actionLabel:  'Open Contact Form',
  },
];

// ── Lead intent detector ──────────────────────────────────────────────────────
// Checks multi-word signals first (longer strings shadow shorter ones naturally
// since we sort by signal length descending before matching).
// Returns a BotReply with isLeadCapture: true, or null if no lead intent fires.
export function detectLeadIntent(message: string): BotReply | null {
  const lower = message.toLowerCase().trim();

  for (const rule of LEAD_INTENT_RULES) {
    const sorted = [...rule.signals].sort((a, b) => b.length - a.length);

    if (sorted.some((signal) => lower.includes(signal))) {
      return {
        text:           `${rule.ackText}\n\n${rule.nextQuestion}`,
        quickReplies:   rule.quickReplies,
        leadIntent:     rule.leadIntent,
        isLeadCapture:  true,
        nextQuestion:   rule.nextQuestion,
        ...(rule.actionUrl   ? { actionUrl:   rule.actionUrl   } : {}),
        ...(rule.actionLabel ? { actionLabel: rule.actionLabel } : {}),
      };
    }
  }

  return null;
}
