import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'snt-web-why-partner',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">Partner With SNT</p>
        <h1 class="page-title">Why SNT is the Best Franchise Investment in EdTech</h1>
        <p class="page-sub">Join a proven network with centralized support, technology, and a brand that students trust.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="reasons-grid">
          @for (r of reasons; track r.title) {
            <div class="reason-card">
              <div class="reason-icon">{{ r.icon }}</div>
              <h3 class="reason-title">{{ r.title }}</h3>
              <p class="reason-desc">{{ r.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="comparison-section">
      <div class="container">
        <h2 class="section-title center-text">SNT vs. Starting Alone</h2>
        <div class="comparison-table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th class="col-snt">With SNT Franchise</th>
                <th class="col-alone">Starting Alone</th>
              </tr>
            </thead>
            <tbody>
              @for (row of comparison; track row.feature) {
                <tr>
                  <td>{{ row.feature }}</td>
                  <td class="col-snt">✅ {{ row.snt }}</td>
                  <td class="col-alone">❌ {{ row.alone }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <h2 class="cta-heading">Ready to Build Your Education Business?</h2>
        <a routerLink="/become-a-partner" class="btn-cta">Apply Now →</a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .section { padding: 72px 0; }
    .eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 8px; }
    .page-hero { background: linear-gradient(135deg, #4c1d95, #6d28d9); padding: 80px 0; text-align: center; }
    .page-title { font-size: clamp(26px, 4vw, 44px); font-weight: 900; color: #fff; margin-bottom: 14px; }
    .page-sub { font-size: 16px; color: #ddd6fe; max-width: 560px; margin: 0 auto; line-height: 1.75; }
    .reasons-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .reason-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 28px; }
    .reason-icon { font-size: 36px; margin-bottom: 14px; }
    .reason-title { font-size: 17px; font-weight: 800; color: #111827; margin-bottom: 8px; }
    .reason-desc { font-size: 13px; color: #6b7280; line-height: 1.7; }
    .comparison-section { background: #f8fafc; padding: 72px 0; }
    .section-title { font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: #111827; margin-bottom: 32px; }
    .center-text { text-align: center; }
    .comparison-table-wrap { overflow-x: auto; }
    .comparison-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 8px rgba(0,0,0,.06); }
    .comparison-table th, .comparison-table td { padding: 14px 20px; text-align: left; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
    .comparison-table th { background: #f8fafc; font-weight: 700; color: #374151; }
    .col-snt { color: #059669; font-weight: 600; }
    .col-alone { color: #dc2626; }
    .cta-band { background: #6d28d9; padding: 56px 0; }
    .cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .cta-heading { font-size: 24px; font-weight: 800; color: #fff; }
    .btn-cta { display: inline-flex; padding: 13px 28px; background: #fff; color: #6d28d9; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; transition: all .15s; }
    .btn-cta:hover { background: #f5f3ff; }
    @media (max-width: 600px) { .cta-inner { flex-direction: column; } }
  `],
})
export class WebWhyPartnerComponent {
  readonly reasons = [
    { icon: '🏷️', title: 'Established Brand',          desc: 'Leverage 14 years of brand equity and student trust across India.' },
    { icon: '🖥️', title: 'Complete Tech Platform',     desc: 'Get access to our LMS, admin panel, student management, and placement tools from day one.' },
    { icon: '📚', title: 'Ready Curriculum',            desc: 'No need to develop courses. Use our industry-aligned, regularly updated curriculum.' },
    { icon: '🤝', title: 'Placement Network',           desc: 'Your students get access to our 50+ company hiring network immediately.' },
    { icon: '📣', title: 'Marketing Support',           desc: 'National brand campaigns, digital marketing templates, and lead generation support.' },
    { icon: '🎓', title: 'Trainer Training',            desc: 'We train your trainers. Ongoing academic support from our head office team.' },
    { icon: '💰', title: 'Proven Revenue Model',        desc: 'Average branch revenue of ₹2L+ per month within 6 months of launch.' },
    { icon: '📊', title: 'Business Analytics',          desc: 'Real-time dashboards to track students, fees, attendance, and placements.' },
  ];
  readonly comparison = [
    { feature: 'Brand Recognition',    snt: 'Established 14-year brand',    alone: 'Build from scratch' },
    { feature: 'Curriculum',           snt: 'Ready, updated regularly',      alone: 'Develop yourself' },
    { feature: 'LMS Platform',         snt: 'Included from day one',         alone: 'Build or buy separately' },
    { feature: 'Placement Network',    snt: '50+ companies ready',           alone: 'Build your own network' },
    { feature: 'Student Management',   snt: 'Full SaaS platform included',   alone: 'Manual or expensive tools' },
    { feature: 'Marketing Support',    snt: 'National + local support',      alone: 'Entirely on your own' },
    { feature: 'Break-Even Period',    snt: 'Average 6 months',              alone: '18–24 months typically' },
    { feature: 'Ongoing Support',      snt: 'Dedicated franchise manager',   alone: 'No support' },
  ];
}
