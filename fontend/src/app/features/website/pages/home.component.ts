import {
  Component, inject, signal, computed, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { WebsitePublicService, PublicPlacementStats } from '../website-public.service';
import { Course } from '../../courses/course.models';
import { WebsiteCmsService } from '../../website-cms/website-cms.service';
import { DisplayControlData, DC_DEFAULTS } from '../../website-display-control/display-control.models';

@Component({
  selector: 'snt-web-home',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ── Hero ─────────────────────────────────────────────────────────── -->
    @if (hero().visible) {
      <section class="hero" [style.background-image]="hero().bgImage.fileUrl ? 'url(' + hero().bgImage.fileUrl + ')' : null" [class.hero-has-bg]="!!hero().bgImage.fileUrl">
        <div class="hero-bg"></div>
        <div class="container hero-inner">
          <div class="hero-visual">
            <div class="hero-img-wrap">
              @if (hero().heroImage.fileUrl) {
                <img [src]="hero().heroImage.fileUrl" [alt]="hero().title" class="hero-photo" />
              } @else {
                <svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
                  <rect x="60" y="240" width="360" height="16" rx="4" fill="#334155"/>
                  <rect x="200" y="256" width="80" height="60" rx="2" fill="#1e293b"/>
                  <rect x="100" y="100" width="280" height="170" rx="10" fill="#1e293b" stroke="#6366f1" stroke-width="3"/>
                  <rect x="112" y="112" width="256" height="146" rx="6" fill="#0f172a"/>
                  <rect x="128" y="128" width="80" height="8" rx="3" fill="#6366f1" opacity=".9"/>
                  <rect x="128" y="144" width="120" height="8" rx="3" fill="#8b5cf6" opacity=".7"/>
                  <rect x="128" y="160" width="60" height="8" rx="3" fill="#06b6d4" opacity=".8"/>
                  <rect x="128" y="176" width="100" height="8" rx="3" fill="#6366f1" opacity=".6"/>
                  <rect x="128" y="192" width="140" height="8" rx="3" fill="#8b5cf6" opacity=".5"/>
                  <rect x="128" y="208" width="90" height="8" rx="3" fill="#06b6d4" opacity=".7"/>
                  <rect x="128" y="224" width="110" height="8" rx="3" fill="#6366f1" opacity=".4"/>
                  <rect x="232" y="224" width="3" height="10" rx="1" fill="#fff" opacity=".9"/>
                  <rect x="320" y="80" width="130" height="52" rx="10" fill="rgba(99,102,241,.15)" stroke="rgba(99,102,241,.4)" stroke-width="1.5"/>
                  <text x="336" y="101" font-size="11" fill="#a5b4fc" font-family="system-ui" font-weight="700">🎓 10,000+</text>
                  <text x="336" y="118" font-size="10" fill="#94a3b8" font-family="system-ui">Students Trained</text>
                  <rect x="30" y="140" width="120" height="52" rx="10" fill="rgba(5,150,105,.15)" stroke="rgba(5,150,105,.4)" stroke-width="1.5"/>
                  <text x="46" y="161" font-size="11" fill="#6ee7b7" font-family="system-ui" font-weight="700">✅ 95%</text>
                  <text x="46" y="178" font-size="10" fill="#94a3b8" font-family="system-ui">Placement Rate</text>
                  <rect x="320" y="270" width="120" height="52" rx="10" fill="rgba(139,92,246,.15)" stroke="rgba(139,92,246,.4)" stroke-width="1.5"/>
                  <text x="336" y="291" font-size="11" fill="#c4b5fd" font-family="system-ui" font-weight="700">🏢 30+</text>
                  <text x="336" y="308" font-size="10" fill="#94a3b8" font-family="system-ui">Active Branches</text>
                </svg>
              }
            </div>
          </div>
          <div class="hero-content">
            @if (hero().badgeText) {
              <div class="hero-badge">{{ hero().badgeText }}</div>
            }
            <h1 class="hero-heading">{{ hero().title }}</h1>
            <p class="hero-sub">{{ hero().subtitle }}</p>
            <div class="hero-actions">
              @if (hero().cta1Label) {
                <a [routerLink]="hero().cta1Link" class="btn-primary-lg">{{ hero().cta1Label }}</a>
              }
              @if (hero().cta2Label) {
                <a [routerLink]="hero().cta2Link" class="btn-outline-lg">{{ hero().cta2Label }}</a>
              }
            </div>
            @if (cms().hero.trustPoints.length) {
              <div class="hero-trust">
                @for (tp of cms().hero.trustPoints; track tp) {
                  <span>{{ tp }}</span>
                }
              </div>
            }
          </div>
        </div>
      </section>
    }

    <!-- ── Stats Bar ──────────────────────────────────────────────────── -->
    @if (dcStats().visible) {
      <section class="stats-bar">
        <div class="container stats-grid">
          @if (stats(); as s) {
            <div class="stat-item"><p class="stat-num">{{ s.totalPlaced | number }}+</p><p class="stat-label">Students Placed</p></div>
            <div class="stat-item"><p class="stat-num">{{ s.companiesHired }}+</p><p class="stat-label">Hiring Companies</p></div>
            <div class="stat-item"><p class="stat-num">{{ s.avgSalaryLpa | number:'1.1-1' }} LPA</p><p class="stat-label">Average Package</p></div>
            <div class="stat-item"><p class="stat-num">{{ s.placementRate }}%</p><p class="stat-label">Placement Rate</p></div>
          }
          @if (!stats()) {
            @for (item of dcStats().items; track item.label) {
              <div class="stat-item"><p class="stat-num">{{ item.value }}</p><p class="stat-label">{{ item.label }}</p></div>
            }
          }
        </div>
      </section>
    }

    <!-- ── Courses Preview ────────────────────────────────────────────── -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <p class="section-eyebrow">What We Teach</p>
            <h2 class="section-title">Job-Ready IT Courses</h2>
          </div>
          <a routerLink="/courses" class="link-more">View All Courses →</a>
        </div>
        <div class="courses-grid">
          @for (course of courses().slice(0, 6); track course.id) {
            <div class="course-card">
              <div class="course-icon">💻</div>
              <h3 class="course-name">{{ course.name }}</h3>
              <p class="course-duration">{{ course.durationMonths }} months</p>
              @if (course.description) { <p class="course-desc">{{ course.description }}</p> }
              <a routerLink="/courses" class="course-link">Learn More →</a>
            </div>
          }
          @if (!courses().length) {
            @for (c of placeholderCourses; track c) {
              <div class="course-card">
                <div class="course-icon">💻</div>
                <h3 class="course-name">{{ c.name }}</h3>
                <p class="course-duration">{{ c.duration }}</p>
                <p class="course-desc">{{ c.desc }}</p>
                <a routerLink="/courses" class="course-link">Learn More →</a>
              </div>
            }
          }
        </div>
      </div>
    </section>

    <!-- ── Features ───────────────────────────────────────────────────── -->
    @if (cms().featuresSection.visible) {
      <section class="section section-alt">
        <div class="container">
          <div class="section-header center">
            <div>
              <p class="section-eyebrow">{{ cms().featuresSection.eyebrow }}</p>
              <h2 class="section-title">{{ cms().featuresSection.title }}</h2>
            </div>
          </div>
          <div class="features-grid">
            @for (f of cms().featuresSection.items; track f.title) {
              <div class="feature-card">
                <div class="feature-icon">{{ f.icon }}</div>
                <h3 class="feature-title">{{ f.title }}</h3>
                <p class="feature-desc">{{ f.desc }}</p>
              </div>
            }
          </div>
        </div>
      </section>
    }

    <!-- ── Franchise CTA ──────────────────────────────────────────────── -->
    @if (cms().franchiseCta.visible) {
      <section class="franchise-cta">
        <div class="container franchise-cta-inner">
          <div class="franchise-cta-content">
            <p class="franchise-eyebrow">{{ cms().franchiseCta.eyebrow }}</p>
            <h2 class="franchise-heading">{{ cms().franchiseCta.title }}</h2>
            <p class="franchise-sub">{{ cms().franchiseCta.subtitle }}</p>
            <ul class="franchise-points">
              @for (pt of cms().franchiseCta.points; track pt) { <li>{{ pt }}</li> }
            </ul>
            <div class="franchise-actions">
              @if (cms().franchiseCta.cta1.label) {
                <a [routerLink]="cms().franchiseCta.cta1.link" class="btn-primary-lg">{{ cms().franchiseCta.cta1.label }}</a>
              }
              @if (cms().franchiseCta.cta2.label) {
                <a [routerLink]="cms().franchiseCta.cta2.link" class="btn-outline-lg btn-outline-white">{{ cms().franchiseCta.cta2.label }}</a>
              }
            </div>
          </div>
          <div class="franchise-cta-stats">
            @for (s of cms().franchiseCta.stats; track s.label) {
              <div class="fstat"><p class="fstat-num">{{ s.value }}</p><p class="fstat-label">{{ s.label }}</p></div>
            }
          </div>
        </div>
      </section>
    }

    <!-- ── Testimonials ───────────────────────────────────────────────── -->
    @if (cms().testimonials.visible) {
      <section class="section">
        <div class="container">
          <div class="section-header center">
            <div>
              <p class="section-eyebrow">{{ cms().testimonials.eyebrow }}</p>
              <h2 class="section-title">{{ cms().testimonials.title }}</h2>
            </div>
          </div>
          <div class="testimonials-grid">
            @for (t of cms().testimonials.items; track t.name) {
              <div class="testimonial-card">
                <div class="testimonial-quote">"</div>
                <p class="testimonial-text">{{ t.text }}</p>
                <div class="testimonial-author">
                  <div class="testimonial-avatar">{{ t.name[0] }}</div>
                  <div>
                    <p class="testimonial-name">{{ t.name }}</p>
                    <p class="testimonial-role">{{ t.role }} · {{ t.company }}</p>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    }

    <!-- ── Final CTA ──────────────────────────────────────────────────── -->
    @if (cms().finalCta.visible) {
      <section class="final-cta">
        <div class="container final-cta-inner">
          <h2 class="final-cta-heading">{{ cms().finalCta.title }}</h2>
          <p class="final-cta-sub">{{ cms().finalCta.subtitle }}</p>
          <div class="final-cta-actions">
            @if (cms().finalCta.cta1.label) {
              <a [routerLink]="cms().finalCta.cta1.link" class="btn-primary-lg">{{ cms().finalCta.cta1.label }}</a>
            }
            @if (cms().finalCta.cta2.label) {
              <a [routerLink]="cms().finalCta.cta2.link" class="btn-outline-lg btn-outline-white">{{ cms().finalCta.cta2.label }}</a>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .hero { position: relative; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); min-height: 600px; display: flex; align-items: center; overflow: hidden; padding: 80px 0; background-size: cover; background-position: center; }
    .hero-has-bg { background-blend-mode: overlay; }
    .hero-photo { width: 100%; max-width: 460px; border-radius: 16px; object-fit: cover; max-height: 380px; filter: drop-shadow(0 20px 40px rgba(99,102,241,.3)); }
    .hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at 70% 50%, rgba(99,102,241,.25) 0%, transparent 60%); pointer-events: none; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; position: relative; z-index: 1; }
    .hero-img-wrap { width: 100%; max-width: 460px; }
    .hero-svg { width: 100%; height: auto; filter: drop-shadow(0 20px 40px rgba(99,102,241,.3)); }
    .hero-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.4); color: #a5b4fc; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    .hero-heading { font-size: clamp(32px, 4vw, 52px); font-weight: 900; color: #fff; line-height: 1.15; margin-bottom: 20px; }
    .hero-sub { font-size: 17px; color: #cbd5e1; line-height: 1.75; margin-bottom: 32px; max-width: 520px; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
    .hero-trust { display: flex; gap: 20px; flex-wrap: wrap; }
    .hero-trust span { font-size: 13px; color: #94a3b8; font-weight: 500; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .btn-primary-lg { display: inline-flex; align-items: center; padding: 13px 28px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; transition: background .15s; }
    .btn-primary-lg:hover { background: #4f46e5; }
    .btn-outline-lg { display: inline-flex; align-items: center; padding: 12px 26px; background: transparent; color: #6366f1; border: 2px solid #6366f1; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; transition: all .15s; }
    .btn-outline-lg:hover { background: #eef2ff; }
    .btn-outline-white { color: #fff; border-color: rgba(255,255,255,.5); }
    .btn-outline-white:hover { background: rgba(255,255,255,.1); }
    .stats-bar { background: #6366f1; padding: 32px 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .stat-item { text-align: center; }
    .stat-num { font-size: 28px; font-weight: 900; color: #fff; }
    .stat-label { font-size: 13px; color: rgba(255,255,255,.75); margin-top: 4px; font-weight: 500; }
    .section { padding: 80px 0; }
    .section-alt { background: #f8fafc; }
    .section-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 40px; }
    .section-header.center { justify-content: center; text-align: center; }
    .section-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 6px; }
    .section-title { font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #111827; }
    .link-more { font-size: 14px; font-weight: 700; color: #6366f1; text-decoration: none; white-space: nowrap; }
    .link-more:hover { text-decoration: underline; }
    .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .course-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; transition: all .2s; }
    .course-card:hover { border-color: #6366f1; box-shadow: 0 4px 20px rgba(99,102,241,.12); transform: translateY(-2px); }
    .course-icon { font-size: 28px; margin-bottom: 12px; }
    .course-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .course-duration { font-size: 12px; color: #6366f1; font-weight: 600; margin-bottom: 8px; }
    .course-desc { font-size: 13px; color: #6b7280; line-height: 1.6; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .course-link { font-size: 13px; font-weight: 700; color: #6366f1; text-decoration: none; }
    .course-link:hover { text-decoration: underline; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; }
    .feature-card { background: #fff; border-radius: 12px; padding: 28px 24px; text-align: center; border: 1px solid #e5e7eb; }
    .feature-icon { font-size: 36px; margin-bottom: 14px; }
    .feature-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 8px; }
    .feature-desc { font-size: 13px; color: #6b7280; line-height: 1.65; }
    .franchise-cta { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 80px 0; }
    .franchise-cta-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .franchise-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 10px; }
    .franchise-heading { font-size: clamp(24px, 3vw, 38px); font-weight: 900; color: #fff; margin-bottom: 16px; line-height: 1.2; }
    .franchise-sub { font-size: 15px; color: #c7d2fe; line-height: 1.75; margin-bottom: 24px; }
    .franchise-points { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 32px; }
    .franchise-points li { font-size: 14px; color: #e0e7ff; font-weight: 500; }
    .franchise-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .franchise-cta-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .fstat { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 24px; text-align: center; }
    .fstat-num { font-size: 32px; font-weight: 900; color: #fff; }
    .fstat-label { font-size: 13px; color: #a5b4fc; margin-top: 4px; }
    .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .testimonial-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px; position: relative; }
    .testimonial-quote { font-size: 48px; color: #e0e7ff; font-family: Georgia, serif; line-height: 1; position: absolute; top: 16px; right: 20px; }
    .testimonial-text { font-size: 14px; color: #374151; line-height: 1.75; margin-bottom: 20px; }
    .testimonial-author { display: flex; align-items: center; gap: 12px; }
    .testimonial-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; }
    .testimonial-name { font-size: 14px; font-weight: 700; color: #111827; }
    .testimonial-role { font-size: 12px; color: #6b7280; }
    .final-cta { background: #6366f1; padding: 72px 0; text-align: center; }
    .final-cta-inner { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .final-cta-heading { font-size: clamp(24px, 3vw, 36px); font-weight: 900; color: #fff; }
    .final-cta-sub { font-size: 16px; color: rgba(255,255,255,.8); max-width: 480px; }
    .final-cta-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
    @media (max-width: 768px) {
      .hero-inner { grid-template-columns: 1fr; }
      .hero-visual { display: none; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .franchise-cta-inner { grid-template-columns: 1fr; }
      .franchise-cta-stats { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr 1fr; } }
  `],
})
export class WebHomeComponent implements OnInit {
  private readonly svc        = inject(WebsitePublicService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cmsService = inject(WebsiteCmsService);

  readonly stats   = signal<PublicPlacementStats | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly cms     = this.cmsService.home;

  private readonly dc = signal<DisplayControlData>(DC_DEFAULTS);
  readonly hero    = computed(() => this.dc().homeHero);
  readonly dcStats = computed(() => this.dc().homepageStats);

  readonly placeholderCourses = [
    { name: 'Full Stack Web Development', duration: '6 months', desc: 'HTML, CSS, JavaScript, React, Node.js, MongoDB' },
    { name: 'Python & Data Science',      duration: '4 months', desc: 'Python, Pandas, ML basics, Data Visualization' },
    { name: 'Java & Spring Boot',         duration: '5 months', desc: 'Core Java, OOP, Spring Boot, REST APIs' },
    { name: 'Digital Marketing',          duration: '3 months', desc: 'SEO, SEM, Social Media, Google Ads, Analytics' },
    { name: 'Cloud Computing (AWS)',       duration: '4 months', desc: 'AWS fundamentals, EC2, S3, Lambda, DevOps basics' },
    { name: 'Cybersecurity Essentials',   duration: '4 months', desc: 'Network security, ethical hacking, VAPT basics' },
  ];

  ngOnInit(): void {
    this.svc.getCourses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.courses.set(c), error: () => {} });
    this.svc.getPlacementStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.stats.set(s), error: () => {} });
    this.svc.getDisplayControl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (res) => this.dc.set(res.data), error: () => {} });
  }
}
