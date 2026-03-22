import {
  Component, inject, signal, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { WebsitePublicService, PublicPlacementStats } from '../website-public.service';

@Component({
  selector: 'snt-web-placements',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container hero-inner">
        <!-- Text LEFT -->
        <div class="hero-text">
          <p class="eyebrow">Placement Record</p>
          <h1 class="page-title">95% Placement Rate.<br/>Real Companies. Real Careers.</h1>
          <p class="page-sub">Our dedicated placement cell has placed 10,000+ students in top IT companies across India.</p>
          <div class="hero-stats">
            <div class="hstat"><span class="hstat-num">10K+</span><span class="hstat-label">Placed</span></div>
            <div class="hstat"><span class="hstat-num">50+</span><span class="hstat-label">Companies</span></div>
            <div class="hstat"><span class="hstat-num">95%</span><span class="hstat-label">Rate</span></div>
          </div>
        </div>
        <!-- Image RIGHT -->
        <div class="hero-visual">
          <svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <!-- offer letter -->
            <rect x="100" y="60" width="220" height="160" rx="10" fill="#1e293b" stroke="#059669" stroke-width="2"/>
            <rect x="116" y="76" width="188" height="12" rx="3" fill="#059669" opacity=".8"/>
            <rect x="116" y="96" width="140" height="8" rx="2" fill="#334155"/>
            <rect x="116" y="110" width="160" height="8" rx="2" fill="#334155" opacity=".7"/>
            <rect x="116" y="124" width="120" height="8" rx="2" fill="#334155" opacity=".5"/>
            <rect x="116" y="144" width="80" height="8" rx="2" fill="#334155" opacity=".6"/>
            <rect x="116" y="158" width="100" height="8" rx="2" fill="#334155" opacity=".4"/>
            <!-- salary highlight -->
            <rect x="116" y="178" width="188" height="28" rx="6" fill="rgba(5,150,105,.2)" stroke="rgba(5,150,105,.5)" stroke-width="1"/>
            <text x="210" y="197" text-anchor="middle" font-size="12" fill="#6ee7b7" font-family="system-ui" font-weight="800">CTC: 6.5 LPA ✨</text>
            <!-- company logos as chips -->
            <rect x="60" y="250" width="80" height="30" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <text x="100" y="270" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="system-ui" font-weight="600">Infosys</text>
            <rect x="150" y="250" width="60" height="30" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <text x="180" y="270" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="system-ui" font-weight="600">TCS</text>
            <rect x="220" y="250" width="70" height="30" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <text x="255" y="270" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="system-ui" font-weight="600">Wipro</text>
            <rect x="300" y="250" width="70" height="30" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <text x="335" y="270" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="system-ui" font-weight="600">HCL</text>
            <!-- success badge -->
            <rect x="290" y="50" width="110" height="52" rx="10" fill="rgba(5,150,105,.15)" stroke="rgba(5,150,105,.4)" stroke-width="1.5"/>
            <text x="345" y="72" text-anchor="middle" font-size="20" font-family="system-ui">🏆</text>
            <text x="345" y="88" text-anchor="middle" font-size="10" fill="#6ee7b7" font-family="system-ui" font-weight="700">Offer Received!</text>
            <!-- person icon -->
            <circle cx="60" cy="150" r="30" fill="#1e293b" stroke="#059669" stroke-width="2"/>
            <text x="60" y="158" text-anchor="middle" font-size="22" font-family="system-ui">👨💼</text>
          </svg>
        </div>
      </div>
    </section>

    @if (stats(); as s) {
      <section class="stats-section">
        <div class="container stats-grid">
          <div class="stat-card"><p class="stat-num">{{ s.totalPlaced | number }}+</p><p class="stat-label">Students Placed</p></div>
          <div class="stat-card"><p class="stat-num">{{ s.companiesHired }}+</p><p class="stat-label">Hiring Partners</p></div>
          <div class="stat-card"><p class="stat-num">{{ s.avgSalaryLpa | number:'1.1-1' }} LPA</p><p class="stat-label">Average Package</p></div>
          <div class="stat-card"><p class="stat-num">{{ s.placementRate }}%</p><p class="stat-label">Placement Rate</p></div>
        </div>
      </section>
    }

    <section class="section">
      <div class="container">
        <h2 class="section-title center-text">Our Hiring Partners</h2>
        <div class="companies-grid">
          @for (c of companies; track c) {
            <div class="company-chip">{{ c }}</div>
          }
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <h2 class="section-title">How Our Placement Process Works</h2>
        <div class="process-steps">
          @for (step of process; track step.num) {
            <div class="process-step">
              <div class="step-num">{{ step.num }}</div>
              <div><h3 class="step-title">{{ step.title }}</h3><p class="step-desc">{{ step.desc }}</p></div>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <h2 class="cta-heading">Start Your Placement Journey Today</h2>
        <a routerLink="/courses" class="btn-cta">Explore Courses →</a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .section { padding: 72px 0; }
    .section-alt { background: #f8fafc; }
    .eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 8px; }
    .page-hero { background: linear-gradient(135deg, #064e3b, #065f46); padding: 72px 0; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-text { display: flex; flex-direction: column; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(5,150,105,.3)); }
    .page-title { font-size: clamp(26px, 4vw, 44px); font-weight: 900; color: #fff; margin-bottom: 14px; }
    .page-sub { font-size: 16px; color: #a7f3d0; max-width: 480px; line-height: 1.75; margin-bottom: 24px; }
    .hero-stats { display: flex; gap: 28px; }
    .hstat { display: flex; flex-direction: column; gap: 2px; }
    .hstat-num { font-size: 26px; font-weight: 900; color: #fff; }
    .hstat-label { font-size: 11px; color: #6ee7b7; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
    .stats-section { background: #059669; padding: 40px 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .stat-card { text-align: center; }
    .stat-num { font-size: 32px; font-weight: 900; color: #fff; }
    .stat-label { font-size: 13px; color: rgba(255,255,255,.75); margin-top: 4px; }
    .section-title { font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: #111827; margin-bottom: 32px; }
    .center-text { text-align: center; }
    .companies-grid { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
    .company-chip { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; color: #374151; }
    .process-steps { display: flex; flex-direction: column; gap: 24px; max-width: 700px; }
    .process-step { display: flex; gap: 20px; align-items: flex-start; }
    .step-num { width: 40px; height: 40px; border-radius: 50%; background: #6366f1; color: #fff; font-size: 16px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .step-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .step-desc { font-size: 14px; color: #6b7280; line-height: 1.65; }
    .cta-band { background: #059669; padding: 56px 0; }
    .cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .cta-heading { font-size: 24px; font-weight: 800; color: #fff; }
    .btn-cta { display: inline-flex; padding: 13px 28px; background: #fff; color: #059669; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; transition: all .15s; }
    .btn-cta:hover { background: #f0fdf4; }
    @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .cta-inner { flex-direction: column; } .hero-inner { grid-template-columns: 1fr; } .hero-visual { display: none; } }
  `],
})
export class WebPlacementsComponent implements OnInit {
  private readonly svc        = inject(WebsitePublicService);
  private readonly destroyRef = inject(DestroyRef);
  readonly stats = signal<PublicPlacementStats | null>(null);

  readonly companies = ['Infosys', 'TCS', 'Wipro', 'HCL', 'Tech Mahindra', 'Cognizant', 'Capgemini', 'Accenture', 'IBM', 'Oracle', 'Amazon', 'Flipkart', 'Persistent', 'Mphasis', 'L&T Infotech'];
  readonly process = [
    { num: '01', title: 'Profile Building',      desc: 'Resume preparation, LinkedIn optimization, and portfolio development.' },
    { num: '02', title: 'Mock Interviews',        desc: 'Technical and HR mock interviews with industry professionals.' },
    { num: '03', title: 'Company Drives',         desc: 'Regular placement drives with 50+ hiring partner companies.' },
    { num: '04', title: 'Offer & Onboarding',     desc: 'Salary negotiation support and joining assistance.' },
  ];

  ngOnInit(): void {
    this.svc.getPlacementStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.stats.set(s), error: () => {} });
  }
}
