import { Component, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CorporateLeadService } from '../../corporate-leads/corporate-lead.service';
import { CORPORATE_TIMELINES } from '../../corporate-leads/corporate-enquiry.models';

@Component({
  selector: 'app-hire-talent',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <!-- Image LEFT -->
        <div class="hero-visual">
          <svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <!-- search circle -->
            <circle cx="180" cy="150" r="100" fill="none" stroke="#4facfe" stroke-width="2" opacity=".3"/>
            <circle cx="180" cy="150" r="70" fill="rgba(79,172,254,.08)" stroke="#4facfe" stroke-width="1.5" opacity=".5"/>
            <!-- magnifier handle -->
            <line x1="255" y1="225" x2="300" y2="270" stroke="#4facfe" stroke-width="6" stroke-linecap="round"/>
            <!-- candidate cards -->
            <rect x="80" y="100" width="200" height="50" rx="8" fill="#1e293b" stroke="#4facfe" stroke-width="1.5"/>
            <circle cx="106" cy="125" r="14" fill="#4facfe" opacity=".8"/>
            <text x="106" y="130" text-anchor="middle" font-size="12" fill="#fff" font-family="system-ui" font-weight="700">A</text>
            <rect x="128" y="112" width="80" height="7" rx="2" fill="#4facfe" opacity=".7"/>
            <rect x="128" y="124" width="55" height="6" rx="2" fill="#94a3b8" opacity=".5"/>
            <rect x="128" y="134" width="40" height="5" rx="2" fill="#10b981" opacity=".7"/>
            <rect x="80" y="160" width="200" height="50" rx="8" fill="#1e293b" stroke="#00f2fe" stroke-width="1.5"/>
            <circle cx="106" cy="185" r="14" fill="#00f2fe" opacity=".8"/>
            <text x="106" y="190" text-anchor="middle" font-size="12" fill="#0f172a" font-family="system-ui" font-weight="700">B</text>
            <rect x="128" y="172" width="70" height="7" rx="2" fill="#00f2fe" opacity=".7"/>
            <rect x="128" y="184" width="50" height="6" rx="2" fill="#94a3b8" opacity=".5"/>
            <rect x="128" y="194" width="45" height="5" rx="2" fill="#10b981" opacity=".7"/>
            <!-- verified badge -->
            <rect x="300" y="90" width="100" height="52" rx="8" fill="rgba(79,172,254,.15)" stroke="rgba(79,172,254,.4)" stroke-width="1.5"/>
            <text x="350" y="112" text-anchor="middle" font-size="18" font-family="system-ui">✅</text>
            <text x="350" y="130" text-anchor="middle" font-size="9" fill="#7dd3fc" font-family="system-ui" font-weight="700">Pre-Screened</text>
            <!-- stats -->
            <rect x="300" y="200" width="100" height="52" rx="8" fill="rgba(0,242,254,.15)" stroke="rgba(0,242,254,.4)" stroke-width="1.5"/>
            <text x="350" y="222" text-anchor="middle" font-size="14" fill="#7dd3fc" font-family="system-ui" font-weight="900">5000+</text>
            <text x="350" y="238" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Candidates</text>
            <!-- company badge -->
            <rect x="20" y="240" width="100" height="44" rx="8" fill="rgba(16,185,129,.15)" stroke="rgba(16,185,129,.4)" stroke-width="1.5"/>
            <text x="70" y="259" text-anchor="middle" font-size="10" fill="#6ee7b7" font-family="system-ui" font-weight="700">🏢 500+</text>
            <text x="70" y="274" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Hiring Partners</text>
          </svg>
        </div>
        <!-- Text RIGHT -->
        <div class="hero-text">
          <p class="hero-eyebrow">🔍 Talent Pipeline</p>
          <h1 class="hero-title">Hire Trained Talent</h1>
          <p class="hero-sub">Access a pool of job-ready tech professionals trained by industry experts. Zero recruitment hassle — we do the screening, you do the hiring.</p>
          <div class="hero-pills">
            <span class="pill">✅ Pre-Screened</span>
            <span class="pill">💻 Tech-Ready</span>
            <span class="pill">⚡ 30-Day Hiring</span>
          </div>
          <a href="#hire-form" class="hero-cta">Post a Requirement →</a>
        </div>
      </div>
    </section>

    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-number">5000+</div>
            <div class="stat-label">Trained Candidates</div>
          </div>
          <div class="stat">
            <div class="stat-number">500+</div>
            <div class="stat-label">Hiring Partners</div>
          </div>
          <div class="stat">
            <div class="stat-number">95%</div>
            <div class="stat-label">Placement Rate</div>
          </div>
          <div class="stat">
            <div class="stat-number">30 Days</div>
            <div class="stat-label">Avg. Hiring Time</div>
          </div>
        </div>
      </div>
    </section>

    <section class="process">
      <div class="container">
        <h2>How It Works</h2>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <h3>Share Requirements</h3>
            <p>Tell us the skills, experience, and team size you need</p>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <h3>We Screen</h3>
            <p>Our team shortlists candidates matching your criteria</p>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <h3>You Interview</h3>
            <p>Conduct interviews with pre-screened, job-ready candidates</p>
          </div>
          <div class="step">
            <div class="step-num">4</div>
            <h3>Hire &amp; Onboard</h3>
            <p>Make offers and we support the onboarding process</p>
          </div>
        </div>
      </div>
    </section>

    <section class="hire-form" id="hire-form">
      <div class="container">
        <h2>Post a Hiring Requirement</h2>
        @if (submitted) {
          <div class="success-message">
            <h3>Requirement Received!</h3>
            <p>Our talent acquisition team will reach out with matching profiles within 48 hours.</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <div class="form-group">
                <label>Contact Person *</label>
                <input type="text" formControlName="contactName" class="form-control">
              </div>
              <div class="form-group">
                <label>Company Name *</label>
                <input type="text" formControlName="companyName" class="form-control">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Email *</label>
                <input type="email" formControlName="email" class="form-control">
              </div>
              <div class="form-group">
                <label>Phone *</label>
                <input type="tel" formControlName="phone" class="form-control">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Number of Openings *</label>
                <input type="number" formControlName="teamSize" class="form-control" min="1">
              </div>
              <div class="form-group">
                <label>Hiring Timeline *</label>
                <select formControlName="timeline" class="form-control">
                  <option value="">Select timeline</option>
                  @for (tl of timelines; track tl.value) {
                    <option [value]="tl.value">{{ tl.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Skills / Roles Required *</label>
              <textarea formControlName="message" rows="4" class="form-control" placeholder="e.g. React Developer (2 yrs exp), Node.js Backend Engineer..."></textarea>
            </div>

            <button type="submit" [disabled]="form.invalid || loading" class="btn-primary">
              {{ loading ? 'Submitting...' : 'Submit Requirement' }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
  styles: [`
    .hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c4a6e 100%);
      padding: 72px 0;
    }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(79,172,254,.3)); }
    .hero-text { display: flex; flex-direction: column; }
    .hero-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #7dd3fc; margin-bottom: 10px; }
    .hero-title { font-size: clamp(28px, 4vw, 48px); font-weight: 900; color: #fff; margin-bottom: 16px; line-height: 1.15; }
    .hero-sub { font-size: 16px; color: #bae6fd; line-height: 1.75; margin-bottom: 24px; max-width: 460px; }
    .hero-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .pill { background: rgba(79,172,254,.15); border: 1px solid rgba(79,172,254,.4); color: #7dd3fc; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .hero-cta { display: inline-flex; padding: 12px 24px; background: #4facfe; color: #0f172a; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; transition: background .15s; align-self: flex-start; }
    .hero-cta:hover { background: #3d9ae8; }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .stats {
      background: #1a1a2e;
      padding: 40px 20px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 2rem;
      text-align: center;
    }
    .stat-number {
      font-size: 2.5rem;
      font-weight: 700;
      color: #4facfe;
    }
    .stat-label {
      color: #ccc;
      margin-top: 0.5rem;
    }
    .process, .hire-form {
      padding: 60px 20px;
    }
    .process {
      background: #f8f9fa;
    }
    h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 2rem;
    }
    .step {
      text-align: center;
      padding: 2rem;
    }
    .step-num {
      width: 60px;
      height: 60px;
      background: #4facfe;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 auto 1rem;
    }
    .step h3 {
      margin-bottom: 0.5rem;
    }
    .hire-form {
      background: #f8f9fa;
    }
    form {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
    }
    .form-group label {
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }
    .form-control {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    .form-control:focus {
      outline: none;
      border-color: #4facfe;
    }
    textarea.form-control {
      resize: vertical;
    }
    .btn-primary {
      background: #4facfe;
      color: white;
      padding: 1rem 2rem;
      border: none;
      border-radius: 4px;
      font-size: 1.1rem;
      cursor: pointer;
      width: 100%;
      margin-top: 1rem;
    }
    .btn-primary:hover:not(:disabled) {
      background: #3d9ae8;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .success-message {
      max-width: 600px;
      margin: 0 auto;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      padding: 2rem;
      border-radius: 8px;
      text-align: center;
    }
    .success-message h3 {
      color: #155724;
      margin-bottom: 1rem;
    }
    @media (max-width: 768px) {
      .hero-inner { grid-template-columns: 1fr; }
      .hero-visual { display: none; }
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HireTalentComponent {
  private fb = inject(FormBuilder);
  private service = inject(CorporateLeadService);
  private destroyRef = inject(DestroyRef);

  timelines = CORPORATE_TIMELINES;

  loading = false;
  submitted = false;

  form = this.fb.group({
    contactName: ['', Validators.required],
    companyName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    teamSize: [null, [Validators.required, Validators.min(1)]],
    timeline: ['', Validators.required],
    message: ['', Validators.required]
  });

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const payload = { ...this.form.value, enquiryType: 'hiring' as const };
    this.service.submitPublic(payload as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitted = true;
          this.loading = false;
        },
        error: () => {
          alert('Failed to submit requirement. Please try again.');
          this.loading = false;
        }
      });
  }
}
