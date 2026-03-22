import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'snt-web-franchise',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container hero-inner">
        <!-- Text LEFT -->
        <div class="hero-text">
          <p class="eyebrow">Franchise Model</p>
          <h1 class="page-title">A Proven Business Model for Education Entrepreneurs</h1>
          <p class="page-sub">Everything you need to know about owning an SNT Education franchise — investment, returns, support, and process.</p>
          <div class="hero-stats">
            <div class="hstat"><span class="hstat-num">₹5L+</span><span class="hstat-label">Starting Investment</span></div>
            <div class="hstat"><span class="hstat-num">₹2L+</span><span class="hstat-label">Monthly Revenue</span></div>
            <div class="hstat"><span class="hstat-num">60d</span><span class="hstat-label">To Launch</span></div>
          </div>
        </div>
        <!-- Image RIGHT -->
        <div class="hero-visual">
          <svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <!-- network tree -->
            <!-- HQ node -->
            <rect x="160" y="30" width="100" height="50" rx="10" fill="#1e293b" stroke="#6366f1" stroke-width="2"/>
            <text x="210" y="52" text-anchor="middle" font-size="10" fill="#a5b4fc" font-family="system-ui" font-weight="700">SNT HQ</text>
            <text x="210" y="67" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Head Office</text>
            <!-- branch lines -->
            <line x1="210" y1="80" x2="80" y2="150" stroke="rgba(99,102,241,.5)" stroke-width="1.5" stroke-dasharray="4 3"/>
            <line x1="210" y1="80" x2="210" y2="150" stroke="rgba(99,102,241,.5)" stroke-width="1.5" stroke-dasharray="4 3"/>
            <line x1="210" y1="80" x2="340" y2="150" stroke="rgba(99,102,241,.5)" stroke-width="1.5" stroke-dasharray="4 3"/>
            <!-- branch nodes -->
            <rect x="30" y="150" width="100" height="44" rx="8" fill="#1e293b" stroke="#8b5cf6" stroke-width="1.5"/>
            <text x="80" y="169" text-anchor="middle" font-size="9" fill="#c4b5fd" font-family="system-ui" font-weight="700">🏢 Pune Branch</text>
            <text x="80" y="183" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="system-ui">Growth Plan</text>
            <rect x="160" y="150" width="100" height="44" rx="8" fill="#1e293b" stroke="#6366f1" stroke-width="1.5"/>
            <text x="210" y="169" text-anchor="middle" font-size="9" fill="#a5b4fc" font-family="system-ui" font-weight="700">🏢 Mumbai</text>
            <text x="210" y="183" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="system-ui">Premium Plan</text>
            <rect x="290" y="150" width="100" height="44" rx="8" fill="#1e293b" stroke="#06b6d4" stroke-width="1.5"/>
            <text x="340" y="169" text-anchor="middle" font-size="9" fill="#67e8f9" font-family="system-ui" font-weight="700">🏢 Nashik</text>
            <text x="340" y="183" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="system-ui">Starter Plan</text>
            <!-- sub-branch lines -->
            <line x1="80" y1="194" x2="60" y2="240" stroke="rgba(139,92,246,.4)" stroke-width="1" stroke-dasharray="3 3"/>
            <line x1="210" y1="194" x2="210" y2="240" stroke="rgba(99,102,241,.4)" stroke-width="1" stroke-dasharray="3 3"/>
            <line x1="340" y1="194" x2="360" y2="240" stroke="rgba(6,182,212,.4)" stroke-width="1" stroke-dasharray="3 3"/>
            <!-- sub nodes -->
            <circle cx="60" cy="255" r="14" fill="#1e293b" stroke="#8b5cf6" stroke-width="1"/>
            <text x="60" y="259" text-anchor="middle" font-size="8" fill="#c4b5fd" font-family="system-ui">🏢</text>
            <circle cx="210" cy="255" r="14" fill="#1e293b" stroke="#6366f1" stroke-width="1"/>
            <text x="210" y="259" text-anchor="middle" font-size="8" fill="#a5b4fc" font-family="system-ui">🏢</text>
            <circle cx="360" cy="255" r="14" fill="#1e293b" stroke="#06b6d4" stroke-width="1"/>
            <text x="360" y="259" text-anchor="middle" font-size="8" fill="#67e8f9" font-family="system-ui">🏢</text>
            <!-- revenue badge -->
            <rect x="10" y="40" width="110" height="52" rx="8" fill="rgba(5,150,105,.15)" stroke="rgba(5,150,105,.4)" stroke-width="1.5"/>
            <text x="65" y="62" text-anchor="middle" font-size="14" fill="#6ee7b7" font-family="system-ui" font-weight="900">₹2L+</text>
            <text x="65" y="78" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Monthly Revenue</text>
            <!-- growth badge -->
            <rect x="300" y="270" width="110" height="44" rx="8" fill="rgba(99,102,241,.15)" stroke="rgba(99,102,241,.4)" stroke-width="1.5"/>
            <text x="355" y="289" text-anchor="middle" font-size="10" fill="#a5b4fc" font-family="system-ui" font-weight="700">📈 30+ Active</text>
            <text x="355" y="304" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Franchise Partners</text>
          </svg>
        </div>
      </div>
    </section>

    <!-- Investment tiers -->
    <section class="section">
      <div class="container">
        <div class="section-header center">
          <p class="eyebrow-dark">Investment Plans</p>
          <h2 class="section-title">Choose Your Franchise Model</h2>
        </div>
        <div class="tiers-grid">
          @for (tier of tiers; track tier.name) {
            <div class="tier-card" [class.tier-featured]="tier.featured">
              @if (tier.featured) { <div class="tier-badge">Most Popular</div> }
              <h3 class="tier-name">{{ tier.name }}</h3>
              <p class="tier-investment">{{ tier.investment }}</p>
              <p class="tier-investment-label">Total Investment</p>
              <ul class="tier-features">
                @for (f of tier.features; track f) {
                  <li>✅ {{ f }}</li>
                }
              </ul>
              <p class="tier-revenue">Expected Monthly Revenue: <strong>{{ tier.revenue }}</strong></p>
              <a routerLink="/become-a-partner" class="tier-btn" [class.tier-btn-featured]="tier.featured">Apply for This Plan →</a>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Process -->
    <section class="section section-alt">
      <div class="container">
        <div class="section-header center">
          <p class="eyebrow-dark">How It Works</p>
          <h2 class="section-title">From Application to Launch in 60 Days</h2>
        </div>
        <div class="process-grid">
          @for (step of steps; track step.num) {
            <div class="process-card">
              <div class="process-num">{{ step.num }}</div>
              <h3 class="process-title">{{ step.title }}</h3>
              <p class="process-desc">{{ step.desc }}</p>
              <p class="process-time">⏱ {{ step.time }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- What's included -->
    <section class="section">
      <div class="container">
        <h2 class="section-title">What's Included in Your Franchise Package</h2>
        <div class="included-grid">
          @for (item of included; track item.title) {
            <div class="included-item">
              <span class="included-icon">{{ item.icon }}</span>
              <div>
                <p class="included-title">{{ item.title }}</p>
                <p class="included-desc">{{ item.desc }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2 class="cta-heading">Start Your Franchise Journey Today</h2>
          <p class="cta-sub">Fill out a simple form and our franchise team will contact you within 24 hours.</p>
        </div>
        <a routerLink="/become-a-partner" class="btn-cta">Apply Now — It's Free →</a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .section { padding: 72px 0; }
    .section-alt { background: #f8fafc; }
    .eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 8px; }
    .eyebrow-dark { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px; }
    .page-hero { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 72px 0; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-text { display: flex; flex-direction: column; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(99,102,241,.3)); }
    .hero-stats { display: flex; gap: 24px; margin-top: 20px; }
    .hstat { display: flex; flex-direction: column; gap: 2px; }
    .hstat-num { font-size: 24px; font-weight: 900; color: #fff; }
    .hstat-label { font-size: 10px; color: #a5b4fc; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
    .page-title { font-size: clamp(26px, 4vw, 44px); font-weight: 900; color: #fff; margin-bottom: 14px; }
    .page-sub { font-size: 16px; color: #c7d2fe; max-width: 560px; margin: 0 auto; line-height: 1.75; }
    .section-header { margin-bottom: 40px; }
    .section-header.center { text-align: center; }
    .section-title { font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: #111827; margin-bottom: 16px; }
    .tiers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .tier-card { background: #fff; border: 2px solid #e5e7eb; border-radius: 16px; padding: 32px; position: relative; display: flex; flex-direction: column; gap: 12px; }
    .tier-featured { border-color: #6366f1; box-shadow: 0 8px 32px rgba(99,102,241,.15); }
    .tier-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #6366f1; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px; white-space: nowrap; }
    .tier-name { font-size: 20px; font-weight: 800; color: #111827; }
    .tier-investment { font-size: 32px; font-weight: 900; color: #6366f1; }
    .tier-investment-label { font-size: 12px; color: #6b7280; margin-top: -8px; }
    .tier-features { list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #374151; flex: 1; }
    .tier-revenue { font-size: 13px; color: #6b7280; background: #f8fafc; padding: 10px 12px; border-radius: 8px; }
    .tier-btn { display: inline-flex; justify-content: center; padding: 11px 20px; background: #f3f4f6; color: #374151; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; transition: all .15s; }
    .tier-btn:hover { background: #e5e7eb; }
    .tier-btn-featured { background: #6366f1; color: #fff; }
    .tier-btn-featured:hover { background: #4f46e5; }
    .process-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
    .process-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; text-align: center; }
    .process-num { width: 44px; height: 44px; border-radius: 50%; background: #eef2ff; color: #6366f1; font-size: 18px; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
    .process-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 8px; }
    .process-desc { font-size: 13px; color: #6b7280; line-height: 1.6; margin-bottom: 8px; }
    .process-time { font-size: 12px; color: #6366f1; font-weight: 600; }
    .included-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .included-item { display: flex; gap: 14px; align-items: flex-start; background: #f8fafc; border-radius: 10px; padding: 16px; }
    .included-icon { font-size: 24px; flex-shrink: 0; }
    .included-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .included-desc { font-size: 13px; color: #6b7280; }
    .cta-band { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 64px 0; }
    .cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .cta-heading { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 6px; }
    .cta-sub { font-size: 14px; color: #c7d2fe; }
    .btn-cta { display: inline-flex; padding: 14px 32px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; white-space: nowrap; border: 2px solid rgba(255,255,255,.3); transition: all .15s; }
    .btn-cta:hover { background: #4f46e5; }
    @media (max-width: 768px) { .tiers-grid { grid-template-columns: 1fr; } .cta-inner { flex-direction: column; } .hero-inner { grid-template-columns: 1fr; } .hero-visual { display: none; } }
  `],
})
export class WebFranchiseModelComponent {
  readonly tiers = [
    {
      name: 'Starter', investment: '₹5–8 Lakhs', featured: false, revenue: '₹80K–1.2L/mo',
      features: ['Up to 3 courses', 'LMS access (50 students)', 'Basic admin panel', 'Placement network access', 'Trainer training (1 batch)', 'Marketing starter kit'],
    },
    {
      name: 'Growth', investment: '₹10–15 Lakhs', featured: true, revenue: '₹1.5L–2.5L/mo',
      features: ['Unlimited courses', 'LMS access (200 students)', 'Full admin platform', 'Priority placement support', 'Trainer training (3 batches)', 'Digital marketing support', 'Dedicated franchise manager'],
    },
    {
      name: 'Premium', investment: '₹20–30 Lakhs', featured: false, revenue: '₹3L–5L/mo',
      features: ['Multi-centre operations', 'Unlimited LMS students', 'White-label branding option', 'Exclusive territory rights', 'Corporate training rights', 'Full marketing campaign', 'Revenue sharing model'],
    },
  ];
  readonly steps = [
    { num: '01', title: 'Submit Application',   desc: 'Fill out the partner enquiry form online.',                    time: 'Day 1' },
    { num: '02', title: 'Initial Discussion',   desc: 'Our franchise team calls you within 24 hours.',               time: 'Day 2–3' },
    { num: '03', title: 'Site Visit & Approval', desc: 'We evaluate your location and approve the franchise.',        time: 'Day 7–14' },
    { num: '04', title: 'Agreement & Payment',  desc: 'Sign the franchise agreement and complete investment.',        time: 'Day 15–20' },
    { num: '05', title: 'Setup & Training',     desc: 'Centre setup, platform access, and trainer training.',         time: 'Day 21–45' },
    { num: '06', title: 'Launch!',              desc: 'Grand opening with marketing support from SNT HO.',            time: 'Day 60' },
  ];
  readonly included = [
    { icon: '🖥️', title: 'Full SaaS Platform Access',    desc: 'Admin panel, LMS, student management, fee collection, reports.' },
    { icon: '📚', title: 'Complete Curriculum',           desc: 'All course materials, projects, and assessments.' },
    { icon: '👨🏫', title: 'Trainer Training Program',     desc: '2-week intensive trainer certification program.' },
    { icon: '📣', title: 'Marketing Kit',                 desc: 'Banners, brochures, social media templates, and digital ads.' },
    { icon: '🤝', title: 'Placement Network Access',      desc: 'Immediate access to 50+ hiring partner companies.' },
    { icon: '📊', title: 'Business Analytics Dashboard',  desc: 'Real-time insights on revenue, students, and performance.' },
    { icon: '🎖️', title: 'Certificate Issuance Rights',   desc: 'Issue SNT-branded certificates to your students.' },
    { icon: '📞', title: 'Dedicated Support Manager',     desc: 'Your personal franchise manager for ongoing guidance.' },
  ];
}
