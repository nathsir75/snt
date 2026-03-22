import {
  Component, inject, signal,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerEnquiryService } from '../../branch-partner-enquiries/partner-enquiry.service';
import {
  CreatePartnerEnquiryPayload,
  INVESTMENT_BUDGET_OPTIONS,
  SPACE_OPTIONS,
} from '../../branch-partner-enquiries/partner-enquiry.models';

type FormStep = 1 | 2 | 3;

@Component({
  selector: 'snt-web-become-partner',
  standalone: true,
  imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hero -->
    <section class="page-hero">
      <div class="container hero-inner">
        <!-- Text LEFT -->
        <div class="hero-text">
          <p class="eyebrow">Franchise Application</p>
          <h1 class="page-title">Become an SNT Education Franchise Partner</h1>
          <p class="page-sub">Fill out the form below and our franchise team will contact you within 24 hours to discuss the opportunity.</p>
          <div class="hero-stats">
            <div class="hstat"><span class="hstat-num">30+</span><span class="hstat-label">Partners</span></div>
            <div class="hstat"><span class="hstat-num">₹2L+</span><span class="hstat-label">Revenue</span></div>
            <div class="hstat"><span class="hstat-num">98%</span><span class="hstat-label">Satisfaction</span></div>
          </div>
        </div>
        <!-- Image RIGHT -->
        <div class="hero-visual">
          <svg viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <!-- handshake center -->
            <circle cx="210" cy="150" r="80" fill="rgba(99,102,241,.08)" stroke="rgba(99,102,241,.2)" stroke-width="1.5"/>
            <!-- left hand -->
            <path d="M100 160 Q130 130 160 150 Q180 160 210 150" fill="none" stroke="#6366f1" stroke-width="4" stroke-linecap="round"/>
            <!-- right hand -->
            <path d="M320 160 Q290 130 260 150 Q240 160 210 150" fill="none" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round"/>
            <!-- handshake icon -->
            <text x="210" y="162" text-anchor="middle" font-size="36" font-family="system-ui">🤝</text>
            <!-- person left -->
            <circle cx="80" cy="120" r="30" fill="#1e293b" stroke="#6366f1" stroke-width="2"/>
            <text x="80" y="128" text-anchor="middle" font-size="20" font-family="system-ui">👨💼</text>
            <text x="80" y="162" text-anchor="middle" font-size="9" fill="#a5b4fc" font-family="system-ui" font-weight="700">Entrepreneur</text>
            <!-- person right -->
            <circle cx="340" cy="120" r="30" fill="#1e293b" stroke="#8b5cf6" stroke-width="2"/>
            <text x="340" y="128" text-anchor="middle" font-size="20" font-family="system-ui">🏢</text>
            <text x="340" y="162" text-anchor="middle" font-size="9" fill="#c4b5fd" font-family="system-ui" font-weight="700">SNT HQ</text>
            <!-- benefit badges -->
            <rect x="20" y="200" width="110" height="44" rx="8" fill="rgba(5,150,105,.15)" stroke="rgba(5,150,105,.4)" stroke-width="1.5"/>
            <text x="75" y="219" text-anchor="middle" font-size="10" fill="#6ee7b7" font-family="system-ui" font-weight="700">💰 ₹2L+/mo</text>
            <text x="75" y="234" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Revenue Potential</text>
            <rect x="150" y="240" width="120" height="44" rx="8" fill="rgba(99,102,241,.15)" stroke="rgba(99,102,241,.4)" stroke-width="1.5"/>
            <text x="210" y="259" text-anchor="middle" font-size="10" fill="#a5b4fc" font-family="system-ui" font-weight="700">🚀 60-Day Launch</text>
            <text x="210" y="274" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">From Apply to Open</text>
            <rect x="290" y="200" width="110" height="44" rx="8" fill="rgba(6,182,212,.15)" stroke="rgba(6,182,212,.4)" stroke-width="1.5"/>
            <text x="345" y="219" text-anchor="middle" font-size="10" fill="#67e8f9" font-family="system-ui" font-weight="700">🖥️ Full Platform</text>
            <text x="345" y="234" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">LMS + Admin</text>
            <!-- glow -->
            <circle cx="210" cy="150" r="20" fill="rgba(99,102,241,.2)"/>
          </svg>
        </div>
      </div>
    </section>

    <!-- Why apply strip -->
    <div class="why-strip">
      <div class="container why-strip-inner">
        @for (w of whyPoints; track w.label) {
          <div class="why-point">
            <span class="why-icon">{{ w.icon }}</span>
            <span class="why-label">{{ w.label }}</span>
          </div>
        }
      </div>
    </div>

    <!-- Main content -->
    <section class="section">
      <div class="container form-layout">

        <!-- Left: Form -->
        <div class="form-col">
          @if (submitted()) {
            <div class="success-card">
              <div class="success-icon">🎉</div>
              <h2 class="success-title">Application Submitted!</h2>
              <p class="success-desc">
                Thank you, <strong>{{ submittedName() }}</strong>! Our franchise team will call you at
                <strong>{{ submittedPhone() }}</strong> within 24 hours.
              </p>
              <p class="success-ref">Reference ID: <strong>#FRQ-{{ submittedId() }}</strong></p>
              <div class="success-actions">
                <a routerLink="/franchise-model" class="btn-secondary">Learn More About the Model</a>
                <a routerLink="/home" class="btn-primary">Back to Home</a>
              </div>
            </div>
          } @else {
            <!-- Step indicator -->
            <div class="step-indicator">
              @for (s of [1,2,3]; track s) {
                <div class="step-item" [class.step-active]="step() === s" [class.step-done]="step() > s">
                  <div class="step-circle">{{ step() > s ? '✓' : s }}</div>
                  <span class="step-label">{{ stepLabels[s - 1] }}</span>
                </div>
                @if (s < 3) { <div class="step-line" [class.step-line-done]="step() > s"></div> }
              }
            </div>

            <!-- Step 1: Personal Info -->
            @if (step() === 1) {
              <div class="form-section">
                <h2 class="form-section-title">Personal Information</h2>
                <div class="form-grid">
                  <div class="form-field form-full">
                    <label class="form-label">Full Name *</label>
                    <input class="form-input" [(ngModel)]="form.fullName" placeholder="Your full name" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Phone Number *</label>
                    <input class="form-input" [(ngModel)]="form.phone" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">Email Address *</label>
                    <input class="form-input" type="email" [(ngModel)]="form.email" placeholder="your@email.com" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">City *</label>
                    <input class="form-input" [(ngModel)]="form.city" placeholder="City where you want to open" />
                  </div>
                  <div class="form-field">
                    <label class="form-label">State *</label>
                    <input class="form-input" [(ngModel)]="form.state" placeholder="State" />
                  </div>
                  <div class="form-field form-full">
                    <label class="form-label">Current Occupation *</label>
                    <input class="form-input" [(ngModel)]="form.currentOccupation" placeholder="e.g. Business Owner, Salaried Professional, Teacher…" />
                  </div>
                </div>
                @if (stepError()) { <p class="form-error">{{ stepError() }}</p> }
                <button class="btn-next" (click)="nextStep()">Next: Business Details →</button>
              </div>
            }

            <!-- Step 2: Business Details -->
            @if (step() === 2) {
              <div class="form-section">
                <h2 class="form-section-title">Business Details</h2>
                <div class="form-grid">
                  <div class="form-field form-full">
                    <label class="form-label">Investment Budget *</label>
                    <select class="form-input" [(ngModel)]="form.investmentBudget">
                      <option value="">Select your budget range</option>
                      @for (opt of budgetOptions; track opt) {
                        <option [value]="opt">{{ opt }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-field form-full">
                    <label class="form-label">Space Available *</label>
                    <select class="form-input" [(ngModel)]="form.spaceAvailable">
                      <option value="">Select space availability</option>
                      @for (opt of spaceOptions; track opt) {
                        <option [value]="opt">{{ opt }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-field form-full">
                    <label class="form-label">Message / Questions (Optional)</label>
                    <textarea class="form-input form-textarea" [(ngModel)]="form.message" placeholder="Any specific questions or information you'd like to share…" rows="4"></textarea>
                  </div>
                </div>
                @if (stepError()) { <p class="form-error">{{ stepError() }}</p> }
                <div class="step-actions">
                  <button class="btn-back" (click)="step.set(1)">← Back</button>
                  <button class="btn-next" (click)="nextStep()">Next: Review →</button>
                </div>
              </div>
            }

            <!-- Step 3: Review & Submit -->
            @if (step() === 3) {
              <div class="form-section">
                <h2 class="form-section-title">Review Your Application</h2>
                <div class="review-grid">
                  <div class="review-item"><span class="review-label">Name</span><span class="review-value">{{ form.fullName }}</span></div>
                  <div class="review-item"><span class="review-label">Phone</span><span class="review-value">{{ form.phone }}</span></div>
                  <div class="review-item"><span class="review-label">Email</span><span class="review-value">{{ form.email }}</span></div>
                  <div class="review-item"><span class="review-label">Location</span><span class="review-value">{{ form.city }}, {{ form.state }}</span></div>
                  <div class="review-item"><span class="review-label">Occupation</span><span class="review-value">{{ form.currentOccupation }}</span></div>
                  <div class="review-item"><span class="review-label">Budget</span><span class="review-value">{{ form.investmentBudget }}</span></div>
                  <div class="review-item"><span class="review-label">Space</span><span class="review-value">{{ form.spaceAvailable }}</span></div>
                  @if (form.message) {
                    <div class="review-item review-full"><span class="review-label">Message</span><span class="review-value">{{ form.message }}</span></div>
                  }
                </div>
                <div class="consent-box">
                  <label class="consent-label">
                    <input type="checkbox" [(ngModel)]="consent" class="consent-check" />
                    I agree to be contacted by SNT Education's franchise team regarding this application. I understand my information will be kept confidential.
                  </label>
                </div>
                @if (submitError()) { <p class="form-error">{{ submitError() }}</p> }
                <div class="step-actions">
                  <button class="btn-back" (click)="step.set(2)">← Back</button>
                  <button
                    class="btn-submit"
                    [disabled]="!consent || saving()"
                    (click)="submit()"
                  >
                    {{ saving() ? 'Submitting…' : '🚀 Submit Application' }}
                  </button>
                </div>
              </div>
            }
          }
        </div>

        <!-- Right: Info sidebar -->
        <div class="info-col">
          <div class="info-card">
            <h3 class="info-title">What Happens Next?</h3>
            @for (step of nextSteps; track step.num) {
              <div class="next-step">
                <div class="next-step-num">{{ step.num }}</div>
                <div>
                  <p class="next-step-title">{{ step.title }}</p>
                  <p class="next-step-desc">{{ step.desc }}</p>
                </div>
              </div>
            }
          </div>

          <div class="info-card info-card-highlight">
            <h3 class="info-title">Quick Facts</h3>
            @for (fact of quickFacts; track fact.label) {
              <div class="quick-fact">
                <span class="fact-icon">{{ fact.icon }}</span>
                <div>
                  <p class="fact-value">{{ fact.value }}</p>
                  <p class="fact-label">{{ fact.label }}</p>
                </div>
              </div>
            }
          </div>

          <div class="contact-card">
            <p class="contact-card-title">Have Questions?</p>
            <p class="contact-card-text">Call our franchise team directly:</p>
            <p class="contact-card-phone">📞 +91 98765 43210</p>
            <p class="contact-card-text">Mon–Sat, 9 AM – 7 PM</p>
          </div>
        </div>

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
    .hero-text { display: flex; flex-direction: column; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(99,102,241,.3)); }
    .hero-stats { display: flex; gap: 24px; margin-top: 20px; }
    .hstat { display: flex; flex-direction: column; gap: 2px; }
    .hstat-num { font-size: 24px; font-weight: 900; color: #fff; }
    .hstat-label { font-size: 10px; color: #a5b4fc; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
    .page-title { font-size: clamp(26px, 4vw, 44px); font-weight: 900; color: #fff; margin-bottom: 14px; }
    .page-sub { font-size: 16px; color: #c7d2fe; max-width: 560px; margin: 0 auto; line-height: 1.75; }

    .why-strip { background: #6366f1; padding: 16px 0; }
    .why-strip-inner { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; }
    .why-point { display: flex; align-items: center; gap: 8px; color: #fff; font-size: 13px; font-weight: 600; }
    .why-icon { font-size: 16px; }

    .form-layout { display: grid; grid-template-columns: 1fr 380px; gap: 40px; align-items: start; }
    .form-col { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }

    /* Step indicator */
    .step-indicator { display: flex; align-items: center; margin-bottom: 32px; }
    .step-item { display: flex; align-items: center; gap: 8px; }
    .step-circle { width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .2s; }
    .step-active .step-circle { background: #6366f1; color: #fff; }
    .step-done .step-circle { background: #059669; color: #fff; }
    .step-label { font-size: 12px; font-weight: 600; color: #6b7280; white-space: nowrap; }
    .step-active .step-label { color: #6366f1; }
    .step-done .step-label { color: #059669; }
    .step-line { flex: 1; height: 2px; background: #e5e7eb; margin: 0 8px; transition: background .2s; }
    .step-line-done { background: #059669; }

    .form-section-title { font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-full { grid-column: 1 / -1; }
    .form-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: #6b7280; }
    .form-input { padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; width: 100%; background: #fff; }
    .form-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
    .form-textarea { resize: vertical; }
    .form-error { font-size: 13px; color: #dc2626; margin-bottom: 12px; font-weight: 500; }

    .step-actions { display: flex; gap: 12px; align-items: center; }
    .btn-next { flex: 1; padding: 13px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background .15s; }
    .btn-next:hover { background: #4f46e5; }
    .btn-back { padding: 12px 20px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; }
    .btn-back:hover { background: #e5e7eb; }
    .btn-submit { flex: 1; padding: 13px; background: #059669; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background .15s; }
    .btn-submit:hover:not(:disabled) { background: #047857; }
    .btn-submit:disabled { opacity: .6; cursor: not-allowed; }

    /* Review */
    .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .review-item { display: flex; flex-direction: column; gap: 3px; background: #f8fafc; border-radius: 8px; padding: 12px; }
    .review-full { grid-column: 1 / -1; }
    .review-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #6b7280; }
    .review-value { font-size: 14px; color: #111827; font-weight: 500; }
    .consent-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
    .consent-label { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: #374151; line-height: 1.6; cursor: pointer; }
    .consent-check { margin-top: 2px; flex-shrink: 0; accent-color: #059669; }

    /* Success */
    .success-card { text-align: center; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .success-icon { font-size: 56px; }
    .success-title { font-size: 24px; font-weight: 900; color: #111827; }
    .success-desc { font-size: 15px; color: #374151; line-height: 1.75; max-width: 400px; }
    .success-ref { font-size: 13px; color: #6b7280; background: #f3f4f6; padding: 8px 16px; border-radius: 6px; }
    .success-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
    .btn-primary { display: inline-flex; padding: 11px 22px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; transition: background .15s; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-secondary { display: inline-flex; padding: 10px 20px; background: #f3f4f6; color: #374151; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; transition: background .15s; }
    .btn-secondary:hover { background: #e5e7eb; }

    /* Info sidebar */
    .info-col { display: flex; flex-direction: column; gap: 16px; }
    .info-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; }
    .info-card-highlight { background: #f0fdf4; border-color: #bbf7d0; }
    .info-title { font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 16px; }
    .next-step { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .next-step-num { width: 28px; height: 28px; border-radius: 50%; background: #eef2ff; color: #6366f1; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .next-step-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 2px; }
    .next-step-desc { font-size: 12px; color: #6b7280; }
    .quick-fact { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
    .fact-icon { font-size: 20px; flex-shrink: 0; }
    .fact-value { font-size: 16px; font-weight: 800; color: #059669; }
    .fact-label { font-size: 11px; color: #6b7280; }
    .contact-card { background: #1e1b4b; border-radius: 14px; padding: 20px; }
    .contact-card-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px; }
    .contact-card-text { font-size: 13px; color: #a5b4fc; margin-bottom: 4px; }
    .contact-card-phone { font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 4px; }

    @media (max-width: 900px) { .form-layout { grid-template-columns: 1fr; } .info-col { display: none; } .hero-inner { grid-template-columns: 1fr; } .hero-visual { display: none; } }
    @media (max-width: 480px) { .form-grid { grid-template-columns: 1fr; } .review-grid { grid-template-columns: 1fr; } }
  `],
})
export class WebBecomePartnerComponent {
  private readonly svc        = inject(PartnerEnquiryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly step        = signal<FormStep>(1);
  readonly saving      = signal(false);
  readonly submitted   = signal(false);
  readonly stepError   = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);
  readonly submittedName  = signal('');
  readonly submittedPhone = signal('');
  readonly submittedId    = signal(0);

  consent = false;

  form: CreatePartnerEnquiryPayload = {
    fullName: '', email: '', phone: '', city: '', state: '',
    investmentBudget: '', spaceAvailable: '', currentOccupation: '', message: '',
  };

  readonly budgetOptions = INVESTMENT_BUDGET_OPTIONS;
  readonly spaceOptions  = SPACE_OPTIONS;
  readonly stepLabels    = ['Personal Info', 'Business Details', 'Review & Submit'];

  readonly whyPoints = [
    { icon: '🏷️', label: 'Established Brand' },
    { icon: '🖥️', label: 'Full Tech Platform' },
    { icon: '🤝', label: 'Placement Network' },
    { icon: '💰', label: '₹2L+ Monthly Revenue' },
    { icon: '📞', label: '24hr Support' },
  ];

  readonly nextSteps = [
    { num: '1', title: 'Application Review',   desc: 'Our team reviews your application within 2 hours.' },
    { num: '2', title: 'Franchise Call',        desc: 'A franchise manager calls you within 24 hours.' },
    { num: '3', title: 'Site Visit & Approval', desc: 'We visit your proposed location and approve.' },
    { num: '4', title: 'Agreement & Launch',    desc: 'Sign agreement, complete setup, and launch!' },
  ];

  readonly quickFacts = [
    { icon: '💰', value: '₹5L+',  label: 'Starting Investment' },
    { icon: '📈', value: '₹2L+',  label: 'Monthly Revenue Potential' },
    { icon: '⏱️', value: '6 Mo',  label: 'Average Break-Even' },
    { icon: '🏢', value: '30+',   label: 'Active Franchise Partners' },
  ];

  nextStep(): void {
    this.stepError.set(null);
    if (this.step() === 1) {
      if (!this.form.fullName.trim() || !this.form.phone.trim() || !this.form.email.trim() || !this.form.city.trim() || !this.form.state.trim() || !this.form.currentOccupation.trim()) {
        this.stepError.set('Please fill in all required fields.');
        return;
      }
      this.step.set(2);
    } else if (this.step() === 2) {
      if (!this.form.investmentBudget || !this.form.spaceAvailable) {
        this.stepError.set('Please select your investment budget and space availability.');
        return;
      }
      this.step.set(3);
    }
  }

  submit(): void {
    if (!this.consent) return;
    this.submitError.set(null);
    this.saving.set(true);
    this.svc.submitPublic(this.form)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.submittedName.set(this.form.fullName);
          this.submittedPhone.set(this.form.phone);
          this.submittedId.set(res.id);
          this.saving.set(false);
          this.submitted.set(true);
        },
        error: () => {
          this.submitError.set('Something went wrong. Please try again or call us directly.');
          this.saving.set(false);
        },
      });
  }
}
