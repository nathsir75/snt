import {
  Component, inject, signal, computed, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WebsitePublicService } from '../website-public.service';
import { Course } from '../../courses/course.models';

const COURSE_ICONS: Record<string, string> = {
  default: '💻', web: '🌐', python: '🐍', java: '☕', data: '📊',
  cloud: '☁️', cyber: '🔐', digital: '📱', design: '🎨', mobile: '📲',
};

function iconFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('web') || n.includes('full'))    return COURSE_ICONS['web'];
  if (n.includes('python') || n.includes('data')) return COURSE_ICONS['python'];
  if (n.includes('java'))                          return COURSE_ICONS['java'];
  if (n.includes('cloud') || n.includes('aws'))   return COURSE_ICONS['cloud'];
  if (n.includes('cyber') || n.includes('secur')) return COURSE_ICONS['cyber'];
  if (n.includes('digital') || n.includes('mark'))return COURSE_ICONS['digital'];
  if (n.includes('mobile') || n.includes('app'))  return COURSE_ICONS['mobile'];
  return COURSE_ICONS['default'];
}

@Component({
  selector: 'snt-web-courses',
  standalone: true,
  imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container hero-inner">
        <!-- Image LEFT -->
        <div class="hero-visual">
          <svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <!-- laptop body -->
            <rect x="60" y="60" width="300" height="190" rx="12" fill="#1e293b" stroke="#6366f1" stroke-width="2"/>
            <rect x="72" y="72" width="276" height="166" rx="6" fill="#0f172a"/>
            <!-- code editor tabs -->
            <rect x="72" y="72" width="276" height="22" rx="6" fill="#1e293b"/>
            <rect x="80" y="78" width="60" height="10" rx="3" fill="#6366f1" opacity=".9"/>
            <rect x="148" y="78" width="50" height="10" rx="3" fill="#334155" opacity=".7"/>
            <rect x="206" y="78" width="50" height="10" rx="3" fill="#334155" opacity=".7"/>
            <!-- code lines -->
            <rect x="84" y="104" width="40" height="7" rx="2" fill="#8b5cf6"/>
            <rect x="130" y="104" width="80" height="7" rx="2" fill="#06b6d4"/>
            <rect x="84" y="118" width="20" height="7" rx="2" fill="#6366f1"/>
            <rect x="110" y="118" width="60" height="7" rx="2" fill="#f59e0b"/>
            <rect x="84" y="132" width="100" height="7" rx="2" fill="#6366f1" opacity=".6"/>
            <rect x="84" y="146" width="30" height="7" rx="2" fill="#8b5cf6"/>
            <rect x="120" y="146" width="70" height="7" rx="2" fill="#06b6d4" opacity=".8"/>
            <rect x="84" y="160" width="120" height="7" rx="2" fill="#6366f1" opacity=".4"/>
            <rect x="84" y="174" width="50" height="7" rx="2" fill="#f59e0b" opacity=".7"/>
            <rect x="140" y="174" width="80" height="7" rx="2" fill="#8b5cf6" opacity=".6"/>
            <rect x="84" y="188" width="90" height="7" rx="2" fill="#06b6d4" opacity=".5"/>
            <rect x="84" y="202" width="110" height="7" rx="2" fill="#6366f1" opacity=".7"/>
            <rect x="84" y="216" width="70" height="7" rx="2" fill="#8b5cf6" opacity=".4"/>
            <!-- laptop base -->
            <rect x="30" y="250" width="360" height="14" rx="4" fill="#334155"/>
            <!-- course badges floating -->
            <rect x="290" y="50" width="110" height="44" rx="8" fill="rgba(99,102,241,.15)" stroke="rgba(99,102,241,.4)" stroke-width="1.5"/>
            <text x="345" y="69" text-anchor="middle" font-size="10" fill="#a5b4fc" font-family="system-ui" font-weight="700">🌐 Full Stack</text>
            <text x="345" y="84" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">6 months</text>
            <rect x="20" y="160" width="100" height="44" rx="8" fill="rgba(6,182,212,.15)" stroke="rgba(6,182,212,.4)" stroke-width="1.5"/>
            <text x="70" y="179" text-anchor="middle" font-size="10" fill="#67e8f9" font-family="system-ui" font-weight="700">☁️ Cloud AWS</text>
            <text x="70" y="194" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">4 months</text>
            <rect x="290" y="270" width="110" height="44" rx="8" fill="rgba(139,92,246,.15)" stroke="rgba(139,92,246,.4)" stroke-width="1.5"/>
            <text x="345" y="289" text-anchor="middle" font-size="10" fill="#c4b5fd" font-family="system-ui" font-weight="700">🐍 Python AI</text>
            <text x="345" y="304" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">4 months</text>
          </svg>
        </div>
        <!-- Text RIGHT -->
        <div class="hero-text">
          <p class="eyebrow">Our Curriculum</p>
          <h1 class="page-title">Job-Ready IT Courses</h1>
          <p class="page-sub">Industry-aligned programs designed with hiring partners. Every course includes hands-on projects, mentorship, and placement support.</p>
          <div class="hero-pills">
            <span class="pill">🎯 Placement Support</span>
            <span class="pill">📜 Certificate</span>
            <span class="pill">🖥️ LMS Access</span>
            <span class="pill">👨🏫 Expert Trainers</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Highlights -->
    <section class="highlights-bar">
      <div class="container highlights-grid">
        @for (h of highlights; track h.label) {
          <div class="highlight">
            <span class="highlight-icon">{{ h.icon }}</span>
            <span class="highlight-text">{{ h.label }}</span>
          </div>
        }
      </div>
    </section>

    <!-- Course list -->
    <section class="section">
      <div class="container">
        <!-- Filter -->
        <div class="filter-bar">
          <input class="filter-input" type="search" placeholder="Search courses…" [(ngModel)]="searchTerm" />
          <select class="filter-select" [(ngModel)]="durationFilter">
            <option value="">All Durations</option>
            <option value="short">1–3 months</option>
            <option value="medium">4–6 months</option>
            <option value="long">7+ months</option>
          </select>
        </div>

        @if (loading()) {
          <div class="loading-state">Loading courses…</div>
        } @else {
          <div class="courses-grid">
            @for (course of filtered(); track course.id) {
              <div class="course-card">
                <div class="course-header">
                  <div class="course-icon">{{ iconFor(course.name) }}</div>
                  <div class="course-meta">
                    <span class="course-duration-badge">{{ course.durationMonths }} months</span>
                  </div>
                </div>
                <h3 class="course-name">{{ course.name }}</h3>
                @if (course.description) {
                  <p class="course-desc">{{ course.description }}</p>
                }
                <div class="course-footer">
                  <div class="course-tags">
                    <span class="tag">Placement Support</span>
                    <span class="tag">Certificate</span>
                  </div>
                  <a routerLink="/contact" class="course-enroll">Enquire →</a>
                </div>
              </div>
            }
          </div>
          @if (!filtered().length) {
            <div class="empty-state">
              <p>No courses match your search. <button class="link-btn" (click)="searchTerm = ''; durationFilter = ''">Clear filters</button></p>
            </div>
          }
        }
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2 class="cta-heading">Not sure which course is right for you?</h2>
          <p class="cta-sub">Our counsellors will help you choose the best path based on your background and goals.</p>
        </div>
        <a routerLink="/contact" class="btn-cta">Get Free Counselling →</a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .section { padding: 64px 0; }
    .eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 8px; }
    .page-hero { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 72px 0; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(99,102,241,.3)); }
    .hero-text { display: flex; flex-direction: column; }
    .page-title { font-size: clamp(28px, 4vw, 44px); font-weight: 900; color: #fff; margin-bottom: 14px; }
    .page-sub { font-size: 16px; color: #c7d2fe; max-width: 480px; line-height: 1.75; margin-bottom: 20px; }
    .hero-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.4); color: #a5b4fc; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .highlights-bar { background: #6366f1; padding: 20px 0; }
    .highlights-grid { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; }
    .highlight { display: flex; align-items: center; gap: 8px; color: #fff; font-size: 14px; font-weight: 600; }
    .highlight-icon { font-size: 18px; }
    .filter-bar { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
    .filter-input { flex: 1; min-width: 200px; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; }
    .filter-input:focus { border-color: #6366f1; }
    .filter-select { padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; cursor: pointer; background: #fff; }
    .loading-state { text-align: center; padding: 60px; color: #6b7280; font-size: 15px; }
    .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .course-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; display: flex; flex-direction: column; gap: 12px; transition: all .2s; }
    .course-card:hover { border-color: #6366f1; box-shadow: 0 4px 20px rgba(99,102,241,.1); transform: translateY(-2px); }
    .course-header { display: flex; align-items: center; justify-content: space-between; }
    .course-icon { font-size: 32px; }
    .course-duration-badge { background: #eef2ff; color: #6366f1; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
    .course-name { font-size: 17px; font-weight: 800; color: #111827; }
    .course-desc { font-size: 13px; color: #6b7280; line-height: 1.65; flex: 1; }
    .course-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; }
    .course-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { background: #f3f4f6; color: #374151; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; }
    .course-enroll { font-size: 13px; font-weight: 700; color: #6366f1; text-decoration: none; white-space: nowrap; }
    .course-enroll:hover { text-decoration: underline; }
    .empty-state { text-align: center; padding: 48px; color: #6b7280; }
    .link-btn { background: none; border: none; color: #6366f1; font-weight: 700; cursor: pointer; font-size: inherit; }
    .cta-band { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 56px 0; }
    .cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .cta-heading { font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 6px; }
    .cta-sub { font-size: 14px; color: #6b7280; }
    .btn-cta { display: inline-flex; padding: 13px 28px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; white-space: nowrap; transition: background .15s; }
    .btn-cta:hover { background: #4f46e5; }
    @media (max-width: 600px) { .cta-inner { flex-direction: column; } }
    @media (max-width: 768px) { .hero-inner { grid-template-columns: 1fr; } .hero-visual { display: none; } }
  `],
})
export class WebCoursesComponent implements OnInit {
  private readonly svc        = inject(WebsitePublicService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly all     = signal<Course[]>([]);

  searchTerm     = '';
  durationFilter = '';

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    return this.all().filter((c) => {
      const matchSearch = !term || c.name.toLowerCase().includes(term) || (c.description ?? '').toLowerCase().includes(term);
      const matchDur = !this.durationFilter ||
        (this.durationFilter === 'short'  && c.durationMonths <= 3) ||
        (this.durationFilter === 'medium' && c.durationMonths >= 4 && c.durationMonths <= 6) ||
        (this.durationFilter === 'long'   && c.durationMonths >= 7);
      return matchSearch && matchDur && c.isActive;
    });
  });

  readonly highlights = [
    { icon: '🎯', label: 'Industry-Aligned Curriculum' },
    { icon: '🤝', label: 'Placement Support Included' },
    { icon: '📜', label: 'Recognized Certification' },
    { icon: '🖥️', label: 'LMS Access Included' },
    { icon: '👨🏫', label: 'Expert Trainers' },
  ];

  iconFor = iconFor;

  ngOnInit(): void {
    this.svc.getCourses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (c) => { this.all.set(c); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
