// ── FAQ Rule Engine ───────────────────────────────────────────────────────────
// Each rule: keyword triggers (any match wins) + structured BotReply fields.
// Rules are evaluated top-to-bottom; first match is returned.
// No external dependencies — runs entirely in-process.

import { BotReply } from './types';

export interface FaqRule {
  intent:       string;
  keywords:     string[];
  text:         string;
  quickReplies: string[];
  actionUrl?:   string;
  actionLabel?: string;
}

export const FAQ_RULES: FaqRule[] = [
  {
    intent: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste', 'hii', 'helo'],
    text: "Hello! 👋 Welcome to SNT Education. I'm here to help you with courses, admissions, placements, franchise, and more. What would you like to know?",
    quickReplies: ['Explore Courses', 'Placement Info', 'Find a Branch', 'Franchise Enquiry'],
  },
  {
    intent: 'course',
    keywords: ['course', 'courses', 'program', 'programs', 'learn', 'study', 'syllabus', 'curriculum', 'subject'],
    text: "📚 SNT Education offers industry-focused programs including:\n\n• Full Stack Web Development\n• Data Science & Machine Learning\n• Digital Marketing\n• Cloud Computing (AWS / Azure)\n• Cybersecurity\n• UI/UX Design\n\nAll programs include live projects, mentorship, and placement support.",
    quickReplies: ['Course Fees?', 'Course Duration?', 'Online or Offline?', 'Enroll Now'],
    actionUrl: '/courses',
    actionLabel: 'Browse All Courses',
  },
  {
    intent: 'fee',
    keywords: ['fee', 'fees', 'cost', 'price', 'pricing', 'charges', 'scholarship', 'emi', 'installment', 'discount', 'afford'],
    text: "💰 Course fees vary by program and location. Here's what we offer:\n\n• Flexible EMI options (0% interest at select branches)\n• Merit-based scholarships for eligible students\n• Early-bird discounts on select batches\n\nContact your nearest branch for exact pricing.",
    quickReplies: ['Apply for Scholarship', 'Find a Branch', 'Explore Courses'],
    actionUrl: '/contact',
    actionLabel: 'Contact Us for Pricing',
  },
  {
    intent: 'placement',
    keywords: ['placement', 'placements', 'job', 'jobs', 'hire', 'hiring', 'salary', 'lpa', 'package', 'career', 'recruit', 'company', 'companies'],
    text: "🏆 SNT Education has a strong placement track record:\n\n• 500+ hiring partners across India\n• Average package: 4–8 LPA\n• Highest package: 18 LPA\n• Dedicated placement cell at every branch\n• Resume building, mock interviews & LinkedIn profile support",
    quickReplies: ['Hiring Partners', 'Explore Courses', 'Find a Branch'],
    actionUrl: '/placements',
    actionLabel: 'View Placement Stats',
  },
  {
    intent: 'internship',
    keywords: ['internship', 'intern', 'interns', 'internships', 'live project', 'live projects', 'industrial training', 'apprentice'],
    text: "💼 SNT Education's Internship Program gives students real-world experience:\n\n• 1–6 month paid & unpaid internship options\n• Available for students and fresh graduates\n• Domains: Web Dev, Data Science, Digital Marketing, Design\n• Certificate of completion provided\n• Top performers get pre-placement offers (PPO)",
    quickReplies: ['Apply for Internship', 'Explore Courses', 'Contact Us'],
    actionUrl: '/internship',
    actionLabel: 'Apply for Internship',
  },
  {
    intent: 'franchise',
    keywords: ['franchise', 'franchisee', 'partner', 'partnership', 'invest', 'open centre', 'open center', 'dealership', 'own branch'],
    text: "🤝 Interested in partnering with SNT Education? Our franchise model is built for entrepreneurs:\n\n• Proven business model with 50+ active centres\n• Full operational support & staff training\n• Centralized curriculum & marketing materials\n• Low investment, high ROI\n• Dedicated franchise support team",
    quickReplies: ['Franchise Details', 'Talk to Partnership Team', 'Find a Branch'],
    actionUrl: '/franchise',
    actionLabel: 'Become a Partner',
  },
  {
    intent: 'branch',
    keywords: ['branch', 'branches', 'location', 'locations', 'centre', 'center', 'city', 'near', 'address', 'nearest', 'office', 'visit'],
    text: "📍 SNT Education has 50+ branches across India.\n\nTo find your nearest branch:\n• Visit the Locations page on our website\n• Use the branch locator tool\n• Call our helpline: available Mon–Sat, 9 AM – 6 PM",
    quickReplies: ['View All Locations', 'Contact Helpline', 'Explore Courses'],
    actionUrl: '/branches',
    actionLabel: 'Find Nearest Branch',
  },
  {
    intent: 'college_partnership',
    keywords: ['college', 'university', 'institution', 'college partnership', 'mou', 'tie-up', 'tieup', 'campus', 'academic partner', 'b.tech', 'bca', 'bsc'],
    text: "🎓 SNT Education partners with colleges and universities to bridge the skill gap:\n\n• MoU-based partnerships with 100+ institutions\n• Campus training programs & workshops\n• Placement drives on campus\n• Curriculum co-design for industry readiness\n• Guest lectures and hackathons",
    quickReplies: ['Request a Partnership', 'Contact Academic Team', 'Learn More'],
    actionUrl: '/college-partnership',
    actionLabel: 'Request a Partnership',
  },
  {
    intent: 'corporate_training',
    keywords: ['corporate', 'corporate training', 'employee training', 'workforce', 'upskill', 'reskill', 'enterprise', 'b2b', 'organization', 'organisation', 'company training', 'staff training'],
    text: "🏢 SNT Education offers tailored Corporate Training solutions:\n\n• Custom training programs for your team's needs\n• Domains: Tech, Soft Skills, Leadership, Digital Tools\n• On-site, online, or hybrid delivery\n• Flexible batch sizes (10–500+ employees)\n• Post-training assessment & certification",
    quickReplies: ['Request a Proposal', 'Talk to B2B Team', 'View Training Domains'],
    actionUrl: '/corporate-training',
    actionLabel: 'Request a Training Proposal',
  },
  {
    intent: 'contact',
    keywords: ['contact', 'phone', 'email', 'call', 'helpline', 'support', 'help', 'reach', 'talk', 'speak', 'enquiry', 'inquiry', 'query'],
    text: "📞 You can reach SNT Education through multiple channels:\n\n• Website: Contact page (enquiry form)\n• Helpline: Available Mon–Sat, 9 AM – 6 PM\n• Visit your nearest branch for in-person support\n\nOur team typically responds within 1 business day.",
    quickReplies: ['Find a Branch', 'Explore Courses'],
    actionUrl: '/contact',
    actionLabel: 'Open Contact Form',
  },
  {
    intent: 'duration',
    keywords: ['duration', 'how long', 'months', 'weeks', 'hours', 'long is', 'schedule', 'batch', 'weekend', 'fast track'],
    text: "⏱️ Course durations at SNT Education:\n\n• Short-term certifications: 1–3 months\n• Diploma programs: 3–6 months\n• Full-stack / advanced programs: 6–12 months\n\nWe offer weekday, weekend, and fast-track batches to fit your schedule.",
    quickReplies: ['Explore Courses', 'Find a Branch', 'Enroll Now'],
    actionUrl: '/courses',
    actionLabel: 'Browse All Courses',
  },
  {
    intent: 'certificate',
    keywords: ['certificate', 'certification', 'degree', 'diploma', 'credential', 'verify', 'recognised', 'recognized'],
    text: "📜 All SNT Education courses come with an industry-recognized certificate upon successful completion.\n\n• Certificates are verifiable online at snt.edu/verify\n• Recognized by 500+ hiring partners\n• Dual certification available on select programs",
    quickReplies: ['Verify a Certificate', 'Explore Courses', 'Placement Info'],
    actionUrl: '/verify-certificate',
  },
  {
    intent: 'online_offline',
    keywords: ['online', 'offline', 'hybrid', 'remote', 'classroom', 'virtual', 'live class', 'recorded'],
    text: "💻 SNT Education offers flexible learning modes:\n\n• Classroom (offline) — available at all branches\n• Online (live) — instructor-led, real-time sessions\n• Hybrid — switch between modes as needed\n• Recorded sessions available for revision",
    quickReplies: ['Explore Online Courses', 'Find a Branch', 'Enroll Now'],
    actionUrl: '/courses',
    actionLabel: 'Explore Learning Modes',
  },
  {
    intent: 'thanks',
    keywords: ['thank', 'thanks', 'thank you', 'thankyou', 'great', 'awesome', 'perfect', 'helpful', 'good'],
    text: "You're welcome! 😊 Is there anything else I can help you with?",
    quickReplies: ['Explore Courses', 'Find a Branch', 'Contact Us'],
  },
  {
    intent: 'bye',
    keywords: ['bye', 'goodbye', 'see you', 'later', 'done', 'exit', 'quit', 'close'],
    text: 'Goodbye! 👋 Best of luck on your learning journey. Feel free to chat anytime — we\'re always here to help. 🎓',
    quickReplies: [],
  },
];

export const FALLBACK: BotReply = {
  text: "I'm not sure about that yet, but our team can help! 🙂\n\nPlease visit the Contact page, call our helpline (Mon–Sat, 9 AM – 6 PM), or drop by your nearest SNT branch.",
  quickReplies: ['Contact Us', 'Find a Branch', 'Explore Courses'],
  leadIntent: 'fallback',
  actionUrl: '/contact',
};

// ── Intent matcher ────────────────────────────────────────────────────────────
// Normalises input, checks every keyword of every rule, returns first match.
export function matchIntent(message: string): BotReply {
  const lower = message.toLowerCase().trim();

  for (const rule of FAQ_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return {
        text:         rule.text,
        quickReplies: rule.quickReplies,
        leadIntent:   rule.intent,
        ...(rule.actionUrl   ? { actionUrl:   rule.actionUrl   } : {}),
        ...(rule.actionLabel ? { actionLabel: rule.actionLabel } : {}),
      };
    }
  }

  return FALLBACK;
}
