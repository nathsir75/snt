import { Component, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CorporateLeadService } from '../../corporate-leads/corporate-lead.service';
import { CORPORATE_TRAINING_NEEDS, CORPORATE_ENQUIRY_TYPES, CORPORATE_TIMELINES } from '../../corporate-leads/corporate-enquiry.models';

@Component({
  selector: 'app-corporate-training',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <!-- Image LEFT -->
        <div class="hero-visual">
          <svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <!-- presentation screen -->
            <rect x="60" y="40" width="300" height="180" rx="10" fill="#1e293b" stroke="#f5576c" stroke-width="2"/>
            <rect x="72" y="52" width="276" height="156" rx="6" fill="#0f172a"/>
            <!-- chart bars -->
            <rect x="90" y="160" width="28" height="36" rx="3" fill="#f5576c" opacity=".8"/>
            <rect x="128" y="140" width="28" height="56" rx="3" fill="#f5576c" opacity=".9"/>
            <rect x="166" y="120" width="28" height="76" rx="3" fill="#f5576c"/>
            <rect x="204" y="100" width="28" height="96" rx="3" fill="#f59e0b"/>
            <rect x="242" y="80" width="28" height="116" rx="3" fill="#10b981"/>
            <rect x="280" y="60" width="28" height="136" rx="3" fill="#6366f1"/>
            <!-- trend line -->
            <polyline points="104,168 142,148 180,128 218,108 256,88 294,68" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 2" opacity=".6"/>
            <!-- screen stand -->
            <rect x="195" y="220" width="30" height="30" rx="2" fill="#1e293b"/>
            <rect x="160" y="250" width="100" height="8" rx="3" fill="#334155"/>
            <!-- trainer person -->
            <circle cx="60" cy="200" r="28" fill="#1e293b" stroke="#f5576c" stroke-width="2"/>
            <text x="60" y="208" text-anchor="middle" font-size="20" font-family="system-ui">👨🏫</text>
            <!-- audience dots -->
            <circle cx="310" cy="200" r="14" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <text x="310" y="205" text-anchor="middle" font-size="10" font-family="system-ui">👤</text>
            <circle cx="345" cy="200" r="14" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <text x="345" y="205" text-anchor="middle" font-size="10" font-family="system-ui">👤</text>
            <circle cx="380" cy="200" r="14" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <text x="380" y="205" text-anchor="middle" font-size="10" font-family="system-ui">👤</text>
            <!-- badge -->
            <rect x="300" y="30" width="110" height="44" rx="8" fill="rgba(245,87,108,.15)" stroke="rgba(245,87,108,.4)" stroke-width="1.5"/>
            <text x="355" y="49" text-anchor="middle" font-size="10" fill="#fca5a5" font-family="system-ui" font-weight="700">🏢 Enterprise</text>
            <text x="355" y="64" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Skilling</text>
            <!-- badge 2 -->
            <rect x="10" y="270" width="110" height="44" rx="8" fill="rgba(16,185,129,.15)" stroke="rgba(16,185,129,.4)" stroke-width="1.5"/>
            <text x="65" y="289" text-anchor="middle" font-size="10" fill="#6ee7b7" font-family="system-ui" font-weight="700">✅ Customized</text>
            <text x="65" y="304" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Training Plans</text>
          </svg>
        </div>
        <!-- Text RIGHT -->
        <div class="hero-text">
          <p class="hero-eyebrow">🏢 Enterprise Solutions</p>
          <h1 class="hero-title">Corporate Training</h1>
          <p class="hero-sub">Upskill your workforce with customized tech training programs. From beginner to advanced — we train your team on the technologies that matter.</p>
          <div class="hero-pills">
            <span class="pill">🎯 Customized Content</span>
            <span class="pill">💻 On-site / Online</span>
            <span class="pill">📊 Skill Reports</span>
          </div>
          <a href="#enquire" class="hero-cta">Get a Custom Quote →</a>
        </div>
      </div>
    </section>

    <section class="training-needs">
      <div class="container">
        <h2>Training Areas</h2>
        <div class="needs-grid">
          @for (need of trainingNeeds; track need) {
            <div class="need-card">{{ need }}</div>
          }
        </div>
      </div>
    </section>

    <section class="why-us">
      <div class="container">
        <h2>Why Choose Us?</h2>
        <div class="grid">
          <div class="card">
            <h3>Customized Content</h3>
            <p>Training programs tailored to your tech stack and business goals</p>
          </div>
          <div class="card">
            <h3>Flexible Delivery</h3>
            <p>On-site, online, or hybrid — we adapt to your team's schedule</p>
          </div>
          <div class="card">
            <h3>Expert Trainers</h3>
            <p>Industry practitioners with 10+ years of hands-on experience</p>
          </div>
          <div class="card">
            <h3>Measurable Outcomes</h3>
            <p>Pre/post assessments and skill gap analysis reports included</p>
          </div>
        </div>
      </div>
    </section>

    <section class="enquiry-form" id="enquire">
      <div class="container">
        <h2>Request a Training Proposal</h2>
        @if (submitted) {
          <div class="success-message">
            <h3>Request Received!</h3>
            <p>Our corporate training team will prepare a customized proposal and reach out within 24 hours.</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <div class="form-group">
                <label>Contact Person *</label>
                <input type="text" formControlName="contactPerson" class="form-control">
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
                <label>Enquiry Type *</label>
                <select formControlName="enquiryType" class="form-control">
                  <option value="">Select type</option>
                  @for (t of enquiryTypes; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Team Size *</label>
                <input type="number" formControlName="employeesCount" class="form-control" min="1">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Training Need *</label>
                <select formControlName="trainingNeeds" class="form-control">
                  <option value="">Select area</option>
                  @for (n of trainingNeeds; track n) {
                    <option [value]="n">{{ n }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Timeline *</label>
                <select formControlName="timeline" class="form-control">
                  <option value="">Select timeline</option>
                  @for (tl of timelines; track tl.value) {
                    <option [value]="tl.value">{{ tl.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Requirements / Message</label>
              <textarea formControlName="message" rows="4" class="form-control"></textarea>
            </div>

            <button type="submit" [disabled]="form.invalid || loading" class="btn-primary">
              {{ loading ? 'Submitting...' : 'Request Proposal' }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
  styles: [`
    .hero {
      background: linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c2d12 100%);
      padding: 72px 0;
    }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(245,87,108,.25)); }
    .hero-text { display: flex; flex-direction: column; }
    .hero-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #fca5a5; margin-bottom: 10px; }
    .hero-title { font-size: clamp(28px, 4vw, 48px); font-weight: 900; color: #fff; margin-bottom: 16px; line-height: 1.15; }
    .hero-sub { font-size: 16px; color: #e9d5ff; line-height: 1.75; margin-bottom: 24px; max-width: 460px; }
    .hero-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .pill { background: rgba(245,87,108,.15); border: 1px solid rgba(245,87,108,.4); color: #fca5a5; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .hero-cta { display: inline-flex; padding: 12px 24px; background: #f5576c; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; transition: background .15s; align-self: flex-start; }
    .hero-cta:hover { background: #e04460; }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .training-needs, .why-us, .enquiry-form {
      padding: 60px 20px;
    }
    .training-needs {
      background: #f8f9fa;
    }
    h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
    }
    .needs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .need-card {
      background: #f5576c;
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
      font-weight: 600;
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
      color: #f5576c;
      margin-bottom: 1rem;
    }
    .enquiry-form {
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
      border-color: #f5576c;
    }
    textarea.form-control {
      resize: vertical;
    }
    .btn-primary {
      background: #f5576c;
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
      background: #e04460;
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
export class CorporateTrainingComponent {
  private fb = inject(FormBuilder);
  private service = inject(CorporateLeadService);
  private destroyRef = inject(DestroyRef);

  trainingNeeds = CORPORATE_TRAINING_NEEDS;
  enquiryTypes = CORPORATE_ENQUIRY_TYPES;
  timelines = CORPORATE_TIMELINES;

  loading = false;
  submitted = false;

  form = this.fb.group({
    contactPerson: ['', Validators.required],
    companyName:   ['', Validators.required],
    email:         ['', [Validators.required, Validators.email]],
    phone:         ['', Validators.required],
    enquiryType:   ['', Validators.required],
    employeesCount:[null as number | null, [Validators.required, Validators.min(1)]],
    trainingNeeds: ['', Validators.required],
    mode:          ['onsite', Validators.required],
    timeline:      ['', Validators.required],
    message:       ['']
  });

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const v = this.form.getRawValue();
    const payload = {
      contactPerson:  v.contactPerson!,
      companyName:    v.companyName!,
      email:          v.email!,
      phone:          v.phone!,
      enquiryType:    v.enquiryType as any,
      employeesCount: v.employeesCount ?? undefined,
      trainingNeeds:  v.trainingNeeds || undefined,
      mode:           v.mode as any,
      timeline:       v.timeline!,
      message:        v.message || undefined,
    };
    this.service.submitPublic(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitted = true;
          this.loading = false;
        },
        error: () => {
          alert('Failed to submit request. Please try again.');
          this.loading = false;
        }
      });
  }
}
