import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WebsiteCmsService } from '../../website-cms/website-cms.service';

@Component({
  selector: 'snt-web-about',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Page Hero -->
    @if (cms().hero.visible) {
      <section class="page-hero">
        <div class="container hero-inner">
          <div class="hero-text">
            <p class="eyebrow">About SNT Education</p>
            <h1 class="page-title">{{ cms().hero.title }}</h1>
            <p class="page-sub">{{ cms().hero.subtitle }}</p>
            @if (cms().hero.stats.length) {
              <div class="hero-stats">
                @for (s of cms().hero.stats; track s.label) {
                  <div class="hstat">
                    <span class="hstat-num">{{ s.value }}</span>
                    <span class="hstat-label">{{ s.label }}</span>
                  </div>
                }
              </div>
            }
          </div>
          <div class="hero-visual">
            <svg viewBox="0 0 420 340" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
              <circle cx="210" cy="170" r="150" fill="rgba(99,102,241,.08)" stroke="rgba(99,102,241,.2)" stroke-width="1"/>
              <circle cx="210" cy="90" r="44" fill="#1e293b" stroke="#6366f1" stroke-width="2"/>
              <text x="210" y="97" text-anchor="middle" font-size="28" font-family="system-ui">👨‍💼</text>
              <text x="210" y="112" text-anchor="middle" font-size="9" fill="#a5b4fc" font-family="system-ui" font-weight="700">CEO &amp; Founder</text>
              <circle cx="100" cy="200" r="36" fill="#1e293b" stroke="#8b5cf6" stroke-width="2"/>
              <text x="100" y="206" text-anchor="middle" font-size="22" font-family="system-ui">👩‍🏫</text>
              <text x="100" y="220" text-anchor="middle" font-size="9" fill="#c4b5fd" font-family="system-ui" font-weight="700">Academics</text>
              <circle cx="320" cy="200" r="36" fill="#1e293b" stroke="#06b6d4" stroke-width="2"/>
              <text x="320" y="206" text-anchor="middle" font-size="22" font-family="system-ui">👨‍💻</text>
              <text x="320" y="220" text-anchor="middle" font-size="9" fill="#67e8f9" font-family="system-ui" font-weight="700">Placements</text>
              <circle cx="210" cy="280" r="36" fill="#1e293b" stroke="#059669" stroke-width="2"/>
              <text x="210" y="286" text-anchor="middle" font-size="22" font-family="system-ui">👩‍💼</text>
              <text x="210" y="300" text-anchor="middle" font-size="9" fill="#6ee7b7" font-family="system-ui" font-weight="700">Franchise Ops</text>
              <line x1="210" y1="134" x2="130" y2="168" stroke="rgba(99,102,241,.4)" stroke-width="1.5" stroke-dasharray="4 3"/>
              <line x1="210" y1="134" x2="290" y2="168" stroke="rgba(99,102,241,.4)" stroke-width="1.5" stroke-dasharray="4 3"/>
              <line x1="130" y1="232" x2="180" y2="248" stroke="rgba(99,102,241,.3)" stroke-width="1.5" stroke-dasharray="4 3"/>
              <line x1="290" y1="232" x2="240" y2="248" stroke="rgba(99,102,241,.3)" stroke-width="1.5" stroke-dasharray="4 3"/>
              <rect x="310" y="60" width="90" height="44" rx="8" fill="rgba(99,102,241,.2)" stroke="rgba(99,102,241,.5)" stroke-width="1.5"/>
              <text x="355" y="79" text-anchor="middle" font-size="11" fill="#a5b4fc" font-family="system-ui" font-weight="700">Est. 2010</text>
              <text x="355" y="95" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">14 Years Strong</text>
            </svg>
          </div>
        </div>
      </section>
    }

    <!-- Mission / Vision / Values -->
    @if (cms().missionVision.visible) {
      <section class="section">
        <div class="container mv-grid">
          <div class="mv-card mv-mission">
            <div class="mv-icon">{{ cms().missionVision.mission.icon }}</div>
            <h2 class="mv-title">{{ cms().missionVision.mission.title }}</h2>
            <p class="mv-text">{{ cms().missionVision.mission.text }}</p>
          </div>
          <div class="mv-card mv-vision">
            <div class="mv-icon">{{ cms().missionVision.vision.icon }}</div>
            <h2 class="mv-title">{{ cms().missionVision.vision.title }}</h2>
            <p class="mv-text">{{ cms().missionVision.vision.text }}</p>
          </div>
          <div class="mv-card mv-values">
            <div class="mv-icon">{{ cms().missionVision.values.icon }}</div>
            <h2 class="mv-title">{{ cms().missionVision.values.title }}</h2>
            <p class="mv-text">{{ cms().missionVision.values.text }}</p>
          </div>
        </div>
      </section>
    }

    <!-- Story -->
    @if (cms().story.visible) {
      <section class="section section-alt">
        <div class="container story-grid">
          <div class="story-content">
            <p class="eyebrow">{{ cms().story.eyebrow }}</p>
            <h2 class="section-title">{{ cms().story.title }}</h2>
            @for (p of cms().story.paragraphs; track $index) {
              <p class="story-text">{{ p }}</p>
            }
            @if (cms().story.ctaLabel) {
              <a [routerLink]="cms().story.ctaLink" class="btn-primary">{{ cms().story.ctaLabel }}</a>
            }
          </div>
          <div class="story-milestones">
            @for (m of cms().story.milestones; track m.year) {
              <div class="milestone">
                <div class="milestone-year">{{ m.year }}</div>
                <div class="milestone-content">
                  <p class="milestone-title">{{ m.title }}</p>
                  <p class="milestone-desc">{{ m.desc }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    }

    <!-- Team -->
    @if (cms().team.visible) {
      <section class="section">
        <div class="container">
          <div class="section-header center">
            <p class="eyebrow">{{ cms().team.eyebrow }}</p>
            <h2 class="section-title">{{ cms().team.title }}</h2>
          </div>
          <div class="team-grid">
            @for (t of cms().team.members; track t.name) {
              <div class="team-card">
                <div class="team-avatar">{{ t.name[0] }}</div>
                <h3 class="team-name">{{ t.name }}</h3>
                <p class="team-role">{{ t.role }}</p>
                <p class="team-bio">{{ t.bio }}</p>
              </div>
            }
          </div>
        </div>
      </section>
    }

    <!-- CTA -->
    @if (cms().cta.visible) {
      <section class="cta-band">
        <div class="container cta-band-inner">
          <h2 class="cta-heading">{{ cms().cta.title }}</h2>
          <div class="cta-actions">
            @if (cms().cta.cta1.label) {
              <a [routerLink]="cms().cta.cta1.link" class="btn-primary">{{ cms().cta.cta1.label }}</a>
            }
            @if (cms().cta.cta2.label) {
              <a [routerLink]="cms().cta.cta2.link" class="btn-outline">{{ cms().cta.cta2.label }}</a>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .section { padding: 80px 0; }
    .section-alt { background: #f8fafc; }
    .eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px; }
    .section-title { font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #111827; }
    .section-header { margin-bottom: 40px; }
    .section-header.center { text-align: center; }

    .page-hero { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 72px 0; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-text { display: flex; flex-direction: column; gap: 0; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(99,102,241,.25)); }
    .page-title { font-size: clamp(28px, 4vw, 48px); font-weight: 900; color: #fff; margin-bottom: 16px; }
    .page-sub { font-size: 17px; color: #c7d2fe; max-width: 600px; line-height: 1.75; margin-bottom: 28px; }
    .hero-stats { display: flex; gap: 28px; }
    .hstat { display: flex; flex-direction: column; gap: 2px; }
    .hstat-num { font-size: 26px; font-weight: 900; color: #fff; }
    .hstat-label { font-size: 11px; color: #a5b4fc; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }

    .mv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .mv-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 32px; }
    .mv-mission { border-top: 4px solid #6366f1; }
    .mv-vision  { border-top: 4px solid #8b5cf6; }
    .mv-values  { border-top: 4px solid #06b6d4; }
    .mv-icon { font-size: 32px; margin-bottom: 14px; }
    .mv-title { font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 10px; }
    .mv-text { font-size: 14px; color: #6b7280; line-height: 1.75; }

    .story-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start; }
    .story-text { font-size: 15px; color: #374151; line-height: 1.8; margin-bottom: 16px; }
    .btn-primary { display: inline-flex; padding: 11px 24px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; transition: background .15s; margin-top: 8px; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-outline { display: inline-flex; padding: 10px 22px; background: transparent; color: #6366f1; border: 2px solid #6366f1; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; transition: all .15s; }
    .btn-outline:hover { background: #eef2ff; }

    .story-milestones { display: flex; flex-direction: column; gap: 0; }
    .milestone { display: flex; gap: 20px; padding: 20px 0; border-left: 2px solid #e5e7eb; padding-left: 24px; position: relative; }
    .milestone::before { content: ''; position: absolute; left: -6px; top: 24px; width: 10px; height: 10px; border-radius: 50%; background: #6366f1; }
    .milestone-year { font-size: 13px; font-weight: 800; color: #6366f1; white-space: nowrap; min-width: 40px; }
    .milestone-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .milestone-desc { font-size: 13px; color: #6b7280; }

    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
    .team-card { text-align: center; padding: 28px 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
    .team-avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 24px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
    .team-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .team-role { font-size: 12px; color: #6366f1; font-weight: 600; margin-bottom: 10px; }
    .team-bio { font-size: 13px; color: #6b7280; line-height: 1.6; }

    .cta-band { background: #6366f1; padding: 56px 0; }
    .cta-band-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .cta-heading { font-size: clamp(20px, 3vw, 28px); font-weight: 800; color: #fff; }
    .cta-actions { display: flex; gap: 12px; }
    .cta-actions .btn-primary { background: #fff; color: #6366f1; }
    .cta-actions .btn-primary:hover { background: #f0f0ff; }
    .cta-actions .btn-outline { border-color: rgba(255,255,255,.6); color: #fff; }
    .cta-actions .btn-outline:hover { background: rgba(255,255,255,.1); }

    @media (max-width: 768px) {
      .hero-inner { grid-template-columns: 1fr; }
      .hero-visual { display: none; }
      .mv-grid { grid-template-columns: 1fr; }
      .story-grid { grid-template-columns: 1fr; }
      .cta-band-inner { flex-direction: column; text-align: center; }
    }
  `],
})
export class WebAboutComponent {
  private readonly cmsService = inject(WebsiteCmsService);
  readonly cms = this.cmsService.about;
}
