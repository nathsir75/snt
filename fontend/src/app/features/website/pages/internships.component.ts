import { Component, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InternshipApplicationService } from '../../internship-applications/internship.service';
import { INTERNSHIP_DOMAINS, EXPERIENCE_LEVELS, AVAILABILITY_OPTIONS, DURATION_OPTIONS } from '../../internship-applications/internship.models';

@Component({
  selector: 'app-internships',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <!-- Text LEFT -->
        <div class="hero-text">
          <p class="hero-eyebrow">🚀 Launch Your Career</p>
          <h1 class="hero-title">Internship Program</h1>
          <p class="hero-sub">Launch your tech career with hands-on experience. Work on real projects, learn from industry experts, and build your portfolio.</p>
          <div class="hero-pills">
            <span class="pill">💻 Live Projects</span>
            <span class="pill">🧑🏫 Mentorship</span>
            <span class="pill">📜 Certificate</span>
            <span class="pill">💼 PPO Opportunity</span>
          </div>
        </div>
        <!-- Image RIGHT -->
        <div class="hero-visual">
          <svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <!-- student at laptop -->
            <rect x="110" y="120" width="200" height="130" rx="8" fill="#1e293b" stroke="#667eea" stroke-width="2"/>
            <rect x="120" y="130" width="180" height="110" rx="4" fill="#0f172a"/>
            <!-- project code -->
            <rect x="128" y="140" width="60" height="7" rx="2" fill="#667eea"/>
            <rect x="128" y="153" width="100" height="7" rx="2" fill="#8b5cf6" opacity=".7"/>
            <rect x="128" y="166" width="80" height="7" rx="2" fill="#06b6d4" opacity=".8"/>
            <rect x="128" y="179" width="120" height="7" rx="2" fill="#667eea" opacity=".5"/>
            <rect x="128" y="192" width="70" height="7" rx="2" fill="#f59e0b" opacity=".7"/>
            <rect x="128" y="205" width="90" height="7" rx="2" fill="#8b5cf6" opacity=".4"/>
            <rect x="128" y="218" width="110" height="7" rx="2" fill="#06b6d4" opacity=".6"/>
            <!-- laptop base -->
            <rect x="80" y="250" width="260" height="10" rx="3" fill="#334155"/>
            <!-- student person -->
            <circle cx="210" cy="60" r="32" fill="#1e293b" stroke="#667eea" stroke-width="2"/>
            <text x="210" y="68" text-anchor="middle" font-size="24" font-family="system-ui">👨🏫</text>
            <!-- mentor badge -->
            <rect x="310" y="80" width="100" height="52" rx="8" fill="rgba(102,126,234,.15)" stroke="rgba(102,126,234,.4)" stroke-width="1.5"/>
            <text x="360" y="101" text-anchor="middle" font-size="18" font-family="system-ui">🧑💼</text>
            <text x="360" y="118" text-anchor="middle" font-size="9" fill="#a5b4fc" font-family="system-ui" font-weight="700">Mentor</text>
            <!-- certificate badge -->
            <rect x="20" y="160" width="80" height="52" rx="8" fill="rgba(5,150,105,.15)" stroke="rgba(5,150,105,.4)" stroke-width="1.5"/>
            <text x="60" y="181" text-anchor="middle" font-size="18" font-family="system-ui">🎖️</text>
            <text x="60" y="198" text-anchor="middle" font-size="9" fill="#6ee7b7" font-family="system-ui" font-weight="700">Certificate</text>
            <!-- project badge -->
            <rect x="320" y="220" width="90" height="44" rx="8" fill="rgba(6,182,212,.15)" stroke="rgba(6,182,212,.4)" stroke-width="1.5"/>
            <text x="365" y="239" text-anchor="middle" font-size="10" fill="#67e8f9" font-family="system-ui" font-weight="700">📊 Live</text>
            <text x="365" y="254" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Project</text>
          </svg>
        </div>
      </div>
    </section>

    <section class="benefits">
      <div class="container">
        <h2>Why Intern With Us?</h2>
        <div class="grid">
          <div class="card">
            <h3>Real Projects</h3>
            <p>Work on live client projects and production systems</p>
          </div>
          <div class="card">
            <h3>Mentorship</h3>
            <p>Learn from experienced developers and industry professionals</p>
          </div>
          <div class="card">
            <h3>Certificate</h3>
            <p>Receive completion certificate and letter of recommendation</p>
          </div>
          <div class="card">
            <h3>Job Opportunities</h3>
            <p>High-performing interns get pre-placement offers</p>
          </div>
        </div>
      </div>
    </section>

    <section class="domains">
      <div class="container">
        <h2>Available Domains</h2>
        <div class="domain-grid">
          @for (domain of domains; track domain.value) {
            <div class="domain-card">{{ domain.label }}</div>
          }
        </div>
      </div>
    </section>

    <section class="apply-form">
      <div class="container">
        <h2>Apply Now</h2>
        @if (submitted) {
          <div class="success-message">
            <h3>Application Submitted!</h3>
            <p>Thank you for applying. Our team will review your application and contact you within 2-3 business days.</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <div class="form-group">
                <label>Full Name *</label>
                <input type="text" formControlName="fullName" class="form-control">
              </div>
              <div class="form-group">
                <label>Email *</label>
                <input type="email" formControlName="email" class="form-control">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Phone *</label>
                <input type="tel" formControlName="phone" class="form-control">
              </div>
              <div class="form-group">
                <label>Domain *</label>
                <select formControlName="preferredDomain" class="form-control">
                  <option value="">Select domain</option>
                  @for (d of domains; track d.value) {
                    <option [value]="d.value">{{ d.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Experience Level *</label>
                <select formControlName="experienceLevel" class="form-control">
                  <option value="">Select level</option>
                  @for (exp of experienceLevels; track exp.value) {
                    <option [value]="exp.value">{{ exp.label }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Availability *</label>
                <select formControlName="availability" class="form-control">
                  <option value="">Select availability</option>
                  @for (avail of availabilityOptions; track avail.value) {
                    <option [value]="avail.value">{{ avail.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Preferred Duration *</label>
                <select formControlName="duration" class="form-control">
                  <option value="">Select duration</option>
                  @for (dur of durationOptions; track dur.value) {
                    <option [value]="dur.value">{{ dur.label }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>College/University *</label>
                <input type="text" formControlName="college" class="form-control">
              </div>
            </div>

            <div class="form-group">
              <label>Resume URL (Google Drive/Dropbox) *</label>
              <input type="url" formControlName="resumeUrl" class="form-control">
            </div>

            <div class="form-group">
              <label>Why do you want to intern with us?</label>
              <textarea formControlName="message" rows="4" class="form-control"></textarea>
            </div>

            <button type="submit" [disabled]="form.invalid || loading" class="btn-primary">
              {{ loading ? 'Submitting...' : 'Submit Application' }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
  styles: [`
    .hero {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%);
      padding: 72px 0;
    }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-text { display: flex; flex-direction: column; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(102,126,234,.3)); }
    .hero-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 10px; }
    .hero-title { font-size: clamp(28px, 4vw, 48px); font-weight: 900; color: #fff; margin-bottom: 16px; line-height: 1.15; }
    .hero-sub { font-size: 16px; color: #c7d2fe; line-height: 1.75; margin-bottom: 24px; max-width: 460px; }
    .hero-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.4); color: #a5b4fc; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .benefits, .domains, .apply-form {
      padding: 60px 20px;
    }
    .benefits {
      background: #f8f9fa;
    }
    h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }
    .card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .card h3 {
      color: #667eea;
      margin-bottom: 1rem;
    }
    .domain-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .domain-card {
      background: #667eea;
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
      font-weight: 600;
    }
    .apply-form {
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
      border-color: #667eea;
    }
    textarea.form-control {
      resize: vertical;
    }
    .btn-primary {
      background: #667eea;
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
      background: #5568d3;
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
export class InternshipsComponent {
  private fb = inject(FormBuilder);
  private service = inject(InternshipApplicationService);
  private destroyRef = inject(DestroyRef);

  domains = INTERNSHIP_DOMAINS;
  experienceLevels = EXPERIENCE_LEVELS;
  availabilityOptions = AVAILABILITY_OPTIONS;
  durationOptions = DURATION_OPTIONS;

  loading = false;
  submitted = false;

  form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    preferredDomain: ['', Validators.required],
    experienceLevel: ['', Validators.required],
    availability: ['', Validators.required],
    duration: ['', Validators.required],
    college: ['', Validators.required],
    resumeUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    message: ['']
  });

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.service.submitPublic(this.form.value as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitted = true;
          this.loading = false;
        },
        error: () => {
          alert('Failed to submit application. Please try again.');
          this.loading = false;
        }
      });
  }
}
