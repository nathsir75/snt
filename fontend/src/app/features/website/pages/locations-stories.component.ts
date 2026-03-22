import {
  Component, inject, signal, computed, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { WebsitePublicService } from '../website-public.service';
import { PublicBranch } from '../../branches/branch.models';
import { DisplayControlData, DC_DEFAULTS } from '../../website-display-control/display-control.models';

interface PublicSuccessStory {
  id: number; studentName: string; course: string; company: string;
  role: string; salaryLpa: number | null; photoUrl: string | null;
  testimonial: string | null; branchName: string;
}
import { DecimalPipe } from '@angular/common';

// ── Branch Locations ──────────────────────────────────────────────────────────
@Component({
  selector: 'snt-web-branch-locations',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hero — title/subtitle/image from Display Control -->
    <section class="page-hero"
      [style.background-image]="hero().heroImage.fileUrl ? 'url(' + hero().heroImage.fileUrl + ')' : null"
      [class.hero-has-bg]="!!hero().heroImage.fileUrl">
      <div class="hero-overlay"></div>
      <div class="container hero-body">
        <p class="eyebrow">Our Network</p>
        <h1 class="page-title">{{ hero().title }}</h1>
        <p class="page-sub">{{ hero().subtitle }}</p>
      </div>
    </section>

    <!-- Search / state filter bar -->
    <div class="filter-bar">
      <div class="container filter-inner">
        <input
          class="filter-input"
          type="text"
          placeholder="Search by city or branch name…"
          [value]="searchTerm()"
          (input)="searchTerm.set($any($event.target).value)"
        />
        @if (stateList().length > 1) {
          <select class="filter-select" [value]="stateFilter()" (change)="stateFilter.set($any($event.target).value)">
            <option value="">All States</option>
            @for (s of stateList(); track s) {
              <option [value]="s">{{ s }}</option>
            }
          </select>
        }
        <span class="filter-count">{{ filtered().length }} branch{{ filtered().length === 1 ? '' : 'es' }}</span>
      </div>
    </div>

    <!-- Branch cards -->
    <section class="section">
      <div class="container">
        @if (loading()) {
          <div class="loading">Loading branches…</div>
        } @else if (filtered().length) {
          <div class="branches-grid">
            @for (b of filtered(); track b.id) {
              <div class="branch-card">
                <div class="branch-header">
                  <div class="branch-avatar">{{ b.name[0] }}</div>
                  <div class="branch-header-text">
                    <h3 class="branch-name">{{ b.name }}</h3>
                    <p class="branch-location">📍 {{ b.city }}@if (b.state) {, {{ b.state }}}</p>
                  </div>
                </div>
                @if (b.shortDescription) {
                  <p class="branch-desc">{{ b.shortDescription }}</p>
                }
                <div class="branch-contact">
                  @if (b.phone) { <span>📞 {{ b.phone }}</span> }
                  @if (b.email) { <span>✉️ {{ b.email }}</span> }
                </div>
                <div class="branch-actions">
                  @if (b.websiteEnabled) {
                    <a [href]="'/b/' + b.code" class="branch-link">Visit Website →</a>
                  }
                  @if (b.mapLink) {
                    <a [href]="b.mapLink" target="_blank" rel="noopener" class="branch-map">🗺️ Map</a>
                  }
                </div>
              </div>
            }
          </div>
        } @else if (!loading()) {
          <div class="empty-state">
            <p class="empty-icon">🔍</p>
            <p class="empty-msg">No branches match your search.</p>
            <button class="empty-reset" (click)="resetFilters()">Clear filters</button>
          </div>
        }
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <h2 class="cta-heading">Don't see your city? Open a branch!</h2>
        <a routerLink="/become-a-partner" class="btn-cta">Become a Franchise Partner →</a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .section { padding: 72px 0; }
    .eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 8px; }
    .page-hero { position: relative; background: linear-gradient(135deg, #0f172a, #1e293b); background-size: cover; background-position: center; padding: 80px 0; text-align: center; }
    .hero-has-bg .hero-overlay { position: absolute; inset: 0; background: rgba(15,23,42,.65); }
    .hero-overlay { position: absolute; inset: 0; pointer-events: none; }
    .hero-body { position: relative; z-index: 1; }
    .page-title { font-size: clamp(26px, 4vw, 44px); font-weight: 900; color: #fff; margin-bottom: 14px; }
    .page-sub { font-size: 16px; color: #94a3b8; max-width: 520px; margin: 0 auto; line-height: 1.75; }
    .filter-bar { background: #f8fafc; border-bottom: 1px solid #e5e7eb; padding: 14px 0; position: sticky; top: 0; z-index: 10; }
    .filter-inner { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .filter-input { flex: 1; min-width: 200px; padding: 9px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; transition: border-color .15s; }
    .filter-input:focus { border-color: #6366f1; }
    .filter-select { padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff; cursor: pointer; }
    .filter-count { font-size: 13px; color: #6b7280; white-space: nowrap; margin-left: auto; }
    .loading { text-align: center; padding: 60px; color: #6b7280; }
    .branches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .branch-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 10px; transition: box-shadow .15s, border-color .15s; }
    .branch-card:hover { border-color: #6366f1; box-shadow: 0 4px 16px rgba(99,102,241,.1); }
    .branch-header { display: flex; align-items: center; gap: 12px; }
    .branch-avatar { width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 17px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .branch-header-text { min-width: 0; }
    .branch-name { font-size: 15px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .branch-location { font-size: 13px; color: #6b7280; margin-top: 2px; }
    .branch-desc { font-size: 13px; color: #4b5563; line-height: 1.6; }
    .branch-contact { display: flex; flex-direction: column; gap: 4px; }
    .branch-contact span { font-size: 13px; color: #374151; }
    .branch-actions { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
    .branch-link { font-size: 13px; font-weight: 700; color: #6366f1; text-decoration: none; }
    .branch-link:hover { text-decoration: underline; }
    .branch-map { font-size: 13px; color: #059669; font-weight: 600; text-decoration: none; }
    .branch-map:hover { text-decoration: underline; }
    .empty-state { text-align: center; padding: 80px 24px; }
    .empty-icon { font-size: 40px; margin-bottom: 12px; }
    .empty-msg { font-size: 16px; color: #6b7280; margin-bottom: 16px; }
    .empty-reset { padding: 9px 20px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .cta-band { background: #6366f1; padding: 56px 0; }
    .cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .cta-heading { font-size: 22px; font-weight: 800; color: #fff; }
    .btn-cta { display: inline-flex; padding: 13px 28px; background: #fff; color: #6366f1; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; white-space: nowrap; transition: all .15s; }
    .btn-cta:hover { background: #eef2ff; }
    @media (max-width: 600px) { .cta-inner { flex-direction: column; } .filter-inner { gap: 8px; } }
  `],
})
export class WebBranchLocationsComponent implements OnInit {
  private readonly svc        = inject(WebsitePublicService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading     = signal(true);
  readonly branches    = signal<PublicBranch[]>([]);
  readonly searchTerm  = signal('');
  readonly stateFilter = signal('');

  private readonly dc = signal<DisplayControlData>(DC_DEFAULTS);
  readonly hero = computed(() => this.dc().branchLocationsHero);

  readonly stateList = computed(() =>
    [...new Set(this.branches().map(b => b.state).filter(Boolean))].sort()
  );

  readonly filtered = computed(() => {
    const term  = this.searchTerm().toLowerCase().trim();
    const state = this.stateFilter();
    return this.branches().filter(b => {
      const matchesState  = !state || b.state === state;
      const matchesSearch = !term ||
        b.name.toLowerCase().includes(term) ||
        b.city.toLowerCase().includes(term) ||
        (b.state ?? '').toLowerCase().includes(term) ||
        (b.shortDescription ?? '').toLowerCase().includes(term);
      return matchesState && matchesSearch;
    });
  });

  ngOnInit(): void {
    this.svc.getDisplayControl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (res) => this.dc.set(res.data), error: () => {} });

    this.svc.getPublicBranches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => { this.branches.set(list); this.loading.set(false); },
        error: ()    => { this.loading.set(false); },
      });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.stateFilter.set('');
  }
}

// ── Success Stories ───────────────────────────────────────────────────────────
@Component({
  selector: 'snt-web-success-stories',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">Student Success</p>
        <h1 class="page-title">Real Students. Real Jobs. Real Impact.</h1>
        <p class="page-sub">Thousands of students have transformed their careers through SNT Education. Here are some of their stories.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="stories-grid">
          @for (s of stories(); track s.id) {
            <div class="story-card">
              <div class="story-header">
                @if (s.photoUrl) {
                  <img [src]="s.photoUrl" [alt]="s.studentName" class="story-photo" />
                } @else {
                  <div class="story-avatar">{{ s.studentName[0] }}</div>
                }
                <div>
                  <h3 class="story-name">{{ s.studentName }}</h3>
                  <p class="story-role">{{ s.role }} at {{ s.company }}</p>
                  @if (s.salaryLpa) {
                    <p class="story-salary">{{ s.salaryLpa | number:'1.1-1' }} LPA</p>
                  }
                </div>
              </div>
              @if (s.testimonial) {
                <p class="story-quote">"{{ s.testimonial }}"</p>
              }
              <div class="story-meta">
                <span class="story-course">📚 {{ s.course }}</span>
                <span class="story-branch">🏢 {{ s.branchName }}</span>
              </div>
            </div>
          }
          @if (!stories().length) {
            @for (s of placeholderStories; track s.name) {
              <div class="story-card">
                <div class="story-header">
                  <div class="story-avatar">{{ s.name[0] }}</div>
                  <div>
                    <h3 class="story-name">{{ s.name }}</h3>
                    <p class="story-role">{{ s.role }} at {{ s.company }}</p>
                    <p class="story-salary">{{ s.salary }}</p>
                  </div>
                </div>
                <p class="story-quote">"{{ s.quote }}"</p>
                <div class="story-meta">
                  <span class="story-course">📚 {{ s.course }}</span>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <h2 class="cta-heading">Your Success Story Starts Here</h2>
        <a routerLink="/courses" class="btn-cta">Explore Courses →</a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .section { padding: 72px 0; }
    .eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 8px; }
    .page-hero { background: linear-gradient(135deg, #064e3b, #065f46); padding: 72px 0; text-align: center; }
    .page-title { font-size: clamp(26px, 4vw, 44px); font-weight: 900; color: #fff; margin-bottom: 14px; }
    .page-sub { font-size: 16px; color: #a7f3d0; max-width: 560px; margin: 0 auto; line-height: 1.75; }
    .stories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .story-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; display: flex; flex-direction: column; gap: 14px; }
    .story-header { display: flex; gap: 14px; align-items: center; }
    .story-photo { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .story-avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 20px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .story-name { font-size: 15px; font-weight: 700; color: #111827; }
    .story-role { font-size: 13px; color: #6b7280; }
    .story-salary { font-size: 13px; font-weight: 700; color: #059669; margin-top: 2px; }
    .story-quote { font-size: 13px; color: #374151; line-height: 1.75; font-style: italic; }
    .story-meta { display: flex; gap: 12px; flex-wrap: wrap; }
    .story-course, .story-branch { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }
    .cta-band { background: #059669; padding: 56px 0; }
    .cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .cta-heading { font-size: 24px; font-weight: 800; color: #fff; }
    .btn-cta { display: inline-flex; padding: 13px 28px; background: #fff; color: #059669; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; transition: all .15s; }
    .btn-cta:hover { background: #f0fdf4; }
    @media (max-width: 600px) { .cta-inner { flex-direction: column; } }
  `],
})
export class WebSuccessStoriesComponent implements OnInit {
  private readonly svc        = inject(WebsitePublicService);
  private readonly destroyRef = inject(DestroyRef);
  readonly stories = signal<PublicSuccessStory[]>([]);

  readonly placeholderStories = [
    { name: 'Priya Sharma',   role: 'Software Engineer',  company: 'Infosys',   salary: '4.5 LPA', course: 'Full Stack Web Dev',    quote: 'SNT gave me the skills and confidence to crack my first job. The placement support was outstanding.' },
    { name: 'Rahul Verma',    role: 'Data Analyst',       company: 'TCS',       salary: '5.2 LPA', course: 'Python & Data Science', quote: 'I got placed within 2 months of completing the course. The curriculum is very practical.' },
    { name: 'Anjali Patel',   role: 'Digital Marketer',   company: 'Wipro',     salary: '3.8 LPA', course: 'Digital Marketing',     quote: 'From zero knowledge to a full-time job in 3 months. Best decision of my life.' },
    { name: 'Vikram Singh',   role: 'Cloud Engineer',     company: 'HCL',       salary: '6.0 LPA', course: 'Cloud Computing (AWS)', quote: 'The AWS course was incredibly hands-on. I cleared my certification and got placed immediately.' },
    { name: 'Sneha Kulkarni', role: 'Java Developer',     company: 'Capgemini', salary: '4.8 LPA', course: 'Java & Spring Boot',    quote: "SNT's trainers are industry professionals. The quality of teaching is unmatched." },
    { name: 'Amit Desai',     role: 'Security Analyst',   company: 'IBM',       salary: '5.5 LPA', course: 'Cybersecurity',         quote: 'The cybersecurity course opened doors I never thought possible. Highly recommended.' },
  ];

  ngOnInit(): void {
    // success-stories endpoint not yet available — placeholder data shown
  }
}
